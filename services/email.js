// services/email.js
const nodemailer = require('nodemailer');

// Create transporter with explicit Gmail SMTP settings
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

const sendOTP = async (email, otp) => {
    try {
        // Check if email credentials are configured
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.error('EMAIL_USER or EMAIL_PASSWORD not configured');
            return false;
        }

        console.log('Attempting to send OTP to:', email);
        console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASSWORD length:', process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : 0);

        const transporter = createTransporter();

        // Verify connection
        try {
            await transporter.verify();
            console.log('SMTP connection verified successfully');
        } catch (verifyError) {
            console.error('SMTP verification failed:', verifyError.message);
            console.error('Full verify error:', verifyError);
            return false;
        }

        const mailOptions = {
            from: `"Blogify" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Blogify Signup OTP Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #ddd; border-radius: 12px; background-color: #f9f9f9;">
                    <h2 style="color: #667eea; text-align: center;">Verify Your Email Address</h2>
                    <p style="font-size: 16px; text-align: center;">Use the following OTP to complete your signup:</p>
                    <h1 style="color: #667eea; letter-spacing: 12px; font-size: 48px; text-align: center; margin: 20px 0;">${otp}</h1>
                    <p style="text-align: center; color: #666;">
                        This code will expire in <strong>5 minutes</strong>.
                    </p>
                    <p style="text-align: center; color: #999; font-size: 14px;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP sent successfully to', email);
        console.log('Message ID:', info.messageId);
        return true;

    } catch (error) {
        console.error('Failed to send OTP email');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Full error:', error);
        
        if (error.code === 'EAUTH') {
            console.error('Authentication failed - Check EMAIL_USER and EMAIL_PASSWORD');
        } else if (error.code === 'ESOCKET' || error.code === 'ECONNECTION') {
            console.error('Connection failed - Check network/firewall');
        } else if (error.code === 'EENVELOPE') {
            console.error('Invalid email address');
        }
        
        return false;
    }
};

module.exports = { sendOTP };
