const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Nkwa payment client - FIXED: Use API_KEY not NKWA_API_KEY
const nkwaClient = axios.create({
    baseURL: 'https://api.pay.mynkwa.com',
    timeout: 30000,
    headers: {
        'X-API-KEY': process.env.API_KEY, // Changed to match working code
        'Content-Type': 'application/json'
    }
});

// @desc    Initialize payment with Nkwa
// @route   POST /api/payments/initiate
// @access  Private (Super Admin only)
// @desc    Initialize payment with Nkwa
// @route   POST /api/payments/initiate
// @access  Private (Super Admin only)
const initiatePayment = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const adminId = req.user._id;
    const amount = 50;

    console.log('========== PAYMENT DEBUG ==========');
    console.log('1. Request body:', req.body);
    console.log('2. User:', { id: adminId, email: req.user.email, role: req.user.role });
    console.log('3. API Key present:', !!process.env.API_KEY);
    console.log('4. API Key first 5 chars:', process.env.API_KEY ? process.env.API_KEY.substring(0, 5) : 'MISSING');

    // Validate phone number
    if (!phoneNumber) {
        console.log('❌ Phone number missing');
        res.status(400);
        throw new Error('Phone number is required');
    }

    // Clean phone number
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    console.log('5. Raw phone input:', phoneNumber);
    console.log('6. Cleaned phone:', cleanPhone);

    if (!cleanPhone.startsWith("237")) {
        cleanPhone = "237" + cleanPhone;
    }
    console.log('7. Final phone with country code:', cleanPhone);

    // Validate phone length
    if (cleanPhone.length !== 12) {
        console.log('❌ Invalid phone length:', cleanPhone.length);
        res.status(400);
        throw new Error(`Invalid phone number length. Expected 12 digits (237 + 9 digits), got ${cleanPhone.length}`);
    }

    // Check API key
    if (!process.env.API_KEY) {
        console.log('❌ API_KEY missing from environment');
        res.status(500);
        throw new Error('Payment provider not configured');
    }

    // Get or create subscription
    let subscription = await Subscription.findOne({ admin: adminId });
    console.log('8. Existing subscription:', subscription ? subscription._id : 'None');

    if (!subscription) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        subscription = await Subscription.create({
            admin: adminId,
            status: 'EXPIRED',
            amount: 50,
            currency: 'XAF',
            endDate,
            nextPaymentDate: endDate
        });
        console.log('9. Created new subscription:', subscription._id);
    }

    // Create payment record
    const externalRef = uuidv4();
    console.log('10. External reference:', externalRef);

    const payment = await Payment.create({
        admin: adminId,
        subscription: subscription._id,
        amount,
        currency: 'XAF',
        status: 'PENDING',
        paymentMethod: 'MOBILE_MONEY',
        provider: 'NKWA',
        metadata: {
            externalRef,
            phoneNumber: cleanPhone,
            userEmail: req.user.email,
            userName: req.user.name
        }
    });
    console.log('11. Created payment record:', payment._id);

    try {
        // Prepare Nkwa request
        const nkwaRequest = {
            amount: Number(amount),
            phoneNumber: cleanPhone,
            externalRef: externalRef,
            description: "TimberTrade Super Admin Weekly Subscription"
        };
        console.log('12. Nkwa request payload:', nkwaRequest);
        console.log('13. Nkwa headers:', {
            'X-API-KEY': '***' + (process.env.API_KEY ? process.env.API_KEY.slice(-4) : 'MISSING'),
            'Content-Type': 'application/json'
        });

        // Initiate payment with Nkwa
        const response = await nkwaClient.post("/collect", nkwaRequest);
        console.log('14. Nkwa response status:', response.status);
        console.log('15. Nkwa response data:', response.data);

        // Update payment with transaction ID
        payment.transactionId = response.data.id;
        await payment.save();
        console.log('16. Payment updated with transaction ID:', response.data.id);

        res.status(202).json({
            success: true,
            message: "Push sent! Please check your phone.",
            transactionId: response.data.id,
            paymentId: payment._id,
            status: response.data.status,
            data: response.data
        });

    } catch (err) {
        console.error('========== NKWA ERROR ==========');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error code:', err.code);

        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', err.response.data);
            console.error('Response headers:', err.response.headers);
        } else if (err.request) {
            console.error('No response received. Request details:', {
                method: err.request.method,
                path: err.request.path,
                host: err.request.host
            });
        }

        payment.status = 'FAILED';
        payment.metadata.error = {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status
        };
        await payment.save();
        console.log('17. Payment marked as failed');

        const statusCode = err.response?.status || 500;
        const errorMessage = err.response?.data?.message ||
            err.response?.data?.error ||
            "Payment provider connection failed";

        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
});

// @desc    Nkwa webhook handler
// @route   POST /api/payments/webhook/nkwa
// @access  Public
const nkwaWebhook = asyncHandler(async (req, res) => {
    const { id, status, amount, externalRef } = req.body;

    console.log(`🔔 Webhook update for ${id}: ${status}`);

    // Find payment by externalRef
    const payment = await Payment.findOne({ 'metadata.externalRef': externalRef });

    if (!payment) {
        console.log(`❌ Payment not found for externalRef: ${externalRef}`);
        return res.status(200).send("OK"); // Always return 200
    }

    // Update payment status
    payment.status = status === 'SUCCESSFUL' ? 'SUCCESS' : 'FAILED';
    payment.providerReference = id;
    payment.paymentDate = new Date();
    await payment.save();

    // If payment successful, update subscription
    if (status === 'SUCCESSFUL') {
        console.log(`💰 Verified payment of ${amount} XAF received!`);

        const subscription = await Subscription.findById(payment.subscription);

        if (subscription) {
            subscription.renew(id, 'MOBILE_MONEY');
            await subscription.save();
            console.log(`✅ Subscription renewed for admin ${payment.admin}`);
        }
    } else if (status === 'FAILED') {
        console.log(`❌ Payment failed for ref: ${externalRef}`);
    }

    // Always return 200 so Nkwa doesn't keep retrying
    res.status(200).send("OK");
});

// @desc    Check payment status manually
// @route   GET /api/payments/check/:transactionId
// @access  Private
const checkPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;

    try {
        const response = await nkwaClient.get(`/payments/${transactionId}`);

        // Update payment in database
        const payment = await Payment.findOne({ transactionId });
        if (payment) {
            const newStatus = response.data.status === 'SUCCESSFUL' ? 'SUCCESS' :
                response.data.status === 'FAILED' ? 'FAILED' : 'PENDING';

            if (payment.status !== newStatus) {
                payment.status = newStatus;
                if (newStatus === 'SUCCESS') {
                    payment.paymentDate = new Date();

                    // Update subscription
                    const subscription = await Subscription.findById(payment.subscription);
                    if (subscription) {
                        subscription.renew(transactionId, 'MOBILE_MONEY');
                        await subscription.save();
                    }
                }
                await payment.save();
            }
        }

        // Return in same format as working code
        res.status(200).json({
            data: response.data,
            status: response.data.status
        });

    } catch (err) {
        res.status(404).json({
            error: "Transaction not found"
        });
    }
});

// @desc    Get subscription status
// @route   GET /api/payments/subscription
// @access  Private (Super Admin only)
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    console.log('📋 getSubscriptionStatus called');
    console.log('User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');

    const adminId = req.user._id;

    let subscription = await Subscription.findOne({ admin: adminId })
        .populate('admin', 'name email');

    console.log('Subscription found:', subscription ? 'Yes' : 'No');

    if (!subscription) {
        console.log('Creating new subscription for admin:', adminId);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        subscription = await Subscription.create({
            admin: adminId,
            status: 'EXPIRED',
            amount: 50,
            currency: 'XAF',
            endDate,
            nextPaymentDate: endDate
        });
    }

    // Check if expired and update status
    if (subscription.status === 'ACTIVE' && new Date() > subscription.endDate) {
        console.log('Subscription expired, updating status');
        subscription.expire();
        await subscription.save();
    }

    // Get recent payments
    const recentPayments = await Payment.find({
        admin: adminId,
        subscription: subscription._id
    })
        .sort('-createdAt')
        .limit(5);

    console.log(`Found ${recentPayments.length} recent payments`);

    res.json({
        success: true,
        subscription: {
            _id: subscription._id,
            status: subscription.status,
            amount: subscription.amount,
            currency: subscription.currency,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            nextPaymentDate: subscription.nextPaymentDate,
            isActive: subscription.isActive(),
            gracePeriodEnd: subscription.gracePeriodEnd,
            autoRenew: subscription.autoRenew
        },
        recentPayments: recentPayments.map(p => ({
            id: p._id,
            amount: p.amount,
            status: p.status,
            paymentMethod: p.paymentMethod,
            date: p.paymentDate || p.createdAt,
            transactionId: p.transactionId
        }))
    });
});

// @desc    Get payment history
const getPaymentHistory = asyncHandler(async (req, res) => {
    console.log('📋 getPaymentHistory called');
    console.log('User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');

    const adminId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ admin: adminId })
        .populate('subscription')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ admin: adminId });

    console.log(`Found ${payments.length} payments out of ${total} total`);

    res.json({
        success: true,
        payments: payments.map(p => ({
            id: p._id,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
            paymentMethod: p.paymentMethod,
            provider: p.provider,
            transactionId: p.transactionId,
            date: p.paymentDate || p.createdAt
        })),
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

module.exports = {
    initiatePayment,
    nkwaWebhook,
    checkPaymentStatus,
    getSubscriptionStatus,
    getPaymentHistory
};