# ระบบบันทึกกิจกรรมล้างรถ (Car Wash Activity)

## 1. ภาพรวม (Overview)

ระบบใหม่สำหรับ Driver บันทึกภาพกิจกรรมล้างรถ พร้อม caption และวันที่/เวลา และ Leader สามารถ monitor ภาพรวมได้ผ่าน dashboard

---

## 2. Data Architecture

### 2.1 MongoDB Model: `CarWashActivity`

```typescript
interface ICarWashActivity {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;          // คนโพสต์ (ref: User)
  activityType: string;                      // "car-wash" (phase 1)
  imageUrl: string;                          // URL จาก Vercel Blob
  caption: string;                           // ข้อความที่ใส่
  activityDate: Date;                        // วันที่ทำกิจกรรมจริง
  activityTime: string;                      // เวลาทำกิจกรรม (HH:mm)
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/car-wash` | ดาวน์โหลด activities (support `userId`, `startDate`, `endDate` filters) |
| POST | `/api/car-wash` | สร้าง activity ใหม่ (upload image + data) |

**GET Query Parameters:**
- `userId` - filter เฉพาะ driver
- `startDate` - filter วันที่เริ่ม
- `endDate` - filter วันที่สิ้นสุด

**POST Request (FormData):**
- `image` - ไฟล์รูปภาพ
- `activityType` - "car-wash"
- `caption` - ข้อความ
- `activityDate` - วันที่ (YYYY-MM-DD)
- `activityTime` - เวลา (HH:mm)

---

## 3. Vercel Blob Integration

### Environment Variables
```
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
```

### Upload Flow
1. Client resize image (client-side)
2. Client POST FormData ไป API
3. Server ใช้ `@vercel/blob` upload ไป cloud
4. Server save URL ลง MongoDB

---

## 4. Driver UX/UI

### 4.1 หน้า: `/car-wash`

**Layout (Mobile First):**

```
┌─────────────────────────────────────┐
│ ← บันทึกกิจกรรม          [Logo]   │  <- PageHeader
├─────────────────────────────────────┤
│                                     │
│  เลือกกิจกรรม                      │  <- Section 1
│  ┌─────────────────────────────────┐│
│  │ 🚗 ล้างรถ                       ││  <- Selected (default)
│  └─────────────────────────────────┘│
│                                     │
│  📷                                 │  <- Section 2: Image Upload
│  แตะเพื่ออัปโหลดรูปภาพ              │
│  ┌─────────┐                        │
│  │ Preview │  (aspect ratio ไม่บิด)│
│  └─────────┘                        │
│                                     │
│  รายละเอียด                        │  <- Section 3: Caption
│  ┌─────────────────────────────────┐│
│  │ โปรดใส่รายละเอียด...           ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  วันที่และเวลาที่ทำกิจกรรม         │  <- Section 4: DateTime
│  ┌─────────────────────────────────┐│
│  │ 📅 04 มี.ค. 2026  ⏰ 14:30     ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │         บันทึก                 ││  <- Submit Button
│  └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│ [หน้าหลัก] [ขอลา] [ประวัติ] [โปรไฟล์]│  <- BottomNav
└─────────────────────────────────────┘
```

### 4.2 Image Resize (Client-side)

**ก่อน Upload ต้อง Resize:**

```typescript
// Config
maxDimension = 800    // pixel
quality = 0.8        // 80%

// Logic
- รักษา aspect ratio (ไม่บิดเบี้ยว)
- dimension ใหญ่สุดไม่เกิน 800px
- ถ้าแนวนอน → width = 800, คำนวณ height
- ถ้าแนวตั้ง → height = 800, คำนวณ width
- Output: JPEG 80%
```

**ตัวอย่างขนาดหลัง Resize:**

| ต้นฉบับ | หลัง Resize |
|---------|-------------|
| 1200 x 800 | 800 x 533 |
| 600 x 1200 | 400 x 800 |
| 1920 x 1080 | 800 x 450 |

### 4.3 Time Picker (Dropdown)

```typescript
const timeSlots = [
  "00:00", "00:30", "01:00", ..., "23:30"
];
// ทุก 30 นาที, 48 options
```

---

## 5. Leader UX/UI

### 5.1 หน้า: `/leader/car-wash`

**Layout:**

```
┌─────────────────────────────────────────────────┐
│ ← กิจกรรมล้างรถ                      [Logo]    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ วันนี้   │ │สัปดาห์นี้│ │ เดือนนี้  │        │ <- Stats Cards
│  │   5      │ │    32    │ │   145    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  ตัวกรอง                                       │
│  ┌─────────────────┐ ┌─────────────────────┐   │
│  │ เลือกพนักงาน ▼ │ │ 📅 เริ่ม - สิ้นสุด  │   │
│  └─────────────────┘ └─────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ [รูป]  สมชาย ล้างรถเรียบร้อย           │   │
│  │        04 มี.ค. 2026 14:30              │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ [รูป]  สมศาล ล้างรถเรียบร้อย           │   │
│  │        03 มี.ค. 2026 09:00              │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│ [หน้าหลัก] [อนุมัติ] [ประวัติ] [พนักงาน]       │  <- BottomNav
└─────────────────────────────────────────────────┘
```

### 5.2 Stats Cards

| Metric | คำนวณจาก |
|--------|----------|
| วันนี้ | activities ที่ `activityDate` = วันนี้ |
| สัปดาห์นี้ | activities ในสัปดาห์นี้ (Mon-Sun) |
| เดือนนี้ | activities ในเดือนนี้ |

### 5.3 Filters

- **Dropdown พนักงาน**: ดึด list จาก `/api/users?status=active`
- **Date Range**: react-day-picker (เลือกช่วงวันที่)

### 5.4 Activity List

- แสดงเป็น Card List
- ข้อมูลในแต่ละ Card:
  - รูปภาพ (thumbnail)
  - ชื่อ Driver
  - Caption
  - วันที่ + เวลา

---

## 6. Navigation

### 6.1 Driver Sidebar & BottomNav

เพิ่มเมนูใหม่:

| Icon | Label | Href |
|------|-------|------|
| Car | กิจกรรม | `/car-wash` |

### 6.2 Leader Sidebar & BottomNav

เพิ่มเมนูใหม่:

| Icon | Label | Href |
|------|-------|------|
| Car | กิจกรรมล้างรถ | `/leader/car-wash` |

---

## 7. Files ที่ต้องสร้าง/แก้ไข

### สร้างใหม่

| Path | Description |
|------|-------------|
| `src/models/CarWashActivity.ts` | Mongoose model |
| `src/app/api/car-wash/route.ts` | GET + POST API |
| `src/app/car-wash/page.tsx` | Driver post page |
| `src/app/leader/car-wash/page.tsx` | Leader dashboard |

### แก้ไข

| Path | Description |
|------|-------------|
| `src/components/Sidebar.tsx` | เพิ่มเมนู driver + leader |
| `src/components/BottomNav.tsx` | เพิ่มเมนู driver + leader |

---

## 8. Dependencies

ไลบรารีที่ต้องติดตั้ง:

```bash
npm install @vercel/blob
```

(อื่นๆ ใช้ที่มีอยู่แล้ว: `react-day-picker`, `dayjs`, `lucide-react`, `framer-motion`)

---

## 9. Error Handling

| Scenario | Handling |
|----------|----------|
| Upload image ล้มเหลว | แสดง error toast "อัปโหลดรูปภาพไม่สำเร็จ" |
| ไม่ได้เลือกรูป | Disable ปุ่ม submit |
| ไม่ได้ใส่ caption | Allow (optional) |
| ไม่ได้เลือกวันที่ | Disable ปุ่ม submit |
| API error | แสดง error message จาก server |

---

## 10. Future Considerations

- เพิ่มกิจกรรมอื่น (เช่น เช็ดกระจก, ดูดฝุ่น)
- ระบบ Like/Comment
- Leader ลบโพสต์ได้
