# ⚠️ CẢNH BÁO BẢO MẬT - API KEY BỊ LỘ

## Vấn đề:

GitHub đã phát hiện **Firebase API Key** của bạn bị public trong file `js/firebase-config.js`

## Rủi ro:

- ❌ Bất kỳ ai cũng có thể xem API key
- ❌ Có thể lạm dụng Firebase project của bạn
- ❌ Có thể gây tốn chi phí hoặc spam dữ liệu

## Giải pháp NGAY:

### Bước 1: Cài đặt GitHub Desktop (nếu chưa có)

1. Tải tại: https://desktop.github.com/
2. Cài đặt và mở GitHub Desktop
3. Đăng nhập tài khoản GitHub của bạn
4. Chọn **File** → **Add Local Repository**
5. Chọn thư mục: `D:\01.BMDATA\Mapping`
6. Click **Add Repository**

### Bước 2: Xóa file config khỏi Git

**Mở PowerShell trong thư mục project:**

```powershell
# Di chuyển vào thư mục (nếu chưa ở đó)
cd D:\01.BMDATA\Mapping

# Xóa file chứa API key
Remove-Item js/firebase-config.js -Force
```

### Bước 3: Commit và Push lên GitHub

1. **Mở GitHub Desktop**
2. Bạn sẽ thấy thay đổi:
   - ❌ `js/firebase-config.js` (deleted)
   - ✅ `.gitignore` (created)
   - ✅ `js/firebase-config.example.js` (created)
   
3. **Tick chọn TẤT CẢ các file**
4. Ở ô "Summary", gõ: `Remove sensitive Firebase config`
5. Click **Commit to main** (hoặc **Commit to master**)
6. Click **Push origin** (nút ở trên)

### Bước 4: Tạo lại file config LOCAL (không push lên GitHub)

**Chạy trong PowerShell:**

```powershell
# Copy file mẫu thành file thật
Copy-Item js/firebase-config.example.js js/firebase-config.js
```

**Kiểm tra trong GitHub Desktop:**
- File `js/firebase-config.js` sẽ KHÔNG xuất hiện trong danh sách thay đổi (vì đã có trong .gitignore)
- Nếu vẫn thấy → có vấn đề, báo tôi!

### Bước 5: TẠO LẠI API Key mới (QUAN TRỌNG!)

**API key cũ đã bị lộ, phải tạo lại:**

1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project **"food-map-11c45"**
3. Click biểu tượng **⚙️ (Settings)** góc trên bên trái
4. Chọn **Project Settings**
5. Tab **General** → cuộn xuống phần **Your apps**
6. Tìm Web App (biểu tượng `</>`)
7. Click **Delete this app** để xóa app cũ
8. Click **Add app** → Chọn biểu tượng Web `</>`
9. Đặt tên: "Food Map Web"
10. **Không chọn** "Also set up Firebase Hosting"
11. Click **Register app**
12. **COPY toàn bộ phần firebaseConfig:**

```javascript
const firebaseConfig = {
  apiKey: "AIza....", // ← Copy cái mới
  authDomain: "...",
  projectId: "...",
  // ... etc
};
```

### Bước 6: Cập nhật API Key MỚI vào file local

1. **Mở file:** `D:\01.BMDATA\Mapping\js\firebase-config.js`
2. **Thay thế** phần `firebaseConfig` (từ dòng 4-11) bằng config mới vừa copy
3. **Lưu file** (Ctrl + S)
4. **Refresh trang web** và kiểm tra xem có hoạt động không

**Kiểm tra trong GitHub Desktop:**
- File này sẽ KHÔNG xuất hiện (đã được gitignore)
- Nếu xuất hiện → ĐỪNG commit!

### Bước 7: Cập nhật Security Rules (Bảo mật thêm)

Vào Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /markers/{document=**} {
      // Giới hạn số lượng reads/writes
      allow read: if request.time < timestamp.date(2026, 12, 31);
      allow write: if request.time < timestamp.date(2026, 12, 31) 
                   && request.resource.size() < 100000; // Giới hạn 100KB
    }
  }
}
```

### Bước 8: Giới hạn API Key trên Firebase (Tùy chọn)

1. Vào Firebase Console → Project Settings
2. Tab **General** → phần **Web API Key**
3. Click vào API Key → **API restrictions**
4. Thêm **HTTP referrers** (chỉ cho phép domain của bạn):
   - `https://your-domain.com/*`
   - `http://localhost:*` (để test local)

## Sau khi hoàn thành:

✅ API key cũ không còn hoạt động
✅ API key mới CHỈ có trong file local (không commit lên GitHub)
✅ File `.gitignore` ngăn chặn commit nhầm trong tương lai

## Lưu ý quan trọng:

⚠️ **KHÔNG BAO GIỜ commit file `js/firebase-config.js` lên GitHub**

Nếu cần chia sẻ code:
- Chỉ commit file `js/firebase-config.example.js` (file mẫu)
- Người khác tự tạo file config của họ

## Kiểm tra:

Chạy lệnh này để đảm bảo file không được track:

```powershell
git status
```

Bạn KHÔNG nên thấy `js/firebase-config.js` trong danh sách.
