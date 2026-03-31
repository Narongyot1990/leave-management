# Leave Management - Architecture Documentation

## Database Structure

### Collections

#### 1. `users` Collection
- เก็บข้อมูล **พนักงานทั้งหมด** (รวม drivers และ leaders)
- Schema: `/src/models/User.ts`

| Field | Type | Description |
|-------|------|-------------|
| _id | ObjectId | ID ของ user |
| email | String | Email (สำหรับ login ด้วยรหัสผ่าน) |
| name | String | ชื่อ |
| surname | String | นามสกุล |
| role | String | `driver` หรือ `leader` หรือ `admin` |
| branch | String | สาขาที่สังกัด (เช่น "AYA") |
| lineUserId | String | LINE User ID (สำหรับ LINE login) |
| lineDisplayName | String | ชื่อที่แสดงบน LINE |
| lineProfileImage | String | URL รูปโปรไฟล์ LINE |
| status | String | `pending` หรือ `active` |
| phone | String | เบอร์โทร |
| employeeId | String | รหัสพนักงาน |

#### 2. `leaders` Collection
- เก็บข้อมูล **หัวหน้างาน** (สำหรับ login ด้วยรหัสผ่าน)
- **หมายเหตุ:** Collection นี้อาจว่างเปล่า - leader บางคนอาจอยู่ใน `users` collection แทน

#### 3. `leaveRequests` Collection
- เก็บคำขอลาทั้งหมด
- Schema: `/src/models/LeaveRequest.ts`

| Field | Type | Description |
|-------|------|-------------|
| userId | ObjectId | ID ของ user ที่ขอลา |
| leaveType | String | ประเภทการลา (sick, personal, vacation, etc.) |
| startDate | Date | วันเริ่มลา |
| endDate | Date | วันสิ้นสุดการลา |
| status | String | `pending`, `approved`, `rejected` |
| reason | String | เหตุผลการลา |

## Authentication Flow

### LINE Login (`/api/auth/line`)
1. User กดปุ่ม Login with LINE
2. ระบบเรียก LINE API เพื่อ get profile
3. ค้นหา user ใน `users` collection ด้วย `lineUserId`
4. ถ้าไม่เจอ → สร้าง user ใหม่
5. สร้าง JWT token พร้อมข้อมูล:
   ```javascript
   {
     userId: user._id,
     role: user.role || "driver",  // driver, leader, หรือ admin
     branch: user.branch,           // สาขาที่สังกัด
     status: user.status            // pending หรือ active
   }
   ```

### Password Login (`/api/auth/leader-login`)
1. ค้นหาใน `leaders` collection ก่อน
2. ถ้าไม่เจอ → ค้นหาใน `users` collection ด้วย `{ email, role: 'leader' }`
3. สร้าง JWT token

## Permission System

### Role Hierarchy
```
admin > leader > driver
```

### Permissions by Role

#### Driver
- ดูได้เฉพาะ **คำขอลาของตัวเอง**
- สร้าง/ยกเลิกคำขอลาตัวเอง
- ดู attendance ตัวเอง

#### Leader
- ดูได้ทุกคำขอลาใน **สาขาของตัวเอง**
- อนุมัติ/ปฏิเสธคำขอลาของ driver ในสาขา
- ถ้าไม่มี branch → ดูได้เฉพาะ pending requests ทั้งหมด

#### Admin
- ดูได้ทุกคำขอลาทุกสาขา
- อนุมัติ/ปฏิเสซคำขอลาได้ทั้งหมด
- จัดการ users, drivers, settings

## API Endpoints

### Leave
- `GET /api/leave` - ดูรายการคำขอลา (filter ตาม role)
- `POST /api/leave` - สร้างคำขอลาใหม่
- `PATCH /api/leave` - อัพเดทคำขอลา (อนุมัติ/ปฏิเสธ)

### Users
- `GET /api/users` - ดูรายการพนักงาน
- `PATCH /api/users/:id` - แก้ไขพนักงาน

## BuildLeaveScope Logic

File: `/src/services/leave.domain.ts`

```javascript
async function buildLeaveScope(actor, query) {
  if (actor.role === "driver") {
    // Driver: ดูได้เฉพาะตัวเอง
    if (actor.branch) {
      filter.userId = { $in: getBranchUserIds(actor.branch, actor.userId) };
    } else {
      filter.userId = actor.userId;
    }
  } else if (actor.role === "leader") {
    // Leader: ถ้าไม่มี branch → ดู pending ทั้งหมด
    if (!actor.branch) {
      filter.status = "pending";
    } else {
      filter.userId = { $in: getBranchUserIds(actor.branch, actor.userId) };
    }
  } else if (actor.role === "admin") {
    // Admin: ดูตาม branch filter
    if (query.branch && query.branch !== "all") {
      filter.userId = { $in: getBranchUserIds(query.branch) };
    }
  }
}
```

## MongoDB Connection

- **Database:** `driver-request` (MongoDB Atlas)
- **Connection:** `mongodb+srv://Vercel-Admin-driver_request:...@driver-request.w11djig.mongodb.net/`
- **Env:** `MONGODB_URI` (in Vercel project settings)

## Common Issues

### 1. Leader ไม่เห็นคำขอลา
**สาเหตุ:** Leader ไม่มี `branch` ตั้งค่าใน users collection

**วิธีแก้:** 
1. เช็คว่า leader record มี branch ถูกต้องใน MongoDB
2. ถ้าไม่มี → อัพเดทให้มี branch

### 2. Collection Structure
- อย่าสับสนระหว่าง `users` และ `leaders`
- `users` = ข้อมูลพนักงานทั้งหมด (drivers, leaders, admins)
- `leaders` = หัวหน้าที่ login ด้วยรหัสผ่าน (อาจว่างเปล่า)
