require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(cors({
  origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
}));
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/mentorship", require("./routes/mentorshipRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));

app.listen(5000, () => {
  console.log("Server running on port 5000");
});