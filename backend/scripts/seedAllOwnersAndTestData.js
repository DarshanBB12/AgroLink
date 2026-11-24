require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../src/models/User');
const Equipment = require('../src/models/Equipment');
const Fertilizer = require('../src/models/Fertilizer');
const Seed = require('../src/models/Seed');
const Order = require('../src/models/Order');
const Transaction = require('../src/models/Transaction');
const Notification = require('../src/models/Notification');
const Review = require('../src/models/Review');
const Worker = require('../src/models/Worker');
const CITY_CENTRES = {
  Pune: [18.5204, 73.8567],
  Nashik: [19.9975, 73.7898],
  Solapur: [17.6599, 75.9064],
  Nagpur: [21.1458, 79.0882],
  Aurangabad: [19.8762, 75.3433],
  Kolhapur: [16.705, 74.2433],
  Bengaluru: [12.9716, 77.5946],
  Mysuru: [12.2958, 76.6394],
  Hubballi: [15.3647, 75.124],
  Davanagere: [14.4644, 75.9218],
  Bangalore: [12.9716, 77.5946]
};

const geoFor = (location = "") => {
  const city = Object.keys(CITY_CENTRES).find((c) => location.toLowerCase().includes(c.toLowerCase()));
  if (!city) return { type: "Point", coordinates: [73.8567, 18.5204] }; // default Pune
  const [lat, lng] = CITY_CENTRES[city];
  return { type: "Point", coordinates: [lng, lat] };
};

const PASSWORD = "Passw0rd123!";

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // 1. Ensure all test and demo accounts exist and have PASSWORD
  const accountsData = [
    { email: "owner@test.com", name: "Test Equipment Owner", role: "equipment_owner", location: "Pune, MH" },
    { email: "owner@agrolink.com", name: "Demo Equipment Owner", role: "equipment_owner", location: "Pune, MH" },
    { email: "farmer@test.com", name: "Test Farmer", role: "farmer", location: "Pune, MH" },
    { email: "farmer@agrolink.com", name: "Demo Farmer", role: "farmer", location: "Nashik, MH" },
    { email: "worker@test.com", name: "Test Worker", role: "worker", location: "Solapur, MH" },
    { email: "worker@agrolink.com", name: "Demo Worker", role: "worker", location: "Kolhapur, MH" },
    { email: "admin@test.com", name: "Test Admin", role: "admin", location: "Bangalore, KA" },
    { email: "admin@agrolink.com", name: "AgroLink Admin", role: "admin", location: "Bangalore, KA" },
  ];

  const users = {};
  for (const acc of accountsData) {
    let u = await User.findOne({ email: acc.email });
    if (!u) {
      u = new User({ name: acc.name, email: acc.email, role: acc.role, location: acc.location, geo: geoFor(acc.location) });
    }
    u.password = PASSWORD;
    u.name = acc.name;
    u.location = acc.location;
    u.geo = geoFor(acc.location);
    await u.save();
    users[acc.email] = u;
    console.log(`User ${acc.email} ready (${acc.role}).`);
  }

  // 2. Set up worker profile for worker@test.com and worker@agrolink.com
  for (const workerEmail of ["worker@test.com", "worker@agrolink.com"]) {
    const wUser = users[workerEmail];
    await Worker.findOneAndUpdate(
      { userId: wUser._id },
      {
        userId: wUser._id,
        user: wUser._id,
        skills: ["Tractor Driving", "Harvesting", "Spraying", "Irrigation", "Ploughing"],
        location: wUser.location,
        geo: geoFor(wUser.location),
        availability: true,
        available: true,
        pricing: { amount: 750, unit: "day" },
        rating: 4.8,
        notes: "Experienced operator with 8+ years across mechanized and organic farms."
      },
      { upsert: true, new: true }
    );
    console.log(`Worker profile configured for ${workerEmail}`);
  }

  // 3. For each owner account, populate equipment, products, orders, transactions, notifications
  const ownerEmails = ["owner@test.com", "owner@agrolink.com"];

  for (const ownerEmail of ownerEmails) {
    const owner = users[ownerEmail];
    const farmer = ownerEmail === "owner@test.com" ? users["farmer@test.com"] : users["farmer@agrolink.com"];
    console.log(`\n--- Populating sample data for ${ownerEmail} ---`);

    // A. Equipment
    const equipmentTemplates = [
      {
        name: `Mahindra 575 DI XP Plus Tractor`,
        category: "Tractor",
        type: "Tractor",
        price: 1200,
        pricing: { amount: 1200, unit: "day" },
        rating: 4.8,
        location: owner.location || "Pune, MH",
        geo: geoFor(owner.location),
        availability: true,
        available: true,
        discount: 5,
        description: "47 HP high torque tractor with modern hydraulics. Ideal for cultivation, haulage, and threshing.",
        specs: { power: "47 HP", fuel: "Diesel", capacity: "4 Cylinders", year: 2023 }
      },
      {
        name: `John Deere 5050 D 4WD Tractor`,
        category: "Tractor",
        type: "Tractor",
        price: 1500,
        pricing: { amount: 1500, unit: "day" },
        rating: 4.9,
        location: owner.location || "Pune, MH",
        geo: geoFor(owner.location),
        availability: true,
        available: true,
        discount: 0,
        description: "Heavy duty 50 HP 4WD tractor equipped with power steering and dual clutch.",
        specs: { power: "50 HP", fuel: "Diesel", capacity: "3 Cylinders", year: 2024 }
      },
      {
        name: `Shaktiman Regular Light Rotavator 7ft`,
        category: "Rotavator",
        type: "Rotavator",
        price: 500,
        pricing: { amount: 500, unit: "day" },
        rating: 4.7,
        location: owner.location || "Pune, MH",
        geo: geoFor(owner.location),
        availability: true,
        available: true,
        discount: 10,
        description: "7-foot secondary tillage rotavator with boron steel blades. Produces fine soil tilth.",
        specs: { power: "45-60 HP required", fuel: "PTO Driven", capacity: "48 Blades", year: 2022 }
      },
      {
        name: `Kubota DC-68G-HK Paddy Harvester`,
        category: "Harvester",
        type: "Harvester",
        price: 3200,
        pricing: { amount: 3200, unit: "day" },
        rating: 4.9,
        location: owner.location || "Pune, MH",
        geo: geoFor(owner.location),
        availability: true,
        available: true,
        discount: 0,
        description: "Rubber crawler combine harvester with low ground pressure. Operates efficiently in wet paddies.",
        specs: { power: "68 HP", fuel: "Diesel", capacity: "1.5 Tons/Hour", year: 2023 }
      },
      {
        name: `Aspee Tractor Mounted Boom Sprayer 600L`,
        category: "Sprayer",
        type: "Sprayer",
        price: 400,
        pricing: { amount: 400, unit: "day" },
        rating: 4.6,
        location: owner.location || "Pune, MH",
        geo: geoFor(owner.location),
        availability: true,
        available: true,
        discount: 0,
        description: "600 Litre chemical-resistant tank with 32 adjustable nozzles and pressure regulator.",
        specs: { power: "PTO Driven", fuel: "N/A", capacity: "600 Litres", year: 2022 }
      }
    ];

    const createdEquip = [];
    for (const eqData of equipmentTemplates) {
      let eq = await Equipment.findOne({ name: eqData.name, ownerId: owner._id });
      if (!eq) {
        eq = await Equipment.create({ ...eqData, ownerId: owner._id, owner: owner._id });
      } else {
        Object.assign(eq, eqData);
        await eq.save();
      }
      createdEquip.push(eq);
    }
    console.log(`Saved ${createdEquip.length} equipment listings for ${ownerEmail}`);

    // B. Products (Fertilizers & Seeds)
    const fertilizerTemplates = [
      {
        name: `${owner.name}'s Vermicompost Gold`,
        type: "organic",
        category: "Compost",
        price: 25,
        pricing: { amount: 25, unit: "kg" },
        unit: "kg",
        discount: 10,
        rating: 4.8,
        description: "100% pure earthworm compost. Enriched with nitrogen-fixing bacteria and micro-nutrients.",
        benefits: ["Improves soil aeration", "Boosts microbial count", "100% organic without chemicals"],
        location: owner.location,
        geo: geoFor(owner.location),
        stock: 1200,
        imageEmoji: "🪱",
        seller: owner._id
      },
      {
        name: `${owner.name}'s Neem Cake Organic Fertilizer`,
        type: "organic",
        category: "Neem Cake",
        price: 35,
        pricing: { amount: 35, unit: "kg" },
        unit: "kg",
        discount: 5,
        rating: 4.7,
        description: "Cold-pressed neem seed cake. Natural pest repellent and slow-release nitrogen source.",
        benefits: ["Protects roots from nematodes", "Slow-release nitrogen", "Improves organic matter"],
        location: owner.location,
        geo: geoFor(owner.location),
        stock: 800,
        imageEmoji: "🌿",
        seller: owner._id
      }
    ];

    for (const fData of fertilizerTemplates) {
      await Fertilizer.findOneAndUpdate(
        { name: fData.name, seller: owner._id },
        { ...fData, available: true },
        { upsert: true, new: true }
      );
    }

    const seedTemplates = [
      {
        name: `Pioneer Hybrid Maize P3396 (${owner.name})`,
        category: "Cereal",
        crop: "Maize / Corn",
        variety: "P3396",
        season: "Kharif",
        price: 320,
        pricing: { amount: 320, unit: "kg" },
        stock: 350,
        rating: 4.8,
        germinationRate: "95%",
        maturityDays: 110,
        imageEmoji: "🌽",
        description: "Drought resilient high yielding hybrid corn seeds with strong stalk strength.",
        location: owner.location,
        geo: geoFor(owner.location),
        seller: owner._id
      },
      {
        name: `Mahyco Bt Cotton Hybrid MRC 7351 (${owner.name})`,
        category: "Cash Crop",
        crop: "Cotton",
        variety: "MRC-7351",
        season: "Kharif",
        price: 850,
        pricing: { amount: 850, unit: "kg" },
        stock: 150,
        rating: 4.9,
        germinationRate: "92%",
        maturityDays: 160,
        imageEmoji: "🌱",
        description: "Bollworm resistant BG-II hybrid cotton with long staple fiber quality.",
        location: owner.location,
        geo: geoFor(owner.location),
        seller: owner._id
      }
    ];

    for (const sData of seedTemplates) {
      await Seed.findOneAndUpdate(
        { name: sData.name, seller: owner._id },
        { ...sData, available: true },
        { upsert: true, new: true }
      );
    }
    console.log(`Saved products (fertilizers & seeds) for ${ownerEmail}`);

    // C. Orders & Rentals
    // Clean old demo orders for this owner so we don't multiply endlessly
    await Order.deleteMany({ providerId: owner._id });
    await Notification.deleteMany({ userId: owner._id });

    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const ordersData = [
      // 1. Pending Request #1 (Mahindra Tractor, 3 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[0]._id,
        equipment: createdEquip[0]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[0].name,
        price: 1200,
        pricing: { amount: 1200, unit: "day" },
        duration: 3,
        quantity: 1,
        totalPrice: 3600,
        status: "pending",
        paymentStatus: "unpaid",
        startDate: new Date(now + 1 * DAY),
        endDate: new Date(now + 4 * DAY),
        location: farmer.location || "Pune, MH",
        notes: "Need for field preparation and deep plowing before monsoon sowing."
      },
      // 2. Pending Request #2 (Shaktiman Rotavator, 2 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[2]._id,
        equipment: createdEquip[2]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[2].name,
        price: 500,
        pricing: { amount: 500, unit: "day" },
        duration: 2,
        quantity: 1,
        totalPrice: 1000,
        status: "pending",
        paymentStatus: "unpaid",
        startDate: new Date(now + 2 * DAY),
        endDate: new Date(now + 4 * DAY),
        location: farmer.location || "Pune, MH",
        notes: "Need rotavator for 5 acres of vegetable field preparation."
      },
      // 3. Approved / Active Rental (John Deere Tractor, 4 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[1]._id,
        equipment: createdEquip[1]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[1].name,
        price: 1500,
        pricing: { amount: 1500, unit: "day" },
        duration: 4,
        quantity: 1,
        totalPrice: 6000,
        status: "approved",
        paymentStatus: "paid",
        paymentMode: "razorpay",
        paidAt: new Date(now - 1 * DAY),
        startDate: new Date(now - 1 * DAY),
        endDate: new Date(now + 3 * DAY),
        location: farmer.location || "Nashik, MH",
        notes: "Ongoing sugarcane land preparation."
      },
      // 4. Completed Rental #1 (Kubota Paddy Harvester, 3 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[3]._id,
        equipment: createdEquip[3]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[3].name,
        price: 3200,
        pricing: { amount: 3200, unit: "day" },
        duration: 3,
        quantity: 1,
        totalPrice: 9600,
        status: "completed",
        paymentStatus: "paid",
        paymentMode: "razorpay",
        paidAt: new Date(now - 5 * DAY),
        startDate: new Date(now - 8 * DAY),
        endDate: new Date(now - 5 * DAY),
        location: farmer.location || "Kolhapur, MH",
        notes: "Paddy crop harvest completed successfully without downtime."
      },
      // 5. Completed Rental #2 (Mahindra 575 DI, 5 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[0]._id,
        equipment: createdEquip[0]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[0].name,
        price: 1200,
        pricing: { amount: 1200, unit: "day" },
        duration: 5,
        quantity: 1,
        totalPrice: 6000,
        status: "completed",
        paymentStatus: "paid",
        paymentMode: "razorpay",
        paidAt: new Date(now - 18 * DAY),
        startDate: new Date(now - 23 * DAY),
        endDate: new Date(now - 18 * DAY),
        location: farmer.location || "Pune, MH",
        notes: "Land leveling and sowing operations."
      },
      // 6. Completed Rental #3 (Boom Sprayer, 2 days)
      {
        farmerId: farmer._id,
        farmer: farmer._id,
        providerId: owner._id,
        provider: owner._id,
        itemId: createdEquip[4]._id,
        equipment: createdEquip[4]._id,
        itemModel: "Equipment",
        type: "equipment",
        orderType: "equipment",
        itemName: createdEquip[4].name,
        price: 400,
        pricing: { amount: 400, unit: "day" },
        duration: 2,
        quantity: 1,
        totalPrice: 800,
        status: "completed",
        paymentStatus: "paid",
        paymentMode: "razorpay",
        paidAt: new Date(now - 32 * DAY),
        startDate: new Date(now - 34 * DAY),
        endDate: new Date(now - 32 * DAY),
        location: farmer.location || "Solapur, MH",
        notes: "Preventative fungicide spray on pomegranate orchard."
      }
    ];

    const savedOrders = await Order.insertMany(ordersData);
    console.log(`Inserted ${savedOrders.length} rental orders for ${ownerEmail}`);

    // D. Transactions for paid orders
    for (const ord of savedOrders) {
      if (ord.paymentStatus === "paid") {
        const txRef = `AGL-TXN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const rcNo = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
        const tx = await Transaction.create({
          userId: farmer._id,
          type: "order_payment",
          amount: ord.totalPrice,
          status: "completed",
          description: `Payment for ${ord.itemName} rental (${ord.duration} days)`,
          relatedId: ord._id,
          relatedModel: "Order",
          paymentMethod: "online",
          purpose: "order",
          mode: "razorpay",
          transactionRef: txRef,
          receiptNo: rcNo,
          paidAt: ord.paidAt || new Date(),
          meta: { providerId: String(owner._id), equipmentId: String(ord.itemId) }
        });
        ord.paymentId = tx._id;
        await ord.save();

        // Create review for completed orders
        if (ord.status === "completed") {
          await Review.findOneAndUpdate(
            { orderId: ord._id },
            {
              orderId: ord._id,
              reviewerId: farmer._id,
              revieweeId: owner._id,
              itemModel: "Equipment",
              itemId: ord.itemId,
              rating: 5,
              comment: `Excellent condition machinery! ${owner.name} provided on-time delivery and good operating guidance.`
            },
            { upsert: true }
          );
        }
      }
    }

    // E. Notifications for owner
    const notificationsData = [
      {
        userId: owner._id,
        type: "booking",
        title: "New Rental Request Received",
        message: `${farmer.name} requested to rent ${createdEquip[0].name} for 3 days starting tomorrow.`,
        severity: "info",
        isRead: false,
        link: "/dashboard/owner/rentals"
      },
      {
        userId: owner._id,
        type: "booking",
        title: "New Booking Request",
        message: `${farmer.name} requested ${createdEquip[2].name} for 2 days.`,
        severity: "info",
        isRead: false,
        link: "/dashboard/owner/rentals"
      },
      {
        userId: owner._id,
        type: "payment",
        title: "Rental Payment Received",
        message: `₹6,000 received for 4-day rental of ${createdEquip[1].name}.`,
        severity: "success",
        isRead: true,
        readAt: new Date(now - 1 * DAY),
        link: "/dashboard/owner/earnings"
      },
      {
        userId: owner._id,
        type: "equipment",
        title: "Rental Completed & Returned",
        message: `Kubota Paddy Harvester rental finished and machine returned in good condition. Payout of ₹9,600 settled.`,
        severity: "success",
        isRead: true,
        readAt: new Date(now - 5 * DAY),
        link: "/dashboard/owner/rentals"
      }
    ];

    await Notification.insertMany(notificationsData);
    console.log(`Generated notifications and reviews for ${ownerEmail}`);
  }

  // 4. Also add a few sample bookings for farmer@test.com and worker jobs for worker@test.com
  const farmerTest = users["farmer@test.com"];
  const workerTest = users["worker@test.com"];
  const workerProfile = await Worker.findOne({ userId: workerTest._id });

  if (workerProfile && farmerTest) {
    const workerJob = await Order.create({
      farmerId: farmerTest._id,
      farmer: farmerTest._id,
      providerId: workerTest._id,
      provider: workerTest._id,
      itemId: workerProfile._id,
      worker: workerProfile._id,
      itemModel: "Worker",
      type: "worker",
      orderType: "worker",
      itemName: `${workerTest.name} - Tractor Driving & Harvesting`,
      price: 750,
      pricing: { amount: 750, unit: "day" },
      duration: 3,
      quantity: 1,
      totalPrice: 2250,
      status: "approved",
      paymentStatus: "paid",
      paymentMode: "razorpay",
      paidAt: new Date(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      location: farmerTest.location,
      notes: "Assisting in crop harvesting and transport."
    });

    await Notification.create({
      userId: workerTest._id,
      type: "worker",
      title: "New Job Assignment",
      message: `${farmerTest.name} assigned you a 3-day harvesting task.`,
      severity: "info",
      isRead: false,
      link: "/dashboard/worker/jobs"
    });
    console.log("Worker sample job created for worker@test.com");
  }

  console.log("\n✅ All sample data successfully seeded for all owners and test accounts!");
  await mongoose.disconnect();
})().catch((err) => {
  console.error("Error seeding sample data:", err);
  process.exit(1);
});
