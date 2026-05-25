const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

router.use(restrictToLoggedInUserOnly);

router.get("/", async (req, res) => {
    try {
        const { search } = req.query;
        const filter = { createdBy: req.user._id };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ];
        }

        const userBlogs = await Blog.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.render("profile", {
            user: req.user,
            blogs: userBlogs,
            search: search || ""
        });
    } catch (error) {
        console.error("Profile Error:", error);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
