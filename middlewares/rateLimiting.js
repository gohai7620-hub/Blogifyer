const rateLimit = require('express-rate-limit');

// Login attempt limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP request limiter
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // limit each IP to 3 requests per windowMs
    message: 'Too many OTP requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// General API limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Blog creation limiter (per user)
const blogCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // max 20 blogs per hour
    keyGenerator: (req) => req.user?._id || req.ip, // Use user ID if authenticated
    skip: (req) => !req.user,
    message: 'You are creating blogs too quickly, please slow down',
});

module.exports = {
    loginLimiter,
    otpLimiter,
    apiLimiter,
    blogCreationLimiter
};

