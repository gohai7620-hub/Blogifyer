const { Router } = require("express");
const User = require("../models/user");
const { sendOTP, sendPasswordResetLink } = require("../services/email");

const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNIN WITH OTP ======================
router.post("/signin/send-otp", async (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ email });

        // If user already exists and verified → Check password
        if (existingUser && existingUser.isVerified) {
            try {
                await User.matchPassword(email, password);
                return res.json({ 
                    success: true, 
                    alreadyLoggedIn: true, 
                    message: "Login successful" 
                });
            } catch (err) {
                return res.status(400).json({ success: false, message: "Incorrect Password" });
            }
        }

        // New User → Send OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await User.findOneAndUpdate(
            { email },
            {
                fullName,
                email,
                password,
                otp,
                otpExpiry: Date.now() + 10 * 60 * 1000,
                isVerified: false
            },
            { upsert: true, new: true }
        );

        const sent = await sendOTP(email, otp);
        if (!sent) return res.status(500).json({ success: false, message: "Failed to send OTP" });

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== VERIFY OTP & CREATE/LOGIN ======================
router.post("/signin/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !user.otp || Date.now() > user.otpExpiry || user.otp !== otp) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Generate JWT Token
        const { creatTokenForUser } = require("../services/authentication");
        const token = creatTokenForUser(user);

        res.json({ 
            success: true, 
            message: "Login successful", 
            token 
        });
    } catch (error) {
        console.error("Verify OTP Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== FORGOT PASSWORD ======================
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "No account found with this email" });
        }

        const resetToken = user.generateResetToken();
        await user.save();

        const sent = await sendPasswordResetLink(email, resetToken);
        if (sent) {
            res.json({ success: true, message: "Reset link sent! Valid for 2 minutes." });
        } else {
            res.status(500).json({ success: false, message: "Failed to send reset email" });
        }
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== RESET PASSWORD ======================
router.get("/reset-password/:token", async (req, res) => {
    try {
        const user = await User.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.render("reset-password", { 
                error: "Invalid or expired reset link. Please request a new one." 
            });
        }

        res.render("reset-password", { 
            token: req.params.token, 
            email: user.email 
        });
    } catch (error) {
        res.render("reset-password", { error: "Something went wrong" });
    }
});

router.post("/reset-password/:token", async (req, res) => {
    const { password, confirmPassword } = req.body;
    const { token } = req.params;

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    try {
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
        }

        user.password = password;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        res.json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
