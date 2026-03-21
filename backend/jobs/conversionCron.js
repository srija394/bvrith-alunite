// backend/jobs/conversionCron.js
// Optional: scheduled auto-conversion on June 1 each year
// Requires: npm install node-cron
// Usage: require("./jobs/conversionCron") in server.js

const cron = require("node-cron");
const mongoose = require("mongoose");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const { createNotification } = require("../utils/notificationHelper");
const emailService = require("../utils/emailService");

// ── Build alumni data from student profile (mirrors conversionController) ──
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
    currentCompany: "",
    currentRole: "",
    location: "",
    isAvailableForMentorship: false,
    availableForTalks: false,
    portfolioUrl: "",
    webinarTopics: [],
    graduationDocKey: "",
    graduationDocName: "",
  };
}

// ── Core auto-conversion logic ─────────────────────────────────────────────
async function runAutoConversion() {
  const currentYear = new Date().getFullYear();
  console.log(`[conversionCron] Starting auto-conversion for Class of ${currentYear}...`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find all un-graduated students whose graduationYear <= current year
    const studentProfiles = await StudentProfile.find({
      graduationYear: { $lte: currentYear },
      isGraduated: { $ne: true },
    }).session(session);

    if (studentProfiles.length === 0) {
      await session.abortTransaction();
      session.endSession();
      console.log("[conversionCron] No eligible students found. Skipping.");
      return;
    }

    const userIds = studentProfiles.map((sp) => sp.user);

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

    if (toProcess.length === 0) {
      await session.abortTransaction();
      session.endSession();
      console.log("[conversionCron] All eligible students already converted. Skipping.");
      return;
    }

    const alumniInsertDocs = toProcess.map((sp) => buildAlumniData(sp, sp.user));
    const userIdsToUpdate = toProcess.map((sp) => sp.user);
    const profileIdsToMark = toProcess.map((sp) => sp._id);

    await AlumniProfile.insertMany(alumniInsertDocs, { session, ordered: false });

    await User.bulkWrite(
      userIdsToUpdate.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { role: "alumni", isApproved: false } },
        },
      })),
      { session }
    );

    await StudentProfile.bulkWrite(
      profileIdsToMark.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: { $set: { isGraduated: true, graduatedAt: new Date() } },
        },
      })),
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log(`[conversionCron] ✅ Auto-converted ${toProcess.length} students to alumni.`);

    // Post-conversion notifications (fire-and-forget)
    for (const sp of toProcess) {
      const user = eligibleUserMap.get(sp.user.toString());
      try {
        await createNotification(
          sp.user,
          `🎓 Your account has been automatically transitioned to Alumni (Class of ${sp.graduationYear}). Please upload your graduation document.`,
          "system"
        );
        if (user?.email) {
          await emailService.sendGraduationConversionEmail(user.email, sp.fullName, sp.graduationYear);
        }
      } catch (e) {
        console.error(`[conversionCron] Notification failed for ${sp.user}:`, e.message);
      }
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("[conversionCron] ❌ Auto-conversion failed — rolled back:", err.message);
  }
}

// ── Schedule: runs at 00:00 on June 1st every year ────────────────────────
// Cron syntax: "0 0 1 6 *" = minute 0, hour 0, day 1, month 6 (June), any weekday
cron.schedule("0 0 1 6 *", () => {
  console.log("[conversionCron] Triggered scheduled auto-conversion...");
  runAutoConversion();
}, {
  timezone: "Asia/Kolkata", // IST
});

console.log("[conversionCron] Scheduled auto-conversion: runs June 1 at 00:00 IST");

module.exports = { runAutoConversion }; // Export for manual trigger / testing
