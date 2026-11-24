const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Optional link back to the order/booking this loan is financing.
  // Kept optional so standalone loan applications are still allowed.
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  orderModel: {
    type: String,
    enum: ['Order', 'Booking', null],
    default: null
  },
  loanAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    default: 8.5 // 8.5% per annum
  },
  loanTerm: {
    type: Number,
    required: true,
    description: 'Loan term in months'
  },
  monthlyEMI: {
    type: Number,
    required: true
  },
  totalPayable: {
    type: Number,
    required: true
  },
  purpose: {
    type: String,
    enum: ['seeds', 'fertilizers', 'equipment', 'irrigation', 'machinery', 'other'],
    required: true
  },
  loanStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'completed', 'default', 'cancelled'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  rejectionReason: String,
  disbursementDate: Date,
  completionDate: Date,
  remainingAmount: {
    type: Number,
    default: function() {
      return this.totalPayable;
    }
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  nextEMIDueDate: Date,
  totalEMIPaid: {
    type: Number,
    default: 0
  },
  defaultCount: {
    type: Number,
    default: 0
  },
  documents: [{
    type: {
      type: String,
      enum: ['land-proof', 'income-proof', 'id-proof', 'bank-statement', 'other']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  collateral: {
    type: String,
    description: 'Description of collateral provided'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Calculate EMI BEFORE validation: monthlyEMI/totalPayable are required fields, and validation runs ahead of
// 'save' hooks, so computing them in pre('save') made every loan application fail with a validation error.
loanSchema.pre('validate', function(next) {
  if (this.isNew) {
    const principal = this.loanAmount;
    const monthlyRate = this.interestRate / 100 / 12;
    const numPayments = this.loanTerm;

    if (monthlyRate === 0) {
      this.monthlyEMI = principal / numPayments;
    } else {
      this.monthlyEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    this.totalPayable = this.monthlyEMI * numPayments;
    this.remainingAmount = this.totalPayable;
    
    if (this.loanStatus === 'approved' || this.loanStatus === 'active') {
      this.nextEMIDueDate = new Date();
      this.nextEMIDueDate.setMonth(this.nextEMIDueDate.getMonth() + 1);
    }
  }
  next();
});

// Instance method to record EMI payment
loanSchema.methods.recordEMIPayment = function(amount) {
  if (this.remainingAmount > 0) {
    this.remainingAmount -= amount;
    this.paidAmount += amount;
    this.totalEMIPaid += 1;
    
    // Update next EMI due date
    this.nextEMIDueDate = new Date(this.nextEMIDueDate);
    this.nextEMIDueDate.setMonth(this.nextEMIDueDate.getMonth() + 1);
    
    // Check if loan is completed
    if (this.remainingAmount <= 0) {
      this.loanStatus = 'completed';
      this.completionDate = new Date();
      this.remainingAmount = 0;
    }
    
    return true;
  }
  return false;
};

// Instance method to check if EMI is overdue
loanSchema.methods.isEMIOverdue = function() {
  return this.nextEMIDueDate < new Date() && this.loanStatus !== 'completed';
};

// Instance method to calculate remaining tenure
loanSchema.methods.getRemainingTenure = function() {
  return this.loanTerm - this.totalEMIPaid;
};

module.exports = mongoose.model('Loan', loanSchema);
