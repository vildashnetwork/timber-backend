const Subscription = require('../models/Subscription');

const checkSubscription = async (req, res, next) => {
    // Only check for super admins
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        const subscription = await Subscription.findOne({ admin: req.user._id });

        // If no subscription or expired
        if (!subscription || !subscription.isActive()) {
            return res.status(403).json({
                success: false,
                error: 'Subscription required',
                message: 'Your subscription has expired. Please make a payment to continue accessing the dashboard.',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }

        // Check grace period
        if (subscription.gracePeriodEnd && new Date() > subscription.gracePeriodEnd) {
            subscription.status = 'EXPIRED';
            await subscription.save();

            return res.status(403).json({
                success: false,
                error: 'Subscription expired',
                message: 'Your subscription has expired. Please make a payment to continue.',
                code: 'SUBSCRIPTION_EXPIRED'
            });
        }
    }

    next();
};

module.exports = { checkSubscription };