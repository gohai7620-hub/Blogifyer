const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_HOST,
    port: process.env.BREVO_PORT,
    secure: false,
    auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASS
    }
});

transporter.verify((error) => {
    if (error) console.error("❌ Brevo Connection Error:", error.message);
    else console.log("✅ Brevo Email Service Ready");
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.BREVO_USER}>`,
        to: email,
        subject: 'Your Signup OTP Code',
        html: `
            <h2>Your Verification Code</h2>
            <h1 style="font-size: 48px;">${otp}</h1>
            <p>This code expires in 5 minutes.</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Sent to ${email}`);
    } catch (error) {
        console.error("❌ Brevo Send Error:", error.message);
        throw error;
    }
};

module.exports = { sendOTPEmail };
