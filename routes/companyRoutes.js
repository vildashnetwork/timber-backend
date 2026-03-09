const express = require('express');
const router = express.Router();
const {
    getCompanyById,
    getPendingCompanies,
    getAllCompanies,
    updateCompanyStatus,
    uploadKYBDocuments,
    deleteCompany,
    updateCompany,
    getCompanyStats,
} = require('../controllers/companyController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

// Stats route (Super Admin only)
router.get('/stats', protect, superAdmin, getCompanyStats);

// Get all companies with filters (Super Admin only)
router.get('/', protect, superAdmin, getAllCompanies);

// Get pending companies (Super Admin only)
router.get('/pending', protect, superAdmin, getPendingCompanies);

// Get single company by ID (Company owner or Super Admin)
router.get('/:id', protect, getCompanyById);

// Update company (Company owner or Super Admin)
router.put('/:id', protect, updateCompany);

// Update company status (Super Admin only)
router.put('/:id/status', protect, superAdmin, updateCompanyStatus);

// Upload KYB documents (Company owner only)
router.post('/:id/documents', protect, uploadKYBDocuments);

// Delete company (Super Admin only)
router.delete('/:id', protect, superAdmin, deleteCompany);

module.exports = router;