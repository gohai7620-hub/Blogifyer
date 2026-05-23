const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: { rejectUnauthorized: false }
});

// Test connection when server starts
transporter.verify((error) => {
    if (error) {
        console.error("❌ EMAIL TRANSPORTER FAILED TO CONNECT:", error.message);
    } else {
        console.log("✅ Email Transporter Connected Successfully");
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Signup OTP - Blogify',
        html: `
            <h2>Your Verification Code</h2>
            <h1 style="font-size:48px; letter-spacing:8px;">${otp}</h1>
            <p>This code expires in 5 minutes.</p>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP SENT SUCCESSFULLY to ${email} | MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ EMAIL SENDING FAILED:");
        console.error("Code:", error.code);
        console.error("Message:", error.message);
        console.error("Full Error:", error);
        throw error;
    }
};

module.exports = { sendOTPEmail };
