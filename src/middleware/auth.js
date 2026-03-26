const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';

/**
 * authenticate – verifies Bearer token, attaches req.user
 */
const authenticate = async (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const user = await User.findById(payload.userId).select('-password_hash -sessions');
        if (!user || user.status === 'DELETED' || user.status === 'SUSPENDED') {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * authorize – role-based access control
 * Usage: router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error: `Access denied. Required roles: ${roles.join(', ')}` });
    }
    next();
};

module.exports = { authenticate, authorize };
