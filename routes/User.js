const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { sendOTPEmail } = require('../services/email');
const bcrypt = require('bcryptjs');

// In-memory OTP storage (email -> {otp, expires})
const otpStore = new Map();

// Send OTP
router.post('/send-otp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

        // Store OTP in memory
        otpStore.set(email, { otp, expires });

        // Send Email
        await sendOTPEmail(email, otp);

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
});

// Signup Route
router.post('/signup', async (req, res) => {
    const { FullName, email, password, otp } = req.body;

    try {
        // Check OTP from memory
        const stored = otpStore.get(email);

        if (!stored || stored.otp !== otp || stored.expires < Date.now()) {
            return res.status(400).send("Invalid or expired OTP");
        }

        // Remove used OTP
        otpStore.delete(email);

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send("User already exists with this email");
        }

        // Create new user
        const newUser = new User({ FullName, email, password });
        await newUser.save();

        res.send(`
            <h2>✅ Account Created Successfully!</h2>
            <p>Welcome, <strong>${fullName}</strong></p>
            <br>
            <a href="/login">Go to Login →</a>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
