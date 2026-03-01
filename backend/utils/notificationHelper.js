const Notification = require("../models/Notification");

/**
 * Create a notification record for a user.
 * Designed to be called alongside existing email sends — never throws,
 * so a notification failure never breaks the main request.
 *
 * @param {string} userId   - Recipient user ObjectId
 * @param {string} type     - Notification type (see Notification model enum)
 * @param {string} message  - Human-readable notification message
 * @param {string} [link]   - Optional deep-link path (e.g. "/mentorship/inbox")
 */
async function createNotification(userId, type, message, link = null) {
  try {
    await Notification.create({ userId, type, message, link });
  } catch (err) {
    // Log but never propagate — notifications are best-effort
    console.error("[Notification] Failed to create:", err.message);
  }
}

module.exports = { createNotification };
