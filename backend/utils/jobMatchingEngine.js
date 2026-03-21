// backend/utils/jobMatchingEngine.js
// Skill-based student ↔ job matching engine for BVRITH Alunite
//
// Job skillsRequired: plain skill names only  (e.g. ["React", "Node.js"])
// Student skills:     [{name, level}]          (e.g. [{name:"React", level:"Advanced"}])
//
// Scoring per matched skill:
//   Advanced     → 3 points
//   Intermediate → 2 points
//   Beginner     → 1 point
//
// Any student who has at least ONE required skill qualifies.
// Final score = sum of level scores across all matched skills.
// Ranked highest score first; CGPA is the tiebreaker.
// Top 100 returned.

const StudentProfile = require("../models/StudentProfile");
const User = require("../models/User");

const LEVEL_SCORE = { Advanced: 3, Intermediate: 2, Beginner: 1 };
const TOP_N = 100;

/**
 * scoreStudent(studentSkills, requiredSkillNames)
 *
 * @param {Array<{name:string, level:string}|string>} studentSkills
 * @param {string[]} requiredSkillNames  — plain lowercase strings
 * @returns {{ score: number, matchedCount: number }}
 */
function scoreStudent(studentSkills, requiredSkillNames) {
  if (!requiredSkillNames || requiredSkillNames.length === 0) return { score: 0, matchedCount: 0 };

  // Build lookup: skill name (lower) → level score
  const studentMap = new Map();
  for (const sk of studentSkills) {
    const name  = (typeof sk === "object" ? sk.name  : sk) || "";
    const level = (typeof sk === "object" ? sk.level : null) || "Beginner";
    studentMap.set(name.toLowerCase().trim(), LEVEL_SCORE[level] ?? 1);
  }

  let score = 0;
  let matchedCount = 0;

  for (const reqName of requiredSkillNames) {
    if (!studentMap.has(reqName)) continue;
    score += studentMap.get(reqName);
    matchedCount += 1;
  }

  return { score, matchedCount };
}

/**
 * runJobMatching(job)
 *
 * Fetches all active non-graduated students with at least one skill,
 * scores them, keeps anyone with ≥1 skill match, returns top N by score.
 *
 * @param {Object} job  — Mongoose Job document
 * @returns {Array<{studentId, score, fullName, branch, cgpa, matchedCount}>}
 */
async function runJobMatching(job) {
  const requiredRaw = job.skillsRequired || [];
  if (requiredRaw.length === 0) return [];

  // Normalise to lowercase plain strings (handles legacy {name,level} objects just in case)
  const requiredNames = requiredRaw.map((s) =>
    ((typeof s === "object" ? s.name : s) || "").toLowerCase().trim()
  ).filter(Boolean);

  if (requiredNames.length === 0) return [];

  // Fetch all active student users
  const activeUsers = await User.find({ role: "student", isActive: true }).select("_id").lean();
  const activeIds   = activeUsers.map((u) => u._id);

  // Fetch non-graduated profiles with at least one skill
  const profiles = await StudentProfile.find({
    user:        { $in: activeIds },
    isGraduated: { $ne: true },
    fullName:    { $exists: true, $ne: "" },
    branch:      { $exists: true, $ne: "" },
    "skills.0":  { $exists: true },
  }).select("user fullName branch cgpa skills").lean();

  const results = [];

  for (const profile of profiles) {
    const { score, matchedCount } = scoreStudent(profile.skills || [], requiredNames);
    if (matchedCount === 0) continue; // must match at least one skill

    results.push({
      studentId:    profile.user,
      score,
      matchedCount,
      fullName:     profile.fullName,
      branch:       profile.branch,
      cgpa:         profile.cgpa ?? null,
    });
  }

  // Sort: highest score first, then CGPA as tiebreaker
  results.sort((a, b) => b.score - a.score || (b.cgpa ?? 0) - (a.cgpa ?? 0));

  return results.slice(0, TOP_N);
}

module.exports = { runJobMatching, scoreStudent };
