const mongoose = require('mongoose');

const emiPaymentSchema = new mongoose.Schema({
  loanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Loan',
    required: true
  },
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'check', 'cash', 'online', 'razorpay', 'stripe'],
    required: true
  },
  transactionId: String,
  receiptUrl: String,
  notes: String,
  
  // Payment gateway details
  razorpayPaymentId: String,
  razorpayOrderId: String,
  
  // Failure details
  failureReason: String,
  failureCode: String,
  
  // Penalties/Charges
  lateFees: {
    type: Number,
    default: 0
  },
  penaltyCharges: {
    type: Number,
    default: 0
  },
  
  // Interest components
  principalAmount: Number,
  interestAmount: Number,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for quick lookups
emiPaymentSchema.index({ loanId: 1, paymentDate: -1 });
emiPaymentSchema.index({ farmerId: 1, status: 1 });

// Instance method to get payment receipt
emiPaymentSchema.methods.getReceipt = function() {
  return {
    paymentId: this._id,
    amount: this.amount,
    date: this.paymentDate,
    method: this.paymentMethod,
    status: this.status,
    transactionId: this.transactionId,
    notes: this.notes
  };
};

// Instance method to process refund
emiPaymentSchema.methods.processRefund = async function() {
  if (this.status !== 'completed') {
    throw new Error('Only completed payments can be refunded');
  }
  
  this.status = 'refunded';
  this.updatedAt = new Date();
  
  // Update corresponding loan
  const Loan = mongoose.model('Loan');
  const loan = await Loan.findById(this.loanId);
  
  if (loan) {
    loan.paidAmount -= this.amount;
    loan.remainingAmount += this.amount;
    loan.totalEMIPaid -= 1;
    await loan.save();
  }
  
  await this.save();
  return this;
};

// Static method to get payment statistics
emiPaymentSchema.statics.getPaymentStats = async function(loanId) {
  const payments = await this.aggregate([
    { $match: { loanId: new mongoose.Types.ObjectId(loanId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  
  return payments;
};

module.exports = mongoose.model('EMIPayment', emiPaymentSchema);
