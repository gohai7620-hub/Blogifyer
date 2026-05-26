const Notification = require("../models/Notification");
const { sendEmail } = require("./email");

class NotificationService {
    // Create in-app notification
    static async createNotification(recipientId, type, data) {
        try {
            const notification = await Notification.create({
                recipient: recipientId,
                type,
                title: data.title,
                message: data.message,
                blog: data.blog || null,
                actor: data.actor || null
            });
            return notification;
        } catch (error) {
            console.error("❌ Error creating notification:", error);
        }
    }

    // Send Email Notification
    static async sendEmailNotification(user, type, data) {
        try {
            if (!user?.notificationSettings) return;

            const settingsMap = {
                comment: "emailOnComment",
                reply: "emailOnComment",
                like: "emailOnLike",
                follow: "emailOnNewFollower"
            };

            const settingKey = settingsMap[type];
            if (settingKey && !user.notificationSettings[settingKey]) {
                return; // User disabled this type
            }

            const templates = {
                comment: {
                    subject: `New comment on "${data.blogTitle || 'your blog'}"`,
                    body: `<p><strong>${data.actorName}</strong> commented on your blog:</p>
                           <p>"${data.comment ? data.comment.substring(0, 150) : ''}..."</p>`
                },
                like: {
                    subject: `Someone liked your blog`,
                    body: `<p><strong>${data.actorName}</strong> liked your blog "${data.blogTitle || ''}"</p>`
                },
                follow: {
                    subject: `New Follower`,
                    body: `<p><strong>${data.actorName}</strong> started following you.</p>`
                }
            };

            const template = templates[type] || templates.comment;

            await sendEmail(user.email, template.subject, template.body);
        } catch (error) {
            console.error("❌ Error sending email notification:", error);
        }
    }

    // Get notifications
    static async getUserNotifications(userId, limit = 10, page = 1) {
        try {
            const skip = (page - 1) * limit;
            
            const notifications = await Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate("actor", "fullName profileImageURL")
                .populate("blog", "title");

            const total = await Notification.countDocuments({ recipient: userId });

            return { notifications, total, pages: Math.ceil(total / limit) };
        } catch (error) {
            console.error("❌ Error getting notifications:", error);
            return { notifications: [], total: 0, pages: 0 };
        }
    }

    static async markAsRead(notificationId) {
        await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    }

    static async markAllAsRead(userId) {
        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );
    }

    static async getUnreadCount(userId) {
        return await Notification.countDocuments({ 
            recipient: userId, 
            isRead: false 
        });
    }
}

module.exports = NotificationService;
