const { verifyToken } = require('../utils/tokenUtils');

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.client = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
}

function authorize(roleRequired) {
    return (req, res, next) => {
        if (!req.client || req.client.role !== roleRequired) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };