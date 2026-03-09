const express = require('express');
const router = express.Router();
const {
    initiatePayment,
    nkwaWebhook,
    checkPaymentStatus,
    getSubscriptionStatus,
    getPaymentHistory
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { checkSubscription } = require('../middleware/subscriptionCheck');

// Public webhook (no auth)
router.post('/webhook/nkwa', nkwaWebhook);

// All routes below require authentication
router.use(protect);

// Subscription routes - require authentication only (no subscription check for viewing)
router.get('/subscription', getSubscriptionStatus);
router.get('/history', getPaymentHistory);

// Payment initiation - requires authentication
router.post('/initiate', initiatePayment);

// Check payment status - requires authentication
router.get('/check/:transactionId', checkPaymentStatus);

// Optional: Add a test route to verify authentication
router.get('/test', (req, res) => {
    res.json({
        message: 'Payment routes working',
        user: req.user.email,
        role: req.user.role
    });
});

module.exports = router;