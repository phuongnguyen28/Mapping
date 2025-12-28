// Cấu hình Firebase
// HƯỚNG DẪN: 
// 1. Copy file này thành "firebase-config.js"
// 2. Thay đổi các giá trị YOUR_XXX bằng config thật từ Firebase Console

const firebaseConfig = {
    apiKey: "AIzaSyCEE7E-GQiBbtmSohhOfy78NTvHVJrjlmA",
    authDomain: "food-map-11c45.firebaseapp.com",
    projectId: "food-map-11c45",
    storageBucket: "food-map-11c45.firebasestorage.app",
    messagingSenderId: "405776170684",
    appId: "1:405776170684:web:25e27d0aba81371c46dab9",
    measurementId: "G-DCPB8RY92S"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo Firestore
const db = firebase.firestore();

// Collection name cho markers
const MARKERS_COLLECTION = 'markers';

// =============================================
// CÁC HÀM FIRESTORE
// =============================================

// Lấy tất cả markers từ Firestore
async function loadMarkersFromFirestore() {
    try {
        const snapshot = await db.collection(MARKERS_COLLECTION).get();
        const markers = [];
        snapshot.forEach(doc => {
            markers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        return markers;
    } catch (error) {
        console.error('Lỗi tải markers từ Firestore:', error);
        return [];
    }
}

// Thêm marker mới vào Firestore
async function addMarkerToFirestore(markerData) {
    try {
        const docRef = await db.collection(MARKERS_COLLECTION).add(markerData);
        return docRef.id;
    } catch (error) {
        console.error('Lỗi thêm marker vào Firestore:', error);
        throw error;
    }
}

// Cập nhật marker trong Firestore
async function updateMarkerInFirestore(markerId, markerData) {
    try {
        await db.collection(MARKERS_COLLECTION).doc(markerId).update(markerData);
    } catch (error) {
        console.error('Lỗi cập nhật marker trong Firestore:', error);
        throw error;
    }
}

// Xóa marker khỏi Firestore
async function deleteMarkerFromFirestore(markerId) {
    try {
        await db.collection(MARKERS_COLLECTION).doc(markerId).delete();
    } catch (error) {
        console.error('Lỗi xóa marker khỏi Firestore:', error);
        throw error;
    }
}

console.log('✅ Firebase đã được khởi tạo');
