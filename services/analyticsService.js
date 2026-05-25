const BlogAnalytics = require("../models/BlogAnalytics");
const Blog = require("../models/Blog");

class AnalyticsService {
    // Track blog view
    static async trackView(blogId, userId, source = "direct") {
        try {
            // Update blog view count
            await Blog.findByIdAndUpdate(
                blogId,
                { $inc: { viewCount: 1 } }
            );

            // Update analytics
            let analytics = await BlogAnalytics.findOne({ blog: blogId });

            if (!analytics) {
                const blog = await Blog.findById(blogId);
                analytics = await BlogAnalytics.create({
                    blog: blogId,
                    author: blog.createdBy
                });
            }

            analytics.totalViews += 1;

            // Track source
            if (analytics.viewSource[source]) {
                analytics.viewSource[source] += 1;
            }

            // Track daily views
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dailyViewIndex = analytics.dailyViews.findIndex(
                dv => new Date(dv.date).getTime() === today.getTime()
            );

            if (dailyViewIndex >= 0) {
                analytics.dailyViews[dailyViewIndex].count += 1;
            } else {
                analytics.dailyViews.push({ date: today, count: 1 });
            }

            await analytics.save();
        } catch (error) {
            console.error("❌ Error tracking view:", error);
        }
    }

    // Get blog analytics
    static async getBlogAnalytics(blogId) {
        try {
            const analytics = await BlogAnalytics.findOne({ blog: blogId })
                .populate("blog", "title viewCount")
                .populate("author", "fullName");

            return analytics || null;
        } catch (error) {
            console.error("❌ Error getting analytics:", error);
            return null;
        }
    }

    // Get author analytics
    static async getAuthorAnalytics(userId) {
        try {
            const analytics = await BlogAnalytics.find({ author: userId })
                .populate("blog", "title viewCount");

            const totalStats = {
                totalViews: 0,
                totalLikes: 0,
                totalComments: 0,
                totalBlogs: analytics.length,
                topBlog: null,
                maxViews: 0
            };

            analytics.forEach(stat => {
                totalStats.totalViews += stat.totalViews;
                totalStats.totalLikes += stat.totalLikes;
                totalStats.totalComments += stat.totalComments;

                if (stat.totalViews > totalStats.maxViews) {
                    totalStats.maxViews = stat.totalViews;
                    totalStats.topBlog = stat.blog;
                }
            });

            return totalStats;
        } catch (error) {
            console.error("❌ Error getting author analytics:", error);
            return null;
        }
    }

    // Get trending blogs
    static async getTrendingBlogs(limit = 5) {
        try {
            const trendingBlogs = await BlogAnalytics.find()
                .sort({ totalViews: -1 })
                .limit(limit)
                .populate("blog", "title slug coverImageURL createdAt")
                .populate("author", "fullName profileImageURL");

            return trendingBlogs;
        } catch (error) {
            console.error("❌ Error getting trending blogs:", error);
            return [];
        }
    }

    // Get most liked blogs
    static async getMostLikedBlogs(limit = 5) {
        try {
            const blogs = await BlogAnalytics.find()
                .sort({ totalLikes: -1 })
                .limit(limit)
                .populate("blog", "title slug coverImageURL")
                .populate("author", "fullName profileImageURL");

            return blogs;
        } catch (error) {
            console.error("❌ Error getting most liked blogs:", error);
            return [];
        }
    }
}

module.exports = AnalyticsService;

