const { Router } = require("express");
const crypto = require("crypto");
const User = require("../models/user");
const { sendOTP } = require("../services/email");

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

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
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

        console.log(`\n🔐 OTP Generated for ${email}`);
        console.log(`📋 OTP Value: ${otp}`);
        console.log(`⏰ Expires at: ${new Date(Date.now() + 300000).toISOString()}`);

        // Send OTP via Email Service
        console.log(`\n📧 Initiating email send process...`);
        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            console.error(`❌ Failed to send email to ${email}`);
            delete otpCache[email];
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send OTP email. Please check your email address and try again." 
            });
        }

        console.log(`✅ Email process completed successfully for ${email}\n`);

        return res.json({ 
            success: true, 
            message: "OTP sent successfully! Check your email inbox.",
            otp: process.env.NODE_ENV === "development" ? otp : undefined
        });

    } catch (error) {
        console.error("🚨 Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Server error while sending OTP" });
    }
});

// ====================== VERIFY OTP & CREATE ACCOUNT ======================
router.post("/signin", async (req, res) => {
    const { email, otp } = req.body;
    const sessionRecord = otpCache[email];

    console.log(`\n🔍 Verifying OTP for: ${email}`);

    if (!sessionRecord) {
        console.log(`❌ No session record found for ${email}`);
        return res.status(400).json({ success: false, message: "OTP expired or not found. Please request a new one." });
    }

    if (Date.now() > sessionRecord.expiresAt) {
        console.log(`❌ OTP expired for ${email}`);
        delete otpCache[email];
        return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (sessionRecord.otp !== otp) {
        console.log(`❌ Incorrect OTP for ${email}. Expected: ${sessionRecord.otp}, Got: ${otp}`);
        return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    try {
        console.log(`✅ OTP verified for ${email}, creating account...`);
        
        await User.create({
            fullName: sessionRecord.fullName,
            email: sessionRecord.email,
            password: sessionRecord.password,
            isVerified: true
        });

        delete otpCache[email];
        console.log(`✅ Account created successfully for ${email}\n`);
        
        return res.json({ success: true, message: "Account created successfully! Redirecting to login..." });
    } catch (error) {
        console.error("🚨 Database Error:", error);
        return res.status(500).json({ success: false, message: "Error creating account." });
    }
});

// ====================== LOGIN ======================
router.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
        console.log(`🔐 Login attempt for: ${email}`);
        const token = await User.matchPassword(email, password);
        
        console.log(`✅ Login successful for ${email}`);
        return res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }).json({ 
            success: true, 
            message: "Login successful! Redirecting...",
            redirect: "/" 
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        return res.status(401).json({ 
            success: false, 
            message: "Incorrect Email or Password" 
        });
    }
});

// ====================== LOGOUT ======================
router.get("/logout", (req, res) => {
    console.log("🚪 User logged out");
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
