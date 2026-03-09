const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token and populate company
            req.user = await User.findById(decoded.id)
                .select('-password')
                .populate({
                    path: 'company',
                    model: 'Company'
                });

            if (!req.user) {
                res.status(401);
                throw new Error('User not found');
            }

            // Log for debugging
            console.log('User authenticated:', req.user.email);
            console.log('User role:', req.user.role);
            console.log('User company:', req.user.company);

            next();
        } catch (error) {
            console.error('Auth error:', error);
            res.status(401);
            throw new Error('Not authorized');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const superAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        next();
    } else {
        res.status(403);
        throw new Error('Not authorized as super admin');
    }
};

module.exports = { protect, superAdmin };