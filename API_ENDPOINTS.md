# API Endpoints Documentation

## 📡 API Gateway
**URL**: `http://localhost:8080` (ตัวหลักที่ frontend เรียก)

### Middleware Flow
```
Frontend → API Gateway:8080 → Backend Services
```

---

## 🔐 Auth Service (Port 8082)

### Endpoints

#### 1. **POST** `/api/auth/login`
**Description**: Login และรับ JWT token
**Request Body**:
```json
{
  "username": "admin",
  "password": "anypassword"
}
```
**Response**:
```json
{
  "access_token": "jwt_token_here",
  "role": "ADMIN",
  "username": "admin",
  "name": "Admin User",
  "organization_id": "uuid",
  "branch_id": "uuid"
}
```

#### 2. **POST** `/api/auth/validate`
**Description**: ตรวจสอบว่า token ยังใช้ได้หรือไม่
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "valid": true,
  "sub": "user_id",
  "role": "ADMIN"
}
```

#### 3. **POST** `/api/auth/refresh`
**Description**: Refresh token เพื่อขอ token ใหม่
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "access_token": "new_jwt_token"
}
```

#### 4. **GET** `/api/auth/me`
**Description**: ดึงข้อมูล user ปัจจุบัน
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "id": "uuid",
  "username": "manager.delicious",
  "name": "John Manager",
  "email": "john@delicious.com",
  "role": "MANAGER",
  "organization_id": "uuid",
  "organization_name": "Delicious Thai Restaurant",
  "branch_id": "uuid",
  "branch_name": "Siam Branch"
}
```

---

## 🏢 Organizations & Branches (in Auth Service)

### Organizations

#### 1. **GET** `/api/organizations`
**Description**: ดึงรายการองค์กรทั้งหมด (ADMIN only)
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "Delicious Thai Restaurant",
      "slug": "delicious-thai",
      "contact_email": "contact@delicious.com",
      "contact_phone": "02-xxx-xxxx",
      "plan_type": "FREE",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. **POST** `/api/organizations`
**Description**: สร้างองค์กรใหม่ (ADMIN only)
**Headers**: `Authorization: Bearer {token}`
**Request Body**:
```json
{
  "name": "New Restaurant",
  "slug": "new-restaurant",
  "contact_email": "contact@new.com",
  "contact_phone": "02-xxx-xxxx",
  "plan_type": "BASIC"
}
```

#### 3. **GET** `/api/organizations/{id}`
**Description**: ดึงข้อมูลองค์กร (ADMIN/MANAGER)
**Headers**: `Authorization: Bearer {token}`

#### 4. **PUT** `/api/organizations/{id}`
**Description**: แก้ไขข้อมูลองค์กร (ADMIN only)
**Headers**: `Authorization: Bearer {token}`

### Branches

#### 5. **GET** `/api/organizations/{orgId}/branches`
**Description**: ดึงรายการสาขา (ADMIN/MANAGER)
**Headers**: `Authorization: Bearer {token}`
**Response**:
```json
{
  "branches": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "name": "Siam Branch",
      "slug": "siam",
      "address": "123 Siam Road",
      "city": "Bangkok",
      "province": "Bangkok",
      "postal_code": "10330",
      "phone": "02-xxx-xxxx",
      "email": "siam@delicious.com",
      "opening_time": "10:00:00",
      "closing_time": "22:00:00",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### 6. **POST** `/api/organizations/{orgId}/branches`
**Description**: สร้างสาขาใหม่ (ADMIN/MANAGER)
**Headers**: `Authorization: Bearer {token}`
**Request Body**:
```json
{
  "name": "New Branch",
  "slug": "new-branch",
  "address": "456 New Road",
  "city": "Bangkok",
  "province": "Bangkok",
  "postal_code": "10400",
  "phone": "02-xxx-xxxx",
  "email": "new@restaurant.com",
  "opening_time": "09:00:00",
  "closing_time": "21:00:00"
}
```

#### 7. **GET** `/api/organizations/{orgId}/branches/{id}`
**Description**: ดึงข้อมูลสาขา (ADMIN/MANAGER/CASHIER)
**Headers**: `Authorization: Bearer {token}`

#### 8. **PUT** `/api/organizations/{orgId}/branches/{id}`
**Description**: แก้ไขข้อมูลสาขา (ADMIN/MANAGER)
**Headers**: `Authorization: Bearer {token}`

---

## 📦 Order Service (Port 8083)

### Endpoints

#### 1. **GET** `/api/orders`
**Description**: ดึงรายการ orders ทั้งหมด
**Query Params**: `status`, `table_id`
**Response**:
```json
[
  {
    "id": "uuid",
    "table_id": 1,
    "order_number": 1,
    "status": "OPEN",
    "subtotal": 100.00,
    "tax": 7.00,
    "discount_amount": 0,
    "total_amount": 107.00,
    "created_at": "2026-02-03T10:00:00Z"
  }
]
```

#### 2. **POST** `/api/orders`
**Description**: สร้าง order ใหม่
**Request Body**:
```json
{
  "table_id": "1",
  "items": [
    {
      "item_name": "Burger",
      "price": 99.99,
      "quantity": 2
    }
  ],
  "created_by": "user_id"
}
```

#### 3. **GET** `/api/orders/{id}`
**Description**: ดูรายละเอียด order เดียว

#### 4. **POST** `/api/orders/{id}/items`
**Description**: เพิ่มรายการอาหารเข้า order

#### 5. **DELETE** `/api/orders/{id}/items/{itemId}`
**Description**: ลบรายการอาหารออกจาก order

#### 6. **PUT** `/api/orders/{id}/status`
**Description**: เปลี่ยนสถานะ order
**Request Body**:
```json
{
  "status": "CONFIRMED"
}
```

---

## 💰 Payment Service (Port 8085)

### Endpoints

#### 1. **POST** `/api/payments/checkout`
**Description**: ชำระเงิน
**Request Body**:
```json
{
  "order_id": "uuid",
  "payment_method": "CASH",
  "amount": 107.00
}
```

#### 2. **GET** `/api/payments/{id}`
**Description**: ดูสถานะการชำระเงิน

---

## 🎁 Promotion Service (Port 8084)

### Endpoints

#### 1. **POST** `/api/promotions/evaluate`
**Description**: ตรวจสอบโปรโมชั่น
**Request Body**:
```json
{
  "code": "SUMMER20",
  "order_total": 100.00
}
```

#### 2. **POST** `/api/promotions/apply`
**Description**: ใช้โปรโมชั่นกับ order
**Request Body**:
```json
{
  "code": "SUMMER20",
  "order_id": "uuid"
}
```

---

## ⚠️ ปัญหาที่พบ

### 1. **CORS Configuration**
- API Gateway ต้องอนุญาต CORS จาก frontend
- ตอนนี้ตั้งเป็น `*` (allow all)

### 2. **Auth Middleware Order**
```go
// ⚠️ ลำดับ middleware สำคัญ!
handler = loggingMiddleware(router)
handler = authMiddleware(jwtSecret, handler)  // ต้องมาก่อน CORS
handler = corsMiddleware(handler)
```

### 3. **Protected Routes**
Routes ที่ **ไม่ต้อง** authentication:
- `OPTIONS` (สำหรับ CORS preflight)
- `/health`
- `/api/auth/*` (login, validate, refresh)
- `GET /api/orders` (user menu)
- `POST /api/orders` (user สั่งอาหาร)

Routes ที่ **ต้องมี** authentication:
- `PUT /api/orders/{id}/status`
- `DELETE /api/orders/{id}/items/{itemId}`
- `/api/payments/*`
- `/api/promotions/*`

---

## 🔧 Frontend Configuration

### Environment Variables
```env
VITE_API_URL=http://localhost:8080
```

### API Client Setup
```javascript
// frontend/src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// ✅ ถูกต้อง - เรียกผ่าน API Gateway
axios.post('/api/auth/login', {...})

// ❌ ผิด - เรียกตรงไป service
axios.post('http://localhost:8082/api/auth/login', {...})
```

---

## 🧪 Testing Endpoints

### 1. Test Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'
```

### 2. Test Orders (with token)
```bash
curl http://localhost:8080/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Test Health Check
```bash
curl http://localhost:8080/health
```

---

## 🐛 Debug Checklist

- [ ] API Gateway running on port 8080
- [ ] Auth Service running on port 8082
- [ ] Frontend เรียก `http://localhost:8080/api/auth/login`
- [ ] CORS headers ถูกส่งกลับมา
- [ ] Token ถูก save ใน localStorage
- [ ] Token ถูกส่งใน `Authorization: Bearer {token}` header
