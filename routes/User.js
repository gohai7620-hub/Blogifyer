const { Router } = require("express");
const passport = require("passport");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");

const router = Router();

// Google Strategy (Same as before)
const GoogleStrategy = require("passport-google-oauth20").Strategy;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use("google", new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await User.findOrCreateGoogleUser(profile);
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Normal Signup - Now handles existing user
router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            if (existingUser.googleId) {
                return res.render("signup", { error: "This email is linked with Google. Please sign in with Google." });
            }
            return res.render("signup", { error: "Email already registered. Please login." });
        }

        await User.create({ fullName, email, password });
        res.redirect("/user/signin");
    } catch (error) {
        res.render("signup", { error: "Something went wrong" });
    }
});

// Google Routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/user/signin", session: false }),
    (req, res) => {
        if (!req.user) return res.redirect("/user/signin");

        const token = creatTokenForUser(req.user);

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.redirect("/?auth=success");
    }
);

module.exports = router;
