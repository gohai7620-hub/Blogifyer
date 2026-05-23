const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendOTPEmail } = require('../services/email');

const otpStore = new Map();

// SIGNIN (Untouched)
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 7*24*60*60*1000 });
        res.status(200).json({ success: true, message: "Login successful" });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message || "Invalid credentials" });
    }
});

// LOGOUT (Untouched)
router.get('/logout', (req, res) => {
    res.clearCookie("token");
    res.redirect('/');
});

// GET SIGNUP PAGE
router.get('/signup', (req, res) => {
    res.render('signup');
});

// SEND OTP
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    try {
        const normalizedEmail = email.toLowerCase().trim();
        if (await User.findOne({ email: normalizedEmail })) {
            return res.status(409).json({ success: false, message: "Email already registered. Please login instead." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(normalizedEmail, { otp, expires: Date.now() + 5*60*1000 });

        await sendOTPEmail(email, otp);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error("Send OTP Error:", error);
        res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' });
    }
});

// SIGNUP
router.post('/signup', async (req, res) => {
    const { FullName, email, password, otp } = req.body;
    if (!FullName || !email || !password || !otp) {
        return res.status(400).json({ success: false, message: "All fields are required" });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const stored = otpStore.get(normalizedEmail);

        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        otpStore.delete(normalizedEmail);

        if (await User.findOne({ email: normalizedEmail })) {
            return res.status(409).json({ success: false, message: "Email already registered." });
        }

        const user = await User.create({ fullName: FullName, email: normalizedEmail, password });

        const token = await User.matchPassword(normalizedEmail, password);
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "strict", maxAge: 7*24*60*60*1000 });

        res.status(201).json({ success: true, message: "Account created successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Signup failed" });
    }
});

module.exports = router;
