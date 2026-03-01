const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = (allowedRoles) => (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Middleware: block unapproved alumni from accessing protected features
exports.requireApproved = async (req, res, next) => {
  try {
    if (req.user.role !== "alumni") return next(); // only applies to alumni
    const user = await User.findById(req.user.id).select("isApproved");
    if (!user || !user.isApproved) {
      return res.status(403).json({
        message: "Your account is pending admin approval. You will be notified once approved.",
        pendingApproval: true,
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
