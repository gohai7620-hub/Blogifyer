const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const UserRoute = require("./routes/User");
const GoogleAuthRoute = require("./routes/GoogleAuthentication"); // New separate file
const BlogRoute = require("./routes/Blog");
const AdminRoute = require("./routes/Admin");
const ProfileRoute = require("./routes/Profile");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

// Load Environment Variables
if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.error("❌ MongoDB Error:", err.message));
}

// Middleware Setup
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));

// ====================== HOME ROUTE ======================
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const allBlogs = await Blog.find({})
            .sort({ createdAt: -1 })
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        res.render("home", { 
            user: req.user || null,
            blogs: allBlogs || [] 
        });
    } catch (error) {
        console.error("Home Route Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// ====================== ROUTES ======================
app.use("/admin", AdminRoute);
app.use("/user/profile", ProfileRoute);
app.use("/user", UserRoute);           // Normal signup/signin
app.use("/user", GoogleAuthRoute);     // Google OAuth routes
app.use("/blogs", BlogRoute);

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
