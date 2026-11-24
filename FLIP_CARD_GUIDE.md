# AgroLink Flip Card System - Integration Guide

## Overview
All flip cards follow the same pattern as the **Seed Card** with CSS 3D rotation effect.

## Features Present in All Cards

### ✅ Front Side (Light Theme)
- **Flip Button** (RotateCw icon, top-left) - Click to rotate
- **Type Badge** (Top-left) - Seed/Worker/Fertilizer/Equipment
- **Large Emoji** (7xl size) - Visual representation
- **Title + Description** - Main content
- **Status Badge** (Top-right) - Available/In Stock/Ready
- **2-Column Info Grid** - Price/Rate, Yield/Skills/Coverage/Availability
- **Tag Badges** - Duration, Skills, Type, Condition (bottom)
- **Action Button** - Order/Hire/Book (color-coded)

### ✅ Back Side (Dark Theme - Color Coded)
- **Header** - "AgroLink [Type]" + Title
- **"Flip card" Badge** (Top-right)
- **4-Box Grid (2x2)** - Specs with icons
- **3 Info Boxes** - Additional details (Benefits/Bio/Specs)
- **Alert Box** (Amber) - Warning/Special notes
- **Action Buttons**:
  - Primary CTA ("Order/Hire/Book")
  - Secondary ("Back to front")
  - Tertiary (Contact/Chat) - optional

---

## Data Structure Required

### Worker Card
```typescript
type Worker = {
  id: number;
  name: string;
  emoji: string;           // e.g., "👨‍🌾"
  role: string;            // e.g., "Farm Manager"
  dailyRate: number;       // e.g., 1500
  hourlyRate: number;      // e.g., 200
  skillLevel: string;      // e.g., "Expert"
  location: string;        // e.g., "Karnataka"
  rating: number;          // e.g., 4.8
  experience: string;      // e.g., "5 years"
  bio: string;             // Short description
  certifications: string;  // e.g., "ICAR Certified"
  availability: string;    // e.g., "Mon-Fri, 6am-6pm"
  phone: string;           // Contact number
};
```

### Fertilizer Card
```typescript
type Fertilizer = {
  id: number;
  name: string;
  emoji: string;           // e.g., "🧪"
  npkRatio: string;        // e.g., "10:26:26"
  price: number;           // e.g., 450
  unit: string;            // e.g., "50kg bag"
  coverage: string;        // e.g., "5 acres"
  type: string;            // e.g., "DAP"
  dosage: string;          // e.g., "50kg/acre"
  composition: string;     // e.g., "NPK + Micronutrients"
  applicationRate: string; // e.g., "500kg/hectare"
  benefits: string;        // Main benefits
  certification: string;   // E.g., "ISO 9001, FSSAI"
  warning: string;         // Safety warning
};
```

### Equipment Card
```typescript
type Equipment = {
  id: number;
  name: string;
  emoji: string;           // e.g., "🚜"
  model: string;           // e.g., "TAFE 3600"
  ownerName: string;       // Equipment owner
  dailyRate: number;       // e.g., 2500
  priceUnit: string;       // e.g., "day"
  condition: string;       // e.g., "Excellent"
  type: string;            // e.g., "Tractor"
  availability: string;    // e.g., "2-5 days advance"
  power: string;           // e.g., "65 HP"
  capacity: string;        // e.g., "2.5 Ton"
  fuelType: string;        // e.g., "Diesel"
  hoursUsed: number;       // e.g., 1250
  ownerDetails: string;    // E.g., "25 yrs experience"
  maintenance: string;     // E.g., "Serviced every 6m"
  warranty: string;        // E.g., "6-month damage waiver"
};
```

---

## Color Theme for Each Card Type

| Type | Front Theme | Back Theme | Primary Color | Accent |
|------|-----------|-----------|---------------|---------|
| **Seed** | Green/Lime | Dark Green | #059669 | Emerald |
| **Worker** | Sky/Blue | Dark Blue | #0284C7 | Sky |
| **Fertilizer** | Amber/Orange | Dark Brown | #D97706 | Amber |
| **Equipment** | Red/Rose | Dark Red | #DC2626 | Red |

---

## Component Usage Examples

### Worker Flip Card
```tsx
import { WorkerFlipCard } from "@/components/dashboard/WorkerFlipCard";

const worker = {
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
  bio: "Experienced farm manager with expertise in crop planning and pest management",
  certifications: "ICAR Certified Agriculture Specialist",
  availability: "Mon-Fri, 6am-6pm",
  phone: "+91 98765 43210",
};

<WorkerFlipCard 
  worker={worker} 
  onHire={(w) => console.log('Hire:', w)}
  onContact={(w) => console.log('Contact:', w)}
/>
```

### Fertilizer Flip Card
```tsx
import { FertilizerFlipCard } from "@/components/dashboard/FertilizerFlipCard";

const fertilizer = {
  id: 1,
  name: "DAP Premium",
  emoji: "🧪",
  npkRatio: "18:46:0",
  price: 1200,
  unit: "50kg bag",
  coverage: "2 acres",
  type: "DAP (Diammonium Phosphate)",
  dosage: "150kg/acre",
  composition: "Nitrogen + Phosphorus + Micronutrients",
  applicationRate: "150-200kg/hectare",
  benefits: "High phosphorus content for root development and flowering",
  certification: "ISO 9001, FSSAI Approved, Organic Certified",
  warning: "Store in cool, dry place. Avoid direct contact with skin.",
};

<FertilizerFlipCard 
  fertilizer={fertilizer} 
  onOrder={(f) => console.log('Order:', f)}
/>
```

### Equipment Flip Card
```tsx
import { EquipmentFlipCard } from "@/components/dashboard/EquipmentFlipCard";

const equipment = {
  id: 1,
  name: "Tractor",
  emoji: "🚜",
  model: "TAFE 3600",
  ownerName: "Ravi Equipments",
  dailyRate: 2500,
  priceUnit: "day",
  condition: "Excellent",
  type: "Tractor",
  availability: "2-5 days advance booking",
  power: "65 HP",
  capacity: "2.5 Ton",
  fuelType: "Diesel",
  hoursUsed: 1250,
  ownerDetails: "25 years of equipment rental experience",
  maintenance: "Serviced every 6 months",
  warranty: "6-month damage waiver included",
};

<EquipmentFlipCard 
  equipment={equipment} 
  onBook={(e) => console.log('Book:', e)}
/>
```

---

## Integration in Pages

### In WorkersPage.tsx
```tsx
import { WorkerFlipCard } from "@/components/dashboard/WorkerFlipCard";

<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
  {filteredWorkers.map((worker) => (
    <WorkerFlipCard 
      key={worker.id} 
      worker={worker}
      onHire={handleHireWorker}
      onContact={handleContactWorker}
    />
  ))}
</div>
```

### In EquipmentPage.tsx
```tsx
import { EquipmentFlipCard } from "@/components/dashboard/EquipmentFlipCard";

<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
  {filteredEquipment.map((item) => (
    <EquipmentFlipCard 
      key={item.id} 
      equipment={item}
      onBook={handleBookEquipment}
    />
  ))}
</div>
```

### In FertilizerPage.tsx
```tsx
import { FertilizerFlipCard } from "@/components/dashboard/FertilizerFlipCard";

<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
  {filteredFertilizers.map((fert) => (
    <FertilizerFlipCard 
      key={fert.id} 
      fertilizer={fert}
      onOrder={handleOrderFertilizer}
    />
  ))}
</div>
```

---

## Rotation Feature Details

### CSS 3D Transform
- Uses `perspective: 1000px` for 3D context
- `preserve-3d` on parent for child transform stacking
- `rotate-y-180` for 180-degree Y-axis rotation
- `backface-hidden` hides back face while rotating

### Animation Properties
- **Duration:** 700ms transition
- **Easing:** Linear
- **Trigger:** Click on flip button
- **State:** `isFlipped` boolean state

### Smooth Flip Effect
```tsx
// State management
const [isFlipped, setIsFlipped] = useState(false);

// Toggle function
const handleFlip = () => {
  setIsFlipped(!isFlipped);
};

// Apply to parent div
<div className={`transition-transform duration-700 ${isFlipped ? "rotate-y-180" : ""}`}>
  {/* Front and Back cards */}
</div>
```

---

## Responsive Design
- Height: 320px (fixed for card consistency)
- Grid Columns:
  - Mobile: 1 column
  - Tablet (sm): 2 columns
  - Desktop (xl): 3 columns
- Scales nicely on all screen sizes
- Touch-friendly flip button (40px)

---

## Customization Options

### Color Overrides
Modify Tailwind color classes in component:
- `bg-green-600` → `bg-blue-600` (change primary color)
- `border-emerald-200/70` → `border-blue-200/70` (change border color)
- `text-emerald-50` → `text-blue-50` (change text color)

### Size Adjustments
- Change `h-[320px]` to different height
- Modify emoji size: `text-7xl` → `text-6xl` / `text-8xl`
- Adjust padding: `p-4` / `p-5`

### Animation Speed
- Change `duration-700` to `duration-500` (faster) or `duration-1000` (slower)

---

## Benefits of This System

✅ **Consistent Design** - All cards follow same pattern
✅ **3D Rotation Animation** - Engaging user experience
✅ **Color-Coded** - Easy visual differentiation
✅ **Type-Specific Info** - Relevant specs on back
✅ **Reusable Pattern** - Can be extended to other resource types
✅ **Responsive** - Works on all devices
✅ **Accessible** - ARIA labels, keyboard-friendly
✅ **Easy Integration** - Simple props-based API

---

## Next Steps

1. Replace existing resource cards with flip cards in respective pages
2. Update data structure to match type definitions
3. Add callback handlers for onHire/onOrder/onBook actions
4. Style booking/order dialogs to match
5. Test flip animation on different devices
