require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Equipment = require('../src/models/Equipment');
const Order = require('../src/models/Order');
const Fertilizer = require('../src/models/Fertilizer');
const Seed = require('../src/models/Seed');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({}, 'name email role');
  console.log('Users summary:');
  for (const u of users) {
    const eq = await Equipment.countDocuments({ ownerId: u._id });
    const ordAsProv = await Order.countDocuments({ providerId: u._id });
    const fert = await Fertilizer.countDocuments({ seller: u._id });
    const seed = await Seed.countDocuments({ seller: u._id });
    console.log(`- ${u.email} (${u.role}): ${eq} equipment, ${ordAsProv} provider orders, ${fert} fertilizers, ${seed} seeds`);
  }
  await mongoose.disconnect();
})();
