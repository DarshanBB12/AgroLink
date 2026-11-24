# Modern Rental Booking Modal - Complete Guide

## Overview

The `ModernRentalBookingModal` is a professional, modern booking interface designed for AgroLink's equipment rental system. It features a glassmorphism design, smooth animations, intelligent pricing calculations, and an intuitive coupon system.

## Features

### 🎨 Design System

- **Glassmorphism Design**: Semi-transparent modal with backdrop blur
- **Color Palette**:
  - Primary Green: #16a34a (Tailwind: `green-600`)
  - Light Background: #f8fafc (Tailwind: `slate-50`)
  - Danger/Warning: #ef4444 (Tailwind: `red-500`)
  - Supporting colors for UI elements

- **Typography**:
  - Headings: Bold, clear hierarchy
  - Body text: Gray-600 for secondary info
  - Labels: Small caps for section titles

- **Spacing**: 6px base unit (consistent 4-6-8-12-16-24 scale)

### 📐 Layout Structure

```
┌─────────────────────────────────────┐
│  [X] Close Button (Top Right)       │
├─────────────────────────────────────┤
│  Equipment Image with Badge         │
│  (h-48, gradient overlay)           │
├─────────────────────────────────────┤
│  Equipment Info                      │
│  • Name, Category, Location, Rating  │
├─────────────────────────────────────┤
│  Rental Duration Selector            │
│  (Dropdown with responsive options)  │
├─────────────────────────────────────┤
│  Coupon Code Section                 │
│  (Input + Apply button + Chips)      │
├─────────────────────────────────────┤
│  Pricing Summary Card                │
│  • Base Price                        │
│  • Equipment Discount (5%)           │
│  • Coupon Discount                   │
│  • Final Total (2xl bold green)      │
│  • Estimated Savings Highlight       │
├─────────────────────────────────────┤
│  Warning: Late Return Fine Info      │
├─────────────────────────────────────┤
│  Confirm Booking Button (Full Width) │
│  (Green gradient, hover scale)       │
└─────────────────────────────────────┘
```

### ✨ Interactive Elements

#### Backdrop
- Semi-transparent black (bg-black/40)
- Backdrop blur effect
- Click to close modal
- Smooth fade-in animation

#### Modal Container
- Rounded corners: 2xl (20px)
- Shadow: shadow-2xl
- Max width: 32rem (512px)
- Responsive margin: mx-4
- Fade-in animation on open

#### Close Button
- Top-right corner (absolute positioning)
- Circular hover state with bg-gray-100
- Smooth transitions

#### Image Thumbnail
- Height: 12rem (192px)
- Gradient overlay (top to transparent)
- Responsive object-cover
- Status badge positioning

#### Duration Selector
- Soft borders (border-gray-200)
- Focus glow effect (focus:ring-green-500)
- Height: h-11 (44px)
- Responsive dropdown

#### Coupon Section
- Blue tinted background (from-blue-50 to-blue-50/50)
- Border: blue-100
- Chip-style coupon tags
- Visual feedback on application
- Error messages with icons

#### Pricing Summary
- Gradient background (gray-50)
- Invoice-style layout
- Icons for discounts (TrendingDown)
- Estimated savings highlight (green)
- Divider line with gradient

#### Confirm Button
- Full width
- Gradient: green-500 to green-600
- Hover animation: scale-105
- Active state: scale-95
- Disabled state with opacity
- Height: h-12 (48px)
- Font weight: semibold

### 🎯 Animations

- **Fade-in**: Modal appears with fade-in animation
- **Hover Scale**: Button scales on hover (105%)
- **Active Scale**: Button scales down on click (95%)
- **Transitions**: All interactive elements use 200ms duration
- **Image Zoom**: Equipment image on card hover

### 💰 Pricing Logic

```javascript
// Base calculation
basePrice = resource.price × duration

// Equipment discount (5% standard)
equipmentDiscount = basePrice × 0.05

// Subtotal
subtotal = basePrice - equipmentDiscount

// Coupon discount (percentage or fixed)
if (coupon.type === 'percentage') {
  couponDiscount = subtotal × (coupon.discount / 100)
} else {
  couponDiscount = Math.min(coupon.discount, subtotal)
}

// Final total
finalTotal = Math.max(0, subtotal - couponDiscount)

// Estimated savings
estimatedSavings = equipmentDiscount + couponDiscount
```

### 🏷️ Coupon System

#### Built-in Coupons
- `SAVE10`: 10% discount
- `SAVE20`: 20% discount
- `FLAT500`: ₹500 fixed discount
- `FLAT1000`: ₹1000 fixed discount

#### Features
- Coupon suggestion chips
- Real-time validation
- Applied state highlighting (green)
- Remove functionality
- Error messages with icons
- Case-insensitive matching

#### Extensibility
Pass custom coupons via `availableCoupons` prop:

```typescript
const customCoupons = [
  { code: "SUMMER50", discount: 50, type: "percentage" },
  { code: "BULK2000", discount: 2000, type: "fixed" },
];

<ModernRentalBookingModal
  availableCoupons={customCoupons}
  // ...other props
/>
```

## Component Props

```typescript
interface ModernRentalBookingModalProps {
  // Resource being booked
  resource: BookingResource;
  
  // Modal visibility state
  isOpen: boolean;
  
  // Close handler
  onClose: () => void;
  
  // Confirmation handler with booking data
  onConfirm: (bookingData: BookingConfirmation) => void;
  
  // Optional: Custom coupon list
  availableCoupons?: Coupon[];
}

interface BookingResource {
  id: number;
  name: string;
  category: string;
  price: number;                    // Per unit/day rate
  location: string;
  image: string;
  available: boolean;
  ownerName: string;
  ownerRating: number;
  feedbackCount: number;
  fine: number;                     // Late return fine per day
  type?: string;                    // "Equipment" | "Fertilizer" | "Seeds"
}

interface BookingConfirmation {
  resourceId: number;
  resourceName: string;
  duration: number;
  durationLabel: string;            // "days" | "bags"
  basePrice: number;
  equipmentDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  finalTotal: number;
  location: string;
  ownerName: string;
  fine: number;
}
```

## Usage Examples

### Basic Implementation

```typescript
import { useState } from "react";
import ModernRentalBookingModal from "@/components/dashboard/ModernRentalBookingModal";

export function EquipmentPage() {
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const handleConfirm = (bookingData) => {
    console.log("Booking confirmed:", bookingData);
    // Send to backend, show confirmation, etc.
  };

  return (
    <>
      {/* Equipment cards */}
      <RentalCard 
        equipment={equipment}
        onRentNow={setSelectedEquipment}
      />

      {/* Modal */}
      <ModernRentalBookingModal
        resource={selectedEquipment}
        isOpen={!!selectedEquipment}
        onClose={() => setSelectedEquipment(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
```

### With Custom Coupons

```typescript
const customCoupons = [
  { code: "SPRING30", discount: 30, type: "percentage" },
  { code: "BULK3000", discount: 3000, type: "fixed" },
];

<ModernRentalBookingModal
  resource={equipment}
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={onConfirm}
  availableCoupons={customCoupons}
/>
```

### Integration with BookingsContext

```typescript
import { useBookings } from "@/contexts/BookingsContext";

export function EquipmentPage() {
  const { addBooking } = useBookings();
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const handleConfirm = (bookingData) => {
    const booking = addBooking({
      type: bookingData.resourceType,
      name: bookingData.resourceName,
      amount: bookingData.finalTotal,
      days: bookingData.duration,
      status: "Pending",
      category: bookingData.category,
      // ... other fields
    });

    setSelectedEquipment(null);
    navigate(`/dashboard/farmer/rentals/${booking.id}`);
  };

  return (
    <ModernRentalBookingModal
      resource={selectedEquipment}
      isOpen={!!selectedEquipment}
      onClose={() => setSelectedEquipment(null)}
      onConfirm={handleConfirm}
    />
  );
}
```

## Styling Details

### Tailwind Classes Used

- **Spacing**: `p-6`, `space-y-6`, `gap-2`, `mx-4`
- **Colors**: `green-500`, `green-600`, `blue-50`, `gray-900`, `gray-600`
- **Borders**: `rounded-2xl`, `rounded-lg`, `border-gray-200`, `border-blue-100`
- **Effects**: `shadow-2xl`, `backdrop-blur-sm`, `hover:scale-105`
- **Animations**: `animate-in`, `fade-in`, `duration-300`

### Responsive Breakpoints

- Mobile: Default single column
- Tablet (sm): Adjusted spacing and font sizes
- Desktop (md/lg): Full featured layout

## Accessibility Features

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements
- ✅ Clear focus states (focus:ring-green-500)
- ✅ Error messages with icons and descriptions
- ✅ Color contrast compliance

## Performance Optimizations

- ✅ Memoized coupon discount calculations
- ✅ Debounced input handlers
- ✅ Lazy image loading
- ✅ CSS-based animations (GPU accelerated)
- ✅ Modal state cleanup on close

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization Guide

### Colors

Edit Tailwind color classes:

```typescript
// Primary color (green)
className="from-green-500 to-green-600"  // Change green to your primary color

// Secondary accents (blue)
className="from-blue-50 to-blue-50/50"   // Change blue to your accent color
```

### Sizing

Adjust modal dimensions:

```typescript
<div className="relative w-full max-w-lg mx-4">  // Change max-w-lg to max-w-md or max-w-2xl
```

### Animations

Customize animation speed:

```typescript
className="animate-in fade-in duration-300"  // Change 300 to 500 for slower animations
className="hover:scale-105"                   // Change 105 to 110 for larger hover effect
```

### Coupon System

Modify available coupons or disable:

```typescript
// Disable coupon section
{showCouponSuggestions && (
  // Hide this section or make it conditional
)}

// Custom coupon logic
const customCoupons = availableCoupons.filter(c => c.discount > 15);
```

## Common Issues & Solutions

### Modal Not Showing
- Ensure `isOpen` prop is `true`
- Check if parent component passes `onClose` handler
- Verify modal is not behind other z-index elements (modal has z-50)

### Coupon Not Applying
- Check coupon code case (auto-converted to uppercase)
- Verify coupon exists in `availableCoupons` array
- Ensure discount calculations are correct

### Styling Issues
- Ensure Tailwind CSS is properly imported
- Check if custom Tailwind config overrides base styles
- Verify all required shadcn/ui components are installed

## Testing

### Unit Tests
```typescript
describe("ModernRentalBookingModal", () => {
  test("renders modal when isOpen is true", () => {
    render(<ModernRentalBookingModal isOpen={true} />);
    expect(screen.getByRole("heading", { name: /equipment name/i })).toBeInTheDocument();
  });

  test("applies coupon correctly", () => {
    // Test coupon application logic
  });

  test("calculates pricing correctly", () => {
    // Test pricing calculations
  });
});
```

### E2E Tests
```typescript
describe("Booking Flow", () => {
  test("user can complete booking", () => {
    cy.visit("/equipment");
    cy.contains("Book Now").click();
    cy.get('[placeholder="Enter coupon code"]').type("SAVE10");
    cy.contains("Apply").click();
    cy.contains("Confirm Booking").click();
  });
});
```

## Future Enhancements

- 📅 Date range picker for specific booking periods
- 💳 Integrated payment gateway
- 🔔 Real-time availability updates
- 📧 Email confirmation
- 📲 SMS notifications
- 🎁 Loyalty rewards integration
- 📊 Booking analytics
- 🌍 Multi-language support
- 🏷️ Dynamic coupon generation
- 🔐 Guest booking option

## Support

For issues, improvements, or questions:
- Create an issue in the repository
- Contact: [support email]
- Documentation: See related files

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-27  
**Created for**: AgroLink Rental System  
**Built with**: React, TypeScript, Tailwind CSS, Lucide Icons
