const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
dns.setServers(['8.8.8.8', '8.8.4.4']); // ← ADD THIS LINE

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Connect database
connectDB();

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/mentorship", require("./routes/mentorshipRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/upload", require("./routes/uploadRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/forum", require("./routes/forumRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/conversion", require("./routes/conversionRoutes"));

// Start server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});