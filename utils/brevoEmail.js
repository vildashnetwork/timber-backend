// utils/brevoEmail.js
const axios = require('axios');
require('dotenv').config();


// Regular email function
const sendBrevoEmail = async (options) => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";

        const emailContent = {
            sender: {
                name: 'TimberTrade',
                email: process.env.SUPPORT_EMAIL
            },
            to: [
                {
                    email: options.email,
                    name: options.name || 'User'
                }
            ],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || ''
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log('Email sent successfully to:', options.email);
        return response.data;

    } catch (error) {
        console.error('Brevo email error:', error.response?.data || error.message);
        throw error;
    }
};

// OTP email function
const sendBrevoOTPEmail = async (email, otpCode, name = 'User') => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";
        const currentYear = new Date().getFullYear();

        const emailContent = {
            sender: {
                name: process.env.FROM_NAME || "TimberTrade",
                email: process.env.SUPPORT_EMAIL || "support@timbertrade.com"
            },
            to: [{ email: email, name: name }],
            subject: "🔐 Password Reset OTP - TimberTrade",
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-top: 5px solid #0a0efc; background: #f4f4f4;">
                    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
                        <h1 style="color: #0a0efc; margin: 0;">🌳 TimberTrade</h1>
                        <p style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px;">Secure Password Reset</p>
                    </div>
                    <div style="padding: 30px; color: #333; background-color: #ffffff; text-align: center;">
                        <h2 style="color: #092991;">Password Reset Initiated</h2>
                        <p>Hello <strong>${name}</strong>,</p>
                        <p>Use the secure verification code below to reset your password:</p>
                        <div style="margin: 30px auto; padding: 20px; background: #f0f4ff; border: 1px dashed #0a0efc; display: inline-block; border-radius: 10px;">
                            <span style="font-size: 36px; font-weight: bold; color: #0a0efc; letter-spacing: 8px; font-family: monospace;">
                                ${otpCode}
                            </span>
                        </div>
                        <p style="margin-top: 20px; font-size: 13px; color: #888;">
                            This code is valid for <strong>10 minutes</strong>.<br>
                            If you did not initiate this request, please ignore this email or contact support immediately.
                        </p>
                    </div>
                    <div style="background: #08067c; color: white; padding: 15px; text-align: center; font-size: 12px;">
                        © ${currentYear} TimberTrade • Secure Password Recovery System
                    </div>
                </div>
            `
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log('OTP email sent successfully to:', email);
        return response.data;
    } catch (error) {
        console.error("OTP Email failed to send:", error.response?.data || error.message);
        throw error;
    }
};

// Success email function
const sendPasswordResetSuccessEmail = async (email, name = 'User') => {
    try {
        const apiKey = process.env.BREVO_API_KEY;
        const url = "https://api.brevo.com/v3/smtp/email";
        const currentYear = new Date().getFullYear();

        const emailContent = {
            sender: {
                name: process.env.FROM_NAME || "TimberTrade",
                email: process.env.SUPPORT_EMAIL || "support@timbertrade.com"
            },
            to: [{ email: email, name: name }],
            subject: "✅ Password Reset Successful - TimberTrade",
            htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-top: 5px solid #059669; background: #f4f4f4;">
                    <div style="background-color: #ffffff; padding: 20px; text-align: center;">
                        <h1 style="color: #059669; margin: 0;">🌳 TimberTrade</h1>
                        <p style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px;">Security Notification</p>
                    </div>
                    <div style="padding: 30px; color: #333; background-color: #ffffff; text-align: center;">
                        <h2 style="color: #059669;">Password Reset Successful</h2>
                        <p>Hello <strong>${name}</strong>,</p>
                        <p>Your password has been successfully reset.</p>
                    </div>
                    <div style="background: #059669; color: white; padding: 15px; text-align: center; font-size: 12px;">
                        © ${currentYear} TimberTrade • Security Notification
                    </div>
                </div>
            `
        };

        const response = await axios.post(url, emailContent, {
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log('Success email sent to:', email);
        return response.data;
    } catch (error) {
        console.error("Success email failed:", error.response?.data || error.message);
        return null;
    }
};

// Export all functions as an object
module.exports = {
    sendBrevoEmail,
    sendBrevoOTPEmail,
    sendPasswordResetSuccessEmail
};

// Also log to confirm exports are working
console.log('brevoEmail.js loaded. Available functions:', Object.keys(module.exports));