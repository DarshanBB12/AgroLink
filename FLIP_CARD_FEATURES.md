# Seed Card Features - Complete Breakdown

## 🎯 All Features Shared Across All Flip Cards

### FRONT SIDE (Light Theme) - All Cards Share These Features

| Feature | Location | Description | Icon |
|---------|----------|-------------|------|
| **Flip Button** | Top-Left Corner | Rotates card to back side | RotateCw |
| **Type Badge** | Top-Left (After flip button) | Shows resource type | - |
| **Large Visual** | Top 40% of card | Emoji (7xl) or image | - |
| **Title** | Below visual | Resource name/model | - |
| **Subtitle** | Below title | Short description | - |
| **Status Badge** | Top-Right | Shows availability | - |
| **Info Grid (2 Col)** | Middle | Price/Rate & Secondary stat | - |
| **Tag Pills** | Bottom | Type, Duration, Skills, etc | - |
| **Primary Button** | Very Bottom | Order/Hire/Book action | Package/Briefcase/ShoppingCart |
| **Height** | - | Consistent 320px | - |
| **Colors** | Full gradient | Theme-specific colors | - |

---

### BACK SIDE (Dark Theme) - All Cards Share These Features

| Feature | Location | Description | Details |
|---------|----------|-------------|---------|
| **Header Section** | Top | "AgroLink [Type]" + Title | Uppercase label + main title |
| **Flip Badge** | Top-Right | "Flip card" indicator | White/translucent |
| **4-Box Specs Grid** | Upper-Middle | 2x2 grid with icons | Type-specific 4 specs |
| **Info Box 1** | Middle | Description/Bio/Benefits | With Sparkles icon |
| **Info Box 2** | Middle | Certification/Details | With CheckCircle2 icon |
| **Info Box 3** | Middle | Warranty/Warning/Availability | With ShieldAlert icon (amber bg) |
| **Primary Button** | Bottom | Order/Hire/Book action | Full width |
| **Secondary Button** | Bottom | "Back to front" flip | Full width |
| **Tertiary Button** | Bottom | Contact/Chat (optional) | Full width |
| **Background** | Full | Dark solid color | Type-specific dark shade |
| **Text Color** | Full | Light/white text | High contrast |

---

## 📋 Feature Comparison: What's the Same?

### ✅ Identical Structure in All Cards

```
FRONT SIDE:
┌─────────────────────────────────┐
│ [Flip] [Badge]           [Status]│
│                                  │
│         [BIG EMOJI]              │
│                                  │
│  [Title] [Subtitle]              │
│  ┌──────────┬──────────┐         │
│  │ Price    │ Secondary│         │
│  └──────────┴──────────┘         │
│  [Tag] [Tag] [Tag]               │
│  [  PRIMARY ACTION BUTTON  ]     │
└─────────────────────────────────┘

BACK SIDE:
┌─────────────────────────────────┐
│ [Header]                [Badge]  │
│                                  │
│ ┌──────────┬──────────┐         │
│ │ Spec 1   │ Spec 2   │         │
│ │ [Icon]   │ [Icon]   │         │
│ └──────────┼──────────┘         │
│ ┌──────────┬──────────┐         │
│ │ Spec 3   │ Spec 4   │         │
│ │ [Icon]   │ [Icon]   │         │
│ └──────────┴──────────┘         │
│                                  │
│ [Box] Description/Benefits       │
│ [Box] Certification/Details      │
│ [Box] Warning/Warranty (amber)   │
│                                  │
│ [   PRIMARY ACTION BUTTON   ]    │
│ [  Back to Front Flip Button ]   │
│ [     Contact/Optional Button ]  │
└─────────────────────────────────┘
```

---

## 🎨 Color Themes (All Same Pattern, Different Colors)

### SEED CARD
- **Front**: White → Emerald 50 → Lime 50 (green gradient)
- **Front Border**: `border-emerald-200/70`
- **Back**: `bg-emerald-950` (dark green)
- **Back Text**: `text-emerald-50`
- **Back Accents**: `text-emerald-200`, `text-emerald-300`
- **Button**: `bg-emerald-500` / `bg-emerald-600`

### WORKER CARD
- **Front**: White → Sky 50 → Blue 50 (blue gradient)
- **Front Border**: `border-sky-200/70`
- **Back**: `bg-sky-950` (dark blue)
- **Back Text**: `text-sky-50`
- **Back Accents**: `text-sky-200`, `text-sky-300`
- **Button**: `bg-sky-500` / `bg-sky-600`

### FERTILIZER CARD
- **Front**: White → Amber 50 → Orange 50 (orange gradient)
- **Front Border**: `border-amber-200/70`
- **Back**: `bg-amber-950` (dark brown)
- **Back Text**: `text-amber-50`
- **Back Accents**: `text-amber-200`, `text-amber-300`
- **Button**: `bg-amber-600` / `bg-amber-500`

### EQUIPMENT CARD
- **Front**: White → Red 50 → Rose 50 (red gradient)
- **Front Border**: `border-red-200/70`
- **Back**: `bg-red-950` (dark red)
- **Back Text**: `text-red-50`
- **Back Accents**: `text-red-200`, `text-red-300`
- **Button**: `bg-red-600` / `bg-red-500`

---

## 🔄 Rotation Animation (All Same)

| Property | Value |
|----------|-------|
| **Container** | `perspective-1000` |
| **Parent** | `preserve-3d`, `h-[320px]` |
| **Condition** | `isFlipped ? "rotate-y-180" : ""` |
| **Duration** | `duration-700` (700ms) |
| **Easing** | Linear |
| **Front Card** | `backface-hidden` (no rotation) |
| **Back Card** | `backface-hidden rotate-y-180` (pre-rotated) |

---

## 📱 Responsive Grid (All Same)

```tsx
<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
  {/* Each card is 320px tall */}
</div>
```

| Screen | Columns |
|--------|---------|
| Mobile | 1 |
| Tablet (sm) | 2 |
| Desktop (xl) | 3 |

---

## 🎭 What Changes Per Card Type

### Only the DATA Changes:

| Aspect | Seed | Worker | Fertilizer | Equipment |
|--------|------|--------|------------|-----------|
| **Front Title** | Seed name | Worker name | Fertilizer name | Model name |
| **Subtitle** | Description | Role | NPK Ratio | Owner name |
| **Emoji** | Plant/crop emoji | Person emoji | Chemical emoji | Machine emoji |
| **Status Badge** | "Ready" | "Available" | "In Stock" | Condition |
| **Grid Box 1** | Price | Daily Rate | Price | Daily Rate |
| **Grid Box 2** | Yield | Skills | Coverage | Availability |
| **Tag 1** | Duration | Skill Level | Type | Type |
| **Tag 2** | Water Need | Location | Dosage | Condition |
| **Button Label** | "Order Seeds" | "Hire Worker" | "Order Now" | "Book Equipment" |
| **Back Spec 1** | Duration | Skill Level | NPK Ratio | Power |
| **Back Spec 2** | Water Need | Experience | Composition | Capacity |
| **Back Spec 3** | Temperature | Hourly Rate | Application Rate | Fuel Type |
| **Back Spec 4** | Avg Yield | Rating | Coverage Area | Hours Used |
| **Back Box 1** | Description | Bio | Benefits | Owner Details |
| **Back Box 2** | Certification | Certifications | Certification | Maintenance |
| **Back Box 3** | Warning | Availability | Warning | Warranty |

---

## 🔐 TypeScript Types (All Follow Same Pattern)

### Common Structure for All

```typescript
type FlipCardData = {
  id: number;              // Unique identifier
  name: string;            // Primary name/title
  emoji: string;           // Visual representation
  [key]: string | number;  // Type-specific fields
  // 4 main specs for back
  description: string;     // Bio/Benefits/Details
  certification: string;   // Certifications/Details
  warning: string;         // Warning/Warranty/Notes
};
```

---

## 💡 Key Insights: Why This Pattern Works

1. **Consistent UX** - Users learn one pattern, works for all resource types
2. **Visual Continuity** - Color-coded but structurally identical
3. **Data-Driven** - Only component data changes, not markup
4. **Scalable** - Easy to add more resource types (e.g., Seeds, Pesticides, Tools)
5. **Responsive** - Single grid layout works for all types
6. **Accessible** - Same ARIA labels, keyboard support across all
7. **Maintainable** - Bug fix in one component helps all others
8. **Professional** - Polished 3D rotation effect on all

---

## 🚀 Extension Possibilities

Can easily add more resource types using same pattern:

- **Pesticides Card** (purple theme, pest control specs)
- **Tools Card** (gray theme, tool specifications)
- **Seeds Organic Card** (green+eco theme)
- **Farm Services Card** (teal theme, service descriptions)

All would follow the exact same component structure!

---

## ✨ Summary

**ONE pattern. FOUR implementations. INFINITE scalability.**

All flip cards use:
- ✅ Same HTML structure
- ✅ Same CSS animation
- ✅ Same responsive grid
- ✅ Same interaction pattern
- ✅ Different data
- ✅ Different colors
- ✅ Type-specific specs
