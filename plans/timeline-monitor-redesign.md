# Timeline Monitor Redesign Specification

## Overview
Redesign the Admin Timeline Monitor page to be a fully functional Timeline/Gantt Chart with dynamic zoom capabilities.

---

## 1. Zoom Levels

| Level | Display | Use Case |
|-------|---------|----------|
| **Hour** | 24 hours in a day (horizontal scroll) | Monitor real-time attendance |
| **Day** | 7 days (1 week) | Weekly overview |
| **Month** | 30-31 days | Monthly attendance pattern |

### Zoom Control UI
```
[Zoom Out] ──────●─────── [Zoom In]
   Hour ←────────→ Day ←────────→ Month
```

---

## 2. Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Timeline Monitor v4.0                    [Zoom]    │
├─────────────────────────────────────────────────────────────┤
│ CONTROLS: [< Prev] [Date: Jan 15, 2026] [Next >] [Today]   │
├────────────────┬────────────────────────────────────────────┤
│                │                                            │
│   STAFF LIST   │           TIMELINE AREA                    │
│                │                                            │
│  ┌──────────┐  │  [Hour View]  00 01 02 03 04 05 ... 23   │
│  │ Avatar    │  │  [Day View]   Mon Tue Wed Thu Fri ...    │
│  │ Name      │  │  [Month View] 1  2  3  4  5  6  ... 31   │
│  │ Status    │  │                                            │
│  └──────────┘  │  ┌─────────────────────────────────────┐   │
│  ┌──────────┐  │  │ ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ Avatar    │  │  │ ░░░░░░░████████░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ Name      │  │  │ ░░░░░░░░░░░░░░████████████░░░░░░░░░░ │   │
│  │ Status    │  │  └─────────────────────────────────────┘   │
│  └──────────┘  │                                            │
│                │                                            │
├────────────────┴────────────────────────────────────────────┤
│ FOOTER: Active: 12/25 | Late: 3 | On Leave: 2              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Header
- **Title**: TIMELINE MONITOR v4.0
- **Version Badge**: "ENHANCED"
- **Zoom Slider**: Range slider 1-3 (Hour/Day/Month)
- **Date Display**: Current selected date/range

### 3.2 Control Bar
- **Navigation**: Previous/Next buttons (context-aware based on zoom level)
- **Today Button**: Jump to current date
- **Quick Select**: Date picker dropdown

### 3.3 Staff List Panel (Left Sidebar)
- **Width**: 180px (fixed)
- **Sticky**: Yes, follows horizontal scroll
- **Content**:
  - User Avatar (40x40px)
  - Name (truncate with ellipsis)
  - Status indicator (colored dot)
  - Current session time (if active)

### 3.4 Timeline Area (Main)
- **Scrollable**: Horizontal + Vertical
- **Grid Lines**: 
  - Hour view: 24 columns (one per hour)
  - Day view: 7 columns (Mon-Sun)
  - Month view: 31 columns (one per day)
- **Gantt Bars**:
  - Rounded corners (8px)
  - Gradient fill (green for active, gray for completed)
  - Hover: Show tooltip with details

### 3.5 Zoom Slider
```
┌─────────────────────────────────────────┐
│ ○──────────────●───────────────○        │
│ Hour            Day            Month     │
└─────────────────────────────────────────┘
```

### 3.6 Footer Stats Bar
- Active: X/Y
- Late arrivals: X
- On leave: X
- Total hours: Xh

---

## 4. Interactions

### 4.1 Zoom Interaction
- **Slider drag**: Smooth transition between levels
- **Mouse wheel**: Ctrl+Scroll to zoom
- **Double-click**: Toggle between Hour/Day
- **Pinch gesture**: Mobile zoom

### 4.2 Timeline Interaction
- **Hover on bar**: Show tooltip (start time, end time, duration, branch)
- **Click on bar**: Open detail modal
- **Drag bar**: (Future) Adjust time (admin only)

### 4.3 Navigation
- **Arrow keys**: Move between days/weeks
- **Home key**: Go to today
- **Page Up/Down**: Move by week/month

---

## 5. Visual Design

### Color Palette
```css
--timeline-active: #10b981;      /* Emerald - currently working */
--timeline-completed: #94a3b8;   /* Gray - finished */
--timeline-late: #f59e0b;         /* Amber - late arrival */
--timeline-absent: #ef4444;       /* Red - absent */
--timeline-leave: #8b5cf6;       /* Purple - on leave */
--timeline-weekend: #fce7f3;      /* Pink - weekend highlight */
--grid-line: var(--border);
--staff-list-bg: var(--bg-surface);
--timeline-bg: var(--bg-inset);
```

### Typography
- **Header**: 16px, Bold (Black)
- **Staff Name**: 12px, Semi-bold
- **Time Labels**: 10px, Regular
- **Tooltip**: 11px, Regular

### Animations
- **Zoom transition**: 300ms ease-out
- **Bar hover**: Scale 1.05, 150ms
- **Scroll**: Smooth scroll behavior

---

## 6. Data Structure

### Attendance Record
```typescript
interface AttendanceRecord {
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  type: 'in' | 'out';
  timestamp: string; // ISO 8601
  branch: string;
  location: { lat: number; lon: number };
  distance: number;
  isInside: boolean;
}
```

### Timeline Data (Processed)
```typescript
interface TimelineEntry {
  id: string;
  name: string;
  image?: string;
  status: 'active' | 'completed' | 'absent' | 'leave';
  sessions: {
    start: Date;
    end: Date | null;
    isLate: boolean;
  }[];
}
```

---

## 7. Mobile Considerations

### Responsive Breakpoints
- **Desktop**: > 1024px - Full layout
- **Tablet**: 768px - 1024px - Collapsible sidebar
- **Mobile**: < 768px - Stacked layout, swipe navigation

### Mobile Optimizations
- Touch-friendly zoom slider (larger targets)
- Swipe left/right for date navigation
- Pull-to-refresh for data update
- Bottom sheet for staff list on mobile

---

## 8. Implementation Priority

### Phase 1: Core Features
1. Zoom slider with 3 levels (Hour/Day/Month)
2. Timeline visualization
3. Staff list with status
4. Navigation controls

### Phase 2: Enhanced UX
1. Tooltips on hover/click
2. Keyboard shortcuts
3. Smooth zoom animations
4. Data refresh optimization

### Phase 3: Advanced Features
1. Export functionality
2. Comparison view
3. Custom filters
4. Analytics dashboard integration

---

## 9. Technical Notes

### Performance
- Use virtualization for large staff lists
- Memoize timeline calculations
- Debounce zoom changes
- Lazy load off-screen data

### Data Fetching
- Hour view: Fetch current day data
- Day view: Fetch week data
- Month view: Fetch month data
- Cache responses based on date range

### State Management
```typescript
interface TimelineState {
  zoomLevel: 'hour' | 'day' | 'month';
  currentDate: Date;
  selectedStaff: string | null;
  isLoading: boolean;
  records: AttendanceRecord[];
}
```

---

## 10. Acceptance Criteria

- [ ] Zoom slider smoothly transitions between Hour → Day → Month
- [ ] Timeline accurately displays attendance sessions as bars
- [ ] Staff list shows current status (active/inactive/leave)
- [ ] Navigation (prev/next) works correctly for each zoom level
- [ ] Hover tooltips show session details
- [ ] Mobile layout is usable
- [ ] No performance issues with 50+ staff members
- [ ] Real-time updates work via Pusher