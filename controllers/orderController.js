




const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const axios = require('axios');
const WoodItem = require('../models/WoodItem');

// @desc    Create new order (checkout)
// @route   POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
        res.status(400);
        throw new Error('No order items');
    }

    // Calculate total and verify stock
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
        const woodItem = await WoodItem.findById(item.id);

        if (!woodItem) {
            res.status(404);
            throw new Error(`Wood item not found: ${item.id}`);
        }

        if (woodItem.stock < item.quantity) {
            res.status(400);
            throw new Error(`Insufficient stock for ${woodItem.species}`);
        }

        // Create order item
        orderItems.push({
            woodItem: woodItem._id,
            quantity: item.quantity,
            price: woodItem.price,
            species: woodItem.species,
        });

        totalAmount += woodItem.price * item.quantity;

        // Update stock
        woodItem.stock -= item.quantity;
        await woodItem.save();
    }

    // Create order
    const order = await Order.create({
        user: req.user._id,
        items: orderItems,
        totalAmount,
        shippingAddress,
    });

    // Populate order details with user and their company
    const populatedOrder = await Order.findById(order._id)
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem');

    res.status(201).json(populatedOrder);
});

// @desc    Get user orders
// @route   GET /api/orders/myorders
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id })
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem')
        .sort('-createdAt');

    res.json(orders);
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Check if user is authorized to view this order
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'SUPER_ADMIN') {
        res.status(403);
        throw new Error('Not authorized to view this order');
    }

    res.json(order);
});




const sendOrderStatusEmail = async (order, oldStatus, newStatus, user) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'long'
        });

        // Get user email (either from order user or the user who made the update)
        const recipientEmail = order.user?.email || user?.email;

        if (!recipientEmail) {
            throw new Error('No recipient email found');
        }

        // Determine email template based on status
        let statusColor, statusIcon, statusMessage, actionRequired, emailSubject;

        switch (newStatus) {
            case 'PENDING':
                statusColor = '#D97706';
                statusIcon = '⏳';
                statusMessage = 'Your order is pending confirmation';
                emailSubject = `⏳ Order #${order.orderNumber} - Pending Confirmation`;
                actionRequired = 'We are processing your order and will confirm shortly.';
                break;
            case 'CONFIRMED':
                statusColor = '#059669';
                statusIcon = '✅';
                statusMessage = 'Your order has been confirmed!';
                emailSubject = `✅ Order #${order.orderNumber} - Confirmed`;
                actionRequired = 'Your order has been confirmed and is being prepared.';
                break;
            case 'PROCESSING':
                statusColor = '#3B82F6';
                statusIcon = '⚙️';
                statusMessage = 'Your order is being processed';
                emailSubject = `⚙️ Order #${order.orderNumber} - Processing`;
                actionRequired = 'We are preparing your items for shipment.';
                break;
            case 'SHIPPED':
                statusColor = '#8B5CF6';
                statusIcon = '🚚';
                statusMessage = 'Your order has been shipped!';
                emailSubject = `🚚 Order #${order.orderNumber} - Shipped`;
                actionRequired = 'Your items are on their way to you.';
                break;
            case 'DELIVERED':
                statusColor = '#059669';
                statusIcon = '📦';
                statusMessage = 'Your order has been delivered!';
                emailSubject = `📦 Order #${order.orderNumber} - Delivered`;
                actionRequired = 'Your items have been delivered. Thank you for shopping with us!';
                break;
            case 'CANCELLED':
                statusColor = '#DC2626';
                statusIcon = '❌';
                statusMessage = 'Your order has been cancelled';
                emailSubject = `❌ Order #${order.orderNumber} - Cancelled`;
                actionRequired = 'If you did not request this cancellation, please contact support immediately.';
                break;
            case 'REFUNDED':
                statusColor = '#6B7280';
                statusIcon = '💰';
                statusMessage = 'Your order has been refunded';
                emailSubject = `💰 Order #${order.orderNumber} - Refunded`;
                actionRequired = 'The refund has been processed. It may take 3-5 business days to appear in your account.';
                break;
            default:
                statusColor = '#6B7280';
                statusIcon = 'ℹ️';
                statusMessage = 'Your order status has been updated';
                emailSubject = `ℹ️ Order #${order.orderNumber} - Status Update`;
                actionRequired = 'Please check your order details for more information.';
        }

        // Calculate order total
        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.19; // Assuming 19% tax
        const total = subtotal + tax + (order.shippingCost || 0);

        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'XAF',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        };

        // Generate items table HTML
        const itemsTable = order.items.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
                    <strong>${item.woodItem?.name || 'Wood Product'}</strong>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(item.price)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const emailContent = {
            sender: {
                name: process.env.FROM_NAME || 'TimberTrade',
                email: process.env.SUPPORT_EMAIL || 'orders@timbertrade.com'
            },
            to: [
                {
                    email: recipientEmail,
                    name: order.user?.name || 'Customer'
                }
            ],
            cc: order.user?.company?.email ? [{ email: order.user.company.email }] : undefined,
            subject: emailSubject,
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Order Status Update - TimberTrade</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        .header {
                            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                            color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 10px 10px 0 0;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 28px;
                        }
                        .header p {
                            margin: 5px 0 0;
                            opacity: 0.9;
                        }
                        .content {
                            background: #f9f9f9;
                            padding: 40px;
                            border-radius: 0 0 10px 10px;
                            border: 1px solid #e0e0e0;
                            border-top: none;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 12px 24px;
                            background: ${statusColor}15;
                            color: ${statusColor};
                            border: 2px solid ${statusColor};
                            border-radius: 50px;
                            font-weight: bold;
                            font-size: 18px;
                            margin: 20px 0;
                        }
                        .status-icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                            line-height: 1;
                        }
                        .order-details {
                            background: white;
                            padding: 25px;
                            border-radius: 12px;
                            margin: 25px 0;
                            border-left: 4px solid ${statusColor};
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        }
                        .order-details h3 {
                            margin-top: 0;
                            margin-bottom: 15px;
                            color: #1e3c72;
                            font-size: 18px;
                            border-bottom: 2px solid #e0e0e0;
                            padding-bottom: 10px;
                        }
                        .order-details p {
                            margin: 10px 0;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        .order-details strong {
                            min-width: 120px;
                            color: #4b5563;
                        }
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            background: white;
                            border-radius: 8px;
                            overflow: hidden;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        }
                        .items-table th {
                            background: #1e3c72;
                            color: white;
                            padding: 12px;
                            text-align: left;
                        }
                        .items-table td {
                            padding: 12px;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        .items-table tr:last-child td {
                            border-bottom: none;
                        }
                        .totals {
                            background: #f8fafc;
                            padding: 20px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            padding: 8px 0;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        .total-row:last-child {
                            border-bottom: none;
                            font-weight: bold;
                            font-size: 18px;
                            color: #1e3c72;
                        }
                        .button {
                            display: inline-block;
                            padding: 14px 32px;
                            background: ${statusColor};
                            color: white !important;
                            text-decoration: none;
                            border-radius: 50px;
                            margin: 25px 0 15px;
                            font-weight: bold;
                            font-size: 16px;
                            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                            transition: all 0.3s ease;
                        }
                        .button:hover {
                            opacity: 0.9;
                            transform: translateY(-2px);
                            box-shadow: 0 6px 8px rgba(0,0,0,0.15);
                        }
                        .info-box {
                            background: #f0f4ff;
                            border: 1px solid #e0e7ff;
                            border-radius: 12px;
                            padding: 20px;
                            margin: 25px 0;
                        }
                        .status-change {
                            background: white;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 15px;
                            color: #4b5563;
                            border: 1px solid #e0e0e0;
                            margin-top: 15px;
                        }
                        .status-change .arrow {
                            font-size: 20px;
                            margin: 0 10px;
                            color: ${statusColor};
                        }
                        .footer {
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e0e0e0;
                        }
                        .tracking-info {
                            background: #e8f4fd;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        @media only screen and (max-width: 600px) {
                            body { padding: 10px; }
                            .content { padding: 20px; }
                            .order-details strong { min-width: 100px; }
                            .items-table { font-size: 14px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🌳 TimberTrade</h1>
                        <p>Order Status Update</p>
                    </div>
                    
                    <div class="content">
                        <div class="status-icon">${statusIcon}</div>
                        
                        <h2 style="text-align: center; color: ${statusColor}; margin: 0 0 10px;">
                            ${statusMessage}
                        </h2>
                        
                        <div style="text-align: center;">
                            <div class="status-badge">${newStatus}</div>
                        </div>

                        <div class="order-details">
                            <h3>📋 Order Information</h3>
                            <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                            <p><strong>Customer Name:</strong> ${order.user?.name || 'N/A'}</p>
                            <p><strong>Company:</strong> ${order.user?.company?.name || 'N/A'}</p>
                            <p><strong>Shipping Address:</strong> ${order.shippingAddress || order.user?.company?.address || 'N/A'}</p>
                           </div>

                        <div class="info-box">
                            <h4 style="margin-top: 0; color: #1e3c72;">📊 Status Change Details</h4>
                            <div class="status-change">
                                <strong>Previous Status:</strong> 
                                <span style="color: #6b7280; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; margin-left: 8px;">
                                    ${oldStatus}
                                </span>
                                <span class="arrow">→</span>
                                <strong>New Status:</strong> 
                                <span style="color: ${statusColor}; background: ${statusColor}15; padding: 4px 8px; border-radius: 4px; margin-left: 8px; font-weight: bold;">
                                    ${newStatus}
                                </span>
                            </div>
                            
                            <p style="margin: 15px 0 0; color: #4b5563;">
                                <strong>🕒 Update Time:</strong> ${currentDate}
                            </p>
                            <p style="margin: 5px 0 0; color: #4b5563;">
                                <strong>👤 Updated By:</strong> ${user?.name || 'System'} (${user?.email || 'N/A'})
                            </p>
                        </div>

                        ${newStatus === 'SHIPPED' && order.trackingNumber ? `
                            <div class="tracking-info">
                                <h4 style="margin-top: 0; color: #1e3c72;">📦 Tracking Information</h4>
                                <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
                                <p><strong>Carrier:</strong> ${order.carrier || 'Standard Shipping'}</p>
                                <p><strong>Estimated Delivery:</strong> ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleDateString() : 'To be confirmed'}</p>
                            </div>
                        ` : ''}

                        <h3 style="color: #1e3c72;">🛒 Order Items</h3>
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th style="text-align: center;">Qty</th>
                                    <th style="text-align: right;">Unit Price</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsTable}
                            </tbody>
                        </table>

                        <div class="totals">
                            <div class="total-row">
                                <span>Subtotal:</span>
                                <span>${formatCurrency(subtotal)}</span>
                            </div>
                            <div class="total-row">
                                <span>Tax (19%):</span>
                                <span>${formatCurrency(tax)}</span>
                            </div>
                            ${order.shippingCost ? `
                                <div class="total-row">
                                    <span>Shipping:</span>
                                    <span>${formatCurrency(order.shippingCost)}</span>
                                </div>
                            ` : ''}
                            <div class="total-row">
                                <span>Total:</span>
                                <span style="color: ${statusColor};">${formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}" class="button">
                                View Order Details
                            </a>
                        </div>

                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                        <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                            <h4 style="margin-top: 0; color: #1e3c72;">📋 What Happens Next:</h4>
                            <p style="margin-bottom: 15px;">${actionRequired}</p>
                            
                            ${newStatus === 'DELIVERED' ? `
                                <p>We hope you enjoy your purchase! If you have any issues, please contact our support team within 7 days.</p>
                            ` : newStatus === 'CANCELLED' ? `
                                <p>If you believe this cancellation was a mistake, please contact our support team immediately.</p>
                            ` : newStatus === 'REFUNDED' ? `
                                <p>The refund has been initiated. Please allow 3-5 business days for the funds to appear in your account.</p>
                            ` : ''}
                        </div>

                        <p style="font-size: 14px; color: #4b5563; margin: 25px 0 0;">
                            <strong>🔒 Security Notice:</strong> This is an automated notification from TimberTrade. 
                            If you have any questions about your order, please contact our support team.
                        </p>

                        <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                            <strong>📧 Need Help?</strong><br>
                            • Email: <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}" style="color: ${statusColor};">
                                ${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}
                            </a><br>
                            • Phone: ${process.env.SUPPORT_PHONE || '+237 123 456 789'}<br>
                            • Order Support: <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/support/order?order=${order._id}" style="color: ${statusColor};">
                                Contact Order Support
                            </a>
                        </p>
                    </div>

                    <div class="footer">
                        <p>&copy; ${currentYear} TimberTrade. All rights reserved.</p>
                        <p>This is an automated message from the TimberTrade platform. Please do not reply to this email.</p>
                        <p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy" style="color: #6b7280;">Privacy Policy</a> • 
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms" style="color: #6b7280;">Terms of Service</a> • 
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(recipientEmail)}" style="color: #6b7280;">Unsubscribe</a>
                        </p>
                        <p>TimberTrade - Your Trusted Timber Marketplace</p>
                    </div>
                </body>
                </html>
            `
        };

        // Remove undefined CC field
        if (!emailContent.cc || emailContent.cc.length === 0) {
            delete emailContent.cc;
        }

        // Add high priority for cancelled orders
        if (newStatus === 'CANCELLED') {
            emailContent.headers = {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high'
            };
        }

        // Send email
        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            },
            timeout: 10000 // 10 second timeout
        });

        console.log(`✅ Order status email sent for order #${order.orderNumber} (${oldStatus} → ${newStatus})`);

        // Log additional info if available
        if (response.data && response.data.messageId) {
            console.log(`📧 Message ID: ${response.data.messageId}`);
        }

        return {
            success: true,
            messageId: response.data?.messageId,
            data: response.data
        };

    } catch (error) {
        // Enhanced error logging
        console.error('❌ Failed to send order status email:');
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }

        // Don't throw - we don't want to block the status update if email fails
        return {
            success: false,
            error: error.message,
            orderId: order._id,
            orderNumber: order.orderNumber
        };
    }
};


// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// const updateOrderStatus = asyncHandler(async (req, res) => {
//     const { status } = req.body;

//     const order = await Order.findById(req.params.id);

//     if (!order) {
//         res.status(404);
//         throw new Error('Order not found');
//     }

//     order.status = status;
//     await order.save();

//     // Return updated order with populated data
//     const updatedOrder = await Order.findById(req.params.id)
//         .populate({
//             path: 'user',
//             select: 'name email role',
//             populate: {
//                 path: 'company',
//                 model: 'Company',
//                 select: 'name email phone taxId address'
//             }
//         })
//         .populate('items.woodItem');

//     res.json(updatedOrder);
// });



const updateOrderStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await Order.findById(req.params.id)
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    // Store old status for email
    const oldStatus = order.status;

    // Don't update if status is the same
    if (oldStatus === status) {
        res.status(400);
        throw new Error(`Order status is already ${status}`);
    }

    // Update status
    order.status = status;

    // Add to status history if you have the field
    if (!order.statusHistory) {
        order.statusHistory = [];
    }

    order.statusHistory.push({
        status,
        changedBy: req.user._id,
        changedByEmail: req.user.email,
        changedAt: new Date()
    });

    await order.save();

    // Log the status change
    console.log(`Order #${order.orderNumber} status changed from ${oldStatus} to ${status} by ${req.user.email}`);

    // Send email notification to the user (non-blocking)
    try {
        // Send to the order user
        if (order.user && order.user.email) {
            await sendOrderStatusEmail(order, oldStatus, status, req.user);
        }

        // If the order has a company email and it's different from user email, also send to company
        if (order.user?.company?.email && order.user?.company?.email !== order.user?.email) {
            // Create a copy of order with company email as recipient
            const companyOrder = {
                ...order.toObject(),
                user: {
                    ...order.user.toObject(),
                    email: order.user.company.email,
                    name: order.user.company.name
                }
            };
            await sendOrderStatusEmail(companyOrder, oldStatus, status, req.user);
        }

        console.log(`Order status notification email sent for order #${order.orderNumber}`);
    } catch (emailError) {
        console.error('Failed to send order status notification email:', emailError);
        // Don't throw - status update was successful even if email fails
    }

    // Return updated order with populated data
    const updatedOrder = await Order.findById(req.params.id)
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem');

    res.json({
        success: true,
        message: `Order status updated to ${status}`,
        order: updatedOrder
    });
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders/all
// @access  Private/SuperAdmin
const getAllOrders = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (status && status !== 'all') {
        query.status = status;
    }

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    // Get orders with pagination - populate user and their company
    const orders = await Order.find(query)
        .populate({
            path: 'user',
            select: 'name email role',
            populate: {
                path: 'company',
                model: 'Company',
                select: 'name email phone taxId address'
            }
        })
        .populate('items.woodItem')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    res.json({
        items: orders,
        page,
        totalPages: Math.ceil(total / limit),
        total
    });
});

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getAllOrders,
};