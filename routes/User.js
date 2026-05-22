// routes/User.js
const { Router } = require("express");
const User = require("../models/user");
const { sendOTP } = require("../services/email");

const router = Router();

// In-memory OTP temporary storage map
const otpStore = new Map();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// ====================== SIGNUP WITH OTP ======================
router.post("/signup", async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;

    console.log('Signup request received for:', email);

    if (!fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: "All form fields are required." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "This email address is already registered." });
        }

        // Generate clean 6 digit numeric code string
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`Generated OTP for ${email}: ${otp}`);

        // Save records inside global context tracker
        otpStore.set(email.toLowerCase(), {
            otp,
            expiry: Date.now() + 5 * 60 * 1000, // 5 minute verification window
            userData: { 
                fullName, 
                email: email.toLowerCase(), 
                password 
            }
        });

        // Trigger nodemailer sequence
        console.log('Sending OTP email...');
        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            // Clean up stored data if email fails
            otpStore.delete(email.toLowerCase());
            return res.status(500).json({ 
                success: false, 
                message: "Failed to send OTP email. Please check server logs and try again." 
            });
        }

        console.log('OTP email sent successfully');
        return res.json({ 
            success: true, 
            message: "OTP sent successfully! Please check your email." 
        });

    } catch (error) {
        console.error("Signup Route Execution Error:", error);
        return res.status(500).json({ success: false, message: "Internal server processing failure." });
    }
});

// ====================== VERIFY OTP ======================
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    console.log(`Verifying OTP for ${email}: ${otp}`);

    try {
        const stored = otpStore.get(email?.toLowerCase());

        if (!stored) {
            console.log('No OTP found for email:', email);
            return res.status(400).json({ success: false, message: "OTP session not found. Please request a new code." });
        }

        if (Date.now() > stored.expiry) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ success: false, message: "Your verification code has expired. Please request a new one." });
        }

        if (stored.otp !== otp) {
            console.log(`OTP mismatch - Expected: ${stored.otp}, Received: ${otp}`);
            return res.status(400).json({ success: false, message: "Incorrect OTP code. Please try again." });
        }

        console.log('OTP verified successfully, creating user...');

        // Create user in database
        await User.create(stored.userData);
        otpStore.delete(email.toLowerCase());

        // Generate authentication token
        const token = await User.matchPassword(email.toLowerCase(), stored.userData.password);

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        console.log('User created and authenticated successfully');
        return res.json({ success: true });

    } catch (error) {
        console.error("Verify OTP Handler Error:", error);
        return res.status(500).json({ success: false, message: "Verification processing failed." });
    }
});

// ====================== LOGOUT ROUTE ======================
router.get("/logout", (req, res) => {
    res.clearCookie("token");
    return res.redirect("/");
});

module.exports = router;
