// backend/routes/conversionRoutes.js
// Admin-only routes for bulk Student → Alumni conversion

const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  previewConversion,
  bulkConvert,
  rollbackConversion,
  getConversionHistory,
} = require("../controllers/conversionController");

const router = express.Router();
const adminOnly = protect(["admin"]);

// GET  /api/conversion/preview   — dry-run: shows who would be converted
router.get("/preview", adminOnly, previewConversion);

// POST /api/conversion/convert   — execute bulk conversion
router.post("/convert", adminOnly, bulkConvert);

// POST /api/conversion/rollback  — undo a conversion batch (safe window)
router.post("/rollback", adminOnly, rollbackConversion);

// GET  /api/conversion/history   — list all converted users
router.get("/history", adminOnly, getConversionHistory);

module.exports = router;
