const crypto = require("crypto");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Worker = require("../models/Worker");
const Seed = require("../models/Seed");
const Fertilizer = require("../models/Fertilizer");

// Approximate city-centre coordinates used ONLY for the shared demo listings below (they describe
// the listing's town, not any user's GPS position). Real users' coordinates always come from their
// own consent-based GPS reading or a manually entered location.
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
};

const geoFor = (location = "") => {
  const city = Object.keys(CITY_CENTRES).find((c) => location.toLowerCase().includes(c.toLowerCase()));
  if (!city) return undefined;
  const [lat, lng] = CITY_CENTRES[city];
  return { type: "Point", coordinates: [lng, lat] };
};

const FERTILIZERS = [
      {
        name: "Cow Dung Manure",
        type: "organic",
        category: "Animal Dung",
        price: 15,
        pricing: { amount: 15, unit: "kg" },
        unit: "kg",
        discount: 10,
        rating: 4.8,
        imageEmoji: "🐄",
        colorClass: "from-amber-50 to-amber-100",
        description: "Premium sun-dried cow dung composted 3 months. Rich in macro and micro nutrients. Safe for all crops.",
        benefits: ["Improves soil structure", "Rich in nitrogen & phosphorus", "Enhances microbial activity", "100% organic & safe"],
        npkRatio: "0.5-0.25-0.5",
        applicationMethod: "Mix 5kg per 10 sq ft before planting or as top dressing after rain",
        suitableCrops: ["Wheat", "Rice", "Vegetables", "Fruits", "Cotton"],
        location: "Pune, MH",
        stock: 500,
      },
      {
        name: "Sheep Dung Manure",
        type: "organic",
        category: "Animal Dung",
        price: 20,
        pricing: { amount: 20, unit: "kg" },
        unit: "kg",
        discount: 5,
        rating: 4.7,
        imageEmoji: "🐑",
        colorClass: "from-stone-50 to-stone-100",
        description: "Aged sheep dung pellets — drier and more concentrated than cow dung. Excellent slow-release fertilizer.",
        benefits: ["High nitrogen content", "Slow-release nutrients", "Improves soil drainage", "No plant burning risk"],
        npkRatio: "0.7-0.3-0.9",
        applicationMethod: "Apply 3-4 kg per plant or broadcast 200 kg/acre",
        suitableCrops: ["Tomatoes", "Peppers", "Herbs", "Grapes", "Strawberries"],
        location: "Nashik, MH",
        stock: 300,
      },
      {
        name: "Poultry Manure",
        type: "organic",
        category: "Animal Dung",
        price: 18,
        pricing: { amount: 18, unit: "kg" },
        unit: "kg",
        available: true,
        discount: 15,
        rating: 4.6,
        imageEmoji: "🐓",
        colorClass: "from-yellow-50 to-yellow-100",
        description: "Processed broiler chicken manure, heat-treated to eliminate pathogens. Highest nitrogen among animal dungs.",
        benefits: ["Very high nitrogen", "Fast acting", "Improves soil pH", "Rich in calcium & phosphorus"],
        npkRatio: "3-2.5-1.5",
        applicationMethod: "Use 2-3 kg per 100 sq ft. Mix with soil — never apply directly to roots",
        suitableCrops: ["Corn", "Sugarcane", "Sunflower", "Leafy Vegetables"],
        location: "Nagpur, MH",
        stock: 400,
      },
      {
        name: "Goat Dung Manure",
        type: "organic",
        category: "Animal Dung",
        price: 22,
        pricing: { amount: 22, unit: "kg" },
        unit: "kg",
        available: true,
        discount: 0,
        rating: 4.5,
        imageEmoji: "🐐",
        colorClass: "from-green-50 to-green-100",
        description: "Dry pellet-form goat manure. Low odour, easy to handle. Perfectly balanced nutrients for all farm types.",
        benefits: ["Balanced NPK ratio", "Very low odour", "Easy pellet form", "Improves aeration"],
        npkRatio: "0.6-0.4-0.7",
        applicationMethod: "Sprinkle 2 kg per plant or use as mulch around base of crops",
        suitableCrops: ["Roses", "Onions", "Garlic", "Pulses", "Millets"],
        location: "Aurangabad, MH",
        stock: 250,
      },
      {
        name: "Vermicompost",
        type: "compost",
        category: "Compost",
        price: 25,
        pricing: { amount: 25, unit: "kg" },
        unit: "kg",
        available: true,
        discount: 20,
        rating: 4.9,
        imageEmoji: "🪱",
        colorClass: "from-emerald-50 to-emerald-100",
        description: "Earthworm-processed organic compost. The gold standard of organic fertilizers — transforms soil biology.",
        benefits: ["Boosts soil microbial life", "Improves water retention", "Promotes deep root growth", "Prevents soil-borne diseases"],
        npkRatio: "1.5-1-1.5",
        applicationMethod: "Mix 2-3 kg per plant or use as seed coating and potting mix ingredient",
        suitableCrops: ["All crops", "Nursery plants", "Orchards", "Vegetables", "Flowers"],
        location: "Kolhapur, MH",
        stock: 600,
      },
      {
        name: "Neem Cake Fertilizer",
        type: "organic",
        category: "Green Manure",
        price: 30,
        pricing: { amount: 30, unit: "kg" },
        unit: "kg",
        discount: 10,
        rating: 4.7,
        imageEmoji: "🌿",
        colorClass: "from-lime-50 to-lime-100",
        description: "Cold-pressed neem seed cake — dual-action fertilizer AND natural pesticide. Deters soil pests and nematodes.",
        benefits: ["Fertilizer + pesticide in one", "Naturally deters soil pests", "Rich in nitrogen", "Improves soil texture"],
        npkRatio: "5-1-1.5",
        applicationMethod: "Mix 1-2 kg per plant into soil 10-15 days before planting for best results",
        suitableCrops: ["Cotton", "Groundnut", "Tobacco", "Vegetables", "Fruits"],
        location: "Solapur, MH",
        stock: 350,
      },
      {
        name: "NPK 19-19-19",
        type: "chemical",
        category: "Chemical NPK",
        price: 80,
        pricing: { amount: 80, unit: "bag" },
        unit: "kg",
        available: true,
        discount: 5,
        rating: 4.4,
        imageEmoji: "⚗️",
        colorClass: "from-blue-50 to-blue-100",
        description: "Fully balanced water-soluble NPK for foliar spray and drip irrigation. Rapid nutrient uptake at all growth stages.",
        benefits: ["Perfectly balanced growth", "Drip & foliar spray compatible", "Rapid nutrient uptake", "Boosts flowering & fruiting"],
        npkRatio: "19-19-19",
        applicationMethod: "Dissolve 2-3g per litre for foliar spray or apply 5 kg/acre via drip irrigation system",
        suitableCrops: ["Tomatoes", "Grapes", "Pomegranate", "Onion", "Potato"],
        location: "Pune, MH",
        stock: 200,
      },
      {
        name: "Rhizobium Biofertilizer",
        type: "bio",
        category: "Biofertilizer",
        price: 45,
        pricing: { amount: 45, unit: "kg" },
        unit: "kg",
        available: true,
        discount: 0,
        rating: 4.5,
        imageEmoji: "🦠",
        colorClass: "from-purple-50 to-purple-100",
        description: "Live nitrogen-fixing bacteria inoculant for legume root nodules. Reduces chemical fertilizer need by 25%.",
        benefits: ["Fixes atmospheric nitrogen for free", "Reduces chemical fertilizer use by 25%", "Completely eco-friendly", "Increases yield 10-15%"],
        npkRatio: "Biological N-Fixer",
        applicationMethod: "Mix 200g with 10kg seeds before sowing. Keep away from direct sunlight",
        suitableCrops: ["Soybean", "Chickpea", "Lentils", "Groundnut", "Peas"],
        location: "Nagpur, MH",
        stock: 150,
      },
      {
        name: "Buffalo Dung Slurry",
        type: "organic",
        category: "Animal Dung",
        price: 10,
        pricing: { amount: 10, unit: "kg" },
        unit: "litre",
        discount: 0,
        rating: 4.3,
        imageEmoji: "🐃",
        colorClass: "from-orange-50 to-orange-100",
        description: "Liquid slurry byproduct of buffalo dung biogas plants. Nutrient-rich liquid fertilizer — zero smell, ready to use.",
        benefits: ["Liquid form, easy to apply", "Zero processing needed", "Fast soil absorption", "Sustainable waste-to-wealth product"],
        npkRatio: "1-0.5-1",
        applicationMethod: "Dilute 1 part slurry with 5 parts water. Pour around plant roots after irrigation",
        suitableCrops: ["Paddy", "Banana", "Sugarcane", "Vegetables"],
        location: "Kolhapur, MH",
        stock: 1000,
      },
    ];

const EQUIPMENT = [
  { name: "John Deere 5050D Tractor", category: "Tractor", price: 2500, unit: "day", rating: 4.6, location: "Pune, MH", discount: 5, description: "Reliable 50 HP tractor for tillage and haulage.", fine: 1200, specs: { power: "50 HP", fuel: "Diesel", capacity: "2WD", year: 2021 } },
  { name: "Kubota Harvester", category: "Harvester", price: 4000, unit: "day", rating: 4.5, location: "Nashik, MH", discount: 10, description: "Self-propelled combine harvester for paddy and wheat.", fine: 3000, specs: { power: "76 HP", fuel: "Diesel", capacity: "1400 L", year: 2023 } },
  { name: "Irrigation Pump Set", category: "Irrigation", price: 800, unit: "hour", rating: 4.7, location: "Solapur, MH", discount: 0, description: "Centrifugal pump set for efficient water delivery.", fine: 600, specs: { power: "5 HP", fuel: "Electric", capacity: "12000 L/hr", year: 2021 } },
  { name: "Heavy-Duty Rotavator", category: "Tillage", price: 1500, unit: "day", rating: 4.6, location: "Nagpur, MH", discount: 20, description: "Rotavator with broad tilling width for seedbed preparation.", fine: 1200, specs: { power: "PTO 45 HP", fuel: "N/A", capacity: "7 ft", year: 2022 } },
  { name: "Precision Seed Drill", category: "Seeding", price: 1200, unit: "day", rating: 4.4, location: "Aurangabad, MH", discount: 5, description: "Seed drill with uniform depth control.", fine: 900, specs: { power: "PTO 35 HP", fuel: "N/A", capacity: "9 rows", year: 2023 } },
  { name: "Motorised Sprayer", category: "Sprayer", price: 600, unit: "hour", rating: 4.3, location: "Kolhapur, MH", discount: 0, description: "Motorised sprayer for pesticides and foliar feed.", fine: 400, specs: { power: "2 HP", fuel: "Petrol", capacity: "20 L", year: 2024 } },
  { name: "Mahindra 575 DI Tractor", category: "Tractor", price: 2200, unit: "day", rating: 4.5, location: "Davanagere, KA", discount: 0, description: "45 HP tractor popular for sugarcane and maize fields.", fine: 1000, specs: { power: "45 HP", fuel: "Diesel", capacity: "2WD", year: 2022 } },
  { name: "Mini Power Tiller", category: "Tillage", price: 1100, unit: "day", rating: 4.2, location: "Mysuru, KA", discount: 0, description: "Compact power tiller for small plots and orchards.", fine: 700, specs: { power: "12 HP", fuel: "Diesel", capacity: "3 ft", year: 2023 } },
  { name: "Drip Irrigation Kit (1 acre)", category: "Irrigation", price: 900, unit: "day", rating: 4.4, location: "Bengaluru, KA", discount: 0, description: "Complete drip kit with filter, mainline and emitters.", fine: 500, specs: { power: "N/A", fuel: "N/A", capacity: "1 acre", year: 2024 } },
  { name: "Boom Sprayer 400L", category: "Sprayer", price: 900, unit: "day", rating: 4.3, location: "Hubballi, KA", discount: 5, description: "Tractor-mounted boom sprayer for orchard and field crops.", fine: 800, specs: { power: "PTO", fuel: "N/A", capacity: "400 L", year: 2022 } },
];

const SEEDS = [
  { name: "Hybrid Maize Seeds", category: "Cereal", crop: "Maize", variety: "NK-6240", season: "Kharif", price: 420, unit: "kg", rating: 4.5, location: "Davanagere, KA", stock: 800, germinationRate: "92%", maturityDays: 110, imageEmoji: "🌽", description: "High-yield hybrid maize suited to rain-fed and irrigated fields." },
  { name: "Basmati Rice Seeds (Pusa 1121)", category: "Cereal", crop: "Rice", variety: "Pusa 1121", season: "Kharif", price: 180, unit: "kg", rating: 4.6, location: "Nashik, MH", stock: 1200, germinationRate: "90%", maturityDays: 140, imageEmoji: "🌾", description: "Long-grain aromatic basmati variety with excellent cooking quality." },
  { name: "Wheat Seeds (HD-2967)", category: "Cereal", crop: "Wheat", variety: "HD-2967", season: "Rabi", price: 55, unit: "kg", rating: 4.4, location: "Nagpur, MH", stock: 2000, germinationRate: "95%", maturityDays: 145, imageEmoji: "🌾", description: "Rust-resistant wheat variety with stable yields." },
  { name: "Tomato Hybrid Seeds", category: "Vegetable", crop: "Tomato", variety: "Arka Rakshak", season: "Zaid", price: 1800, unit: "packet", rating: 4.7, location: "Bengaluru, KA", stock: 300, germinationRate: "88%", maturityDays: 90, imageEmoji: "🍅", description: "Disease-tolerant hybrid tomato with firm, uniform fruit." },
  { name: "Chilli Seeds (Byadgi)", category: "Vegetable", crop: "Chilli", variety: "Byadgi", season: "Kharif", price: 2200, unit: "packet", rating: 4.5, location: "Hubballi, KA", stock: 250, germinationRate: "85%", maturityDays: 120, imageEmoji: "🌶️", description: "Deep-red, low-pungency chilli prized for colour." },
  { name: "Soybean Seeds (JS-335)", category: "Oilseed", crop: "Soybean", variety: "JS-335", season: "Kharif", price: 95, unit: "kg", rating: 4.3, location: "Aurangabad, MH", stock: 1500, germinationRate: "90%", maturityDays: 100, imageEmoji: "🫘", description: "Popular early-maturing soybean for central India." },
  { name: "Pigeon Pea Seeds (BSMR-736)", category: "Pulse", crop: "Pigeon pea", variety: "BSMR-736", season: "Kharif", price: 130, unit: "kg", rating: 4.2, location: "Solapur, MH", stock: 900, germinationRate: "88%", maturityDays: 160, imageEmoji: "🫛", description: "Wilt-tolerant tur variety for dryland farming." },
  { name: "Ragi (Finger Millet) Seeds", category: "Millet", crop: "Ragi", variety: "GPU-28", season: "Kharif", price: 85, unit: "kg", rating: 4.6, location: "Mysuru, KA", stock: 700, germinationRate: "92%", maturityDays: 105, imageEmoji: "🌾", description: "Drought-hardy finger millet ideal for southern Karnataka." },
];

const WORKERS = [
  { name: "Rajesh Kumar", email: "rajesh.worker@agrolink.demo", skills: ["Harvesting", "Tractor Driving"], location: "Pune, MH", amount: 800, unit: "day", rating: 4.7, notes: "10 years of field experience in harvesting and tractor operation." },
  { name: "Sita Devi", email: "sita.worker@agrolink.demo", skills: ["Sowing", "Weeding"], location: "Nashik, MH", amount: 600, unit: "day", rating: 4.5, notes: "Experienced in vegetable transplanting and weeding." },
  { name: "Manjunath Gowda", email: "manju.worker@agrolink.demo", skills: ["Irrigation", "Pesticide Spraying"], location: "Davanagere, KA", amount: 700, unit: "day", rating: 4.6, notes: "Drip and sprinkler installation, safe pesticide application." },
  { name: "Lakshmi Bai", email: "lakshmi.worker@agrolink.demo", skills: ["Harvesting", "Sorting & Packing"], location: "Mysuru, KA", amount: 550, unit: "day", rating: 4.4, notes: "Fruit and vegetable harvest, grading and packing." },
  { name: "Imran Sheikh", email: "imran.worker@agrolink.demo", skills: ["Tractor Driving", "Ploughing"], location: "Hubballi, KA", amount: 120, unit: "hour", rating: 4.3, notes: "Operates tractors and attachments, available for contract work." },
];

const randomPassword = () => crypto.randomBytes(18).toString("base64url") + "a1";

// Create the system accounts that own the shared demo listings (idempotent).
const ensureUser = async ({ name, email, role, location, planCode }) => {
  let user = await User.findOne({ email });
  if (user) return user;
  // Passwords are random and not printed: these accounts only own demo listings and are not meant for login.
  user = await User.create({ name, email, role, location, password: process.env.DEMO_ACCOUNT_PASSWORD || randomPassword(), planCode });
  return user;
};

const seedMarketplace = async () => {
  const owner = await ensureUser({ name: "AgroLink Marketplace", email: "marketplace@agrolink.demo", role: "equipment_owner", location: "Pune, MH", planCode: "equipment_owner" });
  const counts = { equipment: 0, seeds: 0, fertilizers: 0, workers: 0 };

  for (const e of EQUIPMENT) {
    const res = await Equipment.updateOne(
      { name: e.name, ownerId: owner._id },
      {
        $setOnInsert: {
          ...e,
          price: e.price,
          pricing: { amount: e.price, unit: e.unit },
          availability: true,
          available: true,
          ownerId: owner._id,
          owner: owner._id,
          type: e.category,
          ...(geoFor(e.location) ? { geo: geoFor(e.location) } : {}),
        },
      },
      { upsert: true }
    );
    counts.equipment += res.upsertedCount || 0;
  }

  for (const s of SEEDS) {
    const res = await Seed.updateOne(
      { name: s.name, seller: owner._id },
      { $setOnInsert: { ...s, pricing: { amount: s.price, unit: s.unit }, seller: owner._id, available: true, ...(geoFor(s.location) ? { geo: geoFor(s.location) } : {}) } },
      { upsert: true }
    );
    counts.seeds += res.upsertedCount || 0;
  }


  for (const f of FERTILIZERS) {
    const res = await Fertilizer.updateOne(
      { name: f.name, seller: owner._id },
      { $setOnInsert: { ...f, available: f.available !== false, seller: owner._id, ...(geoFor(f.location) ? { geo: geoFor(f.location) } : {}) } },
      { upsert: true }
    );
    counts.fertilizers += res.upsertedCount || 0;
  }

  for (const w of WORKERS) {
    const user = await ensureUser({ name: w.name, email: w.email, role: "worker", location: w.location, planCode: "farmer_free" });
    const res = await Worker.updateOne(
      { userId: user._id },
      {
        $setOnInsert: {
          userId: user._id,
          user: user._id,
          skills: w.skills,
          location: w.location,
          availability: true,
          available: true,
          pricing: { amount: w.amount, unit: w.unit },
          rating: w.rating,
          notes: w.notes,
          ...(geoFor(w.location) ? { geo: geoFor(w.location) } : {}),
        },
      },
      { upsert: true }
    );
    counts.workers += res.upsertedCount || 0;
  }

  return { inserted: counts };
};

module.exports = { seedMarketplace, FERTILIZERS, EQUIPMENT, SEEDS, WORKERS };
