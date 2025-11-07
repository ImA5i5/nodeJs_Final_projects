// app.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");
const expressLayouts = require("express-ejs-layouts");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const RedisStore = require("connect-redis")(session);
const redisClient = require("./app/config/redis");
const db = require("./app/config/db");
const winston = require("./app/config/winston");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const methodOverride = require("method-override");

// Initialize Express App
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set("io", io);

// Connect Database
db();

// Set EJS + Layout
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");
app.use(methodOverride("_method"));

// Public Directory
app.use(express.static(path.join(__dirname, "app/public")));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(morgan("dev"));


// Sessions + Redis
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // only send cookie over HTTPS
      httpOnly: true, // prevent XSS cookie theft
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "lax",
    },
  })
);

app.use(flash());

// Global flash messages for all EJS views


app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  res.locals.user = req.user || null;
  next();
});

// Rate Limiter (Protect from abuse)
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use(limiter);

// Default locals for all templates
app.use((req, res, next) => {
  res.locals.title = "Freelancer Marketplace"; // ✅ default page title
  next();
});

// Import Routes
const authRoutes = require("./app/routes/auth.routes");
app.use("/auth", authRoutes);

const adminRoutes = require("./app/routes/admin.routes");
app.use("/admin", adminRoutes);

const categoryRoutes = require("./app/routes/category.routes");
app.use("/admin/categories", categoryRoutes);

const adminPaymentRoutes=require("./app/routes/admin.payment.routes");
app.use("/admin/payments", adminPaymentRoutes);

const disputeRoutes = require("./app/routes/dispute.routes");
app.use("/admin/disputes", disputeRoutes);


const freelancerRoutes = require("./app/routes/freelancer.routes");
app.use("/freelancer", freelancerRoutes);

const walletRoutes=require("./app/routes/wallet.routes");
app.use("/freelancer/wallet", walletRoutes)

const clientRoutes = require("./app/routes/client.routes");
app.use("/client", clientRoutes);

// Client Hire Routes
const clientHireRoutes = require("./app/routes/ClientHire.routes");
app.use("/client", clientHireRoutes);

const clientChatRoutes = require("./app/routes/clientChat.routes");
app.use("/client", clientChatRoutes);

const projectRoutes = require("./app/routes/project.routes");
app.use("/project", projectRoutes);

const paymentRoutes = require("./app/routes/payment.routes");
app.use("/payment", paymentRoutes);

const chatRoutes = require("./app/routes/chat.routes");
app.use("/chat", chatRoutes);

const analyticsRoutes = require("./app/routes/analytics.routes");
app.use("/analytics", analyticsRoutes);

const reviewRoutes = require("./app/routes/review.routes");
app.use("/review", reviewRoutes);

const milestoneRoutes = require("./app/routes/milestone.routes");
app.use("/milestone", milestoneRoutes);



//Example test route
app.get("/auth/login", (req, res) => {
  res.render("pages/home", { title: "Home Page", layout: "layouts/main" });
});







// 404 handler (always last)
app.use((req, res) => {
  res.status(404).render("errors/404", {
    title: "Page Not Found",
     message: "The page you are looking for does not exist.",
    layout: "layouts/main",
  });
});

// Error Middleware (centralized)
const errorHandler = require("./app/middleware/error.middleware");
app.use(errorHandler);


// Socket.io Setup (Chat)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  winston.info(`🟢 Socket connected: ${socket.id}`);

  // User joins their unique room
  socket.on("joinRoom", (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    onlineUsers.set(userId.toString(), socket.id);
    io.emit("userOnline", { userId });
    winston.info(`👥 User joined room: ${userId}`);
  });

  // Handle message events
  socket.on("chatMessage", (msg) => {
    if (!msg || !msg.room) return;
    io.to(msg.room.toString()).emit("message", msg);
    winston.info(`💬 Message sent to room ${msg.room}`);
  });

  // Typing indicators
  socket.on("typing", (data) => {
    if (!data.room) return;
    io.to(data.room.toString()).emit("showTyping", { sender: data.sender });
  });

  socket.on("stopTyping", (data) => {
    if (!data.room) return;
    io.to(data.room.toString()).emit("hideTyping", { sender: data.sender });
  });

  // Read receipt event
  socket.on("messageRead", (data) => {
    io.to(data.room.toString()).emit("readReceipt", data);
  });

  // Disconnect event
  socket.on("disconnect", (reason) => {
    for (const [userId, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(userId);
        io.emit("userOffline", { userId });
        break;
      }
    }
    winston.info(`🔴 Socket disconnected: ${socket.id} (${reason})`);
  });
});


// Server Listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  winston.info(`🚀 Server running on http://localhost:${PORT}`);
});
