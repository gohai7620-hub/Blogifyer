const { Router } = require("express");
const crypto = require("crypto");
const User = require("../models/user");

const router = Router();

// In-memory OTP storage
const otpCache = {};

// ====================== PAGES ======================
router.get("/signin", (req, res) => res.render("signin"));   // Registration Page
router.get("/signup", (req, res) => res.render("signup"));   // Login Page

// ====================== SEND OTP ======================
router.post("/send-otp", async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already registered." });
        }

        const otp = crypto.randomInt(100000, 999999).toString();

        otpCache[email] = {
            fullName,
            email,
            password,
            otp,
            expiresAt: Date.now() + 300000 // 5 minutes
        };

        console.log(`✅ OTP Generated for ${email} | OTP: ${otp}`);

        return res.json({ 
            success: true, 
            message: "OTP generated successfully!",
            otp: otp 
        });

    } catch (error) {
        console.error("🚨 Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== VERIFY OTP & CREATE ACCOUNT ======================
router.post("/signin", async (req, res) => {
    const { email, otp } = req.body;
    const sessionRecord = otpCache[email];

    if (!sessionRecord || Date.now() > sessionRecord.expiresAt) {
        return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (sessionRecord.otp !== otp) {
        return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    try {
        await User.create({
            fullName: sessionRecord.fullName,
            email: sessionRecord.email,
            password: sessionRecord.password,
            isVerified: true
        });

        delete otpCache[email];
        return res.json({ success: true, message: "Account created successfully!" });
    } catch (error) {
        console.error("🚨 Database Error:", error);
        return res.status(500).json({ success: false, message: "Error creating account." });
    }
});

// ====================== LOGIN ======================
router.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        console.error("Login Error:", error.message);
        return res.render("signup", { error: "Incorrect Email or Password" });
    }
});

// ====================== LOGOUT ======================
router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
