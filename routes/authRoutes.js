const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUserProfile,
    createSuperAdmin,
    updateCompany,
    changePassword,
    updateAdmin,
    getAdmins,
    getAdminById,
    deleteAdmin
} = require('../controllers/authController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/create-super-admin', createSuperAdmin);

// Protected routes (require authentication)
router.use(protect); // All routes below this will require authentication

// User profile routes
router.get('/profile', getUserProfile);
router.post('/change-password', changePassword);

// Company routes
router.put('/companies/:id', updateCompany); // Update company details

// Admin management routes (Super Admin only)
router.get('/admins', superAdmin, getAdmins); // Get all admins
router.get('/admins/:id', superAdmin, getAdminById); // Get single admin by ID
router.put('/admins/:id', updateAdmin); // Update admin (self or super admin)
router.delete('/admins/:id', superAdmin, deleteAdmin); // Delete admin (super admin only)

// Alternative: Keep the original :id route for backward compatibility
// but note: this might conflict with the admins/:id route if not careful
router.put('/:id', updateCompany); // This is for updating companies

module.exports = router;