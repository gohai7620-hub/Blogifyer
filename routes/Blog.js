const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");
const cloudinaryUpload = require("../middlewares/CloudinaryUploads");

// Protect all routes
router.use(restrictToLoggedInUserOnly);

// GET - Add New Blog Form
router.get("/add-new", (req, res) => {
    res.render("addBlog", { user: req.user, error: null });
});

// POST - Create Blog
router.post("/add-new", cloudinaryUpload.single("coverImage"), async (req, res) => {
    try {
        const { title, body } = req.body;

        if (!title || !body) {
            return res.render("addBlog", { 
                user: req.user, 
                error: "Title and Body are required!" 
            });
        }

        const newBlog = await Blog.create({
            title,
            body,
            coverImageURL: req.file ? req.file.path : null,
            createdBy: req.user._id
        });

        res.redirect(`/blogs/${newBlog._id}`);
    } catch (error) {
        console.error("Blog Creation Error:", error);
        res.render("addBlog", { 
            user: req.user, 
            error: "Something went wrong while creating the blog." 
        });
    }
});

// GET Single Blog
router.get("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        if (!blog) return res.status(404).send("Blog not found");

        res.render("view", { user: req.user, blog });   // Changed from "blog" to "view" as per your code
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// DELETE Blog - Only owner can delete
router.delete("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        // Check if user is the owner
        if (String(blog.createdBy) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "You can only delete your own blogs" });
        }

        await Blog.findByIdAndDelete(req.params.id);

        res.json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        console.error("Delete Blog Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete blog" });
    }
});

module.exports = router;
