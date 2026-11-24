/**
 * Sample Data for Flip Cards
 * Use this to test and understand the data structure needed
 */

// ============================================================================
// WORKER FLIP CARD - Sample Data
// ============================================================================

export const sampleWorkers = [
  {
    id: 1,
    name: "Rajesh Kumar",
    emoji: "👨‍🌾",
    role: "Farm Manager",
    dailyRate: 1500,
    hourlyRate: 200,
    skillLevel: "Expert",
    location: "Karnataka",
    rating: 4.8,
    experience: "5 years",
    bio: "Experienced farm manager with expertise in crop planning and pest management. Specialized in rice and sugarcane cultivation.",
    certifications: "ICAR Certified Agriculture Specialist, Advanced Pest Management",
    availability: "Mon-Fri, 6am-6pm. Available for consultations",
    phone: "+91 98765 43210",
  },
  {
    id: 2,
    name: "Priya Sharma",
    emoji: "👩‍🌾",
    role: "Crop Specialist",
    dailyRate: 1200,
    hourlyRate: 180,
    skillLevel: "Intermediate",
    location: "Punjab",
    rating: 4.6,
    experience: "3 years",
    bio: "Skilled crop specialist focusing on vegetable farming and soil management techniques.",
    certifications: "National Institute of Agricultural Extension Management (NIAEM)",
    availability: "Flexible timings, can work weekends",
    phone: "+91 87654 32109",
  },
  {
    id: 3,
    name: "Suresh Patel",
    emoji: "👨‍🏭",
    role: "Equipment Operator",
    dailyRate: 1000,
    hourlyRate: 150,
    skillLevel: "Advanced",
    location: "Gujarat",
    rating: 4.9,
    experience: "8 years",
    bio: "Expert tractor and harvester operator with safe operation certifications.",
    certifications: "Heavy Equipment Operator License, Safety Certification",
    availability: "Available year-round",
    phone: "+91 76543 21098",
  },
];

// ============================================================================
// FERTILIZER FLIP CARD - Sample Data
// ============================================================================

export const sampleFertilizers = [
  {
    id: 1,
    name: "DAP Premium",
    emoji: "🧪",
    npkRatio: "18:46:0",
    price: 1200,
    unit: "50kg bag",
    coverage: "2 acres",
    type: "DAP (Diammonium Phosphate)",
    dosage: "150kg/acre",
    composition: "Nitrogen 18% + Phosphorus 46% + Micronutrients",
    applicationRate: "150-200kg/hectare",
    benefits: "High phosphorus content for strong root development and flowering. Improves seed germination and early growth.",
    certification: "ISO 9001, FSSAI Approved, Organic Certified, RDF Approved",
    warning: "Store in cool, dry place away from moisture. Avoid direct skin contact. Use gloves when handling.",
  },
  {
    id: 2,
    name: "Urea Standard",
    emoji: "⚪",
    npkRatio: "46:0:0",
    price: 850,
    unit: "50kg bag",
    coverage: "3 acres",
    type: "Urea Nitrogen Fertilizer",
    dosage: "100-150kg/acre",
    composition: "Nitrogen 46% (highly soluble ammonium form)",
    applicationRate: "100-150kg/hectare",
    benefits: "High nitrogen content for vegetative growth. Increases leaf greenness and plant vigor. Cost-effective.",
    certification: "ISO 9001, Neem-coated variant available, EIC Certified",
    warning: "Highly soluble - apply with adequate water. Best during monsoon. Avoid overdose as it causes lodging.",
  },
  {
    id: 3,
    name: "MOP Premium",
    emoji: "💎",
    npkRatio: "0:0:60",
    price: 950,
    unit: "50kg bag",
    coverage: "2.5 acres",
    type: "Muriate of Potash (KCl)",
    dosage: "40-50kg/acre",
    composition: "Potassium Chloride 60% + trace minerals",
    applicationRate: "40-50kg/hectare",
    benefits: "Essential for fruit/tuber development. Improves crop quality, taste, and shelf life. Increases drought tolerance.",
    certification: "ISO 9001, Traceable from Canada, FSSAI Approved",
    warning: "Do not apply with urea in high doses. Maintain proper soil pH. Avoid waterlogging after application.",
  },
];

// ============================================================================
// EQUIPMENT FLIP CARD - Sample Data
// ============================================================================

export const sampleEquipment = [
  {
    id: 1,
    name: "Tractor",
    emoji: "🚜",
    model: "TAFE 3600",
    ownerName: "Ravi Equipments",
    dailyRate: 2500,
    priceUnit: "day",
    condition: "Excellent",
    type: "Tractor",
    availability: "2-5 days advance booking required",
    power: "65 HP",
    capacity: "2.5 Ton",
    fuelType: "Diesel",
    hoursUsed: 1250,
    ownerDetails: "25 years of equipment rental experience. Reliable and trustworthy. Based in Bangalore with fast delivery.",
    maintenance: "Serviced every 6 months. Regular oil changes. Engine overhaul done in 2024.",
    warranty: "6-month damage waiver included. Free repairs for normal wear & tear.",
  },
  {
    id: 2,
    name: "Harvester",
    emoji: "🌾",
    model: "John Deere W50",
    ownerName: "Green Harvest Ltd",
    dailyRate: 4500,
    priceUnit: "day",
    condition: "Very Good",
    type: "Combine Harvester",
    availability: "Sept-Dec peak season, book 1-2 weeks advance",
    power: "115 HP",
    capacity: "25 Quintal/hour",
    fuelType: "Diesel",
    hoursUsed: 850,
    ownerDetails: "Professional agricultural service provider. Seasonal availability. Includes operator assistance available.",
    maintenance: "Full service conducted before every season. Header and thresher cleaned regularly.",
    warranty: "Full insurance coverage. Breakage waiver upto 50,000 rupees.",
  },
  {
    id: 3,
    name: "Pump Set",
    emoji: "💧",
    model: "Kirloskar 3HP",
    ownerName: "Irrigation Solutions",
    dailyRate: 500,
    priceUnit: "day",
    condition: "Good",
    type: "Agricultural Pump",
    availability: "Available year-round. Next-day delivery possible.",
    power: "3 HP",
    capacity: "20,000 L/hour",
    fuelType: "Electric (220V)",
    hoursUsed: 2800,
    ownerDetails: "Professional water management specialist. Best for small to medium farms. Quick installation support.",
    maintenance: "Regularly serviced. Motor winding tested. Suction filter cleaned.",
    warranty: "3-month operational warranty. Replacement available within 24 hours if breakdown.",
  },
];

// ============================================================================
// SEED FLIP CARD - Sample Data (Reference)
// ============================================================================

export const sampleSeeds = [
  {
    id: 1,
    name: "Paddy BPT-5204",
    emoji: "🌾",
    price: 1200,
    unit: "bag",
    duration: "125-135 days",
    waterNeed: "High",
    temperature: "24-32°C",
    avgYield: "28-32 q/acre",
    description: "Premium rice variety suited for irrigated farms and steady monsoon conditions.",
    certification: "Certified seed batch with high germination rate (95%+)",
    warning: "Keep fields well-drained during early growth to prevent leaf blast disease.",
  },
  {
    id: 2,
    name: "Tomato Arka Rakshak",
    emoji: "🍅",
    price: 760,
    unit: "packet",
    duration: "70-75 days",
    waterNeed: "Medium",
    temperature: "20-28°C",
    avgYield: "18-22 t/acre",
    description: "Disease-tolerant tomato hybrid ideal for market-grade fresh produce with long shelf life.",
    certification: "Strong fruit firmness, excellent exportable quality",
    warning: "Protect seedlings from waterlogging. Provide drip irrigation for consistent quality.",
  },
];
