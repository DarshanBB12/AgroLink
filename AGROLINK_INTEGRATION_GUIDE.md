# AgroLink Complete Integration Guide

## Overview
This document provides a comprehensive guide to fix all errors and integrate EMI loans, 2FA, weather, subscriptions, and role-based dashboards in AgroLink.

---

## 📋 FILE STRUCTURE SETUP

### Backend Structure
```
backend/
├── models/
│   ├── User.js                 # User model with roles
│   ├── Loan.js                 # EMI/Loan model
│   ├── EMIPayment.js           # EMI payment tracking
│   ├── TwoFactor.js            # 2FA model
│   ├── Weather.js              # Weather data model
│   ├── Subscription.js         # Subscription plan model
│   ├── Equipment.js            # Equipment rental model
│   ├── Transaction.js          # Payment/transaction log
│   └── Notification.js         # User notifications
│
├── routes/
│   ├── authRoutes.js           # Auth & 2FA
│   ├── emiRoutes.js            # EMI/Loan routes
│   ├── loanRoutes.js           # Loan application routes
│   ├── twoFactorRoutes.js      # 2FA setup/verify
│   ├── otpRoutes.js            # OTP generation/verification
│   ├── weatherRoutes.js        # Weather data routes
│   ├── forecastRoutes.js       # Weather forecast routes
│   ├── subscriptionRoutes.js   # Subscription management
│   ├── dashboardRoutes.js      # Role-based dashboards
│   ├── farmerRoutes.js         # Farmer-specific routes
│   ├── workerRoutes.js         # Worker-specific routes
│   ├── equipmentOwnerRoutes.js # Equipment owner routes
│   ├── adminRoutes.js          # Admin routes
│   ├── marketplaceRoutes.js    # Marketplace routes
│   └── paymentRoutes.js        # Payment processing
│
├── controllers/
│   ├── authController.js
│   ├── emiController.js        # EMI operations
│   ├── twoFactorController.js  # 2FA operations
│   ├── weatherController.js    # Weather operations
│   ├── subscriptionController.js
│   ├── dashboardController.js
│   └── [other controllers]
│
├── middleware/
│   ├── auth.js                 # JWT verification
│   ├── roleCheck.js            # Role-based access
│   ├── twoFactorCheck.js       # 2FA verification
│   └── errorHandler.js
│
└── server.js                   # Main server file
```

### Frontend Structure
```
src/
├── pages/
│   ├── Auth/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   ├── TwoFactorAuth.tsx   # 2FA setup
│   │   └── VerifyOTP.tsx       # OTP verification
│   │
│   ├── Farmer/
│   │   ├── Dashboard.tsx       # Farmer dashboard
│   │   ├── MyLoans.tsx         # View loans
│   │   ├── LoanApplication.tsx # Apply for EMI
│   │   ├── EMIPayments.tsx     # EMI payment tracker
│   │   ├── WeatherDashboard.tsx # Weather info
│   │   ├── MySubscription.tsx  # Subscription management
│   │   ├── Marketplace.tsx     # Browse equipment
│   │   └── Equipment.tsx       # My equipment
│   │
│   ├── Worker/
│   │   ├── Dashboard.tsx
│   │   ├── AvailableJobs.tsx
│   │   ├── MyJobs.tsx
│   │   ├── Earnings.tsx
│   │   └── WithdrawEarnings.tsx
│   │
│   ├── EquipmentOwner/
│   │   ├── Dashboard.tsx
│   │   ├── MyEquipment.tsx
│   │   ├── AddEquipment.tsx
│   │   ├── RentalRequests.tsx
│   │   └── EquipmentRevenue.tsx
│   │
│   ├── Admin/
│   │   ├── Dashboard.tsx
│   │   ├── UserManagement.tsx
│   │   ├── LoanApprovals.tsx   # Approve/reject loans
│   │   ├── SystemReports.tsx
│   │   └── TransactionLogs.tsx
│   │
│   └── Shared/
│       ├── Transactions.tsx
│       ├── Payments.tsx
│       ├── AccountSettings.tsx
│       └── NotificationCenter.tsx
│
├── components/
│   ├── ProtectedRoute.tsx      # Route protection
│   ├── RoleBasedView.tsx       # Conditional rendering by role
│   ├── EMICalculator.tsx       # EMI calculation tool
│   ├── WeatherWidget.tsx       # Weather display
│   ├── PaymentForm.tsx         # Payment processing
│   └── Navbar.tsx
│
├── context/
│   ├── AuthContext.tsx         # Auth state management
│   └── UserContext.tsx         # User data state
│
├── services/
│   ├── apiClient.ts            # API configurations
│   ├── authService.ts          # Auth API calls
│   ├── emiService.ts           # EMI API calls
│   ├── weatherService.ts       # Weather API calls
│   └── paymentService.ts       # Payment API calls
│
└── App.tsx                     # Main app with routes
```

---

## 🔐 KEY INTEGRATIONS

### 1. EMI LOAN SYSTEM

#### Creating a Loan
```typescript
// Frontend
const applyForLoan = async (formData) => {
  const response = await api.post('/api/emi/apply', {
    loanAmount: 50000,
    interestRate: 8.5,
    loanTerm: 12, // months
    purpose: 'seeds',
    collateral: 'Land with area X',
    documents: [] // Upload IDs, proofs, etc.
  });
  return response.data.loan;
};

// Backend Route
router.post('/apply', authenticateToken, roleCheck('farmer'), emiController.applyForLoan);
```

#### EMI Calculation
```typescript
// Formula: EMI = [P × r × (1 + r)^n] / [(1 + r)^n - 1]
// P = Principal, r = Monthly interest rate, n = Number of months

const calculateEMI = (principal, annualRate, months) => {
  const monthlyRate = annualRate / 100 / 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  return emi.toFixed(2);
};
```

#### Recording EMI Payment
```typescript
// Frontend
const payEMI = async (loanId, amount) => {
  const response = await api.post('/api/emi/pay', {
    loanId,
    amount,
    paymentMethod: 'razorpay' // or 'bank_transfer'
  });
  return response.data;
};

// Backend
exports.recordEMIPayment = async (req, res) => {
  // Update loan status
  // Track payment
  // Generate receipt
  // Send notification
};
```

---

### 2. TWO-FACTOR AUTHENTICATION (2FA)

#### Setup 2FA
```typescript
// Frontend
const setup2FA = async (method: 'email' | 'sms' | 'authenticator') => {
  const response = await api.post('/api/2fa/setup', { method });
  
  if (method === 'authenticator') {
    // Display QR code for authenticator app
    // Display backup codes
  }
  
  return response.data;
};

// Backend
exports.setup2FA = async (req, res) => {
  const { method } = req.body;
  const twoFactor = new TwoFactor({
    userId: req.user.id,
    method,
    isEnabled: false
  });
  
  if (method === 'authenticator') {
    const secret = speakeasy.generateSecret({ name: 'AgroLink' });
    twoFactor.secret = secret.base32;
    twoFactor.backupCodes = twoFactor.generateBackupCodes();
  }
  
  await twoFactor.save();
  return res.json({ qrCode: secret.qr_code, backupCodes });
};
```

#### Verify 2FA During Login
```typescript
// Frontend - After password verification
const verify2FA = async (userId, code) => {
  const response = await api.post('/api/2fa/verify', { userId, code });
  // Set authentication token
  localStorage.setItem('authToken', response.data.token);
};

// Backend Middleware
const verify2FA = async (req, res, next) => {
  const twoFactor = await TwoFactor.findOne({ userId: req.user.id });
  
  if (!twoFactor.isEnabled) {
    return next();
  }
  
  const code = req.body.code;
  
  if (twoFactor.isLocked()) {
    return res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
  }
  
  const isValid = speakeasy.totp.verify({
    secret: twoFactor.secret,
    encoding: 'base32',
    token: code,
    window: 2
  });
  
  if (!isValid && !twoFactor.verifyBackupCode(code)) {
    twoFactor.incrementFailedAttempts();
    await twoFactor.save();
    return res.status(401).json({ message: 'Invalid code' });
  }
  
  twoFactor.resetFailedAttempts();
  await twoFactor.save();
  next();
};
```

---

### 3. WEATHER INTEGRATION

#### Fetch Weather Data
```typescript
// Frontend
const getWeather = async (latitude, longitude) => {
  const response = await api.get('/api/weather', {
    params: { latitude, longitude }
  });
  return response.data.weather;
};

// Backend - Using OpenWeather API
exports.getWeatherData = async (req, res) => {
  const { latitude, longitude } = req.query;
  
  const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
    params: {
      lat: latitude,
      lon: longitude,
      appid: process.env.OPENWEATHER_API_KEY,
      units: 'metric'
    }
  });
  
  const weatherData = new Weather({
    farmerId: req.user.id,
    location: { latitude, longitude },
    temperature: response.data.main.temp,
    humidity: response.data.main.humidity,
    windSpeed: response.data.wind.speed,
    condition: response.data.weather[0].main,
    description: response.data.weather[0].description,
    lastUpdated: new Date()
  });
  
  await weatherData.save();
  res.json({ success: true, weather: weatherData });
};
```

#### Weather Alerts
```typescript
// Backend - Send alerts for harmful weather
const checkWeatherAlerts = async (farmerId) => {
  const weather = await Weather.findOne({ farmerId }).sort({ lastUpdated: -1 });
  
  if (weather.temperature < 0) {
    await Notification.create({
      userId: farmerId,
      type: 'frost_alert',
      message: 'Frost warning: Temperature below 0°C. Protect your crops!'
    });
  }
  
  if (weather.windSpeed > 40) {
    await Notification.create({
      userId: farmerId,
      type: 'storm_alert',
      message: 'Strong winds expected. Secure your equipment!'
    });
  }
};
```

---

### 4. ROLE-BASED DASHBOARDS

#### Dashboard Data Structure
```typescript
// Frontend - Farmer Dashboard
const FarmerDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    activeLoans: 0,
    totalEMIPaid: 0,
    nextEMIDue: null,
    currentWeather: null,
    equipmentAvailable: [],
    subscriptionStatus: null,
    pendingPayments: []
  });
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  const fetchDashboardData = async () => {
    const response = await api.get('/api/dashboard/farmer');
    setDashboardData(response.data.dashboard);
  };
  
  return (
    <Dashboard>
      <LoansSummary loans={dashboardData.activeLoans} />
      <EMIPaymentTracker nextDue={dashboardData.nextEMIDue} />
      <WeatherWidget weather={dashboardData.currentWeather} />
      <EquipmentMarketplace equipment={dashboardData.equipmentAvailable} />
      <SubscriptionStatus subscription={dashboardData.subscriptionStatus} />
    </Dashboard>
  );
};

// Backend
exports.getFarmerDashboard = async (req, res) => {
  const farmerId = req.user.id;
  
  const [activeLoans, weather, subscription, equipment, payments] = await Promise.all([
    Loan.find({ farmerId, loanStatus: 'active' }),
    Weather.findOne({ farmerId }).sort({ lastUpdated: -1 }),
    Subscription.findOne({ farmerId, isActive: true }),
    Equipment.find({ available: true }).limit(5),
    EMIPayment.find({ farmerId }).sort({ paymentDate: -1 }).limit(10)
  ]);
  
  const totalEMIPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  res.json({
    success: true,
    dashboard: {
      activeLoans: activeLoans.length,
      totalEMIPaid,
      nextEMIDue: activeLoans[0]?.nextEMIDueDate,
      currentWeather: weather,
      equipmentAvailable: equipment,
      subscriptionStatus: subscription,
      recentPayments: payments
    }
  });
};
```

---

### 5. SUBSCRIPTION SYSTEM

#### Create Subscription Plan
```typescript
// Backend
const subscriptionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  planType: {
    enum: ['basic', 'premium', 'enterprise'],
    required: true
  },
  features: [String], // Weather alerts, EMI calculator, marketplace access, etc.
  price: Number,
  validFrom: Date,
  validUntil: Date,
  autoRenewal: Boolean,
  paymentStatus: String
});
```

---

## ⚙️ INSTALLATION STEPS

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install express mongoose cors dotenv jsonwebtoken bcryptjs cookie-parser
npm install axios speakeasy qrcode  # For 2FA and weather
npm install stripe razorpay  # For payments
npm install nodemailer  # For email notifications

# Frontend
cd frontend
npm install axios react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install recharts  # For charts in dashboards
```

### 2. Environment Variables (.env)

```
# Backend
MONGODB_URI=mongodb://localhost:27017/agrolink
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=7d

# 2FA
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1xxx

# Weather
OPENWEATHER_API_KEY=your_api_key

# Payments
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
STRIPE_SECRET_KEY=your_stripe_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

### 3. Database Models - Create Files

Create these model files in `backend/models/`:
- Loan.js (provided)
- TwoFactor.js (provided)
- Weather.js
- Subscription.js
- Equipment.js
- EMIPayment.js
- Transaction.js
- Notification.js

### 4. Routes - Create Files

Create route files in `backend/routes/`:
- emiRoutes.js
- loanRoutes.js
- twoFactorRoutes.js
- weatherRoutes.js
- subscriptionRoutes.js
- etc.

### 5. Controllers - Create Files

Create controller files in `backend/controllers/`:
- emiController.js (provided)
- twoFactorController.js
- weatherController.js
- subscriptionController.js
- dashboardController.js

### 6. Frontend Components

Create all React components in `src/pages/` and `src/components/`

---

## 🔧 COMMON ERRORS & FIXES

### Error 1: "Cannot POST /api/emi/apply"
**Cause**: Routes not registered in server.js
**Fix**: Add to server.js:
```javascript
app.use('/api/emi', require('./backend/routes/emiRoutes'));
```

### Error 2: "2FA middleware not working"
**Cause**: Middleware not applied to routes
**Fix**: Apply in route file:
```javascript
router.post('/login', authController.login, twoFactorCheck);
```

### Error 3: "Role-based access denied"
**Cause**: Role not in JWT payload
**Fix**: Include role in JWT token:
```javascript
const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
```

### Error 4: "Weather data not updating"
**Cause**: API key not configured or location not provided
**Fix**: Check .env and pass latitude/longitude to API

### Error 5: "EMI payment stuck"
**Cause**: Loan status not updated after payment
**Fix**: Use loan.recordEMIPayment() method provided in Loan model

---

## 📊 TESTING CHECKLIST

- [ ] User can sign up with different roles
- [ ] 2FA setup and verification works
- [ ] Farmer can apply for EMI loan
- [ ] Admin can approve/reject loans
- [ ] EMI payments are recorded correctly
- [ ] Weather data is fetched and displayed
- [ ] Subscription plans work
- [ ] Dashboard shows role-specific data
- [ ] Notifications are sent properly
- [ ] Payment gateway integration works
- [ ] All role-based routes are accessible
- [ ] Database transactions are atomic

---

## 🚀 DEPLOYMENT

1. Build frontend: `npm run build`
2. Set environment variables on server
3. Run migrations if needed
4. Start backend: `node server.js`
5. Serve frontend build files

---

## 📞 SUPPORT

For issues, check:
1. Console logs (frontend & backend)
2. Database connection
3. API endpoint availability
4. CORS configuration
5. JWT token expiry

