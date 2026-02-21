const Message = require("../models/Message");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");

// Helper: get profile for any user
async function getProfile(userId, role) {
  if (role === "student") return StudentProfile.findOne({ user: userId });
  if (role === "alumni") return AlumniProfile.findOne({ user: userId });
  return null;
}

// ─── SEND a message ───────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (receiverId === req.user.id) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiverId,
      content: content.trim(),
    });

    res.status(201).json({ message: "Message sent", data: message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET conversation between current user and another ────
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: userId },
        { sender: userId, receiver: req.user.id },
      ],
    }).sort({ createdAt: 1 });

    // Mark received messages as read
    await Message.updateMany(
      { sender: userId, receiver: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET inbox — list of unique conversations ──────────────
exports.getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all messages involving this user
    const allMessages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "email role")
      .populate("receiver", "email role");

    // Build unique conversation list — one entry per contact
    const seen = new Set();
    const conversations = [];

    for (const msg of allMessages) {
      const contact =
        msg.sender._id.toString() === userId.toString()
          ? msg.receiver
          : msg.sender;

      const contactId = contact._id.toString();
      if (seen.has(contactId)) continue;
      seen.add(contactId);

      // Count unread from this contact
      const unreadCount = await Message.countDocuments({
        sender: contactId,
        receiver: userId,
        read: false,
      });

      // Get contact's profile
      const profile = await getProfile(contactId, contact.role);

      conversations.push({
        contact: {
          userId: contactId,
          email: contact.email,
          role: contact.role,
          profile,
        },
        lastMessage: {
          content: msg.content,
          createdAt: msg.createdAt,
          fromMe: msg.sender._id.toString() === userId.toString(),
        },
        unreadCount,
      });
    }

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET unread count (for navbar badge) ─────────────────
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user.id,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
