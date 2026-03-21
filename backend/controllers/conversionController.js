// backend/controllers/conversionController.js
// Bulk Student → Alumni conversion feature for BVRITH Alunite

const mongoose = require("mongoose");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const { createNotification } = require("../utils/notificationHelper");
const emailService = require("../utils/emailService");

// ─── Helper: build AlumniProfile data from StudentProfile ────────────────────
function buildAlumniData(student, userId) {
  return {
    user: userId,
    fullName: student.fullName,
    rollNumber: student.rollNumber,
    branch: student.branch,
    graduationYear: student.graduationYear,
    phone: student.phone || "",
    linkedIn: student.linkedIn || "",
    github: student.github || "",
    skills: student.skills || [],
    bio: student.bio || "",
    photoKey: student.photoKey || "",
    profilePhoto: student.profilePhoto || "",
    resumeKey: student.resumeKey || "",
    resumeName: student.resumeName || "",
    achievements: student.achievements || [],
    certificates: student.certificates || [],
    // Alumni-specific defaults
    currentCompany: "",
    currentRole: "",
    location: "",
    isAvailableForMentorship: false,
    availableForTalks: false,
    portfolioUrl: "",
    webinarTopics: [],
    // Graduation doc — to be uploaded post-conversion
    graduationDocKey: "",
    graduationDocName: "",
  };
}

// ─── GET /api/conversion/preview ─────────────────────────────────────────────
// Returns a dry-run count of students eligible for conversion (no DB writes)
exports.previewConversion = async (req, res) => {
  try {
    const { graduationYear, branch } = req.query;

    if (!graduationYear) {
      return res.status(400).json({ message: "graduationYear is required" });
    }

    // Build query for eligible students
    const studentQuery = { role: "student" };
    const profileQuery = { graduationYear: Number(graduationYear), isGraduated: { $ne: true } };
    if (branch) profileQuery.branch = branch;

    // Find student profiles matching criteria
    const profiles = await StudentProfile.find(profileQuery).select("user fullName branch rollNumber");
    const userIds = profiles.map((p) => p.user);

    // Cross-check they are still role=student
    const eligibleUsers = await User.find({ _id: { $in: userIds }, role: "student" }).select("_id email");
    const eligibleIds = new Set(eligibleUsers.map((u) => u._id.toString()));

    // Check for already-existing alumni profiles (duplicates to skip)
    const existingAlumni = await AlumniProfile.find({ user: { $in: userIds } }).select("user");
    const alreadyConverted = new Set(existingAlumni.map((a) => a.user.toString()));

    const toConvert = profiles.filter(
      (p) => eligibleIds.has(p.user.toString()) && !alreadyConverted.has(p.user.toString())
    );

    res.json({
      graduationYear: Number(graduationYear),
      branch: branch || "all",
      eligible: toConvert.length,
      alreadyConverted: alreadyConverted.size,
      students: toConvert.map((p) => ({
        userId: p.user,
        fullName: p.fullName,
        rollNumber: p.rollNumber,
        branch: p.branch,
      })),
    });
  } catch (err) {
    console.error("[conversionController.previewConversion]", err);
    res.status(500).json({ message: "Server error during preview" });
  }
};

// ─── POST /api/conversion/convert ────────────────────────────────────────────
// Admin-triggered bulk conversion with MongoDB transactions + bulkWrite
exports.bulkConvert = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { graduationYear, branch } = req.body;

    if (!graduationYear) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "graduationYear is required" });
    }

    // ── Step 1: Find eligible student profiles ────────────────────────────
    const profileQuery = { graduationYear: Number(graduationYear), isGraduated: { $ne: true } };
    if (branch) profileQuery.branch = branch;

    const studentProfiles = await StudentProfile.find(profileQuery).session(session);
    const userIds = studentProfiles.map((p) => p.user);

    if (userIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({
        message: "No eligible students found for conversion",
        converted: 0,
        skipped: 0,
        errors: [],
      });
    }

    // ── Step 2: Cross-check role=student and no existing AlumniProfile ───
    const [eligibleUsers, existingAlumniProfiles] = await Promise.all([
      User.find({ _id: { $in: userIds }, role: "student" }).select("_id email").session(session),
      AlumniProfile.find({ user: { $in: userIds } }).select("user").session(session),
    ]);

    const eligibleUserMap = new Map(eligibleUsers.map((u) => [u._id.toString(), u]));
    const alreadyConvertedSet = new Set(existingAlumniProfiles.map((a) => a.user.toString()));

    const toProcess = studentProfiles.filter(
      (sp) =>
        eligibleUserMap.has(sp.user.toString()) &&
        !alreadyConvertedSet.has(sp.user.toString())
    );

    const skippedCount = studentProfiles.length - toProcess.length;

    if (toProcess.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({
        message: "All matching students are already converted",
        converted: 0,
        skipped: skippedCount,
        errors: [],
      });
    }

    // ── Step 3: Build bulk operations ────────────────────────────────────
    const alumniInsertDocs = toProcess.map((sp) => buildAlumniData(sp, sp.user));
    const userIdsToUpdate = toProcess.map((sp) => sp.user);
    const studentProfileIdsToMark = toProcess.map((sp) => sp._id);

    // 3a. Bulk insert AlumniProfiles (insertMany is atomic per document)
    await AlumniProfile.insertMany(alumniInsertDocs, { session, ordered: false });

    // 3b. Bulk update Users: role → alumni, isApproved → false
    await User.bulkWrite(
      userIdsToUpdate.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: { role: "alumni", isApproved: false },
          },
        },
      })),
      { session }
    );

    // 3c. Mark StudentProfiles as graduated (preserve all data — never delete)
    await StudentProfile.bulkWrite(
      studentProfileIdsToMark.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: { isGraduated: true, graduatedAt: new Date() },
          },
        },
      })),
      { session }
    );

    // ── Step 4: Commit transaction ────────────────────────────────────────
    await session.commitTransaction();
    session.endSession();

    // ── Step 5: Post-conversion side effects (outside transaction) ────────
    // Fire-and-forget — failures here do not roll back the conversion
    const convertedUsers = toProcess.map((sp) => ({
      userId: sp.user.toString(),
      email: eligibleUserMap.get(sp.user.toString())?.email,
      fullName: sp.fullName,
    }));

    _postConversionSideEffects(convertedUsers, Number(graduationYear)).catch((e) =>
      console.error("[postConversionSideEffects]", e)
    );

    res.json({
      message: `Successfully converted ${toProcess.length} student(s) to alumni`,
      converted: toProcess.length,
      skipped: skippedCount,
      graduationYear: Number(graduationYear),
      branch: branch || "all",
      errors: [],
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[conversionController.bulkConvert]", err);

    // Handle duplicate key errors (race condition — AlumniProfile already exists)
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Some alumni profiles already exist. Please retry — duplicates are skipped automatically.",
        error: "duplicate_key",
      });
    }

    res.status(500).json({ message: "Conversion failed — all changes have been rolled back", error: err.message });
  }
};

// ─── POST /api/conversion/rollback ───────────────────────────────────────────
// Rollback a conversion batch (for a given year+branch, within safe window)
exports.rollbackConversion = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { graduationYear, branch } = req.body;

    if (!graduationYear) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "graduationYear is required" });
    }

    // Find AlumniProfiles that were bulk-converted (no graduation doc uploaded yet = safe to rollback)
    const alumniProfileQuery = { graduationYear: Number(graduationYear) };
    if (branch) alumniProfileQuery.branch = branch;

    const alumniProfiles = await AlumniProfile.find({
      ...alumniProfileQuery,
      graduationDocKey: { $in: [null, ""] }, // Only rollback if they haven't uploaded docs
    }).select("user").session(session);

    const userIds = alumniProfiles.map((ap) => ap.user);

    if (userIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.json({ message: "No rollback-eligible records found", rolledBack: 0 });
    }

    // Verify these users are currently alumni (role=alumni, isApproved=false)
    const usersToRollback = await User.find({
      _id: { $in: userIds },
      role: "alumni",
      isApproved: false,
    }).select("_id").session(session);

    const rollbackIds = usersToRollback.map((u) => u._id);

    // 1. Delete the AlumniProfiles created during bulk conversion
    await AlumniProfile.deleteMany({ user: { $in: rollbackIds } }, { session });

    // 2. Revert User role back to student
    await User.bulkWrite(
      rollbackIds.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { role: "student", isApproved: true } },
        },
      })),
      { session }
    );

    // 3. Un-mark StudentProfiles as graduated
    await StudentProfile.updateMany(
      { user: { $in: rollbackIds } },
      { $set: { isGraduated: false }, $unset: { graduatedAt: "" } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `Rolled back ${rollbackIds.length} conversion(s) successfully`,
      rolledBack: rollbackIds.length,
      graduationYear: Number(graduationYear),
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[conversionController.rollbackConversion]", err);
    res.status(500).json({ message: "Rollback failed — all changes reversed", error: err.message });
  }
};

// ─── GET /api/conversion/history ─────────────────────────────────────────────
// Lists users who were bulk-converted (role=alumni, isApproved=false, isGraduated=true on StudentProfile)
exports.getConversionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, graduationYear } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Find students marked as graduated
    const spQuery = { isGraduated: true };
    if (graduationYear) spQuery.graduationYear = Number(graduationYear);

    const [profiles, total] = await Promise.all([
      StudentProfile.find(spQuery)
        .sort({ graduatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "email role isApproved createdAt"),
      StudentProfile.countDocuments(spQuery),
    ]);

    const enriched = profiles.map((sp) => ({
      userId: sp.user?._id,
      email: sp.user?.email,
      fullName: sp.fullName,
      rollNumber: sp.rollNumber,
      branch: sp.branch,
      graduationYear: sp.graduationYear,
      convertedAt: sp.graduatedAt,
      currentRole: sp.user?.role,
      isApproved: sp.user?.isApproved,
    }));

    res.json({
      conversions: enriched,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error("[conversionController.getConversionHistory]", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Internal: post-conversion side effects ───────────────────────────────────
async function _postConversionSideEffects(users, graduationYear) {
  for (const { userId, email, fullName } of users) {
    try {
      // In-app notification
      await createNotification(
        userId,
        "🎓 Congratulations! Your account has been transitioned to Alumni status. " +
          "Please upload your graduation document to get your profile approved.",
        "system"
      );

      // Email notification
      if (email) {
        await emailService.sendGraduationConversionEmail(email, fullName, graduationYear);
      }
    } catch (e) {
      console.error(`[postConversionSideEffects] Failed for user ${userId}:`, e.message);
    }
  }
}
