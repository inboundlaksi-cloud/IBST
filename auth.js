import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { showNotification, showLoading, hideLoading } from './ui-manager.js';
import { loadUserData } from './user-management.js';

// Global variables
let currentUser = null;

// Check authentication state
export function checkAuthState() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showView('main-menu-view');
            loadUserData();
            initializeApp();
        } else {
            currentUser = null;
            showView('login-register-view');
        }
        hideLoading();
    });
}

// Setup authentication event listeners
export function setupAuthEventListeners() {
    // Login/Register tabs
    document.getElementById('login-tab').addEventListener('click', () => {
        document.getElementById('login-tab').classList.add('text-white', 'bg-fuchsia-600');
        document.getElementById('login-tab').classList.remove('text-gray-500');
        document.getElementById('register-tab').classList.remove('text-white', 'bg-fuchsia-600');
        document.getElementById('register-tab').classList.add('text-gray-500');
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
    });

    document.getElementById('register-tab').addEventListener('click', () => {
        document.getElementById('register-tab').classList.add('text-white', 'bg-fuchsia-600');
        document.getElementById('register-tab').classList.remove('text-gray-500');
        document.getElementById('login-tab').classList.remove('text-white', 'bg-fuchsia-600');
        document.getElementById('login-tab').classList.add('text-gray-500');
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('login-form').classList.add('hidden');
    });

    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        showLoading();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            showNotification('เข้าสู่ระบบสำเร็จ', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showNotification('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
        hideLoading();
    });

    // Register form
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstname = document.getElementById('register-firstname').value;
        const lastname = document.getElementById('register-lastname').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        showLoading();
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update user profile
            await updateProfile(user, {
                displayName: `${firstname} ${lastname}`
            });
            
            // Add user to Firestore
            await addDoc(collection(db, 'users'), {
                uid: user.uid,
                email: email,
                firstname: firstname,
                lastname: lastname,
                role: 'officer', // Default role
                smallStars: 0,
                bigStars: 0,
                achievements: [],
                createdAt: serverTimestamp()
            });
            
            showNotification('สมัครสมาชิกสำเร็จ', 'success');
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('เกิดข้อผิดพลาดในการสมัครสมาชิก', 'error');
        }
        hideLoading();
    });

    // Logout button
    document.getElementById('logout-button-main').addEventListener('click', async () => {
        try {
            await signOut(auth);
            showNotification('ออกจากระบบสำเร็จ', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showNotification('เกิดข้อผิดพลาดในการออกจากระบบ', 'error');
        }
    });
}

export function getCurrentUser() {
    return currentUser;
}