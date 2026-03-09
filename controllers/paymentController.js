const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Nkwa payment client
const nkwaClient = axios.create({
    baseURL: 'https://api.pay.mynkwa.com',
    timeout: 30000,
    headers: {
        'X-API-KEY': process.env.NKWA_API_KEY,
        'Content-Type': 'application/json'
    }
});

// @desc    Initialize payment with Nkwa
// @route   POST /api/payments/initiate
// @access  Private (Super Admin only)
const initiatePayment = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const adminId = req.user._id;
    const amount = 50; // Fixed 50 FCFA for weekly subscription

    // Validate phone number
    if (!phoneNumber) {
        res.status(400);
        throw new Error('Phone number is required');
    }

    // Clean phone number
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    if (!cleanPhone.startsWith("237")) {
        cleanPhone = "237" + cleanPhone;
    }

    // Get or create subscription
    let subscription = await Subscription.findOne({ admin: adminId });

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
    }

    // Create payment record
    const externalRef = uuidv4();
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

    try {
        // Initiate payment with Nkwa
        const response = await nkwaClient.post("/collect", {
            amount: Number(amount),
            phoneNumber: cleanPhone,
            externalRef,
            description: "TimberTrade Super Admin Weekly Subscription"
        });

        // Update payment with transaction ID
        payment.transactionId = response.data.id;
        await payment.save();

        res.status(202).json({
            success: true,
            message: "Payment push sent! Please check your phone to complete payment.",
            transactionId: response.data.id,
            paymentId: payment._id,
            status: response.data.status
        });

    } catch (err) {
        console.error("Nkwa Payment Error:", err.response?.data || err.message);

        payment.status = 'FAILED';
        payment.metadata.error = err.response?.data || err.message;
        await payment.save();

        res.status(err.response?.status || 500).json({
            success: false,
            error: err.response?.data?.message || "Payment provider connection failed"
        });
    }
});

// @desc    Nkwa webhook handler
// @route   POST /api/payments/webhook/nkwa
// @access  Public
const nkwaWebhook = asyncHandler(async (req, res) => {
    const { id, status, amount, externalRef } = req.body;

    console.log(`🔔 Nkwa webhook update for ${id}: ${status}`);

    // Find payment by externalRef
    const payment = await Payment.findOne({ 'metadata.externalRef': externalRef });

    if (!payment) {
        console.log(`Payment not found for externalRef: ${externalRef}`);
        return res.status(200).send("OK"); // Always return 200
    }

    // Update payment status
    payment.status = status === 'SUCCESSFUL' ? 'SUCCESS' : 'FAILED';
    payment.providerReference = id;
    payment.paymentDate = new Date();
    await payment.save();

    // If payment successful, update subscription
    if (status === 'SUCCESSFUL') {
        const subscription = await Subscription.findById(payment.subscription);

        if (subscription) {
            subscription.renew(id, 'MOBILE_MONEY');
            await subscription.save();

            console.log(`💰 Subscription renewed for admin ${payment.admin}`);

            // Send receipt email (implement this)
            // await sendPaymentReceipt(payment, subscription);
        }
    }

    // Always return 200 to stop retries
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

        res.json({
            success: true,
            data: response.data,
            payment
        });

    } catch (err) {
        res.status(404).json({
            success: false,
            error: "Transaction not found"
        });
    }
});

// @desc    Get subscription status
// @route   GET /api/payments/subscription
// @access  Private (Super Admin only)
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const adminId = req.user._id;

    let subscription = await Subscription.findOne({ admin: adminId })
        .populate('admin', 'name email');

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
    }

    // Check if expired and update status
    if (subscription.status === 'ACTIVE' && new Date() > subscription.endDate) {
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
// @route   GET /api/payments/history
// @access  Private (Super Admin only)
const getPaymentHistory = asyncHandler(async (req, res) => {
    const adminId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ admin: adminId })
        .populate('subscription')
        .sort('-createdAt')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Payment.countDocuments({ admin: adminId });

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