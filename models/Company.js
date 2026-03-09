const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  taxId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: 'Douala',
  },
  directorName: {
    type: String,
    default: '',
  },
  directorEmail: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'SUSPENDED'],
    default: 'PENDING',
  },
  website: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  yearEstablished: {
    type: Number,
  },
  avatar: {
    type: String,
    default: '',
  },
  kybDocs: [{
    documentType: {
      type: String,
      enum: ['NIU', 'RCCM'],
      required: true,
    },
    documentUrl: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Company', companySchema);