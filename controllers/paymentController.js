// const asyncHandler = require('express-async-handler');
// const Subscription = require('../models/Subscription');
// const Payment = require('../models/Payment');
// const axios = require('axios');
// const { v4: uuidv4 } = require('uuid');

// // ============ NKWA PAYMENT CLIENT (for initiating payments) ============
// const nkwaClient = axios.create({
//     baseURL: 'https://api.pay.mynkwa.com',
//     timeout: 30000,
//     headers: {
//         'X-API-KEY': process.env.API_KEY,
//         'Content-Type': 'application/json'
//     }
// });

// // ============ THIRD-PARTY STATUS CHECK CLIENT (your external API) ============
// const statusCheckClient = axios.create({
//     baseURL: 'https://pay.vizit.homes/api/v1',
//     timeout: 30000,
//     headers: {
//         'Content-Type': 'application/json'
//     }
// });

// // @desc    Initialize payment with Nkwa
// // @route   POST /api/payments/initiate
// // @access  Private (Super Admin only)
// const initiatePayment = asyncHandler(async (req, res) => {
//     const { phoneNumber, weeks = 1 } = req.body;
//     const adminId = req.user._id;
//     const amount = 50 * weeks; // Calculate total based on weeks

//     console.log('========== NKWA PAYMENT INITIATION ==========');
//     console.log('1. Request body:', req.body);
//     console.log('2. User:', { id: adminId, email: req.user.email, role: req.user.role });
//     console.log('3. Weeks selected:', weeks);
//     console.log('4. Total amount:', amount);

//     // Validate phone number
//     if (!phoneNumber) {
//         console.log('❌ Phone number missing');
//         res.status(400);
//         throw new Error('Phone number is required');
//     }

//     // Clean phone number (Nkwa format)
//     let cleanPhone = phoneNumber.replace(/\D/g, "");
//     console.log('5. Raw phone input:', phoneNumber);
//     console.log('6. Cleaned phone:', cleanPhone);

//     if (!cleanPhone.startsWith("237")) {
//         cleanPhone = "237" + cleanPhone;
//     }
//     console.log('7. Final phone with country code:', cleanPhone);

//     // Validate phone length for Cameroon
//     if (cleanPhone.length !== 12) {
//         console.log('❌ Invalid phone length:', cleanPhone.length);
//         res.status(400);
//         throw new Error(`Invalid phone number length. Expected 12 digits (237 + 9 digits), got ${cleanPhone.length}`);
//     }

//     // Check Nkwa API key
//     if (!process.env.API_KEY) {
//         console.log('❌ NKWA_API_KEY missing from environment');
//         res.status(500);
//         throw new Error('Payment provider not configured');
//     }

//     // Get or create subscription
//     let subscription = await Subscription.findOne({ admin: adminId });
//     console.log('8. Existing subscription:', subscription ? subscription._id : 'None');

//     if (!subscription) {
//         const endDate = new Date();
//         endDate.setDate(endDate.getDate() + (7 * weeks));

//         subscription = await Subscription.create({
//             admin: adminId,
//             status: 'EXPIRED',
//             amount: 50,
//             currency: 'XAF',
//             endDate,
//             nextPaymentDate: endDate
//         });
//         console.log('9. Created new subscription:', subscription._id);
//     }

//     // Create payment record
//     const externalRef = uuidv4();
//     console.log('10. External reference:', externalRef);

//     const payment = await Payment.create({
//         admin: adminId,
//         subscription: subscription._id,
//         amount,
//         currency: 'XAF',
//         status: 'PENDING',
//         paymentMethod: 'MOBILE_MONEY',
//         provider: 'NKWA',
//         weeks: weeks,
//         metadata: {
//             externalRef,
//             phoneNumber: cleanPhone,
//             weeks,
//             userEmail: req.user.email,
//             userName: req.user.name
//         }
//     });
//     console.log('11. Created payment record:', payment._id);

//     try {
//         // Initiate payment with Nkwa
//         console.log('12. Calling Nkwa API...');
//         const nkwaRequest = {
//             amount: Number(amount),
//             phoneNumber: cleanPhone,
//             externalRef: externalRef,
//             description: `TimberTrade Super Admin Subscription - ${weeks} week(s)`
//         };
//         console.log('13. Nkwa request payload:', nkwaRequest);

//         const response = await nkwaClient.post("/collect", nkwaRequest);
//         console.log('14. Nkwa response status:', response.status);
//         console.log('15. Nkwa response data:', response.data);

//         // Update payment with Nkwa transaction ID
//         payment.transactionId = response.data.id;
//         await payment.save();
//         console.log('16. Payment updated with Nkwa transaction ID:', response.data.id);

//         res.status(202).json({
//             success: true,
//             message: "Push sent! Please check your phone.",
//             transactionId: response.data.id,
//             paymentId: payment._id,
//             status: 'PENDING',
//             weeks: weeks,
//             amount: amount,
//             provider: 'NKWA'
//         });

//     } catch (err) {
//         console.error('========== NKWA PAYMENT ERROR ==========');
//         console.error('Error name:', err.name);
//         console.error('Error message:', err.message);

//         if (err.response) {
//             console.error('Response status:', err.response.status);
//             console.error('Response data:', err.response.data);
//         }

//         payment.status = 'FAILED';
//         payment.metadata.error = {
//             message: err.message,
//             response: err.response?.data,
//             status: err.response?.status,
//             provider: 'NKWA'
//         };
//         await payment.save();
//         console.log('17. Payment marked as failed');

//         const statusCode = err.response?.status || 500;
//         const errorMessage = err.response?.data?.message ||
//             err.response?.data?.error ||
//             "Nkwa payment provider connection failed";

//         res.status(statusCode).json({
//             success: false,
//             error: errorMessage,
//             provider: 'NKWA'
//         });
//     }
// });

// // @desc    Check payment status using third-party API (pay.vizit.homes)
// // @route   GET /api/payments/check/:transactionId
// // @access  Private
// const checkPaymentStatus = asyncHandler(async (req, res) => {
//     const { transactionId } = req.params;
//     const adminId = req.user._id;

//     console.log(`🔍 Checking payment status for transaction: ${transactionId} using third-party API`);

//     try {
//         // Call your third-party API to check status
//         // URL format: https://pay.vizit.homes/api/v1/payments/check/{transactionId}
//         const response = await statusCheckClient.get(`/payments/check/${transactionId}`);

//         console.log('✅ Third-party API response received');
//         console.log('Response data:', JSON.stringify(response.data, null, 2));

//         // The response format from your third-party API:
//         // {
//         //   "data": {
//         //     "id": "...",
//         //     "amount": 50,
//         //     "balanceBefore": 78,
//         //     "balanceAfter": 127,
//         //     "currency": "XAF",
//         //     "phoneNumber": "237654598457",
//         //     "fee": 1,
//         //     "status": "success",
//         //     "merchantId": 126,
//         //     "externalId": "",
//         //     "reason": null,
//         //     "paymentType": "collection",
//         //     "description": "collection",
//         //     "telecomOperator": "mtn",
//         //     "merchantPaidFee": true,
//         //     "createdAt": "2026-03-09T21:23:13.000Z",
//         //     "updatedAt": "2026-03-09T21:24:14.000Z",
//         //     "internalRef": "XgO3wdS_NKPY"
//         //   },
//         //   "status": "success"
//         // }

//         const gatewayData = response.data.data;
//         const gatewayStatus = response.data.status; // This is "success" or "failed"

//         // Find the payment in our database
//         const payment = await Payment.findOne({
//             transactionId,
//             admin: adminId
//         });

//         if (!payment) {
//             console.log('❌ Payment not found in database');
//             return res.status(404).json({
//                 success: false,
//                 error: "Payment not found"
//             });
//         }

//         // Map gateway status to our status
//         let newStatus = payment.status;
//         let statusChanged = false;

//         // Check if payment was successful
//         if (gatewayStatus === 'success' && gatewayData?.status === 'success') {
//             newStatus = 'SUCCESS';
//             statusChanged = payment.status !== 'SUCCESS';

//             if (statusChanged) {
//                 console.log('💰 Payment successful! Updating records...');
//                 payment.paymentDate = new Date(gatewayData.createdAt || new Date());
//                 payment.providerReference = gatewayData.id;

//                 // Store all provider data in metadata
//                 payment.metadata = {
//                     ...payment.metadata,
//                     providerData: {
//                         balanceBefore: gatewayData.balanceBefore,
//                         balanceAfter: gatewayData.balanceAfter,
//                         fee: gatewayData.fee,
//                         telecomOperator: gatewayData.telecomOperator,
//                         merchantId: gatewayData.merchantId,
//                         internalRef: gatewayData.internalRef,
//                         updatedAt: gatewayData.updatedAt,
//                         paymentType: gatewayData.paymentType,
//                         externalId: gatewayData.externalId,
//                         merchantPaidFee: gatewayData.merchantPaidFee
//                     },
//                     lastCheck: new Date(),
//                     providerStatus: gatewayStatus,
//                     statusSource: 'THIRD_PARTY_API'
//                 };

//                 // Update subscription with weeks
//                 const weeks = payment.metadata?.weeks || 1;
//                 const subscription = await Subscription.findById(payment.subscription);

//                 if (subscription) {
//                     console.log(`📅 Updating subscription with +${weeks} weeks`);

//                     // Calculate new end date based on weeks
//                     const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
//                     const newEndDate = new Date(currentEndDate);
//                     newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

//                     subscription.status = 'ACTIVE';
//                     subscription.endDate = newEndDate;
//                     subscription.nextPaymentDate = new Date(newEndDate);

//                     // Add to payment history
//                     if (!subscription.paymentHistory) {
//                         subscription.paymentHistory = [];
//                     }

//                     subscription.paymentHistory.push({
//                         amount: payment.amount,
//                         currency: payment.currency,
//                         status: 'SUCCESS',
//                         transactionId: payment.transactionId,
//                         paymentMethod: payment.paymentMethod,
//                         weeks: weeks,
//                         paymentDate: new Date(),
//                         provider: 'NKWA',
//                         verifiedBy: 'THIRD_PARTY_API',
//                         telecomOperator: gatewayData.telecomOperator
//                     });

//                     await subscription.save();
//                     console.log(`✅ Subscription updated: now active until ${newEndDate.toLocaleDateString()}`);
//                 }
//             }
//         }
//         // Check if payment failed
//         else if (gatewayStatus === 'failed' || gatewayData?.status === 'failed') {
//             newStatus = 'FAILED';
//             statusChanged = payment.status !== 'FAILED';

//             if (statusChanged) {
//                 console.log('❌ Payment failed according to third-party API');
//                 payment.metadata = {
//                     ...payment.metadata,
//                     providerData: gatewayData,
//                     lastCheck: new Date(),
//                     providerStatus: gatewayStatus,
//                     failureReason: gatewayData?.reason || 'Unknown reason',
//                     statusSource: 'THIRD_PARTY_API'
//                 };
//             }
//         }

//         // Update payment status if changed
//         if (statusChanged) {
//             payment.status = newStatus;
//             await payment.save();
//             console.log(`💰 Payment status updated from ${payment.status} to ${newStatus}`);
//         } else {
//             // Just update last check time
//             payment.metadata = {
//                 ...payment.metadata,
//                 lastCheck: new Date(),
//                 statusSource: 'THIRD_PARTY_API'
//             };
//             await payment.save();
//             console.log(`⏱️ Payment status unchanged (still ${payment.status})`);
//         }

//         // Return formatted response
//         res.status(200).json({
//             success: true,
//             data: {
//                 transactionId: payment.transactionId,
//                 amount: payment.amount,
//                 currency: payment.currency,
//                 status: newStatus,
//                 providerStatus: gatewayStatus,
//                 weeks: payment.metadata?.weeks || 1,
//                 paymentDate: payment.paymentDate,
//                 telecomOperator: gatewayData?.telecomOperator,
//                 balanceBefore: gatewayData?.balanceBefore,
//                 balanceAfter: gatewayData?.balanceAfter,
//                 fee: gatewayData?.fee,
//                 verifiedBy: 'THIRD_PARTY_API'
//             },
//             raw: gatewayData // Include raw data for debugging
//         });

//     } catch (err) {
//         console.error('❌ Third-party API status check error:', err.message);

//         if (err.response?.status === 404) {
//             res.status(404).json({
//                 success: false,
//                 error: "Transaction not found on payment gateway",
//                 provider: 'THIRD_PARTY_API'
//             });
//         } else {
//             res.status(err.response?.status || 500).json({
//                 success: false,
//                 error: err.response?.data?.message || "Failed to check payment status",
//                 provider: 'THIRD_PARTY_API'
//             });
//         }
//     }
// });

// // @desc    Refresh all pending payments using third-party API
// // @route   POST /api/payments/refresh-pending
// // @access  Private (Super Admin only)
// const refreshPendingPayments = asyncHandler(async (req, res) => {
//     const adminId = req.user._id;

//     console.log('🔄 Refreshing all pending payments for admin:', adminId);
//     console.log('Using third-party API for status checks');

//     const pendingPayments = await Payment.find({
//         admin: adminId,
//         status: 'PENDING'
//     });

//     const results = {
//         total: pendingPayments.length,
//         updated: [],
//         failed: [],
//         details: []
//     };

//     for (const payment of pendingPayments) {
//         try {
//             // Call third-party API to check status
//             const response = await statusCheckClient.get(`/payments/check/${payment.transactionId}`);

//             const gatewayData = response.data.data;
//             const gatewayStatus = response.data.status;

//             // Check if payment was successful
//             if (gatewayStatus === 'success' && gatewayData?.status === 'success' && payment.status !== 'SUCCESS') {
//                 payment.status = 'SUCCESS';
//                 payment.paymentDate = new Date(gatewayData.createdAt || new Date());
//                 payment.providerReference = gatewayData.id;

//                 // Update subscription with weeks
//                 const weeks = payment.metadata?.weeks || 1;
//                 const subscription = await Subscription.findById(payment.subscription);

//                 if (subscription) {
//                     const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
//                     const newEndDate = new Date(currentEndDate);
//                     newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

//                     subscription.status = 'ACTIVE';
//                     subscription.endDate = newEndDate;
//                     await subscription.save();
//                 }

//                 await payment.save();
//                 results.updated.push(payment.transactionId);
//                 results.details.push({
//                     transactionId: payment.transactionId,
//                     status: 'SUCCESS',
//                     amount: payment.amount,
//                     weeks: weeks,
//                     telecomOperator: gatewayData?.telecomOperator,
//                     verifiedBy: 'THIRD_PARTY_API'
//                 });
//             }
//             // Check if payment failed
//             else if ((gatewayStatus === 'failed' || gatewayData?.status === 'failed') && payment.status !== 'FAILED') {
//                 payment.status = 'FAILED';
//                 payment.metadata = {
//                     ...payment.metadata,
//                     failureReason: gatewayData?.reason || 'Unknown reason',
//                     verifiedBy: 'THIRD_PARTY_API'
//                 };
//                 await payment.save();
//                 results.failed.push(payment.transactionId);
//                 results.details.push({
//                     transactionId: payment.transactionId,
//                     status: 'FAILED',
//                     reason: gatewayData?.reason,
//                     verifiedBy: 'THIRD_PARTY_API'
//                 });
//             }
//         } catch (error) {
//             console.error(`Failed to refresh ${payment.transactionId}:`, error.message);
//             results.failed.push(payment.transactionId);
//             results.details.push({
//                 transactionId: payment.transactionId,
//                 error: error.message,
//                 verifiedBy: 'THIRD_PARTY_API'
//             });
//         }
//     }

//     res.json({
//         success: true,
//         message: `Refreshed ${results.updated.length} payments, ${results.failed.length} failed`,
//         results,
//         source: 'THIRD_PARTY_API'
//     });
// });

// // @desc    Manually update payment status (Admin override)
// // @route   POST /api/payments/manual-update/:paymentId
// // @access  Private (Super Admin only)
// const manualUpdatePayment = asyncHandler(async (req, res) => {
//     const { paymentId } = req.params;
//     const { status } = req.body; // 'SUCCESS' or 'FAILED'
//     const adminId = req.user._id;

//     console.log(`🔄 Manual payment update for ${paymentId} to ${status}`);

//     if (!['SUCCESS', 'FAILED'].includes(status)) {
//         res.status(400);
//         throw new Error('Invalid status. Must be SUCCESS or FAILED');
//     }

//     const payment = await Payment.findOne({
//         _id: paymentId,
//         admin: adminId
//     });

//     if (!payment) {
//         res.status(404);
//         throw new Error('Payment not found');
//     }

//     const oldStatus = payment.status;
//     payment.status = status;
//     payment.metadata = {
//         ...payment.metadata,
//         manuallyUpdated: true,
//         manuallyUpdatedBy: req.user.email,
//         manuallyUpdatedAt: new Date(),
//         oldStatus,
//         updateSource: 'MANUAL_ADMIN_OVERRIDE'
//     };

//     if (status === 'SUCCESS') {
//         payment.paymentDate = new Date();

//         // Update subscription
//         const weeks = payment.metadata?.weeks || 1;
//         const subscription = await Subscription.findById(payment.subscription);

//         if (subscription) {
//             const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
//             const newEndDate = new Date(currentEndDate);
//             newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

//             subscription.status = 'ACTIVE';
//             subscription.endDate = newEndDate;
//             subscription.nextPaymentDate = new Date(newEndDate);

//             await subscription.save();
//             console.log(`✅ Subscription manually updated: +${weeks} weeks`);
//         }
//     }

//     await payment.save();

//     res.json({
//         success: true,
//         message: `Payment manually updated to ${status}`,
//         payment: {
//             id: payment._id,
//             oldStatus,
//             newStatus: status,
//             weeks: payment.metadata?.weeks || 1,
//             updateSource: 'MANUAL_ADMIN_OVERRIDE'
//         }
//     });
// });

// // @desc    Get subscription status
// // @route   GET /api/payments/subscription
// // @access  Private (Super Admin only)
// // const getSubscriptionStatus = asyncHandler(async (req, res) => {
// //     console.log('📋 getSubscriptionStatus called');
// //     console.log('User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');

// //     const adminId = req.user._id;

// //     let subscription = await Subscription.findOne({ admin: adminId })
// //         .populate('admin', 'name email');

// //     console.log('Subscription found:', subscription ? 'Yes' : 'No');

// //     if (!subscription) {
// //         console.log('Creating new subscription for admin:', adminId);
// //         const endDate = new Date();
// //         endDate.setDate(endDate.getDate() + 7);

// //         subscription = await Subscription.create({
// //             admin: adminId,
// //             status: 'EXPIRED',
// //             amount: 50,
// //             currency: 'XAF',
// //             endDate,
// //             nextPaymentDate: endDate
// //         });
// //     }

// //     // Check if expired and update status
// //     if (subscription.status === 'ACTIVE' && new Date() > subscription.endDate) {
// //         console.log('Subscription expired, updating status');
// //         subscription.status = 'EXPIRED';
// //         await subscription.save();
// //     }

// //     // Get recent payments
// //     const recentPayments = await Payment.find({
// //         admin: adminId,
// //         subscription: subscription._id
// //     })
// //         .sort('-createdAt')
// //         .limit(20);

// //     console.log(`Found ${recentPayments.length} recent payments`);

// //     res.json({
// //         success: true,
// //         subscription: {
// //             _id: subscription._id,
// //             status: subscription.status,
// //             amount: subscription.amount,
// //             currency: subscription.currency,
// //             startDate: subscription.startDate,
// //             endDate: subscription.endDate,
// //             nextPaymentDate: subscription.nextPaymentDate,
// //             isActive: subscription.status === 'ACTIVE' && new Date() < new Date(subscription.endDate),
// //             gracePeriodEnd: subscription.gracePeriodEnd,
// //             autoRenew: subscription.autoRenew
// //         },
// //         recentPayments: recentPayments.map(p => ({
// //             id: p._id,
// //             amount: p.amount,
// //             currency: p.currency,
// //             status: p.status,
// //             paymentMethod: p.paymentMethod,
// //             date: p.paymentDate || p.createdAt,
// //             transactionId: p.transactionId,
// //             weeks: p.metadata?.weeks || 1,
// //             phoneNumber: p.metadata?.phoneNumber,
// //             provider: p.provider
// //         }))
// //     });
// // });


// // @desc    Get subscription status
// // @route   GET /api/payments/subscription
// // @access  Private (Super Admin only)
// const getSubscriptionStatus = asyncHandler(async (req, res) => {
//     console.log('📋 getSubscriptionStatus called');
//     console.log('User:', req.user ? { 
//         id: req.user._id, 
//         email: req.user.email, 
//         role: req.user.role 
//     } : 'No user');

//     if (!req.user) {
//         return res.status(401).json({
//             success: false,
//             error: 'Not authenticated'
//         });
//     }

//     const adminId = req.user._id;

//     try {
//         let subscription = await Subscription.findOne({ admin: adminId })
//             .populate('admin', 'name email');

//         console.log('Subscription found:', subscription ? 'Yes' : 'No');

//         if (!subscription) {
//             // Create a default subscription if none exists
//             const endDate = new Date();
//             endDate.setDate(endDate.getDate() + 7); // 7 days from now

//             subscription = await Subscription.create({
//                 admin: adminId,
//                 status: 'EXPIRED',
//                 amount: 50,
//                 currency: 'XAF',
//                 endDate,
//                 nextPaymentDate: endDate
//             });
//             console.log('Created new subscription for admin:', adminId);
//         }

//         // Check if expired and update status
//         if (subscription.status === 'ACTIVE' && new Date() > new Date(subscription.endDate)) {
//             console.log('Subscription expired, updating status');
//             subscription.status = 'EXPIRED';
//             await subscription.save();
//         }

//         // Get recent payments
//         const recentPayments = await Payment.find({
//             admin: adminId,
//             subscription: subscription._id
//         })
//             .sort('-createdAt')
//             .limit(20);

//         res.json({
//             success: true,
//             subscription: {
//                 _id: subscription._id,
//                 status: subscription.status,
//                 amount: subscription.amount,
//                 currency: subscription.currency,
//                 startDate: subscription.startDate,
//                 endDate: subscription.endDate,
//                 nextPaymentDate: subscription.nextPaymentDate,
//                 isActive: subscription.status === 'ACTIVE' && new Date() < new Date(subscription.endDate),
//                 gracePeriodEnd: subscription.gracePeriodEnd,
//                 autoRenew: subscription.autoRenew,
//                 adminEmail: req.user.email // Include admin email for verification
//             },
//             recentPayments: recentPayments.map(p => ({
//                 id: p._id,
//                 amount: p.amount,
//                 currency: p.currency,
//                 status: p.status,
//                 paymentMethod: p.paymentMethod,
//                 date: p.paymentDate || p.createdAt,
//                 transactionId: p.transactionId,
//                 weeks: p.metadata?.weeks || 1,
//                 phoneNumber: p.metadata?.phoneNumber
//             }))
//         });
//     } catch (error) {
//         console.error('Error in getSubscriptionStatus:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch subscription status'
//         });
//     }
// });

// // @desc    Get payment history
// // @route   GET /api/payments/history
// // @access  Private (Super Admin only)
// const getPaymentHistory = asyncHandler(async (req, res) => {
//     console.log('📋 getPaymentHistory called');
//     console.log('User:', req.user ? { id: req.user._id, email: req.user.email, role: req.user.role } : 'No user');

//     const adminId = req.user._id;
//     const { page = 1, limit = 10 } = req.query;

//     const payments = await Payment.find({ admin: adminId })
//         .populate('subscription')
//         .sort('-createdAt')
//         .limit(limit * 1)
//         .skip((page - 1) * limit);

//     const total = await Payment.countDocuments({ admin: adminId });

//     console.log(`Found ${payments.length} payments out of ${total} total`);

//     res.json({
//         success: true,
//         payments: payments.map(p => ({
//             id: p._id,
//             amount: p.amount,
//             currency: p.currency,
//             status: p.status,
//             paymentMethod: p.paymentMethod,
//             provider: p.provider,
//             transactionId: p.transactionId,
//             date: p.paymentDate || p.createdAt,
//             weeks: p.metadata?.weeks || 1,
//             phoneNumber: p.metadata?.phoneNumber
//         })),
//         pagination: {
//             page: Number(page),
//             limit: Number(limit),
//             total,
//             pages: Math.ceil(total / limit)
//         }
//     });
// });

// // @desc    Webhook handler (kept for backward compatibility)
// // @route   POST /api/payments/webhook
// // @access  Public
// const paymentWebhook = asyncHandler(async (req, res) => {
//     const { id, status, amount, externalRef } = req.body;

//     console.log(`🔔 Webhook update received:`, req.body);

//     const payment = await Payment.findOne({
//         $or: [
//             { 'metadata.externalRef': externalRef },
//             { transactionId: id }
//         ]
//     });

//     if (!payment) {
//         console.log(`❌ Payment not found for ref: ${externalRef || id}`);
//         return res.status(200).send("OK");
//     }

//     if (status === 'SUCCESSFUL' || status === 'success') {
//         payment.status = 'SUCCESS';
//         payment.paymentDate = new Date();

//         const weeks = payment.metadata?.weeks || 1;
//         const subscription = await Subscription.findById(payment.subscription);

//         if (subscription) {
//             const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
//             const newEndDate = new Date(currentEndDate);
//             newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

//             subscription.status = 'ACTIVE';
//             subscription.endDate = newEndDate;
//             await subscription.save();
//             console.log(`✅ Subscription renewed via webhook: +${weeks} weeks`);
//         }
//     } else if (status === 'FAILED' || status === 'failed') {
//         payment.status = 'FAILED';
//         console.log(`❌ Payment failed via webhook`);
//     }

//     payment.providerReference = id;
//     await payment.save();

//     res.status(200).send("OK");
// });

// module.exports = {
//     initiatePayment,           // Uses Nkwa API
//     checkPaymentStatus,        // Uses third-party API (pay.vizit.homes)
//     refreshPendingPayments,     // Uses third-party API (pay.vizit.homes)
//     manualUpdatePayment,        // Admin override
//     getSubscriptionStatus,
//     getPaymentHistory,
//     paymentWebhook
// };




































const asyncHandler = require('express-async-handler');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const { PaymentOperation } = require('@hachther/mesomb');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ============ ME SOMB PAYMENT CLIENT (for initiating payments) ============
let paymentClient = null;
let meSombInitialized = false;

try {
    if (process.env.MESOMB_APPLICATION_KEY &&
        process.env.MESOMB_ACCESS_KEY &&
        process.env.MESOMB_SECRET_KEY) {

        paymentClient = new PaymentOperation({
            applicationKey: process.env.MESOMB_APPLICATION_KEY,
            accessKey: process.env.MESOMB_ACCESS_KEY,
            secretKey: process.env.MESOMB_SECRET_KEY,
            language: 'en'
        });
        meSombInitialized = true;
        console.log('✅ MeSomb payment client initialized');
    } else {
        console.error('❌ MeSomb credentials missing');
    }
} catch (error) {
    console.error('❌ MeSomb init error:', error.message);
}

// ============ THIRD-PARTY STATUS CHECK CLIENT (your external API) ============
const statusCheckClient = axios.create({
    baseURL: 'https://pay.vizit.homes/api/v1',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Helper functions
function generateTransactionId(prefix = 'txn') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function formatPhoneNumber(phoneNumber) {
    let clean = phoneNumber.toString().replace(/\D/g, '');
    if (clean.startsWith('237')) {
        clean = clean.substring(3);
    }
    return clean;
}

function validateCameroonPhone(phoneNumber) {
    const cleanPhone = phoneNumber.toString().replace(/\D/g, '');
    const phoneRegex = /^[6][0-9]{8}$/;
    return phoneRegex.test(cleanPhone);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// @desc    Initialize payment with MeSomb
// @route   POST /api/payments/initiate
// @access  Private (Super Admin only)
const initiatePayment = asyncHandler(async (req, res) => {
    const { phoneNumber, weeks = 1 } = req.body;
    const adminId = req.user._id;
    const amount = 50 * weeks; // Calculate total based on weeks

    console.log('========== ME SOMB PAYMENT INITIATION ==========');
    console.log('1. Request body:', req.body);
    console.log('2. User:', { id: adminId, email: req.user.email, role: req.user.role });
    console.log('3. Weeks selected:', weeks);
    console.log('4. Total amount:', amount);

    // Validate phone number
    if (!phoneNumber) {
        console.log('❌ Phone number missing');
        res.status(400);
        throw new Error('Phone number is required');
    }

    // Clean phone number (MeSomb expects 6XXXXXXXX format)
    let cleanPhone = phoneNumber.replace(/\D/g, "");
    console.log('5. Raw phone input:', phoneNumber);
    console.log('6. Cleaned phone:', cleanPhone);

    // Remove 237 if present
    if (cleanPhone.startsWith("237")) {
        cleanPhone = cleanPhone.substring(3);
    }
    console.log('7. Final phone without country code:', cleanPhone);

    // Validate phone format for Cameroon (must be 9 digits starting with 6)
    if (!validateCameroonPhone(cleanPhone)) {
        console.log('❌ Invalid phone format:', cleanPhone);
        res.status(400);
        throw new Error(`Invalid phone number. Must be 9 digits starting with 6 (e.g., 677550203)`);
    }

    // Check MeSomb credentials
    if (!meSombInitialized || !paymentClient) {
        console.log('❌ MeSomb client not initialized');
        res.status(500);
        throw new Error('Payment provider not configured');
    }

    // Get or create subscription
    let subscription = await Subscription.findOne({ admin: adminId });
    console.log('8. Existing subscription:', subscription ? subscription._id : 'None');

    if (!subscription) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (7 * weeks));

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
        provider: 'MESOMB',
        weeks: weeks,
        metadata: {
            externalRef,
            phoneNumber: cleanPhone,
            weeks,
            userEmail: req.user.email,
            userName: req.user.name
        }
    });
    console.log('11. Created payment record:', payment._id);

    try {
        // Force service to MTN only
        const service = "MTN";

        console.log('12. Calling MeSomb API...');
        const mesombRequest = {
            payer: cleanPhone,
            amount: Number(amount),
            service: service,
            country: 'CM',
            currency: 'XAF',
            fees: true,
            conversion: false,
            customer: {
                email: req.user.email || `admin_${Date.now()}@example.com`,
                firstName: req.user.name?.split(' ')[0] || 'Admin',
                lastName: req.user.name?.split(' ')[1] || 'User',
                town: 'Douala',
                region: 'Littoral',
                country: 'CM',
                address: 'Admin Address'
            },
            location: {
                town: 'Douala',
                region: 'Littoral',
                country: 'CM'
            },
            products: [{
                name: `TimberTrade Super Admin Subscription - ${weeks} week(s)`,
                category: 'Subscription',
                quantity: 1,
                amount: Number(amount)
            }]
        };
        console.log('13. MeSomb request payload:', JSON.stringify(mesombRequest, null, 2));

        // Retry logic for network issues
        let response;
        let retries = 3;
        let lastError;

        while (retries > 0) {
            try {
                console.log(`Attempting payment (${retries} retries left)...`);

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000);
                });

                const paymentPromise = paymentClient.makeCollect(mesombRequest);
                response = await Promise.race([paymentPromise, timeoutPromise]);
                break;

            } catch (error) {
                lastError = error;
                console.log(`Attempt failed: ${error.message}`);
                retries--;
                if (retries > 0) await delay(2000);
            }
        }

        if (!response) {
            throw lastError || new Error('All payment attempts failed');
        }

        console.log('14. MeSomb response status:', response.status);
        console.log('15. MeSomb response data:', JSON.stringify(response, null, 2));

        const isSuccess = response.isOperationSuccess ? response.isOperationSuccess() : false;

        if (!isSuccess) {
            let errorMessage = response.message || "Transaction failed";

            if (errorMessage.includes("does not know the recipient")) {
                errorMessage = "Merchant account not configured. Please contact support.";
            } else if (errorMessage.includes("insufficient")) {
                errorMessage = "Insufficient funds in merchant account.";
            }

            throw new Error(errorMessage);
        }

        // Extract MeSomb transaction ID
        const transactionId = response.transaction?.pk || generateTransactionId('pay');

        // Update payment with MeSomb transaction ID
        payment.transactionId = transactionId;
        payment.providerReference = transactionId;
        payment.metadata.providerData = {
            transactionId: transactionId,
            status: response.status,
            service: service,
            responseTime: new Date().toISOString()
        };
        await payment.save();
        console.log('16. Payment updated with MeSomb transaction ID:', transactionId);

        res.status(202).json({
            success: true,
            message: "Push sent! Please check your phone.",
            transactionId: transactionId,
            paymentId: payment._id,
            status: 'PENDING',
            weeks: weeks,
            amount: amount,
            provider: 'MESOMB'
        });

    } catch (err) {
        console.error('========== ME SOMB PAYMENT ERROR ==========');
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);

        payment.status = 'FAILED';
        payment.metadata.error = {
            message: err.message,
            response: err.response?.data,
            status: err.response?.status,
            provider: 'MESOMB'
        };
        await payment.save();
        console.log('17. Payment marked as failed');

        const statusCode = err.response?.status || 500;
        const errorMessage = err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "MeSomb payment provider connection failed";

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            provider: 'MESOMB'
        });
    }
});

// @desc    Check payment status using third-party API (pay.vizit.homes)
// @route   GET /api/payments/check/:transactionId
// @access  Private
const checkPaymentStatus = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const adminId = req.user._id;

    console.log(`🔍 Checking payment status for transaction: ${transactionId} using third-party API`);

    try {
        // Call your third-party API to check status
        const response = await statusCheckClient.get(`/payments/check/${transactionId}`);

        console.log('✅ Third-party API response received');
        console.log('Response data:', JSON.stringify(response.data, null, 2));

        const gatewayData = response.data.data;
        const gatewayStatus = response.data.status;

        // Find the payment in our database
        const payment = await Payment.findOne({
            transactionId,
            admin: adminId
        });

        if (!payment) {
            console.log('❌ Payment not found in database');
            return res.status(404).json({
                success: false,
                error: "Payment not found"
            });
        }

        // Map gateway status to our status
        let newStatus = payment.status;
        let statusChanged = false;

        if (gatewayStatus === 'success' && gatewayData?.status === 'success') {
            newStatus = 'SUCCESS';
            statusChanged = payment.status !== 'SUCCESS';

            if (statusChanged) {
                console.log('💰 Payment successful! Updating records...');
                payment.paymentDate = new Date(gatewayData.createdAt || new Date());
                payment.providerReference = gatewayData.id;

                payment.metadata = {
                    ...payment.metadata,
                    providerData: {
                        balanceBefore: gatewayData.balanceBefore,
                        balanceAfter: gatewayData.balanceAfter,
                        fee: gatewayData.fee,
                        telecomOperator: gatewayData.telecomOperator,
                        merchantId: gatewayData.merchantId,
                        internalRef: gatewayData.internalRef,
                        updatedAt: gatewayData.updatedAt,
                        paymentType: gatewayData.paymentType,
                        externalId: gatewayData.externalId,
                        merchantPaidFee: gatewayData.merchantPaidFee
                    },
                    lastCheck: new Date(),
                    providerStatus: gatewayStatus,
                    statusSource: 'THIRD_PARTY_API'
                };

                const weeks = payment.metadata?.weeks || 1;
                const subscription = await Subscription.findById(payment.subscription);

                if (subscription) {
                    console.log(`📅 Updating subscription with +${weeks} weeks`);

                    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
                    const newEndDate = new Date(currentEndDate);
                    newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

                    subscription.status = 'ACTIVE';
                    subscription.endDate = newEndDate;
                    subscription.nextPaymentDate = new Date(newEndDate);

                    if (!subscription.paymentHistory) {
                        subscription.paymentHistory = [];
                    }

                    subscription.paymentHistory.push({
                        amount: payment.amount,
                        currency: payment.currency,
                        status: 'SUCCESS',
                        transactionId: payment.transactionId,
                        paymentMethod: payment.paymentMethod,
                        weeks: weeks,
                        paymentDate: new Date(),
                        provider: 'MESOMB',
                        verifiedBy: 'THIRD_PARTY_API',
                        telecomOperator: gatewayData.telecomOperator
                    });

                    await subscription.save();
                    console.log(`✅ Subscription updated: now active until ${newEndDate.toLocaleDateString()}`);
                }
            }
        }
        else if (gatewayStatus === 'failed' || gatewayData?.status === 'failed') {
            newStatus = 'FAILED';
            statusChanged = payment.status !== 'FAILED';

            if (statusChanged) {
                console.log('❌ Payment failed according to third-party API');
                payment.metadata = {
                    ...payment.metadata,
                    providerData: gatewayData,
                    lastCheck: new Date(),
                    providerStatus: gatewayStatus,
                    failureReason: gatewayData?.reason || 'Unknown reason',
                    statusSource: 'THIRD_PARTY_API'
                };
            }
        }

        if (statusChanged) {
            payment.status = newStatus;
            await payment.save();
            console.log(`💰 Payment status updated from ${payment.status} to ${newStatus}`);
        } else {
            payment.metadata = {
                ...payment.metadata,
                lastCheck: new Date(),
                statusSource: 'THIRD_PARTY_API'
            };
            await payment.save();
            console.log(`⏱️ Payment status unchanged (still ${payment.status})`);
        }

        res.status(200).json({
            success: true,
            data: {
                transactionId: payment.transactionId,
                amount: payment.amount,
                currency: payment.currency,
                status: newStatus,
                providerStatus: gatewayStatus,
                weeks: payment.metadata?.weeks || 1,
                paymentDate: payment.paymentDate,
                telecomOperator: gatewayData?.telecomOperator,
                balanceBefore: gatewayData?.balanceBefore,
                balanceAfter: gatewayData?.balanceAfter,
                fee: gatewayData?.fee,
                verifiedBy: 'THIRD_PARTY_API'
            },
            raw: gatewayData
        });

    } catch (err) {
        console.error('❌ Third-party API status check error:', err.message);

        if (err.response?.status === 404) {
            res.status(404).json({
                success: false,
                error: "Transaction not found on payment gateway",
                provider: 'THIRD_PARTY_API'
            });
        } else {
            res.status(err.response?.status || 500).json({
                success: false,
                error: err.response?.data?.message || "Failed to check payment status",
                provider: 'THIRD_PARTY_API'
            });
        }
    }
});

// @desc    Refresh all pending payments using third-party API
// @route   POST /api/payments/refresh-pending
// @access  Private (Super Admin only)
const refreshPendingPayments = asyncHandler(async (req, res) => {
    const adminId = req.user._id;

    console.log('🔄 Refreshing all pending payments for admin:', adminId);
    console.log('Using third-party API for status checks');

    const pendingPayments = await Payment.find({
        admin: adminId,
        status: 'PENDING'
    });

    const results = {
        total: pendingPayments.length,
        updated: [],
        failed: [],
        details: []
    };

    for (const payment of pendingPayments) {
        try {
            const response = await statusCheckClient.get(`/payments/check/${payment.transactionId}`);

            const gatewayData = response.data.data;
            const gatewayStatus = response.data.status;

            if (gatewayStatus === 'success' && gatewayData?.status === 'success' && payment.status !== 'SUCCESS') {
                payment.status = 'SUCCESS';
                payment.paymentDate = new Date(gatewayData.createdAt || new Date());
                payment.providerReference = gatewayData.id;

                const weeks = payment.metadata?.weeks || 1;
                const subscription = await Subscription.findById(payment.subscription);

                if (subscription) {
                    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
                    const newEndDate = new Date(currentEndDate);
                    newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

                    subscription.status = 'ACTIVE';
                    subscription.endDate = newEndDate;
                    await subscription.save();
                }

                await payment.save();
                results.updated.push(payment.transactionId);
                results.details.push({
                    transactionId: payment.transactionId,
                    status: 'SUCCESS',
                    amount: payment.amount,
                    weeks: weeks,
                    telecomOperator: gatewayData?.telecomOperator,
                    verifiedBy: 'THIRD_PARTY_API'
                });
            }
            else if ((gatewayStatus === 'failed' || gatewayData?.status === 'failed') && payment.status !== 'FAILED') {
                payment.status = 'FAILED';
                payment.metadata = {
                    ...payment.metadata,
                    failureReason: gatewayData?.reason || 'Unknown reason',
                    verifiedBy: 'THIRD_PARTY_API'
                };
                await payment.save();
                results.failed.push(payment.transactionId);
                results.details.push({
                    transactionId: payment.transactionId,
                    status: 'FAILED',
                    reason: gatewayData?.reason,
                    verifiedBy: 'THIRD_PARTY_API'
                });
            }
        } catch (error) {
            console.error(`Failed to refresh ${payment.transactionId}:`, error.message);
            results.failed.push(payment.transactionId);
            results.details.push({
                transactionId: payment.transactionId,
                error: error.message,
                verifiedBy: 'THIRD_PARTY_API'
            });
        }
    }

    res.json({
        success: true,
        message: `Refreshed ${results.updated.length} payments, ${results.failed.length} failed`,
        results,
        source: 'THIRD_PARTY_API'
    });
});

// @desc    Manually update payment status (Admin override)
// @route   POST /api/payments/manual-update/:paymentId
// @access  Private (Super Admin only)
const manualUpdatePayment = asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { status } = req.body;
    const adminId = req.user._id;

    console.log(`🔄 Manual payment update for ${paymentId} to ${status}`);

    if (!['SUCCESS', 'FAILED'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status. Must be SUCCESS or FAILED');
    }

    const payment = await Payment.findOne({
        _id: paymentId,
        admin: adminId
    });

    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }

    const oldStatus = payment.status;
    payment.status = status;
    payment.metadata = {
        ...payment.metadata,
        manuallyUpdated: true,
        manuallyUpdatedBy: req.user.email,
        manuallyUpdatedAt: new Date(),
        oldStatus,
        updateSource: 'MANUAL_ADMIN_OVERRIDE'
    };

    if (status === 'SUCCESS') {
        payment.paymentDate = new Date();

        const weeks = payment.metadata?.weeks || 1;
        const subscription = await Subscription.findById(payment.subscription);

        if (subscription) {
            const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

            subscription.status = 'ACTIVE';
            subscription.endDate = newEndDate;
            subscription.nextPaymentDate = new Date(newEndDate);

            await subscription.save();
            console.log(`✅ Subscription manually updated: +${weeks} weeks`);
        }
    }

    await payment.save();

    res.json({
        success: true,
        message: `Payment manually updated to ${status}`,
        payment: {
            id: payment._id,
            oldStatus,
            newStatus: status,
            weeks: payment.metadata?.weeks || 1,
            updateSource: 'MANUAL_ADMIN_OVERRIDE'
        }
    });
});

// @desc    Get subscription status
// @route   GET /api/payments/subscription
// @access  Private (Super Admin only)
const getSubscriptionStatus = asyncHandler(async (req, res) => {
    console.log('📋 getSubscriptionStatus called');
    console.log('User:', req.user ? {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
    } : 'No user');

    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    const adminId = req.user._id;

    try {
        let subscription = await Subscription.findOne({ admin: adminId })
            .populate('admin', 'name email');

        console.log('Subscription found:', subscription ? 'Yes' : 'No');

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
            console.log('Created new subscription for admin:', adminId);
        }

        if (subscription.status === 'ACTIVE' && new Date() > new Date(subscription.endDate)) {
            console.log('Subscription expired, updating status');
            subscription.status = 'EXPIRED';
            await subscription.save();
        }

        const recentPayments = await Payment.find({
            admin: adminId,
            subscription: subscription._id
        })
            .sort('-createdAt')
            .limit(20);

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
                isActive: subscription.status === 'ACTIVE' && new Date() < new Date(subscription.endDate),
                gracePeriodEnd: subscription.gracePeriodEnd,
                autoRenew: subscription.autoRenew,
                adminEmail: req.user.email
            },
            recentPayments: recentPayments.map(p => ({
                id: p._id,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
                paymentMethod: p.paymentMethod,
                date: p.paymentDate || p.createdAt,
                transactionId: p.transactionId,
                weeks: p.metadata?.weeks || 1,
                phoneNumber: p.metadata?.phoneNumber
            }))
        });
    } catch (error) {
        console.error('Error in getSubscriptionStatus:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch subscription status'
        });
    }
});

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private (Super Admin only)
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
            date: p.paymentDate || p.createdAt,
            weeks: p.metadata?.weeks || 1,
            phoneNumber: p.metadata?.phoneNumber
        })),
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// @desc    Webhook handler for MeSomb
// @route   POST /api/payments/webhook
// @access  Public
const paymentWebhook = asyncHandler(async (req, res) => {
    const { transaction, status, amount, externalRef } = req.body;

    console.log(`🔔 Webhook update received:`, JSON.stringify(req.body, null, 2));

    const transactionId = transaction?.pk || req.body.id;
    const transactionStatus = status || transaction?.status;

    const payment = await Payment.findOne({
        $or: [
            { 'metadata.externalRef': externalRef },
            { transactionId: transactionId }
        ]
    });

    if (!payment) {
        console.log(`❌ Payment not found for ref: ${externalRef || transactionId}`);
        return res.status(200).send("OK");
    }

    if (transactionStatus === 'SUCCESS') {
        payment.status = 'SUCCESS';
        payment.paymentDate = new Date();

        const weeks = payment.metadata?.weeks || 1;
        const subscription = await Subscription.findById(payment.subscription);

        if (subscription) {
            const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : new Date();
            const newEndDate = new Date(currentEndDate);
            newEndDate.setDate(newEndDate.getDate() + (7 * weeks));

            subscription.status = 'ACTIVE';
            subscription.endDate = newEndDate;
            await subscription.save();
            console.log(`✅ Subscription renewed via webhook: +${weeks} weeks`);
        }
    } else if (transactionStatus === 'FAILED') {
        payment.status = 'FAILED';
        console.log(`❌ Payment failed via webhook`);
    }

    payment.providerReference = transactionId;
    await payment.save();

    res.status(200).send("OK");
});

module.exports = {
    initiatePayment,           // Uses MeSomb API
    checkPaymentStatus,        // Uses third-party API (pay.vizit.homes)
    refreshPendingPayments,     // Uses third-party API (pay.vizit.homes)
    manualUpdatePayment,        // Admin override
    getSubscriptionStatus,
    getPaymentHistory,
    paymentWebhook
};