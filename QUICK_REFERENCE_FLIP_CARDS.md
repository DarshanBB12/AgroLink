
# QUICK REFERENCE: Seed Card Features Applied to All Cards

## ⚡ 30-Second Summary

**Same Seed Card structure applied to 4 card types:**
- 🌾 **Seed Card** (Green theme)
- 👨‍🌾 **Worker Card** (Blue theme)  
- 🧪 **Fertilizer Card** (Orange theme)
- 🚜 **Equipment Card** (Red theme)

**Same Features in ALL:**
- ✅ 3D flip animation (700ms, Y-axis rotation)
- ✅ Click flip button to see back side
- ✅ 4 specs in 2x2 grid on back
- ✅ 3 detailed info boxes on back
- ✅ Light theme front, dark theme back
- ✅ Responsive grid (1/2/3 columns)
- ✅ Fixed 320px height
- ✅ Color-coded by type

---

## 🎯 The "Rotation" Feature Explained

### What is it?
A **3D flip animation** that rotates the card 180° when you click the flip button, showing detailed information on the back.

### How to trigger it?
Click the **RotateCw button** in the top-left corner of any card.

### Animation Details
- **Duration:** 700 milliseconds (smooth, not too slow)
- **Axis:** Y-axis (vertical flip)
- **Trigger:** Click on flip button
- **Back to front:** Click "Back to front" button or flip button again

### Code Pattern
```tsx
const [isFlipped, setIsFlipped] = useState(false);

<div className={`transition-transform duration-700 ${isFlipped ? "rotate-y-180" : ""}`}>
  {/* Front and back cards here */}
</div>
```

---

## 📋 Front Side Features (All Cards)

| Element | Description | Location |
|---------|-------------|----------|
| Flip Button | RotateCw icon, clickable | Top-left |
| Type Badge | "Seed", "Worker", etc. | Top-left (next to flip) |
| Large Emoji | Visual (7xl size) | Top 40% |
| Title | Resource name | Below emoji |
| Subtitle | Description | Below title |
| Status Badge | Available/Ready/In Stock | Top-right |
| Info Grid | 2 boxes (Price + Secondary) | Middle |
| Tag Pills | Specs (2-3 tags) | Bottom |
| CTA Button | Order/Hire/Book (full width) | Very bottom |

---

## 🔄 Back Side Features (All Cards)

| Element | Description | Contains |
|---------|-------------|----------|
| Header | "AgroLink [Type]" + Title | Dark theme |
| Flip Badge | "Flip card" indicator | Top-right |
| **4-Box Grid** | **2x2 specs with icons** | **Type-specific** |
| Description Box | Main details | Icon + text |
| Certification Box | Certs/Quality | Icon + text |
| Warning Box | Alert info (amber bg) | Icon + text |
| Primary Button | Action (Order/Hire/Book) | Full width |
| Back Button | Return to front | Full width |

---

## 🎨 Colors by Type

### SEED (Green)
```
Front:  white + emerald50 + lime50 gradient
Back:   dark emerald (bg-emerald-950)
Button: green (bg-emerald-600)
Text:   emerald-200, emerald-50
```

### WORKER (Blue)
```
Front:  white + sky50 + blue50 gradient
Back:   dark blue (bg-sky-950)
Button: sky blue (bg-sky-600)
Text:   sky-200, sky-50
```

### FERTILIZER (Orange)
```
Front:  white + amber50 + orange50 gradient
Back:   dark brown (bg-amber-950)
Button: amber (bg-amber-600)
Text:   amber-200, amber-50
```

### EQUIPMENT (Red)
```
Front:  white + red50 + rose50 gradient
Back:   dark red (bg-red-950)
Button: red (bg-red-600)
Text:   red-200, red-50
```

---

## 📊 Data Fields by Type

### SEED
```
Price | Unit | Duration | Water Need | Temperature | Avg Yield
Description | Certification | Warning
```

### WORKER
```
Daily Rate | Hourly Rate | Skill Level | Experience | Rating
Bio | Certifications | Availability | Phone
```

### FERTILIZER
```
Price | Unit | Coverage | NPK Ratio | Composition | Application Rate
Benefits | Certification | Warning
```

### EQUIPMENT
```
Daily Rate | Unit | Condition | Power | Capacity | Fuel Type | Hours Used
Owner Details | Maintenance | Warranty
```

---

## 🎬 Animation Timeline

```
t=0ms     ┌──────────────────────┐
          │   [FRONT VISIBLE]    │
          │   (ready to click)    │
          └──────────────────────┘
                      ↓
t=100ms   Card rotates on Y-axis
          Front face turns away
          Back face turns toward viewer
                      ↓
t=350ms   ┌──────────────────────┐
          │   MIDWAY (edge-on)   │ ← Both invisible at this point
          │   perpendicular      │
          └──────────────────────┘
                      ↓
t=600ms   Back face fully visible
          Front face completely hidden
                      ↓
t=700ms   ┌──────────────────────┐
          │   [BACK VISIBLE]     │
          │   (animation done)    │
          └──────────────────────┘
```

---

## 📱 Responsive Behavior

```
MOBILE              TABLET              DESKTOP
(1 column)          (2 columns)         (3 columns)

[Card 1]           [Card 1] [Card 2]   [Card 1] [Card 2] [Card 3]
[Card 2]           [Card 3] [Card 4]   [Card 4] [Card 5] [Card 6]
[Card 3]           [Card 5]            [Card 7] [Card 8]

All cards: 320px height (fixed)
Gap: 20px spacing between cards
```

---

## ✨ Key Differences

| Aspect | Front | Back |
|--------|-------|------|
| **Theme** | Light gradient | Dark solid |
| **Text Color** | Dark (foreground) | Light (white) |
| **Purpose** | Quick overview | Detailed specs |
| **Interaction** | Shows status | Shows credentials |
| **Icons** | Type badge only | Multiple icons |
| **Boxes** | 2-column grid | 4-box grid + 3 info boxes |

---

## 🚀 Component Files

```
✅ WorkerFlipCard.tsx         (Blue theme, 9.4KB)
✅ FertilizerFlipCard.tsx      (Orange theme, 9.4KB)
✅ EquipmentFlipCard.tsx       (Red theme, 9.3KB)
📚 FLIP_CARD_GUIDE.md          (Integration guide)
📚 FLIP_CARD_FEATURES.md       (Feature breakdown)
📚 FLIP_CARD_VISUAL_GUIDE.md   (Visual diagrams)
📚 README_FLIP_CARDS.md        (This reference)
📚 flipCardSamples.ts          (Sample data)
```

---

## 💡 Why Same Pattern?

1. **Users learn once** - They understand how ALL cards work
2. **Consistent experience** - Predictable interactions everywhere
3. **Easy maintenance** - Bug fix helps all card types
4. **Scalable design** - Add more types without changing architecture
5. **Professional feel** - Polished, cohesive design system

---

## 📞 Quick Help

**Q: How do I make cards flip?**
A: Click the RotateCw button in top-left corner

**Q: How fast is the flip animation?**
A: 700 milliseconds (smooth, not too slow or fast)

**Q: Can I change the animation speed?**
A: Yes, change `duration-700` to `duration-500` (faster) or `duration-1000` (slower)

**Q: Can I change the card height?**
A: Yes, change `h-[320px]` to any height you want

**Q: Can I change colors?**
A: Yes, replace Tailwind color classes (emerald → blue, etc.)

**Q: How do I integrate into my page?**
A: See FLIP_CARD_GUIDE.md for step-by-step instructions

---

## ✅ Implementation Checklist

- [ ] Understand the rotation feature (3D flip animation)
- [ ] Review FLIP_CARD_VISUAL_GUIDE.md for visual understanding
- [ ] Check flipCardSamples.ts for data structure
- [ ] Import component into your page
- [ ] Prepare data matching the type definition
- [ ] Render cards in a grid
- [ ] Define action handlers (onHire, onOrder, onBook)
- [ ] Test flip animation on mobile
- [ ] Verify responsive layout (1/2/3 columns)
- [ ] Style action dialog/modal to match card theme

---

## 🎉 You Now Have

✅ Worker flip cards with blue theme  
✅ Fertilizer flip cards with orange theme  
✅ Equipment flip cards with red theme  
✅ All with same 3D rotation animation  
✅ All with same structure and features  
✅ Complete documentation  
✅ Sample data and examples  

**Ready to implement!**
