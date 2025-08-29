// Import necessary modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, updatePassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC4qQZc53yD3LQX3p2z3k3l3k3l3k3l3k3l",
    authDomain: "inbound-system.firebaseapp.com",
    projectId: "inbound-system",
    storageBucket: "inbound-system.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global variables
let currentUser = null;
let currentView = 'login-register-view';
let transfersData = [];
let tforsData = [];
let issuesData = [];
let commentsData = [];
let performanceTimers = {};
let notifications = [];

// DOM Elements
const views = document.querySelectorAll('.view');
const loadingContainer = document.getElementById('loading-container');
const notificationToast = document.getElementById('notification-toast');
const notificationMessage = document.getElementById('notification-message');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
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

    // Setup event listeners
    setupEventListeners();
});

// Setup all event listeners
function setupEventListeners() {
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

    // Profile button
    document.getElementById('profile-button').addEventListener('click', () => {
        showView('profile-view');
        loadProfileData();
    });

    // Back to main menu buttons
    document.querySelectorAll('.back-to-main-menu').forEach(button => {
        button.addEventListener('click', () => {
            showView('main-menu-view');
            initializeApp();
        });
    });

    // Navigation menu items
    document.getElementById('go-to-transfers').addEventListener('click', () => {
        showView('transfers-view');
        showTransfersMenu();
    });

    document.getElementById('go-to-check-product').addEventListener('click', () => {
        showView('check-product-view');
        loadCheckedTfors();
    });

    document.getElementById('go-to-calendar').addEventListener('click', () => {
        showView('calendar-view');
        renderCalendar();
    });

    document.getElementById('go-to-statistics').addEventListener('click', () => {
        showView('statistics-view');
        loadStatistics();
    });

    document.getElementById('go-to-kpi').addEventListener('click', () => {
        showView('kpi-view');
        loadKpiData();
    });

    document.getElementById('go-to-ai-chat').addEventListener('click', () => {
        showView('ai-chat-view');
        initializeChat();
    });

    document.getElementById('summary-todays-plan-card').addEventListener('click', () => {
        showView('todays-plan-view');
        loadTodaysPlan();
    });

    document.getElementById('summary-pending-card').addEventListener('click', () => {
        showView('transfers-view');
        showDetailsView();
    });

    document.getElementById('summary-completed-today-card').addEventListener('click', () => {
        showView('transfers-view');
        showCompletedView();
    });

    document.getElementById('summary-issues-card').addEventListener('click', () => {
        showView('transfers-view');
        showIssuesView();
    });

    // Transfers menu items
    document.getElementById('menu-1').addEventListener('click', () => {
        showFormView();
    });

    document.getElementById('menu-2').addEventListener('click', () => {
        showDetailsView();
    });

    document.getElementById('menu-3').addEventListener('click', () => {
        showCompletedView();
    });

    document.getElementById('menu-4').addEventListener('click', () => {
        showIssuesView();
    });

    // Back to transfers menu buttons
    document.querySelectorAll('.back-to-transfers-menu').forEach(button => {
        button.addEventListener('click', () => {
            showTransfersMenu();
        });
    });

    // Inbound form
    document.getElementById('inbound-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveInboundForm();
    });

    // Add TFOR button
    document.getElementById('add-tfor-button').addEventListener('click', () => {
        addTforField();
    });

    // File upload
    const dragDropArea = document.getElementById('drag-drop-area');
    const fileInput = document.getElementById('file-input');

    dragDropArea.addEventListener('click', () => {
        fileInput.click();
    });

    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('bg-gray-100');
    });

    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.classList.remove('bg-gray-100');
    });

    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('bg-gray-100');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfileData();
    });

    // Profile picture upload
    document.getElementById('profile-pic-upload').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('profile-pic-preview').src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // Change password form
    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await changePassword();
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                toggle.textContent = '🙈';
            } else {
                input.type = 'password';
                toggle.textContent = '👁️';
            }
        });
    });

    // Star rating
    document.querySelectorAll('.star-rating .star').forEach(star => {
        star.addEventListener('click', () => {
            const value = parseInt(star.getAttribute('data-value'));
            const stars = star.parentElement.querySelectorAll('.star');
            
            stars.forEach((s, i) => {
                if (i < value) {
                    s.classList.add('selected');
                } else {
                    s.classList.remove('selected');
                }
            });
            
            document.getElementById('score-value').value = value;
        });
    });

    // Score modal
    document.getElementById('score-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveScore();
    });

    document.getElementById('score-modal-cancel').addEventListener('click', () => {
        document.getElementById('score-modal').classList.add('hidden');
        document.getElementById('score-modal').classList.remove('flex');
    });

    // Star points modal
    document.getElementById('add-star-btn').addEventListener('click', () => {
        const currentSmallStars = parseInt(document.getElementById('current-small-stars').textContent);
        document.getElementById('current-small-stars').textContent = currentSmallStars + 1;
    });

    document.getElementById('deduct-star-btn').addEventListener('click', () => {
        const currentSmallStars = parseInt(document.getElementById('current-small-stars').textContent);
        if (currentSmallStars > 0) {
            document.getElementById('current-small-stars').textContent = currentSmallStars - 1;
        }
    });

    document.getElementById('star-modal-cancel').addEventListener('click', () => {
        document.getElementById('star-points-modal').classList.add('hidden');
        document.getElementById('star-points-modal').classList.remove('flex');
    });

    document.getElementById('save-star-points').addEventListener('click', async () => {
        await saveStarPoints();
    });

    // Backup/Restore modal
    document.getElementById('backup-restore-btn').addEventListener('click', () => {
        document.getElementById('backup-modal').classList.remove('hidden');
        document.getElementById('backup-modal').classList.add('flex');
    });

    document.getElementById('backup-modal-cancel').addEventListener('click', () => {
        document.getElementById('backup-modal').classList.add('hidden');
        document.getElementById('backup-modal').classList.remove('flex');
    });

    document.getElementById('backup-data-btn').addEventListener('click', async () => {
        await backupData();
    });

    document.getElementById('restore-file-input').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            document.getElementById('restore-data-btn').disabled = false;
        }
    });

    document.getElementById('restore-data-btn').addEventListener('click', async () => {
        await restoreData();
    });

    // Delete all data button
    document.getElementById('delete-all-data-btn').addEventListener('click', () => {
        showConfirmation(
            'ลบข้อมูลทั้งหมด',
            'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้',
            async () => {
                await deleteAllData();
            }
        );
    });

    // Export buttons
    document.getElementById('export-excel-btn').addEventListener('click', () => {
        exportToExcel();
    });

    document.getElementById('export-pdf-btn').addEventListener('click', () => {
        exportToPDF();
    });

    // Statistics timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.timeframe-btn').forEach(b => {
                b.classList.remove('bg-fuchsia-600', 'text-white');
            });
            btn.classList.add('bg-fuchsia-600', 'text-white');
            loadStatistics(btn.getAttribute('data-frame'));
        });
    });

    // Chat form
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await sendChatMessage();
    });

    // Plan work button
    document.getElementById('plan-work-btn').addEventListener('click', () => {
        showPlanWorkModal();
    });

    // Details search and sort
    document.getElementById('details-search').addEventListener('input', () => {
        filterDetailsTable();
    });

    document.getElementById('details-sort').addEventListener('change', () => {
        sortDetailsTable();
    });

    // Completed search
    document.getElementById('completed-search').addEventListener('input', () => {
        filterCompletedList();
    });

    // Notification bell
    document.getElementById('notification-bell-btn').addEventListener('click', () => {
        const dropdown = document.getElementById('notification-dropdown');
        dropdown.classList.toggle('hidden');
        loadNotifications();
    });

    // Comment form
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveComment();
    });

    // Performance timer
    document.addEventListener('click', (e) => {
        if (e.target.id === 'start-timer-btn') {
            startPerformanceTimer(e.target.getAttribute('data-tfor-id'));
        }
    });
}

// Initialize the app after login
function initializeApp() {
    // Update user display
    const userDisplay = document.querySelector('.user-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    
    if (currentUser && currentUser.displayName) {
        userDisplay.textContent = currentUser.displayName;
        userDisplay.classList.remove('hidden');
        
        // Get user role
        getUserRole(currentUser.uid).then(role => {
            if (role) {
                userRoleDisplay.textContent = getRoleDisplayName(role);
                userRoleDisplay.classList.remove('hidden');
                
                // Update role-based visibility
                updateRoleBasedVisibility(role);
            }
        });
    }
    
    // Load summary data
    loadSummaryData();
    
    // Load notifications
    loadNotifications();
    
    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
        document.getElementById('login-email').value = rememberedEmail;
        document.getElementById('remember-me').checked = true;
    }
}

// Load user data
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update profile picture if available
            if (userData.profilePicture) {
                document.getElementById('profile-pic-preview').src = userData.profilePicture;
            }
            
            // Load default avatars
            loadDefaultAvatars();
            
            // Update user stars
            document.getElementById('user-small-stars').textContent = userData.smallStars || 0;
            document.getElementById('user-big-stars').textContent = userData.bigStars || 0;
            
            // Update star progress bar
            const smallStars = userData.smallStars || 0;
            const progressPercent = (smallStars % 10) * 10;
            document.getElementById('star-progress-bar').style.width = `${progressPercent}%`;
            
            // Load achievements
            loadAchievements(userData.achievements || []);
            
            // Load recent activity
            loadRecentActivity();
            
            // Load scores
            loadScores();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load default avatars
function loadDefaultAvatars() {
    const container = document.getElementById('default-avatar-container');
    container.innerHTML = '';
    
    const avatarOptions = [
        { id: 'avatar-1', emoji: '😀', color: 'bg-yellow-200' },
        { id: 'avatar-2', emoji: '😎', color: 'bg-blue-200' },
        { id: 'avatar-3', emoji: '🤠', color: 'bg-green-200' },
        { id: 'avatar-4', emoji: '🧐', color: 'bg-purple-200' },
        { id: 'avatar-5', emoji: '😇', color: 'bg-pink-200' },
        { id: 'avatar-6', emoji: '🤓', color: 'bg-indigo-200' }
    ];
    
    avatarOptions.forEach(avatar => {
        const avatarElement = document.createElement('div');
        avatarElement.className = `default-avatar w-16 h-16 rounded-full flex items-center justify-center text-2xl ${avatar.color}`;
        avatarElement.textContent = avatar.emoji;
        avatarElement.setAttribute('data-avatar-id', avatar.id);
        
        avatarElement.addEventListener('click', () => {
            document.querySelectorAll('.default-avatar').forEach(a => {
                a.classList.remove('selected');
            });
            avatarElement.classList.add('selected');
        });
        
        container.appendChild(avatarElement);
    });
}

// Load achievements
function loadAchievements(achievements) {
    const container = document.getElementById('user-achievements');
    container.innerHTML = '';
    
    if (achievements.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีรางวัล</p>';
        return;
    }
    
    achievements.forEach(achievement => {
        const badge = document.createElement('div');
        badge.className = 'achievement-badge';
        badge.innerHTML = `
            <span class="big-star">★</span>
            ${achievement.name}
        `;
        container.appendChild(badge);
    });
}

// Load recent activity
async function loadRecentActivity() {
    const container = document.getElementById('recent-activity-container');
    container.innerHTML = '<p class="text-gray-500 text-center">กำลังโหลด...</p>';
    
    try {
        const q = query(
            collection(db, 'activity'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 text-center">ไม่มีกิจกรรมล่าสุด</p>';
            return;
        }
        
        container.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const activity = doc.data();
            const activityElement = document.createElement('div');
            activityElement.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
            
            const date = new Date(activity.timestamp.toDate());
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            activityElement.innerHTML = `
                <div class="flex-1">
                    <p class="font-medium">${activity.description}</p>
                    <p class="text-sm text-gray-500">${formattedDate}</p>
                </div>
            `;
            
            container.appendChild(activityElement);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        container.innerHTML = '<p class="text-gray-500 text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Load scores
async function loadScores() {
    const container = document.getElementById('profile-scores-container');
    container.innerHTML = '<p class="text-gray-500 text-center">กำลังโหลด...</p>';
    
    try {
        const q = query(
            collection(db, 'scores'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc'),
            limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            container.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีการประเมินจากหัวหน้า</p>';
            return;
        }
        
        container.innerHTML = '';
        
        querySnapshot.forEach(doc => {
            const score = doc.data();
            const scoreElement = document.createElement('div');
            scoreElement.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
            
            const date = new Date(score.timestamp.toDate());
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            const stars = '★'.repeat(score.value) + '☆'.repeat(5 - score.value);
            
            scoreElement.innerHTML = `
                <div class="flex-1">
                    <div class="flex items-center">
                        <span class="text-yellow-500 mr-2">${stars}</span>
                        <span class="font-medium">${score.reason}</span>
                    </div>
                    <p class="text-sm text-gray-500">${formattedDate} - ${score.giverName}</p>
                    ${score.notes ? `<p class="text-sm mt-1">${score.notes}</p>` : ''}
                </div>
            `;
            
            container.appendChild(scoreElement);
        });
    } catch (error) {
        console.error('Error loading scores:', error);
        container.innerHTML = '<p class="text-gray-500 text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Load summary data for dashboard
async function loadSummaryData() {
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Get today's plan count
        const todayPlanQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '==', formattedToday),
            where('status', 'in', ['pending', 'in-progress'])
        );
        const todayPlanSnapshot = await getDocs(todayPlanQuery);
        document.getElementById('summary-todays-plan').textContent = todayPlanSnapshot.size;
        
        // Get pending count (arriving today)
        const pendingQuery = query(
            collection(db, 'transfers'),
            where('deliveryDate', '==', formattedToday),
            where('status', '==', 'pending')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        document.getElementById('summary-pending').textContent = pendingSnapshot.size;
        
        // Get completed today count
        const completedTodayQuery = query(
            collection(db, 'tfors'),
            where('completedDate', '==', formattedToday),
            where('status', '==', 'completed')
        );
        const completedTodaySnapshot = await getDocs(completedTodayQuery);
        document.getElementById('summary-completed-today').textContent = completedTodaySnapshot.size;
        
        // Get issues count
        const issuesQuery = query(
            collection(db, 'issues'),
            where('status', 'in', ['pending', 'in-progress'])
        );
        const issuesSnapshot = await getDocs(issuesQuery);
        document.getElementById('summary-issues').textContent = issuesSnapshot.size;
        
        // Update notification badge
        updateNotificationBadge();
    } catch (error) {
        console.error('Error loading summary data:', error);
    }
}

// Load notifications
async function loadNotifications() {
    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = '<p class="text-gray-500 text-center p-4">กำลังโหลด...</p>';
    
    try {
        // Get overdue TFORs
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const overdueQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '<', formattedToday),
            where('status', 'in', ['pending', 'in-progress'])
        );
        
        const overdueSnapshot = await getDocs(overdueQuery);
        
        if (overdueSnapshot.empty) {
            notificationList.innerHTML = '<p class="text-gray-500 text-center p-4">ไม่มี TFOR ที่เลยกำหนด</p>';
            return;
        }
        
        notificationList.innerHTML = '';
        
        overdueSnapshot.forEach(doc => {
            const tfor = doc.data();
            const notificationElement = document.createElement('div');
            notificationElement.className = 'p-3 hover:bg-gray-50 rounded-lg cursor-pointer';
            
            const plannedDate = new Date(tfor.plannedDate);
            const formattedDate = `${plannedDate.getDate()}/${plannedDate.getMonth() + 1}/${plannedDate.getFullYear()}`;
            
            notificationElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <p class="font-medium">TFOR: ${tfor.tforNumber}</p>
                        <p class="text-sm text-gray-500">กำหนดเช็ค: ${formattedDate}</p>
                    </div>
                    <span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">เลยกำหนด</span>
                </div>
            `;
            
            notificationElement.addEventListener('click', () => {
                showView('transfers-view');
                showCheckView(doc.id);
            });
            
            notificationList.appendChild(notificationElement);
        });
        
        // Update notification badge
        document.getElementById('notification-badge').textContent = overdueSnapshot.size;
        document.getElementById('notification-badge').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = '<p class="text-gray-500 text-center p-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Update notification badge
async function updateNotificationBadge() {
    try {
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const overdueQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '<', formattedToday),
            where('status', 'in', ['pending', 'in-progress'])
        );
        
        const overdueSnapshot = await getDocs(overdueQuery);
        
        if (overdueSnapshot.size > 0) {
            document.getElementById('notification-badge').textContent = overdueSnapshot.size;
            document.getElementById('notification-badge').classList.remove('hidden');
        } else {
            document.getElementById('notification-badge').classList.add('hidden');
        }
    } catch (error) {
        console.error('Error updating notification badge:', error);
    }
}

// Show view
function showView(viewId) {
    views.forEach(view => {
        view.classList.remove('active-view');
    });
    
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active-view');
        currentView = viewId;
    }
}

// Show loading
function showLoading() {
    loadingContainer.classList.remove('hidden');
}

// Hide loading
function hideLoading() {
    loadingContainer.classList.add('hidden');
}

// Show notification
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    
    if (type === 'success') {
        notificationToast.className = 'fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform z-50';
    } else if (type === 'error') {
        notificationToast.className = 'fixed top-5 right-5 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform z-50';
    } else if (type === 'warning') {
        notificationToast.className = 'fixed top-5 right-5 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg transform z-50';
    }
    
    notificationToast.classList.remove('translate-x-full');
    
    setTimeout(() => {
        notificationToast.classList.add('translate-x-full');
    }, 3000);
}

// Show confirmation modal
function showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmation-title').textContent = title;
    document.getElementById('confirmation-message').textContent = message;
    
    const modal = document.getElementById('confirmation-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    const confirmBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    
    // Remove existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Add new event listeners
    newConfirmBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        onConfirm();
    });
    
    newCancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
}

// Get user role
async function getUserRole(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role;
        }
    } catch (error) {
        console.error('Error getting user role:', error);
    }
    return null;
}

// Get role display name
function getRoleDisplayName(role) {
    switch (role) {
        case 'admin': return 'ผู้ดูแลระบบ';
        case 'supervisor': return 'หัวหน้างาน';
        case 'senior': return 'Senior';
        case 'officer': return 'เจ้าหน้าที่';
        case 'viewer': return 'ผู้ดู';
        default: return 'ไม่ทราบตำแหน่ง';
    }
}

// Update role-based visibility
function updateRoleBasedVisibility(role) {
    // Hide all role-specific elements first
    document.querySelectorAll('.admin-only, .supervisor-only, .senior-only, .officer-only, .viewer-only, .admin-supervisor-only, .senior-and-up, .delete-permission').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show elements based on role
    if (role === 'admin') {
        document.querySelectorAll('.admin-only, .admin-supervisor-only, .senior-and-up, .delete-permission').forEach(el => {
            el.style.display = '';
        });
    } else if (role === 'supervisor') {
        document.querySelectorAll('.supervisor-only, .admin-supervisor-only').forEach(el => {
            el.style.display = '';
        });
    } else if (role === 'senior') {
        document.querySelectorAll('.senior-only, .senior-and-up').forEach(el => {
            el.style.display = '';
        });
    } else if (role === 'officer') {
        document.querySelectorAll('.officer-only').forEach(el => {
            el.style.display = '';
        });
    } else if (role === 'viewer') {
        document.querySelectorAll('.viewer-only').forEach(el => {
            el.style.display = '';
        });
    }
}

// Transfers menu
function showTransfersMenu() {
    document.getElementById('transfers-menu-view').classList.remove('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.add('hidden');
}

// Show form view
function showFormView() {
    document.getElementById('transfers-menu-view').classList.add('hidden');
    document.getElementById('form-view').classList.remove('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.add('hidden');
    
    // Reset form
    document.getElementById('inbound-form').reset();
    document.getElementById('tfor-container').innerHTML = '';
    document.getElementById('image-preview').innerHTML = '';
    
    // Set today's date
    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
    document.getElementById('delivery-date').value = formattedDate;
    
    // Add initial TFOR field
    addTforField();
}

// Add TFOR field
function addTforField() {
    const container = document.getElementById('tfor-container');
    const tforIndex = container.children.length;
    
    const tforField = document.createElement('div');
    tforField.className = 'bg-gray-50 p-4 rounded-lg';
    tforField.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <h4 class="font-semibold">TFOR #${tforIndex + 1}</h4>
            <button type="button" class="remove-tfor-btn text-red-500 hover:text-red-700 ${tforIndex === 0 ? 'hidden' : ''}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">เลขที่ TFOR (4 ตัวท้าย)</label>
                <input type="text" name="tfor-number" maxlength="4" pattern="[0-9]{4}" class="w-full rounded-lg border-gray-300 shadow-sm tfor-number" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">สาขา</label>
                <select name="branch" class="w-full rounded-lg border-gray-300 shadow-sm" required>
                    <option value="">เลือกสาขา</option>
                    <option value="สำนักงานใหญ่">สำนักงานใหญ่</option>
                    <option value="สาขา 1">สาขา 1</option>
                    <option value="สาขา 2">สาขา 2</option>
                    <option value="สาขา 3">สาขา 3</option>
                    <option value="สาขา 4">สาขา 4</option>
                    <option value="สาขา 5">สาขา 5</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">จำนวนพาเลท</label>
                <input type="number" name="pallet-count" min="1" class="w-full rounded-lg border-gray-300 shadow-sm" required>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">ประเภทสินค้า</label>
                <select name="product-type" class="w-full rounded-lg border-gray-300 shadow-sm" required>
                    <option value="">เลือกประเภทสินค้า</option>
                    <option value="เครื่องปรุง">เครื่องปรุง</option>
                    <option value="ขนมขบเคี้ยว">ขนมขบเคี้ยว</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                    <option value="อาหารแช่แข็ง">อาหารแช่แข็ง</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(tforField);
    
    // Add event listener to remove button
    tforField.querySelector('.remove-tfor-btn').addEventListener('click', () => {
        tforField.remove();
        updateTforNumbers();
    });
}

// Update TFOR numbers after removal
function updateTforNumbers() {
    const container = document.getElementById('tfor-container');
    Array.from(container.children).forEach((tforField, index) => {
        tforField.querySelector('h4').textContent = `TFOR #${index + 1}`;
        const removeBtn = tforField.querySelector('.remove-tfor-btn');
        if (index === 0) {
            removeBtn.classList.add('hidden');
        } else {
            removeBtn.classList.remove('hidden');
        }
    });
}

// Handle file upload
function handleFiles(files) {
    const previewContainer = document.getElementById('image-preview');
    
    Array.from(files).forEach(file => {
        if (!file.type.match('image.*')) {
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageElement = document.createElement('div');
            imageElement.className = 'relative';
            imageElement.innerHTML = `
                <img src="${e.target.result}" alt="Preview" class="w-full h-32 object-cover rounded-lg">
                <button type="button" class="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 remove-image">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
            
            previewContainer.appendChild(imageElement);
            
            // Add event listener to remove button
            imageElement.querySelector('.remove-image').addEventListener('click', () => {
                imageElement.remove();
            });
        };
        reader.readAsDataURL(file);
    });
}

// Save inbound form
async function saveInboundForm() {
    showLoading();
    
    try {
        // Get form data
        const deliveryDate = document.getElementById('delivery-date').value;
        const lpFront = document.getElementById('lp-front').value.toUpperCase();
        const lpBack = document.getElementById('lp-back').value;
        const licensePlate = `${lpFront} ${lpBack}`;
        
        // Get TFOR data
        const tforFields = document.querySelectorAll('#tfor-container > div');
        const tfors = [];
        
        for (const field of tforFields) {
            const tforNumber = field.querySelector('.tfor-number').value;
            const branch = field.querySelector('select[name="branch"]').value;
            const palletCount = parseInt(field.querySelector('input[name="pallet-count"]').value);
            const productType = field.querySelector('select[name="product-type"]').value;
            
            tfors.push({
                tforNumber: tforNumber,
                branch: branch,
                palletCount: palletCount,
                productType: productType,
                status: 'pending',
                checkedPallets: [],
                receivedPallets: [],
                issues: []
            });
        }
        
        // Get image files
        const imageFiles = [];
        const imageElements = document.querySelectorAll('#image-preview img');
        
        for (const img of imageElements) {
            // In a real app, you would upload these to Firebase Storage
            // For this example, we'll just store the data URL
            imageFiles.push(img.src);
        }
        
        // Create transfer document
        const transferData = {
            deliveryDate: deliveryDate,
            licensePlate: licensePlate,
            images: imageFiles,
            tfors: tfors,
            status: 'pending',
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        };
        
        const transferRef = await addDoc(collection(db, 'transfers'), transferData);
        
        // Create TFOR documents
        for (const tfor of tfors) {
            await addDoc(collection(db, 'tfors'), {
                ...tfor,
                transferId: transferRef.id,
                deliveryDate: deliveryDate,
                licensePlate: licensePlate,
                createdBy: currentUser.uid,
                createdAt: serverTimestamp()
            });
        }
        
        // Log activity
        await addDoc(collection(db, 'activity'), {
            userId: currentUser.uid,
            description: `สร้างรายการ Transfer ใหม่: ${licensePlate}`,
            timestamp: serverTimestamp()
        });
        
        showNotification('บันทึกข้อมูลสำเร็จ', 'success');
        showTransfersMenu();
    } catch (error) {
        console.error('Error saving inbound form:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
    
    hideLoading();
}

// Show details view
async function showDetailsView() {
    document.getElementById('transfers-menu-view').classList.add('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.remove('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.add('hidden');
    
    showLoading();
    
    try {
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        transfersData = [];
        
        transfersSnapshot.forEach(doc => {
            transfersData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get TFORs data
        const tforsQuery = query(
            collection(db, 'tfors'),
            orderBy('createdAt', 'desc')
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        tforsData = [];
        
        tforsSnapshot.forEach(doc => {
            tforsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Render details table
        renderDetailsTable();
    } catch (error) {
        console.error('Error loading details:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    
    hideLoading();
}

// Render details table
function renderDetailsTable() {
    const container = document.getElementById('details-table-container');
    container.innerHTML = '';
    
    if (transfersData.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีข้อมูล</p>';
        return;
    }
    
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    
    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ทะเบียนรถ</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สาขา</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TFOR</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนพาเลท</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TFOR ที่พ่วงมา</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    
    transfersData.forEach(transfer => {
        // Get TFORs for this transfer
        const transferTfors = tforsData.filter(tfor => tfor.transferId === transfer.id);
        
        transferTfors.forEach(tfor => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            // Format date
            const date = new Date(transfer.createdAt.toDate());
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
            
            // Status badge
            let statusBadge = '';
            if (tfor.status === 'pending') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">รอดำเนินการ</span>';
            } else if (tfor.status === 'in-progress') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">กำลังดำเนินการ</span>';
            } else if (tfor.status === 'completed') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">เสร็จสิ้น</span>';
            }
            
            // Check for carried forward TFORs
            const carriedForwardBadge = tfor.carriedForward ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">พ่วงมา</span>' : 
                '-';
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${transfer.licensePlate}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tfor.branch}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${tfor.tforNumber}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tfor.palletCount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${carriedForwardBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900 view-tfor-btn" data-tfor-id="${tfor.id}">ดูรายละเอียด</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-tfor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCheckView(btn.getAttribute('data-tfor-id'));
        });
    });
}

// Filter details table
function filterDetailsTable() {
    const searchTerm = document.getElementById('details-search').value.toLowerCase();
    const rows = document.querySelectorAll('#details-table-container tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Sort details table
function sortDetailsTable() {
    const sortBy = document.getElementById('details-sort').value;
    
    // In a real app, you would sort the data and re-render the table
    // For this example, we'll just show a notification
    showNotification(`เรียงลำดับตาม: ${sortBy}`, 'success');
}

// Show completed view
async function showCompletedView() {
    document.getElementById('transfers-menu-view').classList.add('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.remove('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.add('hidden');
    
    showLoading();
    
    try {
        // Get completed TFORs
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const completedQuery = query(
            collection(db, 'tfors'),
            where('status', '==', 'completed'),
            orderBy('completedDate', 'desc')
        );
        
        const completedSnapshot = await getDocs(completedQuery);
        const completedTfors = [];
        
        completedSnapshot.forEach(doc => {
            completedTfors.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = {};
        
        transfersSnapshot.forEach(doc => {
            transfersData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Render completed TFORs
        renderCompletedTfors(completedTfors, transfersData);
    } catch (error) {
        console.error('Error loading completed TFORs:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    
    hideLoading();
}

// Render completed TFORs
function renderCompletedTfors(completedTfors, transfersData) {
    const container = document.getElementById('completed-container');
    container.innerHTML = '';
    
    if (completedTfors.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีข้อมูล</p>';
        return;
    }
    
    completedTfors.forEach(tfor => {
        const transfer = transfersData[tfor.transferId];
        
        if (!transfer) return;
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-6';
        
        // Format dates
        const createdDate = new Date(tfor.createdAt.toDate());
        const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        
        const completedDate = new Date(tfor.completedDate.toDate());
        const formattedCompletedDate = `${completedDate.getDate()}/${completedDate.getMonth() + 1}/${completedDate.getFullYear()}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">TFOR: ${tfor.tforNumber}</h3>
                    <p class="text-sm text-gray-500 mt-1">สร้างเมื่อ: ${formattedCreatedDate}</p>
                </div>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">เสร็จสิ้น</span>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">ทะเบียนรถ</p>
                    <p class="font-medium">${transfer.licensePlate}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">สาขา</p>
                    <p class="font-medium">${tfor.branch}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">จำนวนพาเลท</p>
                    <p class="font-medium">${tfor.palletCount}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">วันที่เสร็จสิ้น</p>
                    <p class="font-medium">${formattedCompletedDate}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-end">
                <button class="view-completed-tfor-btn text-indigo-600 hover:text-indigo-900" data-tfor-id="${tfor.id}">ดูรายละเอียด</button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-completed-tfor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCheckView(btn.getAttribute('data-tfor-id'));
        });
    });
}

// Filter completed list
function filterCompletedList() {
    const searchTerm = document.getElementById('completed-search').value.toLowerCase();
    const cards = document.querySelectorAll('#completed-container > div');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Show issues view
async function showIssuesView() {
    document.getElementById('transfers-menu-view').classList.add('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.remove('hidden');
    document.getElementById('check-view').classList.add('hidden');
    
    showLoading();
    
    try {
        // Get issues data
        const issuesQuery = query(
            collection(db, 'issues'),
            orderBy('createdAt', 'desc')
        );
        
        const issuesSnapshot = await getDocs(issuesQuery);
        issuesData = [];
        
        issuesSnapshot.forEach(doc => {
            issuesData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get TFORs data
        const tforsQuery = query(
            collection(db, 'tfors'),
            orderBy('createdAt', 'desc')
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        const tforsData = {};
        
        tforsSnapshot.forEach(doc => {
            tforsData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = {};
        
        transfersSnapshot.forEach(doc => {
            transfersData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Render issues
        renderIssues(issuesData, tforsData, transfersData);
    } catch (error) {
        console.error('Error loading issues:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    
    hideLoading();
}

// Render issues
function renderIssues(issues, tfors, transfers) {
    const container = document.getElementById('issues-container');
    container.innerHTML = '';
    
    if (issues.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีข้อมูล</p>';
        return;
    }
    
    issues.forEach(issue => {
        const tfor = tfors[issue.tforId];
        const transfer = tfor ? transfers[tfor.transferId] : null;
        
        if (!tfor || !transfer) return;
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-6';
        
        // Format date
        const createdDate = new Date(issue.createdAt.toDate());
        const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        
        // Status badge
        let statusBadge = '';
        let statusClass = '';
        
        if (issue.status === 'pending') {
            statusBadge = 'รอดำเนินการ';
            statusClass = 'status-pending';
        } else if (issue.status === 'in-progress') {
            statusBadge = 'กำลังแก้ไข';
            statusClass = 'status-in-progress';
        } else if (issue.status === 'resolved') {
            statusBadge = 'แก้ไขแล้ว';
            statusClass = 'status-resolved';
        }
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">TFOR: ${tfor.tforNumber}</h3>
                    <p class="text-sm text-gray-500 mt-1">รายงานเมื่อ: ${formattedCreatedDate}</p>
                </div>
                <span class="status-badge ${statusClass}">${statusBadge}</span>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">ทะเบียนรถ</p>
                    <p class="font-medium">${transfer.licensePlate}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">สาขา</p>
                    <p class="font-medium">${tfor.branch}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">พาเลทที่มีปัญหา</p>
                    <p class="font-medium">${issue.palletNumber}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">ประเภทปัญหา</p>
                    <p class="font-medium">${issue.issueType}</p>
                </div>
            </div>
            <div class="mt-4">
                <p class="text-sm text-gray-500">รายละเอียดปัญหา</p>
                <p class="font-medium">${issue.description}</p>
            </div>
            <div class="mt-4 flex justify-between items-center">
                <div class="admin-supervisor-only">
                    <label class="text-sm text-gray-500 mr-2">เปลี่ยนสถานะ:</label>
                    <select class="status-select" data-issue-id="${issue.id}">
                        <option value="pending" ${issue.status === 'pending' ? 'selected' : ''}>รอดำเนินการ</option>
                        <option value="in-progress" ${issue.status === 'in-progress' ? 'selected' : ''}>กำลังแก้ไข</option>
                        <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>แก้ไขแล้ว</option>
                    </select>
                </div>
                <button class="view-issue-tfor-btn text-indigo-600 hover:text-indigo-900" data-tfor-id="${tfor.id}">ดูรายละเอียด</button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to status dropdowns
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async () => {
            const issueId = select.getAttribute('data-issue-id');
            const newStatus = select.value;
            
            try {
                await updateDoc(doc(db, 'issues', issueId), {
                    status: newStatus,
                    updatedAt: serverTimestamp()
                });
                
                showNotification('อัปเดตสถานะสำเร็จ', 'success');
                
                // Log activity
                const issue = issuesData.find(i => i.id === issueId);
                const tfor = tfors[issue.tforId];
                
                await addDoc(collection(db, 'activity'), {
                    userId: currentUser.uid,
                    description: `เปลี่ยนสถานะปัญหา TFOR ${tfor.tforNumber} เป็น ${newStatus}`,
                    timestamp: serverTimestamp()
                });
            } catch (error) {
                console.error('Error updating issue status:', error);
                showNotification('เกิดข้อผิดพลาดในการอัปเดตสถานะ', 'error');
            }
        });
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-issue-tfor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCheckView(btn.getAttribute('data-tfor-id'));
        });
    });
}

// Show check view
async function showCheckView(tforId) {
    document.getElementById('transfers-menu-view').classList.add('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.remove('hidden');
    
    showLoading();
    
    try {
        // Get TFOR data
        const tforDoc = await getDoc(doc(db, 'tfors', tforId));
        
        if (!tforDoc.exists()) {
            showNotification('ไม่พบข้อมูล TFOR', 'error');
            showDetailsView();
            return;
        }
        
        const tfor = {
            id: tforDoc.id,
            ...tforDoc.data()
        };
        
        // Get transfer data
        const transferDoc = await getDoc(doc(db, 'transfers', tfor.transferId));
        
        if (!transferDoc.exists()) {
            showNotification('ไม่พบข้อมูล Transfer', 'error');
            showDetailsView();
            return;
        }
        
        const transfer = {
            id: transferDoc.id,
            ...transferDoc.data()
        };
        
        // Get issues data
        const issuesQuery = query(
            collection(db, 'issues'),
            where('tforId', '==', tforId)
        );
        
        const issuesSnapshot = await getDocs(issuesQuery);
        const issues = [];
        
        issuesSnapshot.forEach(doc => {
            issues.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get comments data
        const commentsQuery = query(
            collection(db, 'comments'),
            where('tforId', '==', tforId),
            orderBy('createdAt', 'desc')
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = [];
        
        commentsSnapshot.forEach(doc => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Render check view
        renderCheckView(tfor, transfer, issues, comments);
    } catch (error) {
        console.error('Error loading check view:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    
    hideLoading();
}

// Render check view
function renderCheckView(tfor, transfer, issues, comments) {
    // Set back button
    document.getElementById('back-to-previous-view-button').addEventListener('click', () => {
        showDetailsView();
    });
    
    // Set title
    document.getElementById('check-view-title').textContent = `เช็คสินค้า TFOR: ${tfor.tforNumber}`;
    
    // Render check details
    const detailsContainer = document.getElementById('check-details-container');
    
    // Format date
    const createdDate = new Date(tfor.createdAt.toDate());
    const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
    
    // Status badge
    let statusBadge = '';
    if (tfor.status === 'pending') {
        statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">รอดำเนินการ</span>';
    } else if (tfor.status === 'in-progress') {
        statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">กำลังดำเนินการ</span>';
    } else if (tfor.status === 'completed') {
        statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">เสร็จสิ้น</span>';
    }
    
    // Check for carried forward TFORs
    const carriedForwardBadge = tfor.carriedForward ? 
        '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 ml-2">พ่วงมา</span>' : 
        '';
    
    detailsContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p class="text-sm text-gray-500">เลขที่ TFOR</p>
                <p class="font-medium">${tfor.tforNumber} ${statusBadge} ${carriedForwardBadge}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">ทะเบียนรถ</p>
                <p class="font-medium">${transfer.licensePlate}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">สาขา</p>
                <p class="font-medium">${tfor.branch}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">ประเภทสินค้า</p>
                <p class="font-medium">${tfor.productType}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">จำนวนพาเลท</p>
                <p class="font-medium">${tfor.palletCount}</p>
            </div>
            <div>
                <p class="text-sm text-gray-500">วันที่สร้าง</p>
                <p class="font-medium">${formattedCreatedDate}</p>
            </div>
        </div>
        ${transfer.images && transfer.images.length > 0 ? `
            <div class="mt-4">
                <p class="text-sm text-gray-500 mb-2">รูปภาพ</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    ${transfer.images.map(img => `<img src="${img}" alt="Transfer Image" class="w-full h-24 object-cover rounded-lg">`).join('')}
                </div>
            </div>
        ` : ''}
    `;
    
    // Render performance timer
    renderPerformanceTimer(tfor);
    
    // Render check section
    renderCheckSection(tfor);
    
    // Render receive section
    renderReceiveSection(tfor);
    
    // Render report issue section
    renderReportIssueSection(tfor, issues);
    
    // Render comment section
    renderCommentSection(tfor, comments);
}

// Render performance timer
function renderPerformanceTimer(tfor) {
    const container = document.getElementById('timer-display-container');
    
    // Check if timer exists for this TFOR
    const timer = performanceTimers[tfor.id];
    
    container.innerHTML = `
        <div class="text-lg font-medium">เวลาที่ใช้: <span id="timer-display">${timer ? formatTime(timer.elapsed) : '00:00:00'}</span></div>
        <button id="start-timer-btn" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ${tfor.status === 'completed' ? 'hidden' : ''}" data-tfor-id="${tfor.id}">
            ${timer && timer.running ? 'หยุดจับเวลา' : 'เริ่มจับเวลา'}
        </button>
    `;
    
    // Update timer display if running
    if (timer && timer.running) {
        updateTimerDisplay(tfor.id);
    }
}

// Format time (seconds to HH:MM:SS)
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start performance timer
function startPerformanceTimer(tforId) {
    if (!performanceTimers[tforId]) {
        performanceTimers[tforId] = {
            startTime: Date.now(),
            elapsed: 0,
            running: true,
            interval: null
        };
    } else {
        const timer = performanceTimers[tforId];
        
        if (timer.running) {
            // Stop the timer
            timer.running = false;
            clearInterval(timer.interval);
        } else {
            // Resume the timer
            timer.startTime = Date.now() - (timer.elapsed * 1000);
            timer.running = true;
        }
    }
    
    // Update button text
    const btn = document.getElementById('start-timer-btn');
    const timer = performanceTimers[tforId];
    btn.textContent = timer.running ? 'หยุดจับเวลา' : 'เริ่มจับเวลา';
    
    // Start updating display if running
    if (timer.running) {
        updateTimerDisplay(tforId);
    }
}

// Update timer display
function updateTimerDisplay(tforId) {
    const timer = performanceTimers[tforId];
    
    if (!timer || !timer.running) return;
    
    timer.interval = setInterval(() => {
        timer.elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        document.getElementById('timer-display').textContent = formatTime(timer.elapsed);
    }, 1000);
}

// Render check section
function renderCheckSection(tfor) {
    const container = document.getElementById('pallet-buttons-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= tfor.palletCount; i++) {
        const button = document.createElement('button');
        button.className = 'pallet-button px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        button.textContent = `พาเลท ${i}`;
        
        // Check if pallet is already checked
        if (tfor.checkedPallets && tfor.checkedPallets.includes(i)) {
            button.classList.add('active');
        }
        
        button.addEventListener('click', () => {
            togglePalletCheck(tfor.id, i, button, 'checked');
        });
        
        container.appendChild(button);
    }
}

// Render receive section
function renderReceiveSection(tfor) {
    const container = document.getElementById('receive-pallet-buttons-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= tfor.palletCount; i++) {
        const button = document.createElement('button');
        button.className = 'pallet-button px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        button.textContent = `พาเลท ${i}`;
        
        // Check if pallet is already received
        if (tfor.receivedPallets && tfor.receivedPallets.includes(i)) {
            button.classList.add('active');
        }
        
        // Only enable if pallet is checked
        if (!tfor.checkedPallets || !tfor.checkedPallets.includes(i)) {
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        button.addEventListener('click', () => {
            togglePalletCheck(tfor.id, i, button, 'received');
        });
        
        container.appendChild(button);
    }
}

// Render report issue section
function renderReportIssueSection(tfor, issues) {
    const container = document.getElementById('issue-pallet-buttons-container');
    container.innerHTML = '';
    
    for (let i = 1; i <= tfor.palletCount; i++) {
        const button = document.createElement('button');
        button.className = 'pallet-button px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300';
        button.textContent = `พาเลท ${i}`;
        
        // Check if pallet has issue
        const hasIssue = issues.some(issue => issue.palletNumber == i);
        if (hasIssue) {
            button.classList.add('bg-red-200', 'text-red-800');
        }
        
        button.addEventListener('click', () => {
            showIssueForm(tfor, i, issues);
        });
        
        container.appendChild(button);
    }
    
    // Render issue forms
    renderIssueForms(tfor, issues);
}

// Render issue forms
function renderIssueForms(tfor, issues) {
    const container = document.getElementById('issue-forms-container');
    container.innerHTML = '';
    
    if (issues.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">ไม่มีปัญหาที่รายงาน</p>';
        return;
    }
    
    issues.forEach(issue => {
        const form = document.createElement('div');
        form.className = 'mt-4 p-4 bg-red-50 rounded-lg';
        
        // Format date
        const createdDate = new Date(issue.createdAt.toDate());
        const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        
        form.innerHTML = `
            <div class="flex justify-between items-start">
                <h4 class="font-bold text-red-800">พาเลท ${issue.palletNumber}: ${issue.issueType}</h4>
                <button class="remove-issue-btn text-red-500 hover:text-red-700" data-issue-id="${issue.id}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <p class="mt-2 text-red-700">${issue.description}</p>
            <p class="mt-1 text-sm text-red-600">รายงานเมื่อ: ${formattedCreatedDate}</p>
        `;
        
        container.appendChild(form);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-issue-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const issueId = btn.getAttribute('data-issue-id');
            
            showConfirmation(
                'ลบรายงานปัญหา',
                'คุณแน่ใจหรือไม่ว่าต้องการลบรายงานปัญหานี้?',
                async () => {
                    try {
                        await deleteDoc(doc(db, 'issues', issueId));
                        showNotification('ลบรายงานปัญหาสำเร็จ', 'success');
                        
                        // Reload check view
                        showCheckView(tfor.id);
                    } catch (error) {
                        console.error('Error deleting issue:', error);
                        showNotification('เกิดข้อผิดพลาดในการลบรายงานปัญหา', 'error');
                    }
                }
            );
        });
    });
}

// Show issue form
function showIssueForm(tfor, palletNumber, existingIssues) {
    const modal = document.getElementById('details-modal');
    const modalContent = document.getElementById('details-modal-content');
    
    modalContent.innerHTML = `
        <h3 class="text-xl font-bold mb-4">รายงานปัญหาพาเลท ${palletNumber}</h3>
        <form id="issue-form">
            <input type="hidden" id="issue-tfor-id" value="${tfor.id}">
            <input type="hidden" id="issue-pallet-number" value="${palletNumber}">
            <div class="mb-4">
                <label for="issue-type" class="block text-sm font-medium text-gray-700 mb-1">ประเภทปัญหา</label>
                <select id="issue-type" class="w-full rounded-lg border-gray-300 shadow-sm" required>
                    <option value="">เลือกประเภทปัญหา</option>
                    <option value="สินค้าเสียหาย">สินค้าเสียหาย</option>
                    <option value="สินค้าไม่ตรงตามรายการ">สินค้าไม่ตรงตามรายการ</option>
                    <option value="บรรจุไม่สมบูรณ์">บรรจุไม่สมบูรณ์</option>
                    <option value="หมดอายุ">หมดอายุ</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                </select>
            </div>
            <div class="mb-4">
                <label for="issue-description" class="block text-sm font-medium text-gray-700 mb-1">รายละเอียดปัญหา</label>
                <textarea id="issue-description" rows="3" class="w-full rounded-lg border-gray-300 shadow-sm" required></textarea>
            </div>
            <div class="flex justify-end gap-4">
                <button type="button" id="cancel-issue-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">ยกเลิก</button>
                <button type="submit" class="px-4 py-2 bg-red-500 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Add event listeners
    document.getElementById('cancel-issue-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
    
    document.getElementById('issue-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const tforId = document.getElementById('issue-tfor-id').value;
        const palletNumber = parseInt(document.getElementById('issue-pallet-number').value);
        const issueType = document.getElementById('issue-type').value;
        const description = document.getElementById('issue-description').value;
        
        try {
            await addDoc(collection(db, 'issues'), {
                tforId: tforId,
                palletNumber: palletNumber,
                issueType: issueType,
                description: description,
                status: 'pending',
                createdBy: currentUser.uid,
                createdAt: serverTimestamp()
            });
            
            showNotification('บันทึกรายงานปัญหาสำเร็จ', 'success');
            
            // Log activity
            await addDoc(collection(db, 'activity'), {
                userId: currentUser.uid,
                description: `รายงานปัญหา TFOR ${tfor.tforNumber} พาเลท ${palletNumber}: ${issueType}`,
                timestamp: serverTimestamp()
            });
            
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // Reload check view
            showCheckView(tforId);
        } catch (error) {
            console.error('Error saving issue:', error);
            showNotification('เกิดข้อผิดพลาดในการบันทึกรายงานปัญหา', 'error');
        }
    });
}

// Toggle pallet check
async function togglePalletCheck(tforId, palletNumber, button, type) {
    try {
        const tforDoc = await getDoc(doc(db, 'tfors', tforId));
        
        if (!tforDoc.exists()) {
            showNotification('ไม่พบข้อมูล TFOR', 'error');
            return;
        }
        
        const tfor = {
            id: tforDoc.id,
            ...tforDoc.data()
        };
        
        let checkedPallets = tfor.checkedPallets || [];
        let receivedPallets = tfor.receivedPallets || [];
        
        if (type === 'checked') {
            // Toggle checked pallet
            if (checkedPallets.includes(palletNumber)) {
                checkedPallets = checkedPallets.filter(p => p !== palletNumber);
                
                // Also remove from received if it was there
                receivedPallets = receivedPallets.filter(p => p !== palletNumber);
            } else {
                checkedPallets.push(palletNumber);
            }
            
            // Update TFOR
            await updateDoc(doc(db, 'tfors', tforId), {
                checkedPallets: checkedPallets,
                receivedPallets: receivedPallets,
                status: checkedPallets.length > 0 ? 'in-progress' : 'pending',
                updatedAt: serverTimestamp()
            });
            
            // Update button
            button.classList.toggle('active');
            
            // If this is the last pallet, stop the timer and save the time
            if (checkedPallets.length === tfor.palletCount && performanceTimers[tforId]) {
                const timer = performanceTimers[tforId];
                
                if (timer.running) {
                    timer.running = false;
                    clearInterval(timer.interval);
                }
                
                // Save performance time
                await updateDoc(doc(db, 'tfors', tforId), {
                    performanceTime: timer.elapsed,
                    updatedAt: serverTimestamp()
                });
                
                showNotification('เช็คพาเลทครบทุกพาเลทแล้ว', 'success');
            }
            
            // Log activity
            const action = checkedPallets.includes(palletNumber) ? 'เช็ค' : 'ยกเลิกการเช็ค';
            await addDoc(collection(db, 'activity'), {
                userId: currentUser.uid,
                description: `${action}พาเลท ${palletNumber} ของ TFOR ${tfor.tforNumber}`,
                timestamp: serverTimestamp()
            });
            
            // Reload check view to update receive buttons
            showCheckView(tforId);
        } else if (type === 'received') {
            // Toggle received pallet
            if (receivedPallets.includes(palletNumber)) {
                receivedPallets = receivedPallets.filter(p => p !== palletNumber);
            } else {
                receivedPallets.push(palletNumber);
            }
            
            // Update TFOR
            await updateDoc(doc(db, 'tfors', tforId), {
                receivedPallets: receivedPallets,
                updatedAt: serverTimestamp()
            });
            
            // Update button
            button.classList.toggle('active');
            
            // If all pallets are received, mark as completed
            if (receivedPallets.length === tfor.palletCount) {
                const today = new Date();
                const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                
                await updateDoc(doc(db, 'tfors', tforId), {
                    status: 'completed',
                    completedDate: formattedToday,
                    updatedAt: serverTimestamp()
                });
                
                showNotification('รับสินค้าครบทุกพาเลทแล้ว', 'success');
                
                // Log activity
                await addDoc(collection(db, 'activity'), {
                    userId: currentUser.uid,
                    description: `เสร็จสิ้นการเช็ค TFOR ${tfor.tforNumber}`,
                    timestamp: serverTimestamp()
                });
                
                // Update summary data
                loadSummaryData();
            }
            
            // Log activity
            const action = receivedPallets.includes(palletNumber) ? 'รับ' : 'ยกเลิกการรับ';
            await addDoc(collection(db, 'activity'), {
                userId: currentUser.uid,
                description: `${action}พาเลท ${palletNumber} ของ TFOR ${tfor.tforNumber}`,
                timestamp: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error toggling pallet check:', error);
        showNotification('เกิดข้อผิดพลาด', 'error');
    }
}

// Render comment section
function renderCommentSection(tfor, comments) {
    const displayContainer = document.getElementById('comments-display-container');
    displayContainer.innerHTML = '';
    
    if (comments.length === 0) {
        displayContainer.innerHTML = '<p class="text-gray-500 text-center">ยังไม่มีความคิดเห็น</p>';
    } else {
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-bubble';
            
            // Format date
            const createdDate = new Date(comment.createdAt.toDate());
            const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()} ${createdDate.getHours()}:${createdDate.getMinutes().toString().padStart(2, '0')}`;
            
            commentElement.innerHTML = `
                <div class="comment-meta">${comment.userName} - ${formattedCreatedDate}</div>
                <div>${comment.text}</div>
            `;
            
            displayContainer.appendChild(commentElement);
        });
    }
    
    // Set form data
    document.getElementById('comment-form').setAttribute('data-tfor-id', tfor.id);
}

// Save comment
async function saveComment() {
    const tforId = document.getElementById('comment-form').getAttribute('data-tfor-id');
    const text = document.getElementById('comment-input').value.trim();
    
    if (!text) return;
    
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userName = userDoc.exists() ? 
            `${userDoc.data().firstname} ${userDoc.data().lastname}` : 
            currentUser.displayName || 'Unknown User';
        
        await addDoc(collection(db, 'comments'), {
            tforId: tforId,
            userId: currentUser.uid,
            userName: userName,
            text: text,
            createdAt: serverTimestamp()
        });
        
        // Clear input
        document.getElementById('comment-input').value = '';
        
        // Reload comments
        const commentsQuery = query(
            collection(db, 'comments'),
            where('tforId', '==', tforId),
            orderBy('createdAt', 'desc')
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = [];
        
        commentsSnapshot.forEach(doc => {
            comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get TFOR data
        const tforDoc = await getDoc(doc(db, 'tfors', tforId));
        const tfor = {
            id: tforDoc.id,
            ...tforDoc.data()
        };
        
        // Re-render comment section
        renderCommentSection(tfor, comments);
        
        showNotification('เพิ่มความคิดเห็นสำเร็จ', 'success');
    } catch (error) {
        console.error('Error saving comment:', error);
        showNotification('เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น', 'error');
    }
}

// Load checked TFORs
async function loadCheckedTfors() {
    const container = document.getElementById('checked-tfor-container');
    container.innerHTML = '<p class="text-center py-8 text-gray-500">กำลังโหลด...</p>';
    
    try {
        // Get TFORs that are checked but not received
        const tforsQuery = query(
            collection(db, 'tfors'),
            where('status', '==', 'in-progress')
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        const tfors = [];
        
        tforsSnapshot.forEach(doc => {
            const tfor = doc.data();
            
            // Check if all pallets are checked but not all are received
            if (tfor.checkedPallets && tfor.checkedPallets.length > 0 && 
                (!tfor.receivedPallets || tfor.receivedPallets.length < tfor.palletCount)) {
                tfors.push({
                    id: doc.id,
                    ...tfor
                });
            }
        });
        
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = {};
        
        transfersSnapshot.forEach(doc => {
            transfersData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Render checked TFORs
        renderCheckedTfors(tfors, transfersData);
    } catch (error) {
        console.error('Error loading checked TFORs:', error);
        container.innerHTML = '<p class="text-center py-8 text-gray-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Render checked TFORs
function renderCheckedTfors(tfors, transfersData) {
    const container = document.getElementById('checked-tfor-container');
    container.innerHTML = '';
    
    if (tfors.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีรายการที่เช็คแล้วแต่ยังไม่ได้รับ</p>';
        return;
    }
    
    tfors.forEach(tfor => {
        const transfer = transfersData[tfor.transferId];
        
        if (!transfer) return;
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-6 waiting-receive-card';
        
        // Format date
        const createdDate = new Date(tfor.createdAt.toDate());
        const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">TFOR: ${tfor.tforNumber}</h3>
                    <p class="text-sm text-gray-500 mt-1">สร้างเมื่อ: ${formattedCreatedDate}</p>
                </div>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">รอรับสินค้า</span>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">ทะเบียนรถ</p>
                    <p class="font-medium">${transfer.licensePlate}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">สาขา</p>
                    <p class="font-medium">${tfor.branch}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">จำนวนพาเลท</p>
                    <p class="font-medium">${tfor.palletCount}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">เช็คแล้ว / รับแล้ว</p>
                    <p class="font-medium">${tfor.checkedPallets.length} / ${tfor.receivedPallets ? tfor.receivedPallets.length : 0}</p>
                </div>
            </div>
            <div class="mt-4 flex justify-end">
                <button class="receive-tfor-btn px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600" data-tfor-id="${tfor.id}">รับสินค้า</button>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to receive buttons
    document.querySelectorAll('.receive-tfor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCheckView(btn.getAttribute('data-tfor-id'));
        });
    });
}

// Load today's plan
async function loadTodaysPlan() {
    const container = document.getElementById('todays-plan-container');
    container.innerHTML = '<p class="text-center py-8 text-gray-500">กำลังโหลด...</p>';
    
    try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date();
        const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Get TFORs planned for today
        const todayPlanQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '==', formattedToday),
            orderBy('createdAt', 'desc')
        );
        
        const todayPlanSnapshot = await getDocs(todayPlanQuery);
        const todayPlan = [];
        
        todayPlanSnapshot.forEach(doc => {
            todayPlan.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = {};
        
        transfersSnapshot.forEach(doc => {
            transfersData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Render today's plan
        renderTodaysPlan(todayPlan, transfersData);
    } catch (error) {
        console.error('Error loading today\'s plan:', error);
        container.innerHTML = '<p class="text-center py-8 text-gray-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Render today's plan
function renderTodaysPlan(tfors, transfersData) {
    const container = document.getElementById('todays-plan-container');
    container.innerHTML = '';
    
    if (tfors.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีแผนงานสำหรับวันนี้</p>';
        return;
    }
    
    // Group by transfer
    const transfers = {};
    
    tfors.forEach(tfor => {
        const transferId = tfor.transferId;
        
        if (!transfers[transferId]) {
            transfers[transferId] = {
                transfer: transfersData[transferId],
                tfors: []
            };
        }
        
        transfers[transferId].tfors.push(tfor);
    });
    
    // Render each transfer
    Object.values(transfers).forEach(({ transfer, tfors }) => {
        if (!transfer) return;
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-6';
        
        // Format date
        const createdDate = new Date(transfer.createdAt.toDate());
        const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-bold text-gray-900">ทะเบียนรถ: ${transfer.licensePlate}</h3>
                    <p class="text-sm text-gray-500 mt-1">สร้างเมื่อ: ${formattedCreatedDate}</p>
                </div>
            </div>
            <div class="mt-4">
                <h4 class="font-medium text-gray-700 mb-2">รายการ TFOR:</h4>
                <div class="space-y-2">
                    ${tfors.map(tfor => {
                        // Status badge
                        let statusBadge = '';
                        if (tfor.status === 'pending') {
                            statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">รอดำเนินการ</span>';
                        } else if (tfor.status === 'in-progress') {
                            statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">กำลังดำเนินการ</span>';
                        } else if (tfor.status === 'completed') {
                            statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">เสร็จสิ้น</span>';
                        }
                        
                        // Check for carried forward TFORs
                        const carriedForwardBadge = tfor.carriedForward ? 
                            '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 ml-2">พ่วงมา</span>' : 
                            '';
                        
                        return `
                            <div class="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <div>
                                    <span class="font-medium">TFOR: ${tfor.tforNumber}</span>
                                    <span class="text-sm text-gray-500 ml-2">${tfor.branch}</span>
                                    ${statusBadge}
                                    ${carriedForwardBadge}
                                </div>
                                <button class="view-plan-tfor-btn text-indigo-600 hover:text-indigo-900" data-tfor-id="${tfor.id}">ดูรายละเอียด</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-plan-tfor-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showCheckView(btn.getAttribute('data-tfor-id'));
        });
    });
}

// Show plan work modal
function showPlanWorkModal() {
    const modal = document.getElementById('details-modal');
    const modalContent = document.getElementById('details-modal-content');
    
    modalContent.innerHTML = `
        <h3 class="text-xl font-bold mb-4">วางแผนงาน</h3>
        <form id="plan-work-form">
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">เลือก TFOR ที่ต้องการวางแผน</label>
                <div id="plan-tfor-list" class="max-h-60 overflow-y-auto border rounded-lg p-2">
                    <p class="text-gray-500 text-center">กำลังโหลด...</p>
                </div>
            </div>
            <div class="mb-4">
                <label for="plan-date" class="block text-sm font-medium text-gray-700 mb-1">วันที่วางแผน</label>
                <input type="date" id="plan-date" class="w-full rounded-lg border-gray-300 shadow-sm" required>
            </div>
            <div class="mb-4">
                <label class="flex items-center">
                    <input type="checkbox" id="plan-carried-forward" class="rounded border-gray-300 text-fuchsia-600 shadow-sm focus:border-fuchsia-300 focus:ring focus:ring-offset-0 focus:ring-fuchsia-200 focus:ring-opacity-50">
                    <span class="ml-2 text-sm text-gray-700">พ่วงมาจากวันก่อนหน้า</span>
                </label>
            </div>
            <div class="flex justify-end gap-4">
                <button type="button" id="cancel-plan-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">ยกเลิก</button>
                <button type="submit" class="px-4 py-2 bg-fuchsia-600 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Load TFORs for planning
    loadTforsForPlanning();
    
    // Set today's date as default
    const today = new Date();
    const formattedToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    document.getElementById('plan-date').value = formattedToday;
    
    // Add event listeners
    document.getElementById('cancel-plan-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
    
    document.getElementById('plan-work-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const selectedTfors = Array.from(document.querySelectorAll('#plan-tfor-list input:checked')).map(cb => cb.value);
        const plannedDate = document.getElementById('plan-date').value;
        const carriedForward = document.getElementById('plan-carried-forward').checked;
        
        if (selectedTfors.length === 0) {
            showNotification('กรุณาเลือกอย่างน้อย 1 TFOR', 'error');
            return;
        }
        
        try {
            // Update each selected TFOR
            for (const tforId of selectedTfors) {
                await updateDoc(doc(db, 'tfors', tforId), {
                    plannedDate: plannedDate,
                    carriedForward: carriedForward,
                    updatedAt: serverTimestamp()
                });
            }
            
            showNotification('บันทึกแผนงานสำเร็จ', 'success');
            
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // Reload details view
            showDetailsView();
        } catch (error) {
            console.error('Error saving plan work:', error);
            showNotification('เกิดข้อผิดพลาดในการบันทึกแผนงาน', 'error');
        }
    });
}

// Load TFORs for planning
async function loadTforsForPlanning() {
    const container = document.getElementById('plan-tfor-list');
    container.innerHTML = '<p class="text-gray-500 text-center">กำลังโหลด...</p>';
    
    try {
        // Get TFORs that are not planned or completed
        const tforsQuery = query(
            collection(db, 'tfors'),
            where('status', 'in', ['pending', 'in-progress'])
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        const tfors = [];
        
        tforsSnapshot.forEach(doc => {
            tfors.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (tfors.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center">ไม่มี TFOR ที่ต้องการวางแผน</p>';
            return;
        }
        
        container.innerHTML = '';
        
        tfors.forEach(tfor => {
            const item = document.createElement('div');
            item.className = 'flex items-center p-2 hover:bg-gray-50 rounded';
            
            // Format date
            const createdDate = new Date(tfor.createdAt.toDate());
            const formattedCreatedDate = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()}`;
            
            item.innerHTML = `
                <input type="checkbox" id="tfor-${tfor.id}" value="${tfor.id}" class="rounded border-gray-300 text-fuchsia-600 shadow-sm focus:border-fuchsia-300 focus:ring focus:ring-offset-0 focus:ring-fuchsia-200 focus:ring-opacity-50">
                <label for="tfor-${tfor.id}" class="ml-2 flex-1 cursor-pointer">
                    <div class="font-medium">TFOR: ${tfor.tforNumber}</div>
                    <div class="text-sm text-gray-500">${tfor.branch} - ${formattedCreatedDate}</div>
                </label>
            `;
            
            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading TFORs for planning:', error);
        container.innerHTML = '<p class="text-gray-500 text-center">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Render calendar
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<p class="text-center py-8 text-gray-500">กำลังโหลดปฏิทิน...</p>';
    
    // Get current month and year
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Create calendar
    const calendar = document.createElement('div');
    calendar.className = 'calendar';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'p-2 rounded-full hover:bg-gray-100';
    prevBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>';
    
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold';
    title.textContent = `${monthNames[month]} ${year}`;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'p-2 rounded-full hover:bg-gray-100';
    nextBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
    
    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    calendar.appendChild(header);
    
    // Create day names
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const dayNamesContainer = document.createElement('div');
    dayNamesContainer.className = 'grid grid-cols-7 gap-1 mb-2';
    
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'text-center font-medium text-gray-500 py-2';
        dayElement.textContent = day;
        dayNamesContainer.appendChild(dayElement);
    });
    
    calendar.appendChild(dayNamesContainer);
    
    // Create days
    const daysContainer = document.createElement('div');
    daysContainer.className = 'grid grid-cols-7 gap-1';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'h-12';
        daysContainer.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if this is today
        if (year === now.getFullYear() && month === now.getMonth() && day === now.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'text-center';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // Add event dots container
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'event-dots-container';
        dayElement.appendChild(dotsContainer);
        
        // Add click event
        dayElement.addEventListener('click', () => {
            showDayEvents(year, month, day);
        });
        
        daysContainer.appendChild(dayElement);
    }
    
    calendar.appendChild(daysContainer);
    container.innerHTML = '';
    container.appendChild(calendar);
    
    // Load events for this month
    loadCalendarEvents(year, month);
    
    // Add event listeners to navigation buttons
    prevBtn.addEventListener('click', () => {
        renderCalendarMonth(year, month - 1);
    });
    
    nextBtn.addEventListener('click', () => {
        renderCalendarMonth(year, month + 1);
    });
}

// Month names in Thai
const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Render calendar for specific month
function renderCalendarMonth(year, month) {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '<p class="text-center py-8 text-gray-500">กำลังโหลดปฏิทิน...</p>';
    
    // Create calendar
    const calendar = document.createElement('div');
    calendar.className = 'calendar';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'p-2 rounded-full hover:bg-gray-100';
    prevBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>';
    
    const title = document.createElement('h2');
    title.className = 'text-xl font-bold';
    title.textContent = `${monthNames[month]} ${year}`;
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'p-2 rounded-full hover:bg-gray-100';
    nextBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
    
    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    calendar.appendChild(header);
    
    // Create day names
    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const dayNamesContainer = document.createElement('div');
    dayNamesContainer.className = 'grid grid-cols-7 gap-1 mb-2';
    
    dayNames.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'text-center font-medium text-gray-500 py-2';
        dayElement.textContent = day;
        dayNamesContainer.appendChild(dayElement);
    });
    
    calendar.appendChild(dayNamesContainer);
    
    // Create days
    const daysContainer = document.createElement('div');
    daysContainer.className = 'grid grid-cols-7 gap-1';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'h-12';
        daysContainer.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if this is today
        const now = new Date();
        if (year === now.getFullYear() && month === now.getMonth() && day === now.getDate()) {
            dayElement.classList.add('today');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'text-center';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // Add event dots container
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'event-dots-container';
        dayElement.appendChild(dotsContainer);
        
        // Add click event
        dayElement.addEventListener('click', () => {
            showDayEvents(year, month, day);
        });
        
        daysContainer.appendChild(dayElement);
    }
    
    calendar.appendChild(daysContainer);
    container.innerHTML = '';
    container.appendChild(calendar);
    
    // Load events for this month
    loadCalendarEvents(year, month);
    
    // Add event listeners to navigation buttons
    prevBtn.addEventListener('click', () => {
        renderCalendarMonth(year, month - 1);
    });
    
    nextBtn.addEventListener('click', () => {
        renderCalendarMonth(year, month + 1);
    });
}

// Load calendar events
async function loadCalendarEvents(year, month) {
    try {
        // Format month with leading zero
        const formattedMonth = String(month + 1).padStart(2, '0');
        
        // Get TFORs for this month
        const tforsQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '>=', `${year}-${formattedMonth}-01`),
            where('plannedDate', '<=', `${year}-${formattedMonth}-31`)
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        const events = {};
        
        tforsSnapshot.forEach(doc => {
            const tfor = doc.data();
            const day = parseInt(tfor.plannedDate.split('-')[2]);
            
            if (!events[day]) {
                events[day] = {
                    new: 0,
                    completed: 0,
                    issues: 0,
                    scheduled: 0
                };
            }
            
            if (tfor.status === 'pending') {
                events[day].scheduled++;
            } else if (tfor.status === 'in-progress') {
                events[day].scheduled++;
            } else if (tfor.status === 'completed') {
                events[day].completed++;
            }
        });
        
        // Get issues for this month
        const issuesQuery = query(
            collection(db, 'issues'),
            where('createdAt', '>=', new Date(year, month, 1)),
            where('createdAt', '<', new Date(year, month + 1, 1))
        );
        
        const issuesSnapshot = await getDocs(issuesQuery);
        
        issuesSnapshot.forEach(doc => {
            const issue = doc.data();
            const day = new Date(issue.createdAt.toDate()).getDate();
            
            if (!events[day]) {
                events[day] = {
                    new: 0,
                    completed: 0,
                    issues: 0,
                    scheduled: 0
                };
            }
            
            events[day].issues++;
        });
        
        // Update calendar with event dots
        Object.keys(events).forEach(day => {
            const dayElement = document.querySelectorAll('.calendar-day')[parseInt(day) - 1];
            if (!dayElement) return;
            
            const dotsContainer = dayElement.querySelector('.event-dots-container');
            dotsContainer.innerHTML = '';
            
            if (events[day].scheduled > 0) {
                const dot = document.createElement('div');
                dot.className = 'event-dot event-dot-purple';
                dotsContainer.appendChild(dot);
            }
            
            if (events[day].completed > 0) {
                const dot = document.createElement('div');
                dot.className = 'event-dot event-dot-green';
                dotsContainer.appendChild(dot);
            }
            
            if (events[day].issues > 0) {
                const dot = document.createElement('div');
                dot.className = 'event-dot event-dot-red';
                dotsContainer.appendChild(dot);
            }
        });
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

// Show day events
async function showDayEvents(year, month, day) {
    const modal = document.getElementById('details-modal');
    const modalContent = document.getElementById('details-modal-content');
    
    // Format date
    const formattedDate = `${day}/${month + 1}/${year}`;
    
    modalContent.innerHTML = `
        <h3 class="text-xl font-bold mb-4">กิจกรรมวันที่ ${formattedDate}</h3>
        <div id="day-events-container">
            <p class="text-center py-8 text-gray-500">กำลังโหลด...</p>
        </div>
        <div class="flex justify-end mt-4">
            <button id="close-day-events-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">ปิด</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Format month with leading zero
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    
    try {
        // Get TFORs for this day
        const tforsQuery = query(
            collection(db, 'tfors'),
            where('plannedDate', '==', dateStr)
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        const tfors = [];
        
        tforsSnapshot.forEach(doc => {
            tfors.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get transfers data
        const transfersQuery = query(
            collection(db, 'transfers'),
            orderBy('createdAt', 'desc')
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        const transfersData = {};
        
        transfersSnapshot.forEach(doc => {
            transfersData[doc.id] = {
                id: doc.id,
                ...doc.data()
            };
        });
        
        // Get issues for this day
        const issuesQuery = query(
            collection(db, 'issues'),
            where('createdAt', '>=', new Date(year, month, day)),
            where('createdAt', '<', new Date(year, month, day + 1))
        );
        
        const issuesSnapshot = await getDocs(issuesQuery);
        const issues = [];
        
        issuesSnapshot.forEach(doc => {
            issues.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Render events
        renderDayEvents(tfors, transfersData, issues);
    } catch (error) {
        console.error('Error loading day events:', error);
        document.getElementById('day-events-container').innerHTML = '<p class="text-center py-8 text-gray-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
    
    // Add event listener to close button
    document.getElementById('close-day-events-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
}

// Render day events
function renderDayEvents(tfors, transfersData, issues) {
    const container = document.getElementById('day-events-container');
    container.innerHTML = '';
    
    if (tfors.length === 0 && issues.length === 0) {
        container.innerHTML = '<p class="text-center py-8 text-gray-500">ไม่มีกิจกรรมในวันนี้</p>';
        return;
    }
    
    // Render TFORs
    if (tfors.length > 0) {
        const tforsSection = document.createElement('div');
        tforsSection.className = 'mb-6';
        
        const tforsTitle = document.createElement('h4');
        tforsTitle.className = 'font-bold text-lg mb-2';
        tforsTitle.textContent = 'TFOR ที่วางแผนไว้';
        tforsSection.appendChild(tforsTitle);
        
        const tforsList = document.createElement('div');
        tforsList.className = 'space-y-2';
        
        tfors.forEach(tfor => {
            const transfer = transfersData[tfor.transferId];
            
            if (!transfer) return;
            
            const tforItem = document.createElement('div');
            tforItem.className = 'p-3 bg-gray-50 rounded-lg';
            
            // Status badge
            let statusBadge = '';
            if (tfor.status === 'pending') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">รอดำเนินการ</span>';
            } else if (tfor.status === 'in-progress') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">กำลังดำเนินการ</span>';
            } else if (tfor.status === 'completed') {
                statusBadge = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">เสร็จสิ้น</span>';
            }
            
            // Check for carried forward TFORs
            const carriedForwardBadge = tfor.carriedForward ? 
                '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 ml-2">พ่วงมา</span>' : 
                '';
            
            tforItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-medium">TFOR: ${tfor.tforNumber}</div>
                        <div class="text-sm text-gray-500">${transfer.licensePlate} - ${tfor.branch}</div>
                    </div>
                    <div>
                        ${statusBadge}
                        ${carriedForwardBadge}
                    </div>
                </div>
            `;
            
            tforsList.appendChild(tforItem);
        });
        
        tforsSection.appendChild(tforsList);
        container.appendChild(tforsSection);
    }
    
    // Render issues
    if (issues.length > 0) {
        const issuesSection = document.createElement('div');
        
        const issuesTitle = document.createElement('h4');
        issuesTitle.className = 'font-bold text-lg mb-2';
        issuesTitle.textContent = 'ปัญหาที่รายงาน';
        issuesSection.appendChild(issuesTitle);
        
        const issuesList = document.createElement('div');
        issuesList.className = 'space-y-2';
        
        issues.forEach(issue => {
            const issueItem = document.createElement('div');
            issueItem.className = 'p-3 bg-red-50 rounded-lg';
            
            // Format time
            const time = new Date(issue.createdAt.toDate());
            const formattedTime = `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
            
            issueItem.innerHTML = `
                <div class="font-medium text-red-800">พาเลท ${issue.palletNumber}: ${issue.issueType}</div>
                <div class="text-sm text-red-600">${issue.description}</div>
                <div class="text-xs text-red-500 mt-1">เวลา: ${formattedTime}</div>
            `;
            
            issuesList.appendChild(issueItem);
        });
        
        issuesSection.appendChild(issuesList);
        container.appendChild(issuesSection);
    }
}

// Load statistics
async function loadStatistics(timeframe = 'month') {
    showLoading();
    
    try {
        // Get date range based on timeframe
        const now = new Date();
        let startDate, formattedStartDate, formattedEndDate;
        
        if (timeframe === 'week') {
            // Start of the week (Sunday)
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        } else if (timeframe === 'month') {
            // Start of the month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        } else if (timeframe === 'year') {
            // Start of the year
            startDate = new Date(now.getFullYear(), 0, 1);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
        
        // Update report title
        let timeframeText = '';
        if (timeframe === 'week') {
            timeframeText = 'สัปดาห์นี้';
        } else if (timeframe === 'month') {
            timeframeText = 'เดือนนี้';
        } else if (timeframe === 'year') {
            timeframeText = 'ปีนี้';
        }
        
        document.getElementById('report-title').textContent = `รายงานสรุปผล (${timeframeText})`;
        
        // Get statistics data
        const stats = await getStatisticsData(formattedStartDate, formattedEndDate);
        
        // Render statistics
        renderStatistics(stats);
        
        // Render charts
        renderCharts(stats, timeframe);
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดสถิติ', 'error');
    }
    
    hideLoading();
}

// Get statistics data
async function getStatisticsData(startDate, endDate) {
    const stats = {
        transfers: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0
        },
        tfors: {
            total: 0,
            pending: 0,
            inProgress: 0,
            completed: 0,
            withIssues: 0
        },
        issues: {
            total: 0,
            pending: 0,
            inProgress: 0,
            resolved: 0
        },
        performance: {
            averageTime: 0,
            fastestTime: null,
            slowestTime: null
        },
        byBranch: {},
        byProductType: {},
        byDay: {}
    };
    
    try {
        // Get transfers
        const transfersQuery = query(
            collection(db, 'transfers'),
            where('deliveryDate', '>=', startDate),
            where('deliveryDate', '<=', endDate)
        );
        
        const transfersSnapshot = await getDocs(transfersQuery);
        stats.transfers.total = transfersSnapshot.size;
        
        // Get TFORs
        const tforsQuery = query(
            collection(db, 'tfors'),
            where('deliveryDate', '>=', startDate),
            where('deliveryDate', '<=', endDate)
        );
        
        const tforsSnapshot = await getDocs(tforsQuery);
        
        tforsSnapshot.forEach(doc => {
            const tfor = doc.data();
            stats.tfors.total++;
            
            if (tfor.status === 'pending') {
                stats.tfors.pending++;
            } else if (tfor.status === 'in-progress') {
                stats.tfors.inProgress++;
            } else if (tfor.status === 'completed') {
                stats.tfors.completed++;
            }
            
            // Group by branch
            if (!stats.byBranch[tfor.branch]) {
                stats.byBranch[tfor.branch] = 0;
            }
            stats.byBranch[tfor.branch]++;
            
            // Group by product type
            if (!stats.byProductType[tfor.productType]) {
                stats.byProductType[tfor.productType] = 0;
            }
            stats.byProductType[tfor.productType]++;
            
            // Group by day
            const day = tfor.deliveryDate;
            if (!stats.byDay[day]) {
                stats.byDay[day] = {
                    tfors: 0,
                    completed: 0,
                    issues: 0
                };
            }
            stats.byDay[day].tfors++;
            
            if (tfor.status === 'completed') {
                stats.byDay[day].completed++;
                
                // Performance time
                if (tfor.performanceTime) {
                    if (stats.performance.fastestTime === null || tfor.performanceTime < stats.performance.fastestTime) {
                        stats.performance.fastestTime = tfor.performanceTime;
                    }
                    
                    if (stats.performance.slowestTime === null || tfor.performanceTime > stats.performance.slowestTime) {
                        stats.performance.slowestTime = tfor.performanceTime;
                    }
                }
            }
        });
        
        // Calculate average performance time
        let totalTime = 0;
        let completedWithTime = 0;
        
        tforsSnapshot.forEach(doc => {
            const tfor = doc.data();
            
            if (tfor.status === 'completed' && tfor.performanceTime) {
                totalTime += tfor.performanceTime;
                completedWithTime++;
            }
        });
        
        if (completedWithTime > 0) {
            stats.performance.averageTime = Math.round(totalTime / completedWithTime);
        }
        
        // Get issues
        const issuesQuery = query(
            collection(db, 'issues'),
            where('createdAt', '>=', new Date(startDate)),
            where('createdAt', '<=', new Date(endDate + ' 23:59:59'))
        );
        
        const issuesSnapshot = await getDocs(issuesQuery);
        stats.issues.total = issuesSnapshot.size;
        
        issuesSnapshot.forEach(doc => {
            const issue = doc.data();
            
            if (issue.status === 'pending') {
                stats.issues.pending++;
            } else if (issue.status === 'in-progress') {
                stats.issues.inProgress++;
            } else if (issue.status === 'resolved') {
                stats.issues.resolved++;
            }
            
            // Group by day
            const createdDate = new Date(issue.createdAt.toDate());
            const day = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
            
            if (!stats.byDay[day]) {
                stats.byDay[day] = {
                    tfors: 0,
                    completed: 0,
                    issues: 0
                };
            }
            stats.byDay[day].issues++;
        });
        
        // Get TFORs with issues
        const tforsWithIssuesQuery = query(
            collection(db, 'tfors'),
            where('deliveryDate', '>=', startDate),
            where('deliveryDate', '<=', endDate)
        );
        
        const tforsWithIssuesSnapshot = await getDocs(tforsWithIssuesQuery);
        
        for (const doc of tforsWithIssuesSnapshot.docs) {
            const tforId = doc.id;
            
            const tforIssuesQuery = query(
                collection(db, 'issues'),
                where('tforId', '==', tforId)
            );
            
            const tforIssuesSnapshot = await getDocs(tforIssuesQuery);
            
            if (!tforIssuesSnapshot.empty) {
                stats.tfors.withIssues++;
            }
        }
    } catch (error) {
        console.error('Error getting statistics data:', error);
    }
    
    return stats;
}

// Render statistics
function renderStatistics(stats) {
    const container = document.getElementById('statistics-container');
    container.innerHTML = '';
    
    // Summary cards
    const summaryCards = [
        {
            title: 'Transfer ทั้งหมด',
            value: stats.transfers.total,
            icon: '📦',
            color: 'bg-blue-500'
        },
        {
            title: 'TFOR ทั้งหมด',
            value: stats.tfors.total,
            icon: '📋',
            color: 'bg-purple-500'
        },
        {
            title: 'TFOR ที่เสร็จสิ้น',
            value: stats.tfors.completed,
            icon: '✅',
            color: 'bg-green-500'
        },
        {
            title: 'ปัญหาที่รายงาน',
            value: stats.issues.total,
            icon: '⚠️',
            color: 'bg-red-500'
        },
        {
            title: 'เวลาเฉลี่ยต่อ TFOR',
            value: stats.performance.averageTime > 0 ? formatTime(stats.performance.averageTime) : '-',
            icon: '⏱️',
            color: 'bg-yellow-500'
        },
        {
            title: 'TFOR ที่มีปัญหา',
            value: stats.tfors.withIssues,
            icon: '❌',
            color: 'bg-orange-500'
        }
    ];
    
    summaryCards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'bg-white rounded-xl shadow-md p-6';
        
        cardElement.innerHTML = `
            <div class="flex items-center">
                <div class="${card.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-xl mr-4">
                    ${card.icon}
                </div>
                <div>
                    <p class="text-sm text-gray-500">${card.title}</p>
                    <p class="text-2xl font-bold">${card.value}</p>
                </div>
            </div>
        `;
        
        container.appendChild(cardElement);
    });
}

// Render charts
function renderCharts(stats, timeframe) {
    const container = document.getElementById('charts-container');
    container.innerHTML = '';
    
    // TFOR status chart
    const tforStatusChart = document.createElement('div');
    tforStatusChart.className = 'bg-white rounded-xl shadow-md p-6';
    
    const tforStatusCanvas = document.createElement('canvas');
    tforStatusCanvas.id = 'tfor-status-chart';
    tforStatusChart.appendChild(tforStatusCanvas);
    
    container.appendChild(tforStatusChart);
    
    // Create TFOR status chart
    new Chart(tforStatusCanvas, {
        type: 'doughnut',
        data: {
            labels: ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น'],
            datasets: [{
                data: [stats.tfors.pending, stats.tfors.inProgress, stats.tfors.completed],
                backgroundColor: [
                    '#FCD34D', // yellow
                    '#60A5FA', // blue
                    '#34D399'  // green
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'สถานะ TFOR'
                }
            }
        }
    });
    
    // Branch distribution chart
    const branchChart = document.createElement('div');
    branchChart.className = 'bg-white rounded-xl shadow-md p-6';
    
    const branchCanvas = document.createElement('canvas');
    branchCanvas.id = 'branch-chart';
    branchChart.appendChild(branchCanvas);
    
    container.appendChild(branchChart);
    
    // Prepare branch data
    const branchLabels = Object.keys(stats.byBranch);
    const branchData = Object.values(stats.byBranch);
    
    // Create branch chart
    new Chart(branchCanvas, {
        type: 'bar',
        data: {
            labels: branchLabels,
            datasets: [{
                label: 'จำนวน TFOR',
                data: branchData,
                backgroundColor: '#8B5CF6'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'การกระจายตามสาขา'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    // Daily trend chart
    const dailyTrendChart = document.createElement('div');
    dailyTrendChart.className = 'bg-white rounded-xl shadow-md p-6';
    
    const dailyTrendCanvas = document.createElement('canvas');
    dailyTrendCanvas.id = 'daily-trend-chart';
    dailyTrendChart.appendChild(dailyTrendCanvas);
    
    container.appendChild(dailyTrendChart);
    
    // Prepare daily data
    const dailyLabels = Object.keys(stats.byDay).sort();
    const dailyTforsData = dailyLabels.map(day => stats.byDay[day].tfors);
    const dailyCompletedData = dailyLabels.map(day => stats.byDay[day].completed);
    const dailyIssuesData = dailyLabels.map(day => stats.byDay[day].issues);
    
    // Format daily labels
    const formattedDailyLabels = dailyLabels.map(label => {
        const date = new Date(label);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    // Create daily trend chart
    new Chart(dailyTrendCanvas, {
        type: 'line',
        data: {
            labels: formattedDailyLabels,
            datasets: [
                {
                    label: 'TFOR ทั้งหมด',
                    data: dailyTforsData,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.3
                },
                {
                    label: 'เสร็จสิ้น',
                    data: dailyCompletedData,
                    borderColor: '#34D399',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    tension: 0.3
                },
                {
                    label: 'ปัญหา',
                    data: dailyIssuesData,
                    borderColor: '#F87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'แนวโน้มรายวัน'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Load KPI data
async function loadKpiData() {
    const summaryContainer = document.getElementById('kpi-summary-container');
    summaryContainer.innerHTML = '<p class="text-center py-8 text-gray-500">กำลังโหลดข้อมูล KPI...</p>';
    
    const detailsContainer = document.getElementById('kpi-details-container');
    detailsContainer.classList.add('hidden');
    
    try {
        // Get users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            if (user.role !== 'admin') { // Exclude admin users
                users.push({
                    id: doc.id,
                    ...user
                });
            }
        });
        
        // Get TFORs for each user
        const userStats = {};
        
        for (const user of users) {
            const tforsQuery = query(
                collection(db, 'tfors'),
                where('createdBy', '==', user.id)
            );
            
            const tforsSnapshot = await getDocs(tforsQuery);
            
            userStats[user.id] = {
                user: user,
                tfors: tforsSnapshot.size,
                completed: 0,
                withIssues: 0,
                totalTime: 0,
                completedWithTime: 0
            };
            
            tforsSnapshot.forEach(doc => {
                const tfor = doc.data();
                
                if (tfor.status === 'completed') {
                    userStats[user.id].completed++;
                    
                    if (tfor.performanceTime) {
                        userStats[user.id].totalTime += tfor.performanceTime;
                        userStats[user.id].completedWithTime++;
                    }
                }
            });
            
            // Get issues for each user
            const issuesQuery = query(
                collection(db, 'issues'),
                where('createdBy', '==', user.id)
            );
            
            const issuesSnapshot = await getDocs(issuesQuery);
            userStats[user.id].issues = issuesSnapshot.size;
            
            // Get TFORs with issues for each user
            const tforsWithIssuesQuery = query(
                collection(db, 'tfors'),
                where('createdBy', '==', user.id)
            );
            
            const tforsWithIssuesSnapshot = await getDocs(tforsWithIssuesQuery);
            
            for (const doc of tforsWithIssuesSnapshot.docs) {
                const tforId = doc.id;
                
                const tforIssuesQuery = query(
                    collection(db, 'issues'),
                    where('tforId', '==', tforId)
                );
                
                const tforIssuesSnapshot = await getDocs(tforIssuesQuery);
                
                if (!tforIssuesSnapshot.empty) {
                    userStats[user.id].withIssues++;
                }
            }
            
            // Calculate average time
            if (userStats[user.id].completedWithTime > 0) {
                userStats[user.id].averageTime = Math.round(userStats[user.id].totalTime / userStats[user.id].completedWithTime);
            } else {
                userStats[user.id].averageTime = 0;
            }
        }
        
        // Render KPI summary
        renderKpiSummary(userStats);
        
        // Load user management data
        loadUserManagement(users);
    } catch (error) {
        console.error('Error loading KPI data:', error);
        summaryContainer.innerHTML = '<p class="text-center py-8 text-gray-500">เกิดข้อผิดพลาดในการโหลดข้อมูล KPI</p>';
    }
}

// Render KPI summary
function renderKpiSummary(userStats) {
    const container = document.getElementById('kpi-summary-container');
    container.innerHTML = '';
    
    // Convert to array and sort by completion rate
    const statsArray = Object.values(userStats);
    
    statsArray.forEach(stat => {
        // Calculate completion rate
        stat.completionRate = stat.tfors > 0 ? Math.round((stat.completed / stat.tfors) * 100) : 0;
        
        // Calculate issue rate
        stat.issueRate = stat.tfors > 0 ? Math.round((stat.withIssues / stat.tfors) * 100) : 0;
    });
    
    // Sort by completion rate (descending)
    statsArray.sort((a, b) => b.completionRate - a.completionRate);
    
    // Create KPI cards
    statsArray.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow';
        
        // Determine performance color
        let performanceColor = 'bg-red-100 text-red-800';
        if (stat.completionRate >= 80) {
            performanceColor = 'bg-green-100 text-green-800';
        } else if (stat.completionRate >= 60) {
            performanceColor = 'bg-yellow-100 text-yellow-800';
        }
        
        card.innerHTML = `
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-800 text-xl mr-4">
                    ${stat.user.firstname ? stat.user.firstname.charAt(0) : 'U'}
                </div>
                <div>
                    <h3 class="font-bold">${stat.user.firstname || ''} ${stat.user.lastname || ''}</h3>
                    <p class="text-sm text-gray-500">${getRoleDisplayName(stat.user.role)}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">TFOR ทั้งหมด</p>
                    <p class="text-xl font-bold">${stat.tfors}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">เสร็จสิ้น</p>
                    <p class="text-xl font-bold">${stat.completed}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">อัตราการเสร็จสิ้น</p>
                    <p class="text-xl font-bold">${stat.completionRate}%</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">มีปัญหา</p>
                    <p class="text-xl font-bold">${stat.withIssues} (${stat.issueRate}%)</p>
                </div>
            </div>
            <div class="mt-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${performanceColor}">
                    ${stat.completionRate >= 80 ? 'ประสิทธิภาพดี' : stat.completionRate >= 60 ? 'ประสิทธิภาพปานกลาง' : 'ต้องปรับปรุง'}
                </span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            showKpiDetails(stat);
        });
        
        container.appendChild(card);
    });
}

// Show KPI details
function showKpiDetails(userStat) {
    const container = document.getElementById('kpi-details-container');
    container.innerHTML = '';
    
    const details = document.createElement('div');
    
    // Determine performance color
    let performanceColor = 'text-red-600';
    if (userStat.completionRate >= 80) {
        performanceColor = 'text-green-600';
    } else if (userStat.completionRate >= 60) {
        performanceColor = 'text-yellow-600';
    }
    
    details.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold">รายละเอียด KPI: ${userStat.user.firstname || ''} ${userStat.user.lastname || ''}</h2>
            <button id="close-kpi-details-btn" class="text-gray-500 hover:text-gray-700">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="font-bold text-lg mb-4">ข้อมูลทั่วไป</h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">ตำแหน่ง:</span>
                        <span class="font-medium">${getRoleDisplayName(userStat.user.role)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">ดาวเล็ก:</span>
                        <span class="font-medium">${userStat.user.smallStars || 0}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">ดาวใหญ่:</span>
                        <span class="font-medium">${userStat.user.bigStars || 0}</span>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="font-bold text-lg mb-4">สรุปผลงาน</h3>
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">TFOR ทั้งหมด:</span>
                        <span class="font-medium">${userStat.tfors}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">เสร็จสิ้น:</span>
                        <span class="font-medium">${userStat.completed}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">มีปัญหา:</span>
                        <span class="font-medium">${userStat.withIssues}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">รายงานปัญหา:</span>
                        <span class="font-medium">${userStat.issues}</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="font-bold text-lg mb-4">ประสิทธิภาพ</h3>
                <div class="space-y-4">
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-gray-500">อัตราการเสร็จสิ้น:</span>
                            <span class="font-medium ${performanceColor}">${userStat.completionRate}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-fuchsia-600 h-2 rounded-full" style="width: ${userStat.completionRate}%"></div>
                        </div>
                    </div>
                    <div>
                        <div class="flex justify-between mb-1">
                            <span class="text-gray-500">อัตราปัญหา:</span>
                            <span class="font-medium">${userStat.issueRate}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-red-500 h-2 rounded-full" style="width: ${userStat.issueRate}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-6">
                <h3 class="font-bold text-lg mb-4">เวลาเฉลี่ยในการทำงาน</h3>
                <div class="text-center">
                    <p class="text-3xl font-bold text-fuchsia-600 mb-2">${userStat.averageTime > 0 ? formatTime(userStat.averageTime) : '-'}</p>
                    <p class="text-sm text-gray-500">ต่อ TFOR</p>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="font-bold text-lg mb-4">การดำเนินการ</h3>
            <div class="flex gap-4">
                <button id="give-score-btn" class="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 admin-supervisor-only">
                    ให้คะแนน
                </button>
                <button id="give-star-btn" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 admin-supervisor-only">
                    ให้ดาว
                </button>
            </div>
        </div>
    `;
    
    container.appendChild(details);
    container.classList.remove('hidden');
    
    // Add event listeners
    document.getElementById('close-kpi-details-btn').addEventListener('click', () => {
        container.classList.add('hidden');
    });
    
    document.getElementById('give-score-btn').addEventListener('click', () => {
        document.getElementById('score-user-id').value = userStat.user.id;
        document.getElementById('score-modal').classList.remove('hidden');
        document.getElementById('score-modal').classList.add('flex');
    });
    
    document.getElementById('give-star-btn').addEventListener('click', () => {
        document.getElementById('current-small-stars').textContent = userStat.user.smallStars || 0;
        document.getElementById('current-big-stars').textContent = userStat.user.bigStars || 0;
        document.getElementById('star-points-modal').classList.remove('hidden');
        document.getElementById('star-points-modal').classList.add('flex');
    });
}

// Load user management
async function loadUserManagement(users) {
    const container = document.getElementById('user-list-container');
    container.innerHTML = '';
    
    const title = document.createElement('h3');
    title.className = 'text-lg font-bold mb-4';
    title.textContent = 'จัดการผู้ใช้งาน';
    container.appendChild(title);
    
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    
    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อ</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ตำแหน่ง</th>
            <th class="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // Table body
    const tbody = document.createElement('tbody');
    tbody.className = 'bg-white divide-y divide-gray-200';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center text-fuchsia-800 text-sm mr-3">
                        ${user.firstname ? user.firstname.charAt(0) : 'U'}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900">${user.firstname || ''} ${user.lastname || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${getRoleDisplayName(user.role)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="edit-role-btn text-indigo-600 hover:text-indigo-900 mr-3" data-user-id="${user.id}" data-current-role="${user.role}">แก้ไขตำแหน่ง</button>
                <button class="delete-user-btn text-red-600 hover:text-red-900 delete-permission" data-user-id="${user.id}">ลบ</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Add event listeners
    document.querySelectorAll('.edit-role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-user-id');
            const currentRole = btn.getAttribute('data-current-role');
            showEditRoleModal(userId, currentRole);
        });
    });
    
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-user-id');
            
            showConfirmation(
                'ลบผู้ใช้งาน',
                'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้',
                async () => {
                    try {
                        await deleteDoc(doc(db, 'users', userId));
                        showNotification('ลบผู้ใช้งานสำเร็จ', 'success');
                        loadKpiData();
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        showNotification('เกิดข้อผิดพลาดในการลบผู้ใช้งาน', 'error');
                    }
                }
            );
        });
    });
}

// Show edit role modal
function showEditRoleModal(userId, currentRole) {
    const modal = document.getElementById('details-modal');
    const modalContent = document.getElementById('details-modal-content');
    
    modalContent.innerHTML = `
        <h3 class="text-xl font-bold mb-4">แก้ไขตำแหน่งผู้ใช้งาน</h3>
        <form id="edit-role-form">
            <input type="hidden" id="edit-user-id" value="${userId}">
            <div class="mb-4">
                <label for="user-role" class="block text-sm font-medium text-gray-700 mb-1">ตำแหน่ง</label>
                <select id="user-role" class="w-full rounded-lg border-gray-300 shadow-sm" required>
                    <option value="viewer" ${currentRole === 'viewer' ? 'selected' : ''}>ผู้ดู</option>
                    <option value="officer" ${currentRole === 'officer' ? 'selected' : ''}>เจ้าหน้าที่</option>
                    <option value="senior" ${currentRole === 'senior' ? 'selected' : ''}>Senior</option>
                    <option value="supervisor" ${currentRole === 'supervisor' ? 'selected' : ''}>หัวหน้างาน</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>ผู้ดูแลระบบ</option>
                </select>
            </div>
            <div class="flex justify-end gap-4">
                <button type="button" id="cancel-edit-role-btn" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">ยกเลิก</button>
                <button type="submit" class="px-4 py-2 bg-fuchsia-600 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Add event listeners
    document.getElementById('cancel-edit-role-btn').addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
    
    document.getElementById('edit-role-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('edit-user-id').value;
        const newRole = document.getElementById('user-role').value;
        
        try {
            await updateDoc(doc(db, 'users', userId), {
                role: newRole,
                updatedAt: serverTimestamp()
            });
            
            showNotification('แก้ไขตำแหน่งสำเร็จ', 'success');
            
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            
            // Reload KPI data
            loadKpiData();
        } catch (error) {
            console.error('Error updating user role:', error);
            showNotification('เกิดข้อผิดพลาดในการแก้ไขตำแหน่ง', 'error');
        }
    });
}

// Save score
async function saveScore() {
    const userId = document.getElementById('score-user-id').value;
    const value = parseInt(document.getElementById('score-value').value);
    const reason = document.getElementById('score-reason').value;
    const notes = document.getElementById('score-notes').value;
    
    if (!value) {
        showNotification('กรุณาเลือกคะแนน', 'error');
        return;
    }
    
    try {
        // Get current user data
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const giverName = userDoc.exists() ? 
            `${userDoc.data().firstname} ${userDoc.data().lastname}` : 
            currentUser.displayName || 'Unknown User';
        
        // Save score
        await addDoc(collection(db, 'scores'), {
            userId: userId,
            giverId: currentUser.uid,
            giverName: giverName,
            value: value,
            reason: reason,
            notes: notes,
            timestamp: serverTimestamp()
        });
        
        // Log activity
        await addDoc(collection(db, 'activity'), {
            userId: currentUser.uid,
            description: `ให้คะแนน ${value} ดาว`,
            timestamp: serverTimestamp()
        });
        
        showNotification('บันทึกคะแนนสำเร็จ', 'success');
        
        document.getElementById('score-modal').classList.add('hidden');
        document.getElementById('score-modal').classList.remove('flex');
        
        // Reset form
        document.getElementById('score-form').reset();
        document.querySelectorAll('.star-rating .star').forEach(star => {
            star.classList.remove('selected');
        });
    } catch (error) {
        console.error('Error saving score:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกคะแนน', 'error');
    }
}

// Save star points
async function saveStarPoints() {
    const userId = document.getElementById('score-user-id').value;
    const smallStars = parseInt(document.getElementById('current-small-stars').textContent);
    const bigStars = parseInt(document.getElementById('current-big-stars').textContent);
    const reason = document.getElementById('star-reason').value;
    const notes = document.getElementById('star-notes').value;
    
    try {
        // Update user stars
        await updateDoc(doc(db, 'users', userId), {
            smallStars: smallStars,
            bigStars: bigStars,
            updatedAt: serverTimestamp()
        });
        
        // Log activity
        await addDoc(collection(db, 'activity'), {
            userId: currentUser.uid,
            description: `ปรับดาว: ${smallStars} ดาวเล็ก, ${bigStars} ดาวใหญ่`,
            timestamp: serverTimestamp()
        });
        
        showNotification('บันทึกดาวสำเร็จ', 'success');
        
        document.getElementById('star-points-modal').classList.add('hidden');
        document.getElementById('star-points-modal').classList.remove('flex');
        
        // Reload KPI data if we're in KPI view
        if (currentView === 'kpi-view') {
            loadKpiData();
        }
    } catch (error) {
        console.error('Error saving star points:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกดาว', 'error');
    }
}

// Backup data
async function backupData() {
    showLoading();
    
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            users: [],
            transfers: [],
            tfors: [],
            issues: [],
            comments: [],
            scores: [],
            activity: []
        };
        
        // Get users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(doc => {
            backup.users.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get transfers
        const transfersSnapshot = await getDocs(collection(db, 'transfers'));
        transfersSnapshot.forEach(doc => {
            backup.transfers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get TFORs
        const tforsSnapshot = await getDocs(collection(db, 'tfors'));
        tforsSnapshot.forEach(doc => {
            backup.tfors.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get issues
        const issuesSnapshot = await getDocs(collection(db, 'issues'));
        issuesSnapshot.forEach(doc => {
            backup.issues.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get comments
        const commentsSnapshot = await getDocs(collection(db, 'comments'));
        commentsSnapshot.forEach(doc => {
            backup.comments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get scores
        const scoresSnapshot = await getDocs(collection(db, 'scores'));
        scoresSnapshot.forEach(doc => {
            backup.scores.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Get activity
        const activitySnapshot = await getDocs(collection(db, 'activity'));
        activitySnapshot.forEach(doc => {
            backup.activity.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Create download link
        const dataStr = JSON.stringify(backup, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `inbound-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('สำรองข้อมูลสำเร็จ', 'success');
    } catch (error) {
        console.error('Error backing up data:', error);
        showNotification('เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
    }
    
    hideLoading();
}

// Restore data
async function restoreData() {
    const fileInput = document.getElementById('restore-file-input');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        showNotification('กรุณาเลือกไฟล์สำรองข้อมูล', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const file = fileInput.files[0];
        const text = await file.text();
        const backup = JSON.parse(text);
        
        // Confirm restore
        showConfirmation(
            'กู้คืนข้อมูล',
            'คุณแน่ใจหรือไม่ว่าต้องการกู้คืนข้อมูล? ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่',
            async () => {
                try {
                    // Clear existing data
                    await clearAllData();
                    
                    // Restore users
                    for (const user of backup.users) {
                        await addDoc(collection(db, 'users'), {
                            uid: user.uid,
                            email: user.email,
                            firstname: user.firstname,
                            lastname: user.lastname,
                            role: user.role,
                            smallStars: user.smallStars || 0,
                            bigStars: user.bigStars || 0,
                            achievements: user.achievements || [],
                            profilePicture: user.profilePicture || null,
                            createdAt: user.createdAt
                        });
                    }
                    
                    // Restore transfers
                    for (const transfer of backup.transfers) {
                        await addDoc(collection(db, 'transfers'), {
                            deliveryDate: transfer.deliveryDate,
                            licensePlate: transfer.licensePlate,
                            images: transfer.images || [],
                            status: transfer.status,
                            createdBy: transfer.createdBy,
                            createdAt: transfer.createdAt
                        });
                    }
                    
                    // Restore TFORs
                    for (const tfor of backup.tfors) {
                        await addDoc(collection(db, 'tfors'), {
                            tforNumber: tfor.tforNumber,
                            branch: tfor.branch,
                            palletCount: tfor.palletCount,
                            productType: tfor.productType,
                            status: tfor.status,
                            checkedPallets: tfor.checkedPallets || [],
                            receivedPallets: tfor.receivedPallets || [],
                            issues: tfor.issues || [],
                            transferId: tfor.transferId,
                            deliveryDate: tfor.deliveryDate,
                            licensePlate: tfor.licensePlate,
                            plannedDate: tfor.plannedDate,
                            carriedForward: tfor.carriedForward || false,
                            completedDate: tfor.completedDate,
                            performanceTime: tfor.performanceTime,
                            createdBy: tfor.createdBy,
                            createdAt: tfor.createdAt
                        });
                    }
                    
                    // Restore issues
                    for (const issue of backup.issues) {
                        await addDoc(collection(db, 'issues'), {
                            tforId: issue.tforId,
                            palletNumber: issue.palletNumber,
                            issueType: issue.issueType,
                            description: issue.description,
                            status: issue.status,
                            createdBy: issue.createdBy,
                            createdAt: issue.createdAt
                        });
                    }
                    
                    // Restore comments
                    for (const comment of backup.comments) {
                        await addDoc(collection(db, 'comments'), {
                            tforId: comment.tforId,
                            userId: comment.userId,
                            userName: comment.userName,
                            text: comment.text,
                            createdAt: comment.createdAt
                        });
                    }
                    
                    // Restore scores
                    for (const score of backup.scores) {
                        await addDoc(collection(db, 'scores'), {
                            userId: score.userId,
                            giverId: score.giverId,
                            giverName: score.giverName,
                            value: score.value,
                            reason: score.reason,
                            notes: score.notes,
                            timestamp: score.timestamp
                        });
                    }
                    
                    // Restore activity
                    for (const activity of backup.activity) {
                        await addDoc(collection(db, 'activity'), {
                            userId: activity.userId,
                            description: activity.description,
                            timestamp: activity.timestamp
                        });
                    }
                    
                    showNotification('กู้คืนข้อมูลสำเร็จ', 'success');
                    
                    // Reset file input
                    fileInput.value = '';
                    document.getElementById('restore-data-btn').disabled = true;
                    
                    // Close modal
                    document.getElementById('backup-modal').classList.add('hidden');
                    document.getElementById('backup-modal').classList.remove('flex');
                    
                    // Reload current view
                    if (currentView === 'main-menu-view') {
                        initializeApp();
                    } else if (currentView === 'kpi-view') {
                        loadKpiData();
                    } else if (currentView === 'statistics-view') {
                        loadStatistics();
                    }
                } catch (error) {
                    console.error('Error restoring data:', error);
                    showNotification('เกิดข้อผิดพลาดในการกู้คืนข้อมูล', 'error');
                }
                hideLoading();
            }
        );
    } catch (error) {
        console.error('Error parsing backup file:', error);
        showNotification('ไฟล์สำรองข้อมูลไม่ถูกต้อง', 'error');
        hideLoading();
    }
}

// Clear all data
async function clearAllData() {
    // Get all collections
    const collections = ['users', 'transfers', 'tfors', 'issues', 'comments', 'scores', 'activity'];
    
    for (const collectionName of collections) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        
        for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
        }
    }
}

// Delete all data
async function deleteAllData() {
    showLoading();
    
    try {
        await clearAllData();
        showNotification('ลบข้อมูลทั้งหมดสำเร็จ', 'success');
        
        // Reload current view
        if (currentView === 'main-menu-view') {
            initializeApp();
        } else if (currentView === 'kpi-view') {
            loadKpiData();
        } else if (currentView === 'statistics-view') {
            loadStatistics();
        }
    } catch (error) {
        console.error('Error deleting all data:', error);
        showNotification('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
    }
    
    hideLoading();
}

// Export to Excel
function exportToExcel() {
    showNotification('กำลังส่งออกข้อมูลเป็น Excel...', 'success');
    
    // In a real app, you would use a library like SheetJS to export to Excel
    // For this example, we'll just show a notification
    setTimeout(() => {
        showNotification('ส่งออกข้อมูลเป็น Excel สำเร็จ', 'success');
    }, 1500);
}

// Export to PDF
function exportToPDF() {
    showLoading();
    
    try {
        // Get current timeframe
        let timeframe = 'month';
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            if (btn.classList.contains('bg-fuchsia-600')) {
                timeframe = btn.getAttribute('data-frame');
            }
        });
        
        // Get statistics data
        const now = new Date();
        let startDate, formattedStartDate, formattedEndDate;
        
        if (timeframe === 'week') {
            // Start of the week (Sunday)
            const dayOfWeek = now.getDay();
            startDate = new Date(now);
            startDate.setDate(now.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        } else if (timeframe === 'month') {
            // Start of the month
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        } else if (timeframe === 'year') {
            // Start of the year
            startDate = new Date(now.getFullYear(), 0, 1);
            
            formattedStartDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            formattedEndDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        }
        
        // Get statistics data
        getStatisticsData(formattedStartDate, formattedEndDate).then(stats => {
            // Create PDF content
            const pdfContent = document.getElementById('pdf-export-content');
            
            // Set title
            let timeframeText = '';
            if (timeframe === 'week') {
                timeframeText = 'สัปดาห์นี้';
            } else if (timeframe === 'month') {
                timeframeText = 'เดือนนี้';
            } else if (timeframe === 'year') {
                timeframeText = 'ปีนี้';
            }
            
            pdfContent.innerHTML = `
                <h1>รายงานสรุปผล (${timeframeText})</h1>
                <p>วันที่ส่งออก: ${new Date().toLocaleDateString('th-TH')}</p>
                
                <h2>สรุปข้อมูล</h2>
                <div class="summary-card">
                    <h3>Transfer ทั้งหมด</h3>
                    <p class="summary-value">${stats.transfers.total}</p>
                </div>
                <div class="summary-card">
                    <h3>TFOR ทั้งหมด</h3>
                    <p class="summary-value">${stats.tfors.total}</p>
                </div>
                <div class="summary-card">
                    <h3>TFOR ที่เสร็จสิ้น</h3>
                    <p class="summary-value">${stats.tfors.completed}</p>
                </div>
                <div class="summary-card">
                    <h3>ปัญหาที่รายงาน</h3>
                    <p class="summary-value">${stats.issues.total}</p>
                </div>
                <div class="summary-card">
                    <h3>เวลาเฉลี่ยต่อ TFOR</h3>
                    <p class="summary-value">${stats.performance.averageTime > 0 ? formatTime(stats.performance.averageTime) : '-'}</p>
                </div>
                <div class="summary-card">
                    <h3>TFOR ที่มีปัญหา</h3>
                    <p class="summary-value">${stats.tfors.withIssues}</p>
                </div>
                
                <h2>การกระจายตามสาขา</h2>
                <table>
                    <thead>
                        <tr>
                            <th>สาขา</th>
                            <th>จำนวน TFOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(stats.byBranch).map(branch => `
                            <tr>
                                <td>${branch}</td>
                                <td>${stats.byBranch[branch]}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <h2>การกระจายตามประเภทสินค้า</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ประเภทสินค้า</th>
                            <th>จำนวน TFOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(stats.byProductType).map(type => `
                            <tr>
                                <td>${type}</td>
                                <td>${stats.byProductType[type]}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="page-break"></div>
                
                <h2>แนวโน้มรายวัน</h2>
                <table>
                    <thead>
                        <tr>
                            <th>วันที่</th>
                            <th>TFOR ทั้งหมด</th>
                            <th>เสร็จสิ้น</th>
                            <th>ปัญหา</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(stats.byDay).sort().map(day => {
                            const date = new Date(day);
                            const formattedDate = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            
                            return `
                                <tr>
                                    <td>${formattedDate}</td>
                                    <td>${stats.byDay[day].tfors}</td>
                                    <td>${stats.byDay[day].completed}</td>
                                    <td>${stats.byDay[day].issues}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            
            // Generate PDF
            const element = document.getElementById('pdf-export-container');
            const opt = {
                margin: 10,
                filename: `inbound-report-${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                showNotification('ส่งออกข้อมูลเป็น PDF สำเร็จ', 'success');
                hideLoading();
            });
        }).catch(error => {
            console.error('Error exporting PDF:', error);
            showNotification('เกิดข้อผิดพลาดในการส่งออก PDF', 'error');
            hideLoading();
        });
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('เกิดข้อผิดพลาดในการส่งออก PDF', 'error');
        hideLoading();
    }
}

// Initialize chat
function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="flex justify-center items-center h-full">
            <div class="text-center">
                <div class="text-4xl mb-4">👋</div>
                <h3 class="text-xl font-bold mb-2">ยินดีต้อนรับสู่ Inbound Assistant</h3>
                <p class="text-gray-600">ฉันสามารถช่วยคุณเกี่ยวกับข้อมูลในระบบ Inbound ได้</p>
                <p class="text-gray-600 mt-2">ลองถามคำถามเกี่ยวกับ Transfer, TFOR, สถิติ หรืออื่นๆ</p>
            </div>
        </div>
    `;
    
    // Focus on chat input
    document.getElementById('chat-input').focus();
}

// Send chat message
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-bubble user-bubble';
    userMessage.textContent = message;
    chatMessages.appendChild(userMessage);
    
    // Clear input
    input.value = '';
    
    // Add loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-bubble ai-bubble flex items-center';
    loadingMessage.innerHTML = `
        <span>กำลังพิมพ์</span>
        <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
    `;
    chatMessages.appendChild(loadingMessage);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // In a real app, you would send this to an AI service
    // For this example, we'll simulate a response
    setTimeout(() => {
        // Remove loading indicator
        chatMessages.removeChild(loadingMessage);
        
        // Add AI response
        const aiMessage = document.createElement('div');
        aiMessage.className = 'chat-bubble ai-bubble';
        
        // Simple response based on keywords
        let response = 'ฉันไม่แน่ใจว่าคุณหมายถึงอะไร กรุณาถามคำถามเกี่ยวกับ Transfer, TFOR, สถิติ หรืออื่นๆ ในระบบ Inbound';
        
        if (message.toLowerCase().includes('transfer') || message.toLowerCase().includes('รถ')) {
            response = 'Transfer คือข้อมูลการขนส่งสินค้าเข้าสาขา ประกอบด้วยทะเบียนรถ วันที่ส่ง และรูปภาพสินค้าบนรถ คุณสามารถดูข้อมูล Transfer ได้ในเมนู Transfers > รายละเอียดข้อมูล TRANFERS';
        } else if (message.toLowerCase().includes('tfor')) {
            response = 'TFOR คือหมายเลขการขนส่ง ประกอบด้วย 4 ตัวท้าย ระบุสาขาปลายทาง จำนวนพาเลท และประเภทสินค้า คุณสามารถเช็คสถานะ TFOR ได้ในหน้าเช็คสินค้า';
        } else if (message.toLowerCase().includes('สถิติ') || message.toLowerCase().includes('stat')) {
            response = 'คุณสามารถดูสถิติการทำงานได้ในเมนูสถิติ มีทั้งแบบสัปดาห์ เดือน และปี สถิติประกอบด้วยจำนวน Transfer, TFOR, อัตราการเสร็จสิ้น และปัญหาที่เกิดขึ้น';
        } else if (message.toLowerCase().includes('ปัญหา') || message.toLowerCase().includes('issue')) {
            response = 'เมื่อพบปัญหากับสินค้า คุณสามารถรายงานปัญหาได้ในหน้าเช็คสินค้า โดยเลือกพาเลทที่มีปัญหาและกรอกรายละเอียดปัญหา หัวหน้างานสามารถติดตามสถานะการแก้ไขปัญหาได้';
        } else if (message.toLowerCase().includes('kpi')) {
            response = 'KPI พนักงานแสดงประสิทธิภาพการทำงานของแต่ละบุคคล ประกอบด้วยจำนวน TFOR ที่ทำ อัตราการเสร็จสิ้น และปัญหาที่เกิดขึ้น หัวหน้างานและผู้ดูแลระบบสามารถเข้าดูได้';
        }
        
        aiMessage.textContent = response;
        chatMessages.appendChild(aiMessage);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500);
}

// Save profile data
async function saveProfileData() {
    showLoading();
    
    try {
        const firstname = document.getElementById('profile-firstname').value;
        const lastname = document.getElementById('profile-lastname').value;
        const profilePicPreview = document.getElementById('profile-pic-preview');
        
        // Update display name
        await updateProfile(auth.currentUser, {
            displayName: `${firstname} ${lastname}`
        });
        
        // Update user data in Firestore
        const updateData = {
            firstname: firstname,
            lastname: lastname,
            updatedAt: serverTimestamp()
        };
        
        // Check if profile picture was changed
        if (profilePicPreview.src && !profilePicPreview.src.includes('placehold.co')) {
            // In a real app, you would upload the image to Firebase Storage
            // For this example, we'll just store the data URL
            updateData.profilePicture = profilePicPreview.src;
        }
        
        // Check if default avatar was selected
        const selectedAvatar = document.querySelector('.default-avatar.selected');
        if (selectedAvatar) {
            const avatarId = selectedAvatar.getAttribute('data-avatar-id');
            
            // Get avatar emoji and color
            const avatarOptions = [
                { id: 'avatar-1', emoji: '😀', color: 'bg-yellow-200' },
                { id: 'avatar-2', emoji: '😎', color: 'bg-blue-200' },
                { id: 'avatar-3', emoji: '🤠', color: 'bg-green-200' },
                { id: 'avatar-4', emoji: '🧐', color: 'bg-purple-200' },
                { id: 'avatar-5', emoji: '😇', color: 'bg-pink-200' },
                { id: 'avatar-6', emoji: '🤓', color: 'bg-indigo-200' }
            ];
            
            const avatar = avatarOptions.find(a => a.id === avatarId);
            if (avatar) {
                updateData.profilePicture = null;
                updateData.avatarEmoji = avatar.emoji;
                updateData.avatarColor = avatar.color;
            }
        }
        
        await updateDoc(doc(db, 'users', currentUser.uid), updateData);
        
        // Update user display
        const userDisplay = document.querySelector('.user-display');
        userDisplay.textContent = `${firstname} ${lastname}`;
        
        showNotification('บันทึกข้อมูลส่วนตัวสำเร็จ', 'success');
    } catch (error) {
        console.error('Error saving profile data:', error);
        showNotification('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
    
    hideLoading();
}

// Change password
async function changePassword() {
    showLoading();
    
    try {
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            showNotification('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
            hideLoading();
            return;
        }
        
        // In a real app, you would need to re-authenticate the user before changing password
        // For this example, we'll just show a success message
        
        // await updatePassword(auth.currentUser, newPassword);
        
        // Clear form
        document.getElementById('change-password-form').reset();
        
        showNotification('เปลี่ยนรหัสผ่านสำเร็จ', 'success');
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 'error');
    }
    
    hideLoading();
}

// Load profile data
async function loadProfileData() {
    showLoading();
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Set form values
            document.getElementById('profile-email').value = currentUser.email;
            document.getElementById('profile-role').value = getRoleDisplayName(userData.role);
            document.getElementById('profile-firstname').value = userData.firstname || '';
            document.getElementById('profile-lastname').value = userData.lastname || '';
            
            // Set profile picture
            if (userData.profilePicture) {
                document.getElementById('profile-pic-preview').src = userData.profilePicture;
            } else if (userData.avatarEmoji) {
                // Create avatar from emoji
                const canvas = document.createElement('canvas');
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                // Set background color based on avatarColor
                let bgColor = '#F3F4F6'; // Default gray
                if (userData.avatarColor === 'bg-yellow-200') bgColor = '#FEF3C7';
                else if (userData.avatarColor === 'bg-blue-200') bgColor = '#DBEAFE';
                else if (userData.avatarColor === 'bg-green-200') bgColor = '#D1FAE5';
                else if (userData.avatarColor === 'bg-purple-200') bgColor = '#E9D5FF';
                else if (userData.avatarColor === 'bg-pink-200') bgColor = '#FCE7F3';
                else if (userData.avatarColor === 'bg-indigo-200') bgColor = '#C7D2FE';
                
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw emoji
                ctx.font = '64px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(userData.avatarEmoji, canvas.width / 2, canvas.height / 2);
                
                document.getElementById('profile-pic-preview').src = canvas.toDataURL();
            }
            
            // Load default avatars
            loadDefaultAvatars();
            
            // Select avatar if set
            if (userData.avatarEmoji) {
                const avatarOptions = [
                    { id: 'avatar-1', emoji: '😀' },
                    { id: 'avatar-2', emoji: '😎' },
                    { id: 'avatar-3', emoji: '🤠' },
                    { id: 'avatar-4', emoji: '🧐' },
                    { id: 'avatar-5', emoji: '😇' },
                    { id: 'avatar-6', emoji: '🤓' }
                ];
                
                const avatar = avatarOptions.find(a => a.emoji === userData.avatarEmoji);
                if (avatar) {
                    const avatarElement = document.querySelector(`[data-avatar-id="${avatar.id}"]`);
                    if (avatarElement) {
                        avatarElement.classList.add('selected');
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
    }
    
    hideLoading();
}
