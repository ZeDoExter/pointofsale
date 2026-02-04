# POS Flow & Requirements

**Last Updated**: 2026-02-04

---

## 🎯 Flow Overview

### Admin Dashboard
- แสดง **list ของ Manager accounts** ทั้งหมด
- แต่ละ Manager สามารถ **expand** เพื่อดู:
  - สาขา (Branches) ที่ Manager นั้นดูแล
  - รายละเอียดร้าน (Organization) ที่ Manager อยู่
- ไม่ต้องสร้าง Organization/Branch แยกแล้ว (focus ที่ Manager)

---

### Manager Dashboard
- **จัดการ Products/Categories**:
  - สร้าง/แก้ไข/ลบ products
  - จัดหมวดหมู่ (categories)
  - **Availability**: Boolean ง่ายๆ (ขาย/ไม่ขาย) - ไม่ต้อง inventory ซับซ้อน
  - **Product Options**:
    - หลายตัวเลือก (multiple choice) - เช่น Size: Small, Medium, Large
    - ต้องเลือก (required) - เช่น Spice Level: Mild, Medium, Hot
    - ราคาเพิ่ม (price modifier) - เช่น Large +20 บาท
- Products ที่ Manager สร้างจะ **ใช้ได้ทุกสาขา** ที่มี Cashier อยู่

---

### Cashier Dashboard
1. **เปิด Table Session**:
   - Cashier เลือกโต๊ะ → สร้าง Table Session
   - ได้ QR Code สำหรับลูกค้า
   - **เปิด WebSocket** สำหรับ realtime updates

2. **ลูกค้าสั่งอาหาร**:
   - ลูกค้า scan QR Code → เข้า User Menu
   - เห็น products ที่ Manager สร้างไว้
   - สั่งอาหารได้ → Order แสดงแบบ **realtime ผ่าน WebSocket**
   - สามารถสั่งเพิ่มได้เรื่อยๆ (ไม่เกิน 1-2 ชั่วโมง)

3. **จ่ายเงิน**:
   - ลูกค้าสามารถจ่ายได้หลายวิธี:
     - QR Code ที่หน้าเว็บ
     - จ่ายที่หน้า counter (Cashier จัดการ)
   - **Payment Service** จัดการการชำระเงิน

4. **ปิด Table Session**:
   - Cashier หรือ Manager ปิดได้ (Manager ต้องเลือกสาขาก่อน)
   - เมื่อปิด → สรุป **Transaction/Bill** สุดท้ายของโต๊ะ
   - ส่ง Bill ให้ลูกค้า

---

## 🔄 Complete Flow

```
1. Admin → ดู Manager list → Expand ดูสาขาและร้าน

2. Manager → จัดการ Products:
   - สร้าง Product พร้อม Options
   - ตั้ง Availability (ขาย/ไม่ขาย)
   - Products ใช้ได้ทุกสาขาที่มี Cashier

3. Cashier → เปิด Table Session:
   - เลือกโต๊ะ → สร้าง Session → ได้ QR Code
   - เปิด WebSocket สำหรับ realtime

4. ลูกค้า → Scan QR Code:
   - เห็น Products จาก Manager
   - สั่งอาหาร → Order แสดง realtime
   - สั่งเพิ่มได้เรื่อยๆ

5. จ่ายเงิน:
   - QR Code ที่หน้าเว็บ หรือ
   - จ่ายที่ counter (Cashier)

6. ปิด Table Session:
   - Cashier/Manager ปิด Session
   - สรุป Transaction → Generate Bill
   - ส่ง Bill ให้ลูกค้า
```

---

## 📋 Technical Requirements

### Backend
- [ ] Products API (CRUD) - Manager only
- [ ] Product Options API (multiple choice, required, price modifier)
- [ ] Table Session API (open/close)
- [ ] WebSocket for realtime orders
- [ ] Payment API (multiple methods)
- [ ] Bill/Transaction generation

### Frontend
- [ ] Admin: Manager list with expandable branches/orgs
- [ ] Manager: Product management UI with options
- [ ] Cashier: Table Session management
- [ ] User Menu: Real-time order updates via WebSocket
- [ ] Payment: QR Code + Counter payment
- [ ] Bill: Generate and display

---

## 🚫 Not Required (For Now)
- ❌ Inventory system (ใช้ boolean availability แทน)
- ❌ Promotion system (ไว้ทีหลัง)

---

## ✅ Current Status
- ✅ Authentication & User Management
- ✅ Organization & Branch Management
- ✅ Basic Order System
- 🚧 Product/Catalog System (ต้องทำ)
- 🚧 WebSocket Realtime (ต้องทำ)
- 🚧 Payment Integration (ต้องทำ)
- 🚧 Bill Generation (ต้องทำ)
