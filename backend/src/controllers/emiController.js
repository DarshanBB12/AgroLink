const Loan = require('../models/Loan');
const EMIPayment = require('../models/EMIPayment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { MIN_TENURE_MONTHS, MAX_TENURE_MONTHS } = require('../config/emiConfig');
const settings = require('../services/settingsService');

const emiRules = async () => ({
  MIN_EMI_ELIGIBLE_AMOUNT: await settings.get('payments.emiMinAmount'),
  DEFAULT_INTEREST_RATE: await settings.get('payments.emiInterestRate'),
});

// Helper: notify every admin user about a loan event (Notification.userId is required,
// so unlike the old code we can't create a single "broadcast" notification with userId: null).
async function notifyAdmins({ title, message, relatedId }) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return;
  await Notification.insertMany(
    admins.map((admin) => ({
      userId: admin._id,
      type: 'loan',
      title,
      message,
      link: '/dashboard/admin/emi',
      metadata: { loanId: relatedId },
    }))
  );
}

async function notifyFarmer({ userId, title, message, relatedId }) {
  await Notification.create({
    userId,
    type: 'loan',
    title,
    message,
    link: '/dashboard/farmer/emi',
    metadata: { loanId: relatedId },
  });
}

// Public-ish helper endpoint: run the EMI calculator without creating anything.
exports.calculateEMI = async (req, res) => {
  try {
    const { MIN_EMI_ELIGIBLE_AMOUNT, DEFAULT_INTEREST_RATE } = await emiRules();
    const principal = Number(req.body.principal);
    const annualRate = req.body.annualRate !== undefined ? Number(req.body.annualRate) : DEFAULT_INTEREST_RATE;
    const months = Number(req.body.months);

    if (!principal || principal <= 0) {
      return res.status(400).json({ success: false, message: 'A valid principal amount is required' });
    }
    if (!months || months < MIN_TENURE_MONTHS || months > MAX_TENURE_MONTHS) {
      return res.status(400).json({
        success: false,
        message: `Tenure must be between ${MIN_TENURE_MONTHS} and ${MAX_TENURE_MONTHS} months`,
      });
    }

    const monthlyRate = annualRate / 100 / 12;
    let emi;
    if (monthlyRate === 0) {
      emi = principal / months;
    } else {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
        (Math.pow(1 + monthlyRate, months) - 1);
    }

    const totalPayable = emi * months;
    const totalInterest = totalPayable - principal;

    res.status(200).json({
      success: true,
      data: {
        principal,
        annualRate,
        months,
        monthlyEMI: Number(emi.toFixed(2)),
        totalPayable: Number(totalPayable.toFixed(2)),
        totalInterest: Number(totalInterest.toFixed(2)),
        eligible: principal >= MIN_EMI_ELIGIBLE_AMOUNT,
        minEligibleAmount: MIN_EMI_ELIGIBLE_AMOUNT,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Expose the eligibility threshold so the frontend never hardcodes it.
exports.getEligibilityConfig = async (req, res) => {
  const { MIN_EMI_ELIGIBLE_AMOUNT, DEFAULT_INTEREST_RATE } = await emiRules();
  res.status(200).json({
    success: true,
    data: {
      minEligibleAmount: MIN_EMI_ELIGIBLE_AMOUNT,
      defaultInterestRate: DEFAULT_INTEREST_RATE,
      minTenureMonths: MIN_TENURE_MONTHS,
      maxTenureMonths: MAX_TENURE_MONTHS,
    },
  });
};

// Apply for a loan
exports.applyForLoan = async (req, res) => {
  try {
    const {
      loanAmount,
      loanTerm,
      purpose,
      collateral,
      documents,
      orderId,
      orderModel,
    } = req.body;
    const farmerId = req.user.id;
    const { MIN_EMI_ELIGIBLE_AMOUNT, DEFAULT_INTEREST_RATE } = await emiRules();

    if (!loanAmount || !loanTerm || !purpose) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const amount = Number(loanAmount);
    if (amount < MIN_EMI_ELIGIBLE_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `EMI is only available for amounts of ₹${MIN_EMI_ELIGIBLE_AMOUNT.toLocaleString('en-IN')} or more`,
      });
    }

    const term = Number(loanTerm);
    if (term < MIN_TENURE_MONTHS || term > MAX_TENURE_MONTHS) {
      return res.status(400).json({
        success: false,
        message: `Loan tenure must be between ${MIN_TENURE_MONTHS} and ${MAX_TENURE_MONTHS} months`,
      });
    }

    const loan = new Loan({
      farmerId,
      loanAmount: amount,
      interestRate: DEFAULT_INTEREST_RATE, // set by the platform, never by the applicant
      loanTerm: term,
      purpose,
      collateral,
      documents,
      orderId: orderId || null,
      orderModel: orderId ? (orderModel || 'Order') : null,
      loanStatus: 'pending',
    });

    await loan.save();

    await notifyAdmins({
      title: 'New EMI application',
      message: `A new loan application of ₹${amount.toLocaleString('en-IN')} was submitted and needs review.`,
      relatedId: loan._id,
    });

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      loan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get farmer's loans
exports.getFarmerLoans = async (req, res) => {
  try {
    const farmerId = req.user.id;
    const loans = await Loan.find({ farmerId }).sort({ createdAt: -1 }).populate('approvedBy', 'name email');

    res.status(200).json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single loan details
exports.getLoanDetails = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId).populate('farmerId', 'name email phone');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (req.user.role !== 'admin' && loan.farmerId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const payments = await EMIPayment.find({ loanId }).sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      loan,
      payments,
      stats: {
        totalEMIPaid: loan.totalEMIPaid,
        paidAmount: loan.paidAmount,
        remainingAmount: loan.remainingAmount,
        remainingTenure: loan.getRemainingTenure(),
        isOverdue: loan.isEMIOverdue(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record EMI Payment
exports.recordEMIPayment = async (req, res) => {
  try {
    const { loanId, amount, paymentMethod, transactionId } = req.body;
    const farmerId = req.user.id;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'EMI payments must be made through the payment gateway' });
    }
    if (!['cash', 'bank_transfer', 'check'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Offline payments must specify cash, bank_transfer or check' });
    }

    if (!['active', 'approved'].includes(loan.loanStatus)) {
      return res.status(400).json({ success: false, message: `Cannot pay EMI on a loan with status "${loan.loanStatus}"` });
    }

    const paidAmount = Number(amount);
    if (!paidAmount || paidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    if (transactionId) {
      const existing = await EMIPayment.findOne({ loanId, transactionId, status: 'completed' });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Payment already recorded',
          payment: existing,
          duplicate: true,
        });
      }
    }

    const payment = new EMIPayment({
      loanId,
      farmerId: loan.farmerId,
      amount: paidAmount,
      paymentMethod,
      transactionId,
      paymentDate: new Date(),
      status: 'completed',
    });

    await payment.save();

    loan.recordEMIPayment(paidAmount);
    await loan.save();

    await Transaction.create({
      userId: loan.farmerId,
      type: 'emi_payment',
      amount: paidAmount,
      status: 'completed',
      description: `EMI payment (recorded by admin) for loan ${loanId}`,
      relatedId: loan._id,
      relatedModel: 'Loan',
      paymentMethod: paymentMethod || 'online',
      mode: 'offline',
      purpose: 'emi',
      transactionRef: transactionId || undefined,
      receiptNo: `RCPT-OFF-${Date.now().toString(36).toUpperCase()}`,
      paidAt: new Date(),
      idempotencyKey: transactionId || undefined,
    });

    await notifyFarmer({
      userId: loan.farmerId,
      title: 'EMI payment received',
      message: `Your EMI payment of ₹${paidAmount.toLocaleString('en-IN')} was recorded successfully.`,
      relatedId: loan._id,
    });

    if (loan.loanStatus === 'completed') {
      await notifyFarmer({
        userId: loan.farmerId,
        title: 'Loan fully repaid',
        message: `Congratulations! Your loan of ₹${loan.loanAmount.toLocaleString('en-IN')} has been fully repaid.`,
        relatedId: loan._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'EMI payment recorded successfully',
      payment,
      loan: {
        remainingAmount: loan.remainingAmount,
        nextEMIDueDate: loan.nextEMIDueDate,
        status: loan.loanStatus,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'This payment has already been processed' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get EMI payment history
exports.getEMIPaymentHistory = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (req.user.role !== 'admin' && loan.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const payments = await EMIPayment.find({ loanId }).sort({ paymentDate: -1 });
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: get all loans (any status), with optional ?status= filter
exports.getAllLoans = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.loanStatus = req.query.status;
    const loans = await Loan.find(filter).sort({ createdAt: -1 }).populate('farmerId', 'name email phone');
    res.status(200).json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Get all pending loans
exports.getPendingLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ loanStatus: 'pending' }).sort({ createdAt: -1 }).populate('farmerId', 'name email phone');
    res.status(200).json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: dashboard summary stats
exports.getAdminEMIStats = async (req, res) => {
  try {
    const [pending, active, completed, rejected, overdueLoans, totals, monthlyCollection] = await Promise.all([
      Loan.countDocuments({ loanStatus: 'pending' }),
      Loan.countDocuments({ loanStatus: 'active' }),
      Loan.countDocuments({ loanStatus: 'completed' }),
      Loan.countDocuments({ loanStatus: 'rejected' }),
      Loan.countDocuments({ loanStatus: 'active', nextEMIDueDate: { $lt: new Date() } }),
      Loan.aggregate([
        { $match: { loanStatus: { $in: ['active', 'completed'] } } },
        { $group: { _id: null, totalFinanced: { $sum: '$loanAmount' }, totalReceived: { $sum: '$paidAmount' }, totalOutstanding: { $sum: '$remainingAmount' } } },
      ]),
      EMIPayment.aggregate([
        { $match: { status: 'completed', paymentDate: { $gte: new Date(new Date().setDate(1)) } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const totalsData = totals[0] || { totalFinanced: 0, totalReceived: 0, totalOutstanding: 0 };
    const monthly = monthlyCollection[0] || { amount: 0, count: 0 };

    res.status(200).json({
      success: true,
      data: {
        pendingApplications: pending,
        activeLoans: active,
        completedLoans: completed,
        rejectedLoans: rejected,
        overdueLoans,
        totalFinancedAmount: totalsData.totalFinanced,
        totalReceived: totalsData.totalReceived,
        totalOutstanding: totalsData.totalOutstanding,
        monthlyCollection: monthly.amount,
        monthlyPaymentCount: monthly.count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Approve loan
exports.approveLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { approvalNotes } = req.body;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (loan.loanStatus !== 'pending') {
      return res.status(400).json({ success: false, message: `Loan is already "${loan.loanStatus}"` });
    }

    loan.loanStatus = 'active';
    loan.approvedBy = req.user.id;
    loan.approvalDate = new Date();
    loan.disbursementDate = new Date();
    loan.nextEMIDueDate = new Date();
    loan.nextEMIDueDate.setMonth(loan.nextEMIDueDate.getMonth() + 1);
    if (approvalNotes) loan.notes = approvalNotes;

    await loan.save();

    await notifyFarmer({
      userId: loan.farmerId,
      title: 'Loan approved',
      message: `Your loan application of ₹${loan.loanAmount.toLocaleString('en-IN')} has been approved!`,
      relatedId: loan._id,
    });

    res.status(200).json({ success: true, message: 'Loan approved successfully', loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Reject loan
exports.rejectLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const { rejectionReason } = req.body;

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (loan.loanStatus !== 'pending') {
      return res.status(400).json({ success: false, message: `Loan is already "${loan.loanStatus}"` });
    }

    loan.loanStatus = 'rejected';
    loan.rejectionReason = rejectionReason || 'Not specified';

    await loan.save();

    await notifyFarmer({
      userId: loan.farmerId,
      title: 'Loan application rejected',
      message: `Your loan application was rejected. Reason: ${loan.rejectionReason}`,
      relatedId: loan._id,
    });

    res.status(200).json({ success: true, message: 'Loan rejected successfully', loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Farmer: cancel a still-pending application
exports.cancelLoan = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }
    if (loan.farmerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (loan.loanStatus !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending applications can be cancelled' });
    }
    loan.loanStatus = 'cancelled';
    await loan.save();
    res.status(200).json({ success: true, message: 'Loan application cancelled', loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
