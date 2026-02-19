/**
 * AI Mentorship Matching Engine
 * 
 * Converts alumni and student profiles into TF-IDF-style vectors
 * then ranks alumni by cosine similarity to the student.
 *
 * Vector dimensions:
 *  - skills (weighted highest: 0.6)
 *  - branch match (0.25)
 *  - bio/role keywords (0.15)
 */

// ── Tokenize a string into lowercase words ─────────────────
function tokenize(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

// ── Build a term-frequency map from an array of tokens ─────
function termFreq(tokens) {
  const tf = {};
  tokens.forEach((t) => { tf[t] = (tf[t] || 0) + 1; });
  return tf;
}

// ── Convert a profile into a weighted token bag ────────────
function profileToTokens(profile, role) {
  const tokens = [];

  // Skills — highest weight, repeat 3x
  (profile.skills || []).forEach((s) => {
    const t = tokenize(s);
    tokens.push(...t, ...t, ...t); // 3x weight
  });

  // Branch — repeat 2x
  if (profile.branch) {
    const b = tokenize(profile.branch);
    tokens.push(...b, ...b);
  }

  // Bio keywords
  tokens.push(...tokenize(profile.bio || ""));

  // Alumni-specific: role + company keywords
  if (role === "alumni") {
    tokens.push(...tokenize(profile.currentRole || ""));
    tokens.push(...tokenize(profile.currentCompany || ""));
  }

  // Student-specific: year as string signal
  if (role === "student" && profile.year) {
    tokens.push(`year${profile.year}`);
  }

  return tokens;
}

// ── Cosine similarity between two TF maps ──────────────────
function cosineSimilarity(tfA, tfB) {
  const allTerms = new Set([...Object.keys(tfA), ...Object.keys(tfB)]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allTerms.forEach((term) => {
    const a = tfA[term] || 0;
    const b = tfB[term] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Bonus: same branch gives a flat +0.1 boost ─────────────
function branchBonus(studentProfile, alumniProfile) {
  if (
    studentProfile.branch &&
    alumniProfile.branch &&
    studentProfile.branch === alumniProfile.branch
  ) {
    return 0.1;
  }
  return 0;
}

/**
 * Main function: rank alumni by match score for a given student
 * @param {Object} studentProfile - StudentProfile document
 * @param {Array}  alumniProfiles - Array of AlumniProfile documents
 * @param {number} topN           - How many to return (default 10)
 * @returns {Array} sorted alumni with matchScore attached
 */
function rankMentors(studentProfile, alumniProfiles, topN = 10) {
  const studentTokens = profileToTokens(studentProfile, "student");
  const studentTF = termFreq(studentTokens);

  const scored = alumniProfiles
    .filter((a) => a.isAvailableForMentorship) // only willing mentors
    .map((alumni) => {
      const alumniTokens = profileToTokens(alumni, "alumni");
      const alumniTF = termFreq(alumniTokens);

      const similarity = cosineSimilarity(studentTF, alumniTF);
      const bonus = branchBonus(studentProfile, alumni);
      const finalScore = Math.min(1, similarity + bonus);

      return {
        alumni,
        matchScore: parseFloat(finalScore.toFixed(4)),
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN);

  return scored;
}

module.exports = { rankMentors };
