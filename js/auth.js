// =============================================
// FIREBASE AUTHENTICATION
// =============================================

let currentUser = null;

// Kiểm tra trạng thái đăng nhập
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // Đã đăng nhập
        currentUser = user;
        console.log('✅ Đã đăng nhập:', user.email);
        showMainApp();
    } else {
        // Chưa đăng nhập
        currentUser = null;
        console.log('⚠️ Chưa đăng nhập');
        showLoginForm();
    }
});

// Hiển thị form đăng nhập
function showLoginForm() {
    document.body.innerHTML = `
        <div class="login-container">
            <div class="login-box">
                <div class="login-header">
                    <i class="fas fa-map-marked-alt"></i>
                    <h2>Food time?</h2>
                    <p>Đăng nhập để tiếp tục</p>
                </div>
                
                <div class="login-form">
                    <div class="input-group">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="login-email" placeholder="Email" autocomplete="username">
                    </div>
                    
                    <div class="input-group">
                        <i class="fas fa-lock"></i>
                        <input type="password" id="login-password" placeholder="Mật khẩu" autocomplete="current-password">
                    </div>
                    
                    <div class="remember-me">
                        <label>
                            <input type="checkbox" id="remember-me">
                            <span>Nhớ tài khoản</span>
                        </label>
                    </div>
                    
                    <button id="login-btn" class="login-btn">
                        <i class="fas fa-sign-in-alt"></i> Đăng nhập
                    </button>
                    
                    <div id="login-error" class="login-error" style="display:none;"></div>
                </div>
                </div>
            </div>
        </div>
    `;

    // Tự động điền thông tin nếu đã lưu
    loadSavedCredentials();

    // Xử lý đăng nhập
    document.getElementById('login-btn').addEventListener('click', handleLogin);

    // Enter để đăng nhập
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

// Tải thông tin đăng nhập đã lưu
function loadSavedCredentials() {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPassword = localStorage.getItem('saved_password');

    if (savedEmail && savedPassword) {
        document.getElementById('login-email').value = savedEmail;
        document.getElementById('login-password').value = savedPassword;
        document.getElementById('remember-me').checked = true;
    }
}

// Xử lý đăng nhập
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (!email || !password) {
        showError('Vui lòng nhập email và mật khẩu!');
        return;
    }

    // Disable button và hiển thị loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);

        // Lưu hoặc xóa thông tin đăng nhập
        const rememberMe = document.getElementById('remember-me').checked;
        if (rememberMe) {
            localStorage.setItem('saved_email', email);
            localStorage.setItem('saved_password', password);
        } else {
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_password');
        }

        // Thành công -> onAuthStateChanged sẽ tự động chuyển sang main app
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        let errorMessage = 'Đăng nhập thất bại!';

        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Email không tồn tại!';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Sai mật khẩu!';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ!';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau!';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Lỗi kết nối mạng!';
                break;
        }

        showError(errorMessage);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
    }
}

function showError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Hiển thị ứng dụng chính
function showMainApp() {
    // Reload lại trang để load main app
    if (document.querySelector('.login-container')) {
        window.location.reload();
    }
}

// Đăng xuất
function logout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        // Không xóa thông tin đã lưu khi đăng xuất (để lần sau tự động điền)
        // Nếu muốn xóa luôn, uncomment dòng dưới:
        // localStorage.removeItem('saved_email');
        // localStorage.removeItem('saved_password');

        firebase.auth().signOut();
    }
}
