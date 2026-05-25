const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const UserRoute = require("./routes/User");
const GoogleAuthRoute = require("./routes/GoogleAuthentication");
const BlogRoute = require("./routes/Blog");
const AdminRoute = require("./routes/Admin");
const ProfileRoute = require("./routes/Profile");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

require("dotenv").config();

console.log("🔧 ENV Check - EMAIL_USER:", !!process.env.EMAIL_USER);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log("✅ MongoDB Connected"))
        .catch(err => console.error("❌ MongoDB Error:", err.message));
}

// Middleware
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));

// ====================== HOME ROUTE WITH QUERY PARAMS ======================
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const { search, page = 1, limit = 9, sort = "newest" } = req.query;

        const filter = {};
        let sortOption = { createdAt: -1 };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ];
        }

        if (sort === "oldest") sortOption = { createdAt: 1 };
        else if (sort === "title") sortOption = { title: 1 };

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const allBlogs = await Blog.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limitNum)
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        const totalBlogs = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(totalBlogs / limitNum);

        res.render("home", { 
            user: req.user || null,
            blogs: allBlogs || [],
            currentPage: pageNum,
            totalPages,
            totalBlogs,
            search: search || "",
            sort: sort,
            limit: limitNum
        });
    } catch (error) {
        console.error("Home Route Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Routes
app.use("/admin", AdminRoute);
app.use("/user/profile", ProfileRoute);
app.use("/user", UserRoute);
app.use("/user", GoogleAuthRoute);
app.use("/blogs", BlogRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
