# HƯỚNG DẪN CẤU HÌNH FIREBASE - Đơn giản

## Bước 1: Tạo project Firebase (5 phút)

1. Truy cập: https://console.firebase.google.com/
2. Đăng nhập bằng tài khoản Google
3. Click **"Thêm dự án"** (Add project)
4. Đặt tên project (ví dụ: "food-map")
5. Tắt Google Analytics → Click **"Tạo dự án"**

## Bước 2: Tạo Web App

1. Trong Firebase Console, click biểu tượng **Web** `</>` 
2. Đặt tên app: "Food Map Web"
3. **KHÔNG** chọn "Also set up Firebase Hosting"
4. Click **"Đăng ký ứng dụng"**

## Bước 3: Copy cấu hình Firebase

Bạn sẽ thấy một đoạn code như này:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBxxxxxxxxxxxxxxxxxxxxxx",
  authDomain: "food-map-xxxxx.firebaseapp.com",
  projectId: "food-map-xxxxx",
  storageBucket: "food-map-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxxxx"
};
```

**→ COPY toàn bộ phần này!**

## Bước 4: Dán vào file firebase-config.js

1. Mở file: `js/firebase-config.js`
2. Tìm dòng 4-10 có nội dung:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    ...
};
```

3. **Thay thế toàn bộ** bằng đoạn code bạn vừa copy ở Bước 3
4. **Lưu file** (Ctrl + S)

## Bước 5: Tạo Firestore Database

1. Trong Firebase Console, menu bên trái → **"Firestore Database"**
2. Click **"Tạo cơ sở dữ liệu"**
3. Chọn **"Bắt đầu ở chế độ test"** (Start in test mode)
4. Chọn vị trí: **asia-southeast1 (Singapore)**
5. Click **"Kích hoạt"**

## Bước 6: Cấu hình Security Rules (QUAN TRỌNG!)

1. Trong Firestore Database → Tab **"Rules"**
2. Thay thế bằng code này:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /markers/{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **"Publish"** (Xuất bản)

⚠️ **Lưu ý:** Rules này cho phép mọi người đọc/ghi (phù hợp cho ứng dụng công khai)

## Bước 7: Test ứng dụng

1. Mở file `index.html` bằng trình duyệt
2. Nhấn **F12** để mở Console
3. Nếu thành công, bạn sẽ thấy:
   - `✅ Firebase đã được khởi tạo`
   - `✅ Đã tải X markers từ Firestore`

4. Thử thêm một marker mới
5. Mở trên thiết bị khác → marker sẽ hiện ra!

## ✅ Hoàn thành!

Bây giờ:
- ✅ Tất cả markers được lưu trên cloud (Firestore)
- ✅ Tự động đồng bộ giữa các thiết bị
- ✅ Mọi người đều có thể thêm/xem/sửa/xóa markers
- ✅ Miễn phí (đủ cho hàng nghìn người dùng)

## Kiểm tra dữ liệu

1. Vào Firebase Console → **Firestore Database**
2. Bạn sẽ thấy collection **"markers"**
3. Mỗi document = 1 marker đã lưu

## Giới hạn miễn phí

**Gói Spark (Miễn phí):**
- 1 GB dữ liệu
- 10 GB bandwidth/tháng
- 50,000 reads/ngày
- 20,000 writes/ngày

→ **Đủ cho hàng nghìn người dùng!**

## Troubleshooting

### Lỗi: "Firebase is not defined"
- Kiểm tra thứ tự script trong `index.html`
- Firebase SDK phải load trước `firebase-config.js`

### Lỗi: "Missing or insufficient permissions"
- Kiểm tra Security Rules trong Firestore
- Đảm bảo đã Publish rules

### Màn hình trắng xóa
- Mở Console (F12) xem lỗi
- Kiểm tra đã copy đúng Firebase config chưa
- Kiểm tra đã tạo Firestore Database chưa

### Dữ liệu không đồng bộ
- Xóa cache trình duyệt (Ctrl + Shift + R)
- Kiểm tra cả 2 thiết bị đều dùng phiên bản mới
- Kiểm tra Console có lỗi không

## Cần hỗ trợ?

Gửi cho tôi:
1. Screenshot Console (F12)
2. Mô tả lỗi gặp phải
