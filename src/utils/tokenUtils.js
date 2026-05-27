require('dotenv').config();

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function generateToken(clientId, role) {
    return jwt.sign({ clientId, role }, SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
    return jwt.verify(token, SECRET);
}

if (!SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

module.exports = { generateToken, verifyToken };