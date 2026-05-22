const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

// Middleware - Only logged in users can create/edit blogs
router.use(restrictToLoggedInUserOnly);

// GET - Add New Blog Form
router.get("/add-new", (req, res) => {
    res.render("addBlog", { user: req.user });
});

// POST - Create New Blog
router.post("/add-new", async (req, res) => {
    try {
        const { title, body } = req.body;
        const coverImageURL = req.body.coverImageURL || null; // If using Cloudinary later

        if (!title || !body) {
            return res.render("addBlog", { 
                user: req.user, 
                error: "Title and Body are required" 
            });
        }

        const newBlog = await Blog.create({
            title,
            body,
            coverImageURL,
            createdBy: req.user._id
        });

        res.redirect(`/blogs/${newBlog._id}`);
    } catch (error) {
        console.error("🚨 Blog Creation Error:", error);
        res.render("addBlog", { 
            user: req.user, 
            error: "Something went wrong while creating blog" 
        });
    }
});

// GET - View Single Blog
router.get("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        if (!blog) return res.status(404).send("Blog not found");

        res.render("blog", { 
            user: req.user, 
            blog 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
