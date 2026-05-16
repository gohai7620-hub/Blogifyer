const JWT = require("jsonwebtoken");
const secret = process.env.JWT_SECRET || "SuperMan@123";

function creatTokenForUser(user) {
    const payload = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profileImageURL: user.profileImageURL,
        role: user.role,
    };
    const token = JWT.sign(payload, secret);
    return token;
}

function validateToken(token) {
    try {
        const payload = JWT.verify(token, secret);
        return payload;
    } catch (error) {
        return null;
    }
}

module.exports = { creatTokenForUser, validateToken };