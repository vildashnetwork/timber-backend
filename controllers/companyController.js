// const asyncHandler = require('express-async-handler');
// const Company = require('../models/Company');
// const axios = require('axios');

// // @desc    Get company by ID
// // @route   GET /api/companies/:id
// // @access  Private (Company owner or Super Admin)
// const getCompanyById = asyncHandler(async (req, res) => {
//     const company = await Company.findById(req.params.id);

//     if (!company) {
//         res.status(404);
//         throw new Error('Company not found');
//     }

//     // Log for debugging
//     console.log('User role:', req.user.role);
//     console.log('User company ID (from _id):', req.user.company?._id?.toString());
//     console.log('User company ID (as string):', req.user.company?.toString());
//     console.log('Requested company ID:', req.params.id);

//     // Check if user is authorized to view this company
//     // Super Admin can view any company
//     if (req.user.role === 'SUPER_ADMIN') {
//         return res.json(company);
//     }

//     // For regular users, check if they own this company
//     // Handle both cases where company might be an object (populated) or just an ID
//     const userCompanyId = req.user.company?._id?.toString() || // If populated
//         (typeof req.user.company === 'string' ? req.user.company : null); // If just ID

//     console.log('Extracted user company ID:', userCompanyId);
//     console.log('Comparison:', userCompanyId === req.params.id);

//     if (!userCompanyId || userCompanyId !== req.params.id) {
//         console.log('Authorization failed. User company ID:', userCompanyId, 'Requested ID:', req.params.id);
//         res.status(403);
//         throw new Error('Not authorized to view this company');
//     }

//     res.json(company);
// });

// // @desc    Get all pending companies
// // @route   GET /api/companies/pending
// // @access  Private (Super Admin only)
// const getPendingCompanies = asyncHandler(async (req, res) => {
//     const companies = await Company.find({ status: 'PENDING' })
//         .sort({ createdAt: -1 }); // Most recent first

//     res.json(companies);
// });

// // @desc    Get all companies (with optional filters)
// // @route   GET /api/companies
// // @access  Private (Super Admin only)
// const getAllCompanies = asyncHandler(async (req, res) => {
//     const { status, search } = req.query;
//     let query = {};

//     // Filter by status if provided
//     if (status && ['PENDING', 'APPROVED', 'SUSPENDED'].includes(status)) {
//         query.status = status;
//     }

//     // Search by name or taxId if provided
//     if (search) {
//         query.$or = [
//             { name: { $regex: search, $options: 'i' } },
//             { taxId: { $regex: search, $options: 'i' } }
//         ];
//     }

//     const companies = await Company.find(query)
//         .sort({ createdAt: -1 });

//     res.json(companies);
// });




// // @desc    Approve or reject company
// // @route   PUT /api/companies/:id/status
// // @access  Private (Super Admin only)
// const updateCompanyStatus = asyncHandler(async (req, res) => {
//     const { status } = req.body;

//     // Validate status
//     if (!['APPROVED', 'PENDING', 'SUSPENDED'].includes(status)) {
//         res.status(400);
//         throw new Error('Invalid status. Must be APPROVED, PENDING, or SUSPENDED');
//     }

//     const company = await Company.findById(req.params.id);

//     if (!company) {
//         res.status(404);
//         throw new Error('Company not found');
//     }

//     // Store old status for response message
//     const oldStatus = company.status;

//     // Update status
//     company.status = status;
//     await company.save();

//     // Log the status change
//     console.log(`Company ${company.name} (${company.taxId}) status changed from ${oldStatus} to ${status} by admin ${req.user.email}`);

//     res.json({
//         message: `Company ${status.toLowerCase()} successfully`,
//         company
//     });
// });

// // @desc    Upload KYB documents
// // @route   POST /api/companies/:id/documents
// // @access  Private (Company owner only)
// const uploadKYBDocuments = asyncHandler(async (req, res) => {
//     const { documentType, documentUrl } = req.body;

//     // Validate document type
//     if (!documentType || !['NIU', 'RCCM'].includes(documentType)) {
//         res.status(400);
//         throw new Error('Invalid document type. Must be NIU or RCCM');
//     }

//     // Validate document URL
//     if (!documentUrl) {
//         res.status(400);
//         throw new Error('Document URL is required');
//     }

//     const company = await Company.findById(req.params.id);

//     if (!company) {
//         res.status(404);
//         throw new Error('Company not found');
//     }

//     // Check if user is authorized to upload for this company
//     if (req.user.role !== 'SUPER_ADMIN' &&
//         req.user.company?.toString() !== req.params.id) {
//         res.status(403);
//         throw new Error('Not authorized to upload documents for this company');
//     }

//     // Check if document of this type already exists
//     const existingDocIndex = company.kybDocs.findIndex(
//         doc => doc.documentType === documentType
//     );

//     if (existingDocIndex !== -1) {
//         // Remove existing document of same type
//         company.kybDocs.splice(existingDocIndex, 1);
//     }

//     // Add new document
//     company.kybDocs.push({
//         documentType,
//         documentUrl,
//         uploadedAt: new Date(),
//     });

//     await company.save();

//     // Return the newly added document
//     const newDoc = company.kybDocs[company.kybDocs.length - 1];

//     res.status(201).json({
//         message: 'Document uploaded successfully',
//         document: newDoc,
//         company: company
//     });
// });

// // @desc    Delete company (Super Admin only)
// // @route   DELETE /api/companies/:id
// // @access  Private (Super Admin only)
// const deleteCompany = asyncHandler(async (req, res) => {
//     const company = await Company.findById(req.params.id);

//     if (!company) {
//         res.status(404);
//         throw new Error('Company not found');
//     }

//     // Optional: Check if company has any active orders before deleting
//     // This would require importing the Order model
//     // const Order = require('../models/Order');
//     // const activeOrders = await Order.find({ company: company._id, status: { $ne: 'DELIVERED' } });
//     // if (activeOrders.length > 0) {
//     //     res.status(400);
//     //     throw new Error('Cannot delete company with active orders');
//     // }

//     await company.deleteOne();

//     res.json({
//         message: 'Company deleted successfully',
//         companyId: req.params.id
//     });
// });






// /**
//  * Send company status update email notification
//  * @param {Object} company - Company object
//  * @param {string} oldStatus - Previous status
//  * @param {string} newStatus - New status
//  * @param {string} adminEmail - Email of admin who made the change
//  * @param {string} reason - Optional reason for status change
//  * @param {Object} options - Additional options
//  * @returns {Promise<Object>} - Email send response
//  */
// const sendCompanyUpdateEmail = async (company, oldStatus, newStatus, adminEmail, reason = 'Not Stated', options = {}) => {
//     try {
//         const apiKey = process.env.BREVO_API_KEY;
//         const url = "https://api.brevo.com/v3/smtp/email";
//         const currentYear = new Date().getFullYear();
//         const currentDate = new Date().toLocaleString('en-US', {
//             dateStyle: 'full',
//             timeStyle: 'long'
//         });

//         // Validate required fields
//         if (!company || !company.email) {
//             throw new Error('Company email is required');
//         }

//         if (!oldStatus || !newStatus) {
//             throw new Error('Old and new status are required');
//         }

//         // Determine email template based on status
//         let statusColor, statusIcon, statusMessage, actionRequired, emailSubject, notificationType;

//         switch (newStatus) {
//             case 'APPROVED':
//                 statusColor = '#059669';
//                 statusIcon = '✅';
//                 statusMessage = 'Your company has been approved!';
//                 notificationType = 'Approval Notification';
//                 emailSubject = '✅ Company Approved - Welcome to TimberTrade';
//                 actionRequired = 'You can now start trading on our platform. Access your dashboard to begin.';
//                 break;
//             case 'PENDING':
//                 statusColor = '#D97706';
//                 statusIcon = '⏳';
//                 statusMessage = 'Your company status has been set to pending review.';
//                 notificationType = 'Pending Review';
//                 emailSubject = '⏳ Company Under Review - TimberTrade';
//                 actionRequired = 'Our team is reviewing your documents. This usually takes 1-2 business days.';
//                 break;
//             case 'SUSPENDED':
//                 statusColor = '#DC2626';
//                 statusIcon = '⚠️';
//                 statusMessage = 'Your company account has been suspended.';
//                 notificationType = 'Account Suspension';
//                 emailSubject = '⚠️ Important: Company Account Suspended - TimberTrade';
//                 actionRequired = 'Please contact our support team immediately for assistance.';
//                 break;
//             default:
//                 statusColor = '#6B7280';
//                 statusIcon = 'ℹ️';
//                 statusMessage = 'Your company status has been updated.';
//                 notificationType = 'Status Update';
//                 emailSubject = 'ℹ️ Company Status Update - TimberTrade';
//                 actionRequired = 'Please check your dashboard for more details.';
//         }

//         // Add reason to subject if provided
//         if (reason) {
//             emailSubject = `${emailSubject} - ${reason.substring(0, 50)}`;
//         }

//         // Determine if this is a critical update
//         const isCritical = newStatus === 'SUSPENDED';

//         const emailContent = {
//             sender: {
//                 name: process.env.FROM_NAME || 'TimberTrade Admin',
//                 email: process.env.SUPPORT_EMAIL || 'admin@timbertrade.com'
//             },
//             to: [
//                 {
//                     email: company.email,
//                     name: company.directorName || company.name
//                 }
//             ],
//             cc: company.directorEmail && company.directorEmail !== company.email
//                 ? [{ email: company.directorEmail, name: company.directorName || 'Director' }]
//                 : undefined,
//             bcc: options.bcc || undefined,
//             subject: emailSubject,
//             htmlContent: `
//                 <!DOCTYPE html>
//                 <html>
//                 <head>
//                     <meta charset="utf-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>Company Status Update - TimberTrade</title>
//                     <style>
//                         body {
//                             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//                             line-height: 1.6;
//                             color: #333;
//                             max-width: 600px;
//                             margin: 0 auto;
//                             padding: 20px;
//                         }
//                         .header {
//                             background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
//                             color: white;
//                             padding: 30px;
//                             text-align: center;
//                             border-radius: 10px 10px 0 0;
//                         }
//                         .header h1 {
//                             margin: 0;
//                             font-size: 28px;
//                         }
//                         .header p {
//                             margin: 5px 0 0;
//                             opacity: 0.9;
//                         }
//                         .content {
//                             background: #f9f9f9;
//                             padding: 40px;
//                             border-radius: 0 0 10px 10px;
//                             border: 1px solid #e0e0e0;
//                             border-top: none;
//                         }
//                         .status-badge {
//                             display: inline-block;
//                             padding: 12px 24px;
//                             background: ${statusColor}15;
//                             color: ${statusColor};
//                             border: 2px solid ${statusColor};
//                             border-radius: 50px;
//                             font-weight: bold;
//                             font-size: 20px;
//                             margin: 20px 0;
//                             text-transform: uppercase;
//                             letter-spacing: 1px;
//                         }
//                         .status-icon {
//                             font-size: 64px;
//                             margin-bottom: 20px;
//                             line-height: 1;
//                         }
//                         .company-details {
//                             background: white;
//                             padding: 25px;
//                             border-radius: 12px;
//                             margin: 25px 0;
//                             border-left: 4px solid ${statusColor};
//                             box-shadow: 0 2px 8px rgba(0,0,0,0.05);
//                         }
//                         .company-details h3 {
//                             margin-top: 0;
//                             margin-bottom: 15px;
//                             color: #1e3c72;
//                             font-size: 18px;
//                             border-bottom: 2px solid #e0e0e0;
//                             padding-bottom: 10px;
//                         }
//                         .company-details p {
//                             margin: 10px 0;
//                             display: flex;
//                             align-items: center;
//                             gap: 10px;
//                         }
//                         .company-details strong {
//                             min-width: 120px;
//                             color: #4b5563;
//                         }
//                         .button {
//                             display: inline-block;
//                             padding: 14px 32px;
//                             background: ${statusColor};
//                             color: white !important;
//                             text-decoration: none;
//                             border-radius: 50px;
//                             margin: 25px 0 15px;
//                             font-weight: bold;
//                             font-size: 16px;
//                             box-shadow: 0 4px 6px rgba(0,0,0,0.1);
//                             transition: all 0.3s ease;
//                         }
//                         .button:hover {
//                             opacity: 0.9;
//                             transform: translateY(-2px);
//                             box-shadow: 0 6px 8px rgba(0,0,0,0.15);
//                         }
//                         .footer {
//                             text-align: center;
//                             color: #666;
//                             font-size: 12px;
//                             margin-top: 30px;
//                             padding-top: 20px;
//                             border-top: 1px solid #e0e0e0;
//                         }
//                         .info-box {
//                             background: #f0f4ff;
//                             border: 1px solid #e0e7ff;
//                             border-radius: 12px;
//                             padding: 20px;
//                             margin: 25px 0;
//                         }
//                         .status-change {
//                             background: white;
//                             padding: 15px;
//                             border-radius: 8px;
//                             font-size: 15px;
//                             color: #4b5563;
//                             border: 1px solid #e0e0e0;
//                             margin-top: 15px;
//                         }
//                         .status-change .arrow {
//                             font-size: 20px;
//                             margin: 0 10px;
//                             color: ${statusColor};
//                         }
//                         .reason-box {
//                             background: ${isCritical ? '#fee2e2' : '#fef3c7'};
//                             border-left: 4px solid ${statusColor};
//                             padding: 15px;
//                             margin: 20px 0;
//                             border-radius: 8px;
//                         }
//                         .reason-box strong {
//                             color: ${statusColor};
//                         }
//                         .next-steps {
//                             background: #f8fafc;
//                             padding: 20px;
//                             border-radius: 12px;
//                             margin: 25px 0;
//                         }
//                         .next-steps h4 {
//                             margin-top: 0;
//                             color: #1e3c72;
//                         }
//                         .next-steps ul {
//                             padding-left: 20px;
//                             margin-bottom: 0;
//                         }
//                         .next-steps li {
//                             margin: 8px 0;
//                             color: #4b5563;
//                         }
//                         .metadata {
//                             font-size: 13px;
//                             color: #6b7280;
//                             background: #f3f4f6;
//                             padding: 15px;
//                             border-radius: 8px;
//                             margin: 20px 0;
//                         }
//                         .metadata p {
//                             margin: 5px 0;
//                         }
//                         .divider {
//                             border: none;
//                             border-top: 2px solid #e0e0e0;
//                             margin: 30px 0;
//                         }
//                         .support-link {
//                             color: ${statusColor};
//                             text-decoration: none;
//                             font-weight: bold;
//                         }
//                         .support-link:hover {
//                             text-decoration: underline;
//                         }
//                         @media only screen and (max-width: 600px) {
//                             body { padding: 10px; }
//                             .content { padding: 20px; }
//                             .company-details strong { min-width: 100px; }
//                         }
//                     </style>
//                 </head>
//                 <body>
//                     <div class="header">
//                         <h1>🌳 TimberTrade</h1>
//                         <p>Company Status Update - ${notificationType}</p>
//                     </div>

//                     <div class="content">
//                         <div class="status-icon">${statusIcon}</div>

//                         <h2 style="text-align: center; color: ${statusColor}; margin: 0 0 10px;">
//                             ${statusMessage}
//                         </h2>

//                         <div style="text-align: center;">
//                             <div class="status-badge">${newStatus}</div>
//                         </div>

//                         ${reason ? `
//                             <div class="reason-box">
//                                 <strong>📝 Reason for update:</strong>
//                                 <p style="margin: 10px 0 0; color: #4b5563;">${reason}</p>
//                             </div>
//                         ` : ''}

//                         <div class="company-details">
//                             <h3>🏢 Company Information</h3>
//                             <p><strong>Company Name:</strong> ${company.name}</p>
//                             <p><strong>Tax ID (NIU):</strong> ${company.taxId}</p>
//                             <p><strong>Company Email:</strong> ${company.email}</p>
//                             <p><strong>Phone:</strong> ${company.phone || 'Not provided'}</p>
//                             <p><strong>Address:</strong> ${company.address || 'Not provided'}</p>
//                             ${company.directorName ? `<p><strong>Director:</strong> ${company.directorName}</p>` : ''}
//                             ${company.directorEmail ? `<p><strong>Director Email:</strong> ${company.directorEmail}</p>` : ''}
//                             ${company.website ? `<p><strong>Website:</strong> ${company.website}</p>` : ''}
//                             ${company.yearEstablished ? `<p><strong>Year Established:</strong> ${company.yearEstablished}</p>` : ''}
//                         </div>

//                         <div class="info-box">
//                             <h4 style="margin-top: 0; color: #1e3c72;">📊 Status Change Details</h4>
//                             <div class="status-change">
//                                 <strong>Previous Status:</strong> 
//                                 <span style="color: #6b7280; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; margin-left: 8px;">
//                                     ${oldStatus}
//                                 </span>
//                                 <span class="arrow">→</span>
//                                 <strong>New Status:</strong> 
//                                 <span style="color: ${statusColor}; background: ${statusColor}15; padding: 4px 8px; border-radius: 4px; margin-left: 8px; font-weight: bold;">
//                                     ${newStatus}
//                                 </span>
//                             </div>

//                             <p style="margin: 15px 0 0; color: #4b5563;">
//                                 <strong>🕒 Update Time:</strong> ${currentDate}
//                             </p>
//                         </div>

//                         <div class="next-steps">
//                             <h4>📋 What This Means For You:</h4>
//                             <p style="margin-bottom: 15px;">${actionRequired}</p>

//                             <h4 style="margin-top: 20px;">📌 Next Steps:</h4>
//                             <ul>
//                                 ${newStatus === 'APPROVED' ? `
//                                     <li>✅ Access your company dashboard to start trading</li>
//                                     <li>🛒 Browse the timber catalog and place orders</li>
//                                     <li>🤝 Connect with verified sellers</li>
//                                     <li>📦 Track your orders and manage your profile</li>
//                                     <li>📊 Monitor your trading activity</li>
//                                 ` : newStatus === 'PENDING' ? `
//                                     <li>🔍 Our team is reviewing your documents</li>
//                                     <li>⏱️ This usually takes 1-2 business days</li>
//                                     <li>📧 You'll receive another email once reviewed</li>
//                                     <li>💼 Ensure all company information is accurate</li>
//                                     <li>📞 Contact support if you have questions</li>
//                                 ` : newStatus === 'SUSPENDED' ? `
//                                     <li>⚠️ Contact our support team immediately</li>
//                                     <li>📋 Review your company documents for compliance</li>
//                                     <li>📤 Provide any requested information promptly</li>
//                                     <li>🤝 We're here to help resolve any issues</li>
//                                     <li>📞 Call our support hotline: ${process.env.SUPPORT_PHONE || '+237 123 456 789'}</li>
//                                 ` : `
//                                     <li>📊 Check your dashboard for more details</li>
//                                     <li>📞 Contact support if you have questions</li>
//                                     <li>🔄 Keep your company information updated</li>
//                                 `}
//                             </ul>
//                         </div>

//                         <div style="text-align: center;">
//                             <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/dashboard" class="button">
//                                 Access Your Dashboard
//                             </a>
//                         </div>

//                         <hr class="divider">

//                         <div class="metadata">
//                             <p><strong>🆔 Company ID:</strong> ${company._id}</p>
//                             <p><strong>👤 Updated By:</strong> ${adminEmail}</p>
//                             <p><strong>📅 Account Created:</strong> ${new Date(company.createdAt).toLocaleDateString()}</p>
//                             <p><strong>🕒 Last Updated:</strong> ${new Date(company.updatedAt).toLocaleString()}</p>
//                         </div>

//                         <p style="font-size: 14px; color: #4b5563; margin: 25px 0 0;">
//                             <strong>🔒 Security Notice:</strong> This is an automated notification from TimberTrade. 
//                             If you have any questions or concerns, please contact our support team.
//                         </p>

//                         <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
//                             <strong>📧 Need Help?</strong><br>
//                             • Email: <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}" class="support-link">
//                                 ${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}
//                             </a><br>
//                             • Phone: ${process.env.SUPPORT_PHONE || '+237 123 456 789'}<br>
//                             • Hours: Monday - Friday, 9:00 AM - 6:00 PM (WAT)
//                         </p>
//                     </div>

//                     <div class="footer">
//                         <p>&copy; ${currentYear} TimberTrade. All rights reserved.</p>
//                         <p>This is an automated message from the TimberTrade platform. Please do not reply to this email.</p>
//                         <p>
//                             <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy" style="color: #6b7280;">Privacy Policy</a> • 
//                             <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms" style="color: #6b7280;">Terms of Service</a> • 
//                             <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(company.email)}" style="color: #6b7280;">Unsubscribe</a>
//                         </p>
//                         <p>TimberTrade - Your Trusted Timber Marketplace</p>
//                     </div>
//                 </body>
//                 </html>
//             `
//         };

//         // Remove undefined CC field
//         if (!emailContent.cc || emailContent.cc.length === 0) {
//             delete emailContent.cc;
//         }

//         // Add high priority for critical updates
//         if (isCritical) {
//             emailContent.headers = {
//                 'X-Priority': '1',
//                 'X-MSMail-Priority': 'High',
//                 'Importance': 'high'
//             };
//         }

//         // Send email
//         const response = await axios.post(url, emailContent, {
//             headers: {
//                 "api-key": apiKey,
//                 "Content-Type": "application/json"
//             },
//             timeout: 10000 // 10 second timeout
//         });

//         console.log(`✅ Status update email sent to ${company.email} (${oldStatus} → ${newStatus})`);

//         // Log additional info if available
//         if (response.data && response.data.messageId) {
//             console.log(`📧 Message ID: ${response.data.messageId}`);
//         }

//         return {
//             success: true,
//             messageId: response.data?.messageId,
//             data: response.data
//         };

//     } catch (error) {
//         // Enhanced error logging
//         console.error('❌ Failed to send status update email:');
//         if (error.response) {
//             console.error('Response data:', error.response.data);
//             console.error('Response status:', error.response.status);
//             console.error('Response headers:', error.response.headers);
//         } else if (error.request) {
//             console.error('No response received:', error.request);
//         } else {
//             console.error('Error:', error.message);
//         }

//         // Don't throw - we don't want to block the status update if email fails
//         return {
//             success: false,
//             error: error.message,
//             company: company.email,
//             oldStatus,
//             newStatus
//         };
//     }
// };
// // @desc    Update company details
// // @route   PUT /api/companies/:id
// // @access  Private (Company owner or Super Admin)
// // const updateCompany = asyncHandler(async (req, res) => {
// //     const { name, address, phone, directorName, directorEmail } = req.body;

// //     const company = await Company.findById(req.params.id);

// //     if (!company) {
// //         res.status(404);
// //         throw new Error('Company not found');
// //     }

// //     // Check authorization
// //     if (req.user.role !== 'SUPER_ADMIN' &&
// //         req.user.company?.toString() !== req.params.id) {
// //         res.status(403);
// //         throw new Error('Not authorized to update this company');
// //     }

// //     // Update fields if provided
// //     if (name) company.name = name;
// //     if (address) company.address = address;
// //     if (phone) company.phone = phone;
// //     if (directorName) company.directorName = directorName;
// //     if (directorEmail) company.directorEmail = directorEmail;

// //     await company.save();

// //     res.json({
// //         message: 'Company updated successfully',
// //         company
// //     });
// // });


// const updateCompany = asyncHandler(async (req, res) => {
//     const {
//         name,
//         address,
//         phone,
//         directorName,
//         directorEmail,
//         website,
//         description,
//         yearEstablished,
//         avatar
//     } = req.body;

//     const company = await Company.findById(req.params.id);

//     if (!company) {
//         res.status(404);
//         throw new Error('Company not found');
//     }

//     // Check authorization
//     const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
//     const isCompanyOwner = req.user.company?.toString() === req.params.id;

//     if (!isSuperAdmin && !isCompanyOwner) {
//         res.status(403);
//         throw new Error('Not authorized to update this company');
//     }

//     // Store old values for email notification
//     const oldValues = {
//         name: company.name,
//         address: company.address,
//         phone: company.phone,
//         directorName: company.directorName,
//         directorEmail: company.directorEmail,
//         website: company.website,
//         description: company.description,
//         yearEstablished: company.yearEstablished,
//         avatar: company.avatar
//     };

//     // Track what fields are being updated
//     const updatedFields = [];

//     // Update fields if provided
//     if (name && name !== company.name) {
//         company.name = name;
//         updatedFields.push('name');
//     }

//     if (address !== undefined && address !== company.address) {
//         company.address = address;
//         updatedFields.push('address');
//     }

//     if (phone !== undefined && phone !== company.phone) {
//         company.phone = phone;
//         updatedFields.push('phone');
//     }

//     if (directorName !== undefined && directorName !== company.directorName) {
//         company.directorName = directorName;
//         updatedFields.push('directorName');
//     }

//     if (directorEmail !== undefined && directorEmail !== company.directorEmail) {
//         company.directorEmail = directorEmail;
//         updatedFields.push('directorEmail');
//     }

//     if (website !== undefined && website !== company.website) {
//         company.website = website;
//         updatedFields.push('website');
//     }

//     if (description !== undefined && description !== company.description) {
//         company.description = description;
//         updatedFields.push('description');
//     }

//     if (yearEstablished !== undefined && yearEstablished !== company.yearEstablished) {
//         company.yearEstablished = yearEstablished;
//         updatedFields.push('yearEstablished');
//     }

//     if (avatar !== undefined && avatar !== company.avatar) {
//         company.avatar = avatar;
//         updatedFields.push('avatar');
//     }

//     // If no fields were updated, return early
//     if (updatedFields.length === 0) {
//         return res.json({
//             message: 'No changes detected',
//             company
//         });
//     }

//     // Add to update history if you have a history field
//     if (!company.updateHistory) {
//         company.updateHistory = [];
//     }

//     company.updateHistory.push({
//         updatedBy: req.user._id,
//         updatedByEmail: req.user.email,
//         updatedFields: updatedFields,
//         oldValues: oldValues,
//         updatedAt: new Date()
//     });

//     await company.save();

//     // Log the update
//     console.log(`Company ${company.name} (${company.taxId}) updated by ${req.user.email}. Fields: ${updatedFields.join(', ')}`);

//     // Send email notification to the company (non-blocking)
//     try {
//         await sendCompanyUpdateEmail(
//             company,
//             oldValues,
//             updatedFields,
//             req.user.email,
//             isSuperAdmin ? 'Super Admin' : 'Company Owner'
//         );

//         // If director email is different from company email, also send to director
//         if (company.directorEmail && company.directorEmail !== company.email) {
//             await sendCompanyUpdateEmail(
//                 { ...company.toObject(), email: company.directorEmail },
//                 oldValues,
//                 updatedFields,
//                 req.user.email,
//                 isSuperAdmin ? 'Super Admin' : 'Company Owner'
//             );
//         }

//         console.log(`Update notification email sent to ${company.email}`);
//     } catch (emailError) {
//         console.error('Failed to send update notification email:', emailError);
//         // Don't throw - update was successful even if email fails
//     }

//     res.json({
//         success: true,
//         message: 'Company updated successfully',
//         updatedFields,
//         company: {
//             _id: company._id,
//             name: company.name,
//             taxId: company.taxId,
//             email: company.email,
//             phone: company.phone,
//             address: company.address,
//             directorName: company.directorName,
//             directorEmail: company.directorEmail,
//             website: company.website,
//             description: company.description,
//             yearEstablished: company.yearEstablished,
//             avatar: company.avatar,
//             status: company.status,
//             updatedAt: company.updatedAt
//         }
//     });
// });
// // @desc    Get company statistics (Super Admin only)
// // @route   GET /api/companies/stats
// // @access  Private (Super Admin only)
// const getCompanyStats = asyncHandler(async (req, res) => {
//     const totalCompanies = await Company.countDocuments();
//     const pendingCompanies = await Company.countDocuments({ status: 'PENDING' });
//     const approvedCompanies = await Company.countDocuments({ status: 'APPROVED' });
//     const suspendedCompanies = await Company.countDocuments({ status: 'SUSPENDED' });

//     // Get recent registrations (last 7 days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//     const recentRegistrations = await Company.countDocuments({
//         createdAt: { $gte: sevenDaysAgo }
//     });

//     res.json({
//         total: totalCompanies,
//         pending: pendingCompanies,
//         approved: approvedCompanies,
//         suspended: suspendedCompanies,
//         recentRegistrations,
//         registrationTrend: {
//             last7Days: recentRegistrations
//         }
//     });
// });

// module.exports = {
//     getCompanyById,
//     getPendingCompanies,
//     getAllCompanies,
//     updateCompanyStatus,
//     uploadKYBDocuments,
//     deleteCompany,
//     updateCompany,
//     getCompanyStats
// };

































const asyncHandler = require('express-async-handler');
const Company = require('../models/Company');
const axios = require('axios');

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private (Company owner or Super Admin)
const getCompanyById = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // Log for debugging
    console.log('User role:', req.user.role);
    console.log('User company ID (from _id):', req.user.company?._id?.toString());
    console.log('User company ID (as string):', req.user.company?.toString());
    console.log('Requested company ID:', req.params.id);

    // Check if user is authorized to view this company
    // Super Admin can view any company
    if (req.user.role === 'SUPER_ADMIN') {
        return res.json(company);
    }

    // For regular users, check if they own this company
    // Handle both cases where company might be an object (populated) or just an ID
    const userCompanyId = req.user.company?._id?.toString() || // If populated
        (typeof req.user.company === 'string' ? req.user.company : null); // If just ID

    console.log('Extracted user company ID:', userCompanyId);
    console.log('Comparison:', userCompanyId === req.params.id);

    if (!userCompanyId || userCompanyId !== req.params.id) {
        console.log('Authorization failed. User company ID:', userCompanyId, 'Requested ID:', req.params.id);
        res.status(403);
        throw new Error('Not authorized to view this company');
    }

    res.json(company);
});

// @desc    Get all pending companies
// @route   GET /api/companies/pending
// @access  Private (Super Admin only)
const getPendingCompanies = asyncHandler(async (req, res) => {
    const companies = await Company.find({ status: 'PENDING' })
        .sort({ createdAt: -1 }); // Most recent first

    res.json(companies);
});

// @desc    Get all companies (with optional filters)
// @route   GET /api/companies
// @access  Private (Super Admin only)
const getAllCompanies = asyncHandler(async (req, res) => {
    const { status, search } = req.query;
    let query = {};

    // Filter by status if provided
    if (status && ['PENDING', 'APPROVED', 'SUSPENDED'].includes(status)) {
        query.status = status;
    }

    // Search by name or taxId if provided
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { taxId: { $regex: search, $options: 'i' } }
        ];
    }

    const companies = await Company.find(query)
        .sort({ createdAt: -1 });

    res.json(companies);
});

/**
 * Send company status update email notification
 * @param {Object} company - Company object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} adminEmail - Email of admin who made the change
 * @param {string} reason - Optional reason for status change
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Email send response
 */
const sendCompanyStatusEmail = async (company, oldStatus, newStatus, adminEmail, reason = 'Not Stated', options = {}) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'long'
        });

        // Validate required fields
        if (!company || !company.email) {
            throw new Error('Company email is required');
        }

        if (!oldStatus || !newStatus) {
            throw new Error('Old and new status are required');
        }

        // Determine email template based on status
        let statusColor, statusIcon, statusMessage, actionRequired, emailSubject, notificationType;

        switch (newStatus) {
            case 'APPROVED':
                statusColor = '#059669';
                statusIcon = '✅';
                statusMessage = 'Your company has been approved!';
                notificationType = 'Approval Notification';
                emailSubject = '✅ Company Approved - Welcome to TimberTrade';
                actionRequired = 'You can now start trading on our platform. Access your dashboard to begin.';
                break;
            case 'PENDING':
                statusColor = '#D97706';
                statusIcon = '⏳';
                statusMessage = 'Your company status has been set to pending review.';
                notificationType = 'Pending Review';
                emailSubject = '⏳ Company Under Review - TimberTrade';
                actionRequired = 'Our team is reviewing your documents. This usually takes 1-2 business days.';
                break;
            case 'SUSPENDED':
                statusColor = '#DC2626';
                statusIcon = '⚠️';
                statusMessage = 'Your company account has been suspended.';
                notificationType = 'Account Suspension';
                emailSubject = '⚠️ Important: Company Account Suspended - TimberTrade';
                actionRequired = 'Please contact our support team immediately for assistance.';
                break;
            default:
                statusColor = '#6B7280';
                statusIcon = 'ℹ️';
                statusMessage = 'Your company status has been updated.';
                notificationType = 'Status Update';
                emailSubject = 'ℹ️ Company Status Update - TimberTrade';
                actionRequired = 'Please check your dashboard for more details.';
        }

        // Add reason to subject if provided
        if (reason && reason !== 'Not Stated') {
            emailSubject = `${emailSubject} - ${reason.substring(0, 50)}`;
        }

        // Determine if this is a critical update
        const isCritical = newStatus === 'SUSPENDED';

        const emailContent = {
            sender: {
                name: process.env.FROM_NAME || 'TimberTrade Admin',
                email: process.env.SUPPORT_EMAIL || 'admin@timbertrade.com'
            },
            to: [
                {
                    email: company.email,
                    name: company.directorName || company.name
                }
            ],
            cc: company.directorEmail && company.directorEmail !== company.email
                ? [{ email: company.directorEmail, name: company.directorName || 'Director' }]
                : undefined,
            bcc: options.bcc || undefined,
            subject: emailSubject,
            htmlContent: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Company Status Update - TimberTrade</title>
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
                            font-size: 20px;
                            margin: 20px 0;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        .status-icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                            line-height: 1;
                        }
                        .company-details {
                            background: white;
                            padding: 25px;
                            border-radius: 12px;
                            margin: 25px 0;
                            border-left: 4px solid ${statusColor};
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        }
                        .company-details h3 {
                            margin-top: 0;
                            margin-bottom: 15px;
                            color: #1e3c72;
                            font-size: 18px;
                            border-bottom: 2px solid #e0e0e0;
                            padding-bottom: 10px;
                        }
                        .company-details p {
                            margin: 10px 0;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        .company-details strong {
                            min-width: 120px;
                            color: #4b5563;
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
                        .footer {
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #e0e0e0;
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
                        .reason-box {
                            background: ${isCritical ? '#fee2e2' : '#fef3c7'};
                            border-left: 4px solid ${statusColor};
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 8px;
                        }
                        .reason-box strong {
                            color: ${statusColor};
                        }
                        .next-steps {
                            background: #f8fafc;
                            padding: 20px;
                            border-radius: 12px;
                            margin: 25px 0;
                        }
                        .next-steps h4 {
                            margin-top: 0;
                            color: #1e3c72;
                        }
                        .next-steps ul {
                            padding-left: 20px;
                            margin-bottom: 0;
                        }
                        .next-steps li {
                            margin: 8px 0;
                            color: #4b5563;
                        }
                        .metadata {
                            font-size: 13px;
                            color: #6b7280;
                            background: #f3f4f6;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .metadata p {
                            margin: 5px 0;
                        }
                        .divider {
                            border: none;
                            border-top: 2px solid #e0e0e0;
                            margin: 30px 0;
                        }
                        .support-link {
                            color: ${statusColor};
                            text-decoration: none;
                            font-weight: bold;
                        }
                        .support-link:hover {
                            text-decoration: underline;
                        }
                        @media only screen and (max-width: 600px) {
                            body { padding: 10px; }
                            .content { padding: 20px; }
                            .company-details strong { min-width: 100px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🌳 TimberTrade</h1>
                        <p>Company Status Update - ${notificationType}</p>
                    </div>
                    
                    <div class="content">
                        <div class="status-icon">${statusIcon}</div>
                        
                        <h2 style="text-align: center; color: ${statusColor}; margin: 0 0 10px;">
                            ${statusMessage}
                        </h2>
                        
                        <div style="text-align: center;">
                            <div class="status-badge">${newStatus}</div>
                        </div>

                        ${reason && reason !== 'Not Stated' ? `
                            <div class="reason-box">
                                <strong>📝 Reason for update:</strong>
                                <p style="margin: 10px 0 0; color: #4b5563;">${reason}</p>
                            </div>
                        ` : ''}

                        <div class="company-details">
                            <h3>🏢 Company Information</h3>
                            <p><strong>Company Name:</strong> ${company.name}</p>
                            <p><strong>Tax ID (NIU):</strong> ${company.taxId}</p>
                            <p><strong>Company Email:</strong> ${company.email}</p>
                            <p><strong>Phone:</strong> ${company.phone || 'Not provided'}</p>
                            <p><strong>Address:</strong> ${company.address || 'Not provided'}</p>
                            ${company.directorName ? `<p><strong>Director:</strong> ${company.directorName}</p>` : ''}
                            ${company.directorEmail ? `<p><strong>Director Email:</strong> ${company.directorEmail}</p>` : ''}
                            ${company.website ? `<p><strong>Website:</strong> ${company.website}</p>` : ''}
                            ${company.yearEstablished ? `<p><strong>Year Established:</strong> ${company.yearEstablished}</p>` : ''}
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
                        </div>

                        <div class="next-steps">
                            <h4>📋 What This Means For You:</h4>
                            <p style="margin-bottom: 15px;">${actionRequired}</p>
                            
                            <h4 style="margin-top: 20px;">📌 Next Steps:</h4>
                            <ul>
                                ${newStatus === 'APPROVED' ? `
                                    <li>✅ Access your company dashboard to start trading</li>
                                    <li>🛒 Browse the timber catalog and place orders</li>
                                    <li>🤝 Connect with verified sellers</li>
                                    <li>📦 Track your orders and manage your profile</li>
                                    <li>📊 Monitor your trading activity</li>
                                ` : newStatus === 'PENDING' ? `
                                    <li>🔍 Our team is reviewing your documents</li>
                                    <li>⏱️ This usually takes 1-2 business days</li>
                                    <li>📧 You'll receive another email once reviewed</li>
                                    <li>💼 Ensure all company information is accurate</li>
                                    <li>📞 Contact support if you have questions</li>
                                ` : newStatus === 'SUSPENDED' ? `
                                    <li>⚠️ Contact our support team immediately</li>
                                    <li>📋 Review your company documents for compliance</li>
                                    <li>📤 Provide any requested information promptly</li>
                                    <li>🤝 We're here to help resolve any issues</li>
                                    <li>📞 Call our support hotline: ${process.env.SUPPORT_PHONE || '+237 123 456 789'}</li>
                                ` : `
                                    <li>📊 Check your dashboard for more details</li>
                                    <li>📞 Contact support if you have questions</li>
                                    <li>🔄 Keep your company information updated</li>
                                `}
                            </ul>
                        </div>

                        <div style="text-align: center;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/dashboard" class="button">
                                Access Your Dashboard
                            </a>
                        </div>

                        <hr class="divider">

                        <div class="metadata">
                            <p><strong>🆔 Company ID:</strong> ${company._id}</p>
                            <p><strong>👤 Updated By:</strong> ${adminEmail}</p>
                            <p><strong>📅 Account Created:</strong> ${new Date(company.createdAt).toLocaleDateString()}</p>
                            <p><strong>🕒 Last Updated:</strong> ${new Date(company.updatedAt).toLocaleString()}</p>
                        </div>

                        <p style="font-size: 14px; color: #4b5563; margin: 25px 0 0;">
                            <strong>🔒 Security Notice:</strong> This is an automated notification from TimberTrade. 
                            If you have any questions or concerns, please contact our support team.
                        </p>

                        <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                            <strong>📧 Need Help?</strong><br>
                            • Email: <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}" class="support-link">
                                ${process.env.SUPPORT_EMAIL || 'support@timbertrade.com'}
                            </a><br>
                            • Phone: ${process.env.SUPPORT_PHONE || '+237 123 456 789'}<br>
                            • Hours: Monday - Friday, 9:00 AM - 6:00 PM (WAT)
                        </p>
                    </div>

                    <div class="footer">
                        <p>&copy; ${currentYear} TimberTrade. All rights reserved.</p>
                        <p>This is an automated message from the TimberTrade platform. Please do not reply to this email.</p>
                        <p>
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy" style="color: #6b7280;">Privacy Policy</a> • 
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms" style="color: #6b7280;">Terms of Service</a> • 
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(company.email)}" style="color: #6b7280;">Unsubscribe</a>
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

        // Add high priority for critical updates
        if (isCritical) {
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

        console.log(`✅ Status update email sent to ${company.email} (${oldStatus} → ${newStatus})`);

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
        console.error('❌ Failed to send status update email:');
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }

        // Don't throw - we don't want to block the status update if email fails
        return {
            success: false,
            error: error.message,
            company: company.email,
            oldStatus,
            newStatus
        };
    }
};

// @desc    Approve or reject company
// @route   PUT /api/companies/:id/status
// @access  Private (Super Admin only)
const updateCompanyStatus = asyncHandler(async (req, res) => {
    const { status, reason } = req.body;

    // Validate status
    if (!['APPROVED', 'PENDING', 'SUSPENDED'].includes(status)) {
        res.status(400);
        throw new Error('Invalid status. Must be APPROVED, PENDING, or SUSPENDED');
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // Store old status for response message
    const oldStatus = company.status;

    // Don't update if status is the same
    if (oldStatus === status) {
        res.status(400);
        throw new Error(`Company status is already ${status}`);
    }

    // Update status
    company.status = status;

    // Add to status history if you have the field
    if (!company.statusHistory) {
        company.statusHistory = [];
    }

    company.statusHistory.push({
        status,
        changedBy: req.user._id,
        changedByEmail: req.user.email,
        reason: reason || 'Status updated by admin',
        changedAt: new Date()
    });

    await company.save();

    // Log the status change
    console.log(`Company ${company.name} (${company.taxId}) status changed from ${oldStatus} to ${status} by admin ${req.user.email}`);

    // Send email notification to the company (non-blocking)
    try {
        await sendCompanyStatusEmail(
            company,
            oldStatus,
            status,
            req.user.email,
            reason || 'Status updated by administrator'
        );

        // If director email is different from company email, also send to director
        if (company.directorEmail && company.directorEmail !== company.email) {
            await sendCompanyStatusEmail(
                { ...company.toObject(), email: company.directorEmail },
                oldStatus,
                status,
                req.user.email,
                reason || 'Status updated by administrator'
            );
        }

        console.log(`Status update notification email sent to ${company.email}`);
    } catch (emailError) {
        console.error('Failed to send status update notification email:', emailError);
        // Don't throw - status update was successful even if email fails
    }

    res.json({
        success: true,
        message: `Company ${status.toLowerCase()} successfully`,
        company: {
            _id: company._id,
            name: company.name,
            taxId: company.taxId,
            status: company.status,
            oldStatus,
            email: company.email,
            directorEmail: company.directorEmail
        }
    });
});

// @desc    Upload KYB documents
// @route   POST /api/companies/:id/documents
// @access  Private (Company owner only)
const uploadKYBDocuments = asyncHandler(async (req, res) => {
    const { documentType, documentUrl } = req.body;

    // Validate document type
    if (!documentType || !['NIU', 'RCCM'].includes(documentType)) {
        res.status(400);
        throw new Error('Invalid document type. Must be NIU or RCCM');
    }

    // Validate document URL
    if (!documentUrl) {
        res.status(400);
        throw new Error('Document URL is required');
    }

    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // Check if user is authorized to upload for this company
    if (req.user.role !== 'SUPER_ADMIN' &&
        req.user.company?.toString() !== req.params.id) {
        res.status(403);
        throw new Error('Not authorized to upload documents for this company');
    }

    // Check if document of this type already exists
    const existingDocIndex = company.kybDocs.findIndex(
        doc => doc.documentType === documentType
    );

    if (existingDocIndex !== -1) {
        // Remove existing document of same type
        company.kybDocs.splice(existingDocIndex, 1);
    }

    // Add new document
    company.kybDocs.push({
        documentType,
        documentUrl,
        uploadedAt: new Date(),
    });

    await company.save();

    // Return the newly added document
    const newDoc = company.kybDocs[company.kybDocs.length - 1];

    res.status(201).json({
        message: 'Document uploaded successfully',
        document: newDoc,
        company: company
    });
});

// @desc    Delete company (Super Admin only)
// @route   DELETE /api/companies/:id
// @access  Private (Super Admin only)
const deleteCompany = asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // Optional: Check if company has any active orders before deleting
    // This would require importing the Order model
    // const Order = require('../models/Order');
    // const activeOrders = await Order.find({ company: company._id, status: { $ne: 'DELIVERED' } });
    // if (activeOrders.length > 0) {
    //     res.status(400);
    //     throw new Error('Cannot delete company with active orders');
    // }

    await company.deleteOne();

    res.json({
        message: 'Company deleted successfully',
        companyId: req.params.id
    });
});

// @desc    Update company details
// @route   PUT /api/companies/:id
// @access  Private (Company owner or Super Admin)
const updateCompany = asyncHandler(async (req, res) => {
    const {
        name,
        address,
        phone,
        directorName,
        directorEmail,
        website,
        description,
        yearEstablished,
        avatar
    } = req.body;

    const company = await Company.findById(req.params.id);

    if (!company) {
        res.status(404);
        throw new Error('Company not found');
    }

    // Check authorization
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const isCompanyOwner = req.user.company?.toString() === req.params.id;

    if (!isSuperAdmin && !isCompanyOwner) {
        res.status(403);
        throw new Error('Not authorized to update this company');
    }

    // Store old values for email notification
    const oldValues = {
        name: company.name,
        address: company.address,
        phone: company.phone,
        directorName: company.directorName,
        directorEmail: company.directorEmail,
        website: company.website,
        description: company.description,
        yearEstablished: company.yearEstablished,
        avatar: company.avatar
    };

    // Track what fields are being updated
    const updatedFields = [];

    // Update fields if provided
    if (name && name !== company.name) {
        company.name = name;
        updatedFields.push('name');
    }

    if (address !== undefined && address !== company.address) {
        company.address = address;
        updatedFields.push('address');
    }

    if (phone !== undefined && phone !== company.phone) {
        company.phone = phone;
        updatedFields.push('phone');
    }

    if (directorName !== undefined && directorName !== company.directorName) {
        company.directorName = directorName;
        updatedFields.push('directorName');
    }

    if (directorEmail !== undefined && directorEmail !== company.directorEmail) {
        company.directorEmail = directorEmail;
        updatedFields.push('directorEmail');
    }

    if (website !== undefined && website !== company.website) {
        company.website = website;
        updatedFields.push('website');
    }

    if (description !== undefined && description !== company.description) {
        company.description = description;
        updatedFields.push('description');
    }

    if (yearEstablished !== undefined && yearEstablished !== company.yearEstablished) {
        company.yearEstablished = yearEstablished;
        updatedFields.push('yearEstablished');
    }

    if (avatar !== undefined && avatar !== company.avatar) {
        company.avatar = avatar;
        updatedFields.push('avatar');
    }

    // If no fields were updated, return early
    if (updatedFields.length === 0) {
        return res.json({
            message: 'No changes detected',
            company
        });
    }

    // Add to update history if you have a history field
    if (!company.updateHistory) {
        company.updateHistory = [];
    }

    company.updateHistory.push({
        updatedBy: req.user._id,
        updatedByEmail: req.user.email,
        updatedFields: updatedFields,
        oldValues: oldValues,
        updatedAt: new Date()
    });

    await company.save();

    // Log the update
    console.log(`Company ${company.name} (${company.taxId}) updated by ${req.user.email}. Fields: ${updatedFields.join(', ')}`);

    res.json({
        success: true,
        message: 'Company updated successfully',
        updatedFields,
        company: {
            _id: company._id,
            name: company.name,
            taxId: company.taxId,
            email: company.email,
            phone: company.phone,
            address: company.address,
            directorName: company.directorName,
            directorEmail: company.directorEmail,
            website: company.website,
            description: company.description,
            yearEstablished: company.yearEstablished,
            avatar: company.avatar,
            status: company.status,
            updatedAt: company.updatedAt
        }
    });
});

// @desc    Get company statistics (Super Admin only)
// @route   GET /api/companies/stats
// @access  Private (Super Admin only)
const getCompanyStats = asyncHandler(async (req, res) => {
    const totalCompanies = await Company.countDocuments();
    const pendingCompanies = await Company.countDocuments({ status: 'PENDING' });
    const approvedCompanies = await Company.countDocuments({ status: 'APPROVED' });
    const suspendedCompanies = await Company.countDocuments({ status: 'SUSPENDED' });

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRegistrations = await Company.countDocuments({
        createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
        total: totalCompanies,
        pending: pendingCompanies,
        approved: approvedCompanies,
        suspended: suspendedCompanies,
        recentRegistrations,
        registrationTrend: {
            last7Days: recentRegistrations
        }
    });
});

module.exports = {
    getCompanyById,
    getPendingCompanies,
    getAllCompanies,
    updateCompanyStatus,
    uploadKYBDocuments,
    deleteCompany,
    updateCompany,
    getCompanyStats
};