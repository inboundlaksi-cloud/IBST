// scripts.js
// Firebase Core and Auth
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// Firestore Database
import { getFirestore, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, collection, onSnapshot, serverTimestamp, query, where, getDocs, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJRXZqHsSKT6ea1bVM9ctycAlg0cqeT50",
  authDomain: "inbound-system-prod.firebaseapp.com",
  projectId: "inbound-system-prod",
  storageBucket: "inbound-system-prod.firebasestorage.app",
  messagingSenderId: "1080446836155",
  appId: "1:1080446836155:web:da8d3f12f76d83b408389e"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Your Gemini API Key
const geminiApiKey = "AIzaSyAVxhKKuLVWKQzAh9XTNITsQ4LF3_TlNzg";

async function callGeminiAPI(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`;
    const payload = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }
        const result = await response.json();
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error("Unexpected API response structure:", result);
            return "ขออภัยค่ะ ไม่สามารถประมวลผลคำตอบได้ในขณะนี้";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loadingContainer = document.getElementById('loading-container');
    if (loadingContainer) loadingContainer.style.display = 'none';

    const views = {
        loginRegister: document.getElementById('login-register-view'),
        mainMenu: document.getElementById('main-menu-view'),
        transfers: document.getElementById('transfers-view'),
        aiChat: document.getElementById('ai-chat-view'),
        calendar: document.getElementById('calendar-view'),
        statistics: document.getElementById('statistics-view'),
        todaysPlan: document.getElementById('todays-plan-view'),
        kpi: document.getElementById('kpi-view'),
        profile: document.getElementById('profile-view'),
        checkProduct: document.getElementById('check-product-view')
    };
    
    // ... (rest of element selections are the same)
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const logoutButtonMain = document.getElementById('logout-button-main');
    const inboundForm = document.getElementById('inbound-form');
    const saveButton = document.getElementById('save-button');
    const transfersMenuView = document.getElementById('transfers-menu-view');
    const formView = document.getElementById('form-view');
    const detailsView = document.getElementById('details-view');
    const issuesView = document.getElementById('issues-view');
    const completedView = document.getElementById('completed-view');
    const checkView = document.getElementById('check-view');
    const checkProductView = document.getElementById('check-product-view');
    const backToPreviousViewButton = document.getElementById('back-to-previous-view-button');
    const detailsModal = document.getElementById('details-modal');
    const detailsModalContent = document.getElementById('details-modal-content');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmationMessage = document.getElementById('confirmation-message');
    const profileForm = document.getElementById('profile-form');
    const changePasswordForm = document.getElementById('change-password-form');
    const scoreModal = document.getElementById('score-modal');
    const starPointsModal = document.getElementById('star-points-modal');
    const scoreForm = document.getElementById('score-form');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const defaultAvatarContainer = document.getElementById('default-avatar-container');
    const backupModal = document.getElementById('backup-modal');
    const notificationBell = document.getElementById('notification-bell');
    const notificationPanel = document.getElementById('notification-panel');
    const notificationList = document.getElementById('notification-list');
    const notificationCount = document.getElementById('notification-count');

    let currentChartInstances = {};
    let currentUser = null;
    let currentUserProfile = null;
    let allUsers = [];
    let allScores = [];
    let allStarPoints = [];
    let unsubscribeUsers = null;
    let unsubscribeTransfers = null;
    let unsubscribeIssues = null;
    let unsubscribeScores = null;
    let unsubscribeStarPoints = null;
    let allTransfersData = [];
    let completedTransfersData = [];
    let issuesData = {};
    let currentTforData = null;
    let previousView = null;
    let confirmCallback = null;
    let uploadedImagesBase64 = [];
    let newProfilePicBase64 = null;

    // --- NEW: Permission Management ---
    function getPermissionsFromRole(role) {
        const basePermissions = {
            canCreate: true, canCheck: true, canReceive: true, canReportIssue: true, canComment: true,
            canPlanWork: false, canViewKpi: false, canGiveScores: false, canManageUsers: false,
            canDelete: false, canManageSystem: false
        };
        switch (role) {
            case 'Admin':
                return { ...basePermissions, canPlanWork: true, canViewKpi: true, canGiveScores: true, canManageUsers: true, canDelete: true, canManageSystem: true };
            case 'Supervisor':
                return { ...basePermissions, canPlanWork: true, canViewKpi: true, canGiveScores: true, canDelete: true };
            case 'Senior':
                return { ...basePermissions, canPlanWork: true, canViewKpi: true };
            case 'Viewer':
                return { canCreate: false, canCheck: false, canReceive: false, canReportIssue: false, canComment: false };
            case 'Officer':
            default:
                return basePermissions;
        }
    }

    function checkPermission(permissionKey) {
        return currentUserProfile?.permissions?.[permissionKey] === true;
    }

    function updateUIForPermissions() {
        if (!currentUserProfile?.permissions) return;
        document.querySelectorAll('[data-permission]').forEach(el => {
            const requiredPermission = el.dataset.permission;
            if (checkPermission(requiredPermission)) {
                el.style.display = ''; // Use default display style
            } else {
                el.style.display = 'none';
            }
        });
    }

    function showNotification(message, isSuccess = true) {
        const toast = document.getElementById('notification-toast');
        const messageP = document.getElementById('notification-message');
        if (!toast || !messageP) return;
        messageP.textContent = message;
        toast.className = `fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-500 z-50 ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`;
        toast.classList.remove('translate-x-full');
        setTimeout(() => {
            toast.classList.add('translate-x-full');
        }, 3000);
    }
    
    function showMainView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        if (viewToShow) viewToShow.style.display = 'block';
        window.scrollTo(0, 0);
    }
    
    function showAuthForm(formToShow) {
        loginForm.classList.toggle('hidden', formToShow !== 'login');
        registerForm.classList.toggle('hidden', formToShow !== 'register');
        loginTab.classList.toggle('bg-fuchsia-600', formToShow === 'login');
        loginTab.classList.toggle('text-white', formToShow === 'login');
        registerTab.classList.toggle('bg-fuchsia-600', formToShow === 'register');
        registerTab.classList.toggle('text-white', formToShow === 'register');
    }
    
    loginTab.addEventListener('click', () => showAuthForm('login'));
    registerTab.addEventListener('click', () => showAuthForm('register'));
    
    function updateUserDisplays(profile) {
        const displayElements = document.querySelectorAll('.user-display');
        const roleDisplay = document.getElementById('user-role-display');
        if (profile) {
            const fullName = `${profile.firstName} ${profile.lastName}`;
            displayElements.forEach(el => {
                el.textContent = fullName;
                el.classList.remove('hidden');
            });
            if(roleDisplay) {
                roleDisplay.textContent = profile.role || 'Officer';
                roleDisplay.classList.remove('hidden');
            }
        } else {
            displayElements.forEach(el => el.classList.add('hidden'));
             if(roleDisplay) roleDisplay.classList.add('hidden');
        }
    }
    
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentUserProfile = userDoc.data();
            } else {
                currentUserProfile = {
                    email: user.email, firstName: "ผู้ใช้", lastName: "ใหม่", role: 'Officer',
                    smallStars: 0, bigStars: 0
                };
            }
            
            // --- Permission System Integration ---
            if (!currentUserProfile.permissions) {
                currentUserProfile.permissions = getPermissionsFromRole(currentUserProfile.role);
                await setDoc(userDocRef, { permissions: currentUserProfile.permissions }, { merge: true });
            }

            updateUserDisplays(currentUserProfile);
            updateUIForPermissions();
            setupFirestoreListeners();
            showMainView(views.mainMenu);
        } else {
            detachFirestoreListeners();
            currentUserProfile = null;
            showMainView(views.loginRegister);
            showAuthForm('login');
        }
    });
    
    function detachFirestoreListeners() {
        if (unsubscribeTransfers) unsubscribeTransfers();
        if (unsubscribeIssues) unsubscribeIssues();
        if (unsubscribeUsers) unsubscribeUsers();
        if (unsubscribeScores) unsubscribeScores();
        if (unsubscribeStarPoints) unsubscribeStarPoints();
    }
    
    function setupFirestoreListeners() {
        if (!currentUser) return;
        detachFirestoreListeners();
        const transfersQuery = query(collection(db, "transfers"));
        unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => {
            const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allTransfersData = allData.filter(d => !d.isCompleted);
            completedTransfersData = allData.filter(d => d.isCompleted);
            updateMainMenuSummary();
            updateNotifications();
            // ... (rest of the UI updates)
            if (views.transfers && views.transfers.style.display === 'block') {
                if (detailsView.style.display === 'block') renderDetailsTable();
                if (completedView.style.display === 'block') renderCompletedView();
                if (issuesView.style.display === 'block') renderIssuesView();
                if (checkView.style.display === 'block' && currentTforData) {
                    const updatedData = allData.find(t => t.id === currentTforData.id);
                    if(updatedData) {
                        currentTforData = updatedData;
                        renderCheckView();
                    }
                }
            }
            if (views.checkProduct && views.checkProduct.style.display === 'block') renderCheckProductView();
            if (views.statistics && views.statistics.style.display === 'block') renderAdvancedStatistics();
            if (views.todaysPlan && views.todaysPlan.style.display === 'block') renderTodaysPlanView();
            if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            if (views.profile && views.profile.style.display === 'block') renderRecentActivity();
        }, (error) => console.error("Transfers listener error:", error));
        
        const issuesQuery = query(collection(db, "issues"));
        unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
            const newIssuesData = {};
            snapshot.forEach(doc => {
                const issue = { id: doc.id, ...doc.data() };
                (issue.issueTypes || ['อื่นๆ']).forEach(type => {
                    if (!newIssuesData[type]) newIssuesData[type] = [];
                    newIssuesData[type].push(issue);
                });
            });
            issuesData = newIssuesData;
            updateMainMenuSummary();
            if (views.transfers && views.transfers.style.display === 'block' && issuesView.style.display === 'block') renderIssuesView();
            if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            if (views.profile && views.profile.style.display === 'block') renderRecentActivity();
        }, (error) => console.error("Issues listener error:", error));
        
        if (checkPermission('canViewKpi')) {
            const usersQuery = query(collection(db, "users"));
            unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
                allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (views.kpi && views.kpi.style.display === 'block') renderKpiView();
            });
            const scoresQuery = query(collection(db, "scores"));
            unsubscribeScores = onSnapshot(scoresQuery, (snapshot) => {
                allScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 if (views.kpi && views.kpi.style.display === 'block' && document.getElementById('kpi-details-container').style.display !== 'none') {
                    const activeUserId = document.getElementById('kpi-details-container').dataset.userId;
                    if (activeUserId) {
                        const activeUser = allUsers.find(u => u.id === activeUserId);
                        if (activeUser) renderKpiDetails(activeUser);
                    }
                }
                if (views.profile && views.profile.style.display === 'block') renderProfileView();
            });
            const starPointsQuery = query(collection(db, "starPoints"));
            unsubscribeStarPoints = onSnapshot(starPointsQuery, (snapshot) => {
                allStarPoints = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (views.profile && views.profile.style.display === 'block') renderProfileStarPoints();
            });
        }
    }
    
    // ... (Login, Register, Logout functions are the same)

    document.getElementById('go-to-transfers').addEventListener('click', () => showMainView(views.transfers));
    document.getElementById('go-to-check-product').addEventListener('click', () => {
        renderCheckProductView();
        showMainView(views.checkProduct);
    });
    document.getElementById('go-to-ai-chat').addEventListener('click', () => showMainView(views.aiChat));
    document.getElementById('go-to-calendar').addEventListener('click', () => {
        renderCalendar(new Date());
        showMainView(views.calendar);
    });
    document.getElementById('go-to-statistics').addEventListener('click', () => {
        renderAdvancedStatistics();
        showMainView(views.statistics);
    });
    document.getElementById('go-to-kpi').addEventListener('click', () => {
        renderKpiView();
        showMainView(views.kpi);
    });
    document.getElementById('profile-button').addEventListener('click', () => {
        renderProfileView();
        showMainView(views.profile);
    });
    
    document.querySelectorAll('.toggle-password').forEach(el => {
        el.addEventListener('click', (e) => {
            const input = e.target.closest('.password-container').querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            e.target.textContent = type === 'password' ? '👁️' : ' ';
        });
    });
    
    function updateMainMenuSummary() {
        // ... (this function remains the same)
    }
    
    // ... (showSubView, initializeForm, summary card event listeners are the same)

    // ... (resizeImage and handleFiles functions are the same)
    
    function addTforBlock() {
        // ... (This function is the same, including the Linked TFOR part from the previous request)
    }
    
    // ... (addTforBlockListeners function is the same)
    
    inboundForm.addEventListener('submit', async (e) => {
        // ... (This function is the same, including saving linkedTfors array)
    });
    
    // ... (handlePalletCheck, handlePalletReceive, handleReceiveAll, savePalletIssues, deleteTransfer, deleteIssue functions are the same)
    
    function renderDetailsTable(filter = '', sortBy = 'date-desc') {
        const container = document.getElementById('details-table-container');
        let filteredData = allTransfersData.filter(d => !d.scheduledDate && !d.isReceived);
        if (filter) {
            const lowerCaseFilter = filter.toLowerCase();
            filteredData = filteredData.filter(d => 
                (d.tforNumber || '').endsWith(filter) || 
                (d.licensePlate || '').toLowerCase().includes(lowerCaseFilter) ||
                (d.branch || '').toLowerCase().includes(lowerCaseFilter) ||
                (d.linkedTfors && d.linkedTfors.some(lt => lt.toLowerCase().includes(lowerCaseFilter)))
            );
        }
        if (sortBy === 'date-desc') filteredData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        else if (sortBy === 'date-asc') filteredData.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
        else if (sortBy === 'branch-asc') filteredData.sort((a, b) => (a.branch || '').localeCompare(b.branch || ''));
        
        container.innerHTML = filteredData.length === 0 ? `<p class="text-gray-500 text-center">ไม่พบข้อมูล</p>` : '';
        if(filteredData.length === 0) return;

        const table = document.createElement('table');
        table.className = 'min-w-full bg-white rounded-lg shadow';
        table.innerHTML = `
            <thead class="bg-gray-200"><tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TFOR หลัก/พ่วง</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สาขาต้นทาง</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ทะเบียนรถ</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">พาเลท</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" data-permission="canDelete">จัดการ</th>
            </tr></thead>
            <tbody class="bg-white divide-y divide-gray-200"></tbody>`;
        
        const tbody = table.querySelector('tbody');
        const now = new Date();
        filteredData.forEach(data => {
            // ... (statusText and statusColor logic is the same)
            
            const linkedTforsHtml = (data.linkedTfors && data.linkedTfors.length > 0)
                ? `<div class="flex flex-wrap gap-1 mt-1">${data.linkedTfors.map(lt => `<span class="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">${lt.slice(-4)}</span>`).join('')}</div>`
                : '';
            
            // Overdue logic
            const arrivalDate = parseThaiDate(data.deliveryDate);
            let isOverdue = false;
            if (arrivalDate) {
                const dueDate = calculateDueDate(arrivalDate);
                if (now > dueDate) {
                    isOverdue = true;
                }
            }
            const overdueIndicator = isOverdue ? '<span class="w-3 h-3 bg-red-500 rounded-full inline-block ml-2" title="เลยกำหนดเช็ค"></span>' : '';

            const row = tbody.insertRow();
            row.className = 'hover:bg-gray-50 cursor-pointer';
            row.innerHTML = `
                <td class="px-4 py-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">${statusText}</span> ${overdueIndicator}</td>
                <td class="px-4 py-4 text-sm">${formatDateAbbreviated(data.deliveryDate)}</td>
                <td class="px-4 py-4 text-sm font-semibold">...${data.tforNumber} ${linkedTforsHtml}</td>
                <td class="px-4 py-4 text-sm">${data.branch}</td>
                <td class="px-4 py-4 text-sm">${data.licensePlate}</td>
                <td class="px-4 py-4 text-sm">${data.palletCount}</td>
                <td class="px-4 py-4 text-sm" data-permission="canDelete"></td>`;
            
            row.addEventListener('click', () => {
                currentTforData = data;
                renderCheckView();
                showSubView(checkView);
            });
            
            const adminCell = row.querySelector('[data-permission="canDelete"]');
            const deleteButton = document.createElement('button');
            deleteButton.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>`;
            deleteButton.className = 'text-red-500 hover:text-red-700';
            deleteButton.onclick = (e) => { e.stopPropagation(); deleteTransfer(data.id); };
            adminCell.appendChild(deleteButton);
        });
        container.appendChild(table);
        updateUIForPermissions();
    }
    
    // ... (details-search and details-sort listeners are the same)
    
    // ... (plan-work-btn listener and showCalendarPicker functions are the same)

    function renderCheckView() {
        // ... (container selections are the same)
        
        // ... (arrivalDate and dueDateString logic is the same)
        
        // --- Performance Timer Display ---
        const timerContainer = document.getElementById('performance-timer-section');
        if (currentTforData.checkDurationMinutes) {
            timerContainer.innerHTML = `<div class="p-3 bg-green-100 text-green-800 rounded-lg text-center">
                <p class="font-semibold">ใช้เวลาเช็คทั้งหมด: ${currentTforData.checkDurationMinutes} นาที</p>
            </div>`;
        } else if (currentTforData.checkStartTime) {
            timerContainer.innerHTML = `<div class="p-3 bg-yellow-100 text-yellow-800 rounded-lg text-center">
                <p class="font-semibold">เริ่มเช็คเมื่อ: ${new Date(currentTforData.checkStartTime.toDate()).toLocaleString('th-TH')}</p>
            </div>`;
        } else {
            timerContainer.innerHTML = `<button id="start-check-btn" data-permission="canCheck" class="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">เริ่มเช็ค</button>`;
        }

        // --- Details Display ---
        const detailsContainer = document.getElementById('check-details-container');
        // ... (detailsContainer.innerHTML is the same, including the linked-tfor-display div)

        // --- Comment Section ---
        renderComments();

        // ... (Rest of the renderCheckView function is the same, rendering pallet buttons, etc.)

        // --- Event Listeners for new buttons ---
        document.getElementById('start-check-btn')?.addEventListener('click', async () => {
            try {
                const transferRef = doc(db, "transfers", currentTforData.id);
                await updateDoc(transferRef, { checkStartTime: serverTimestamp() });
                showNotification('เริ่มจับเวลาการเช็ค');
            } catch (error) {
                console.error("Error starting check timer:", error);
                showNotification("เกิดข้อผิดพลาด", false);
            }
        });

        document.getElementById('post-comment-btn')?.addEventListener('click', async () => {
            const commentInput = document.getElementById('new-comment-input');
            const commentText = commentInput.value.trim();
            if (commentText) {
                const newComment = {
                    text: commentText,
                    userName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    timestamp: new Date() // Using client-side date for immediate feedback
                };
                try {
                    const transferRef = doc(db, "transfers", currentTforData.id);
                    await updateDoc(transferRef, {
                        comments: arrayUnion(newComment)
                    });
                    commentInput.value = '';
                } catch (error) {
                    console.error("Error posting comment:", error);
                    showNotification("ไม่สามารถส่งข้อความได้", false);
                }
            }
        });

        updateUIForPermissions();
    }
    
    // --- NEW: Comment Rendering Function ---
    function renderComments() {
        const container = document.getElementById('comments-display');
        container.innerHTML = '';
        const comments = currentTforData.comments || [];
        if (comments.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500 text-center">ยังไม่มีความคิดเห็น</p>';
            return;
        }
        comments.sort((a,b) => getMillis(b.timestamp) - getMillis(a.timestamp));
        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'text-sm';
            commentDiv.innerHTML = `
                <p class="break-words">${comment.text}</p>
                <p class="text-xs text-gray-400 text-right mt-1">โดย ${comment.userName} - ${new Date(getMillis(comment.timestamp)).toLocaleString('th-TH')}</p>
            `;
            container.appendChild(commentDiv);
        });
    }

    // --- MODIFIED: handlePalletCheck for Timer ---
    async function handlePalletCheck(palletNum, buttonElement) {
        // ... (existing logic for toggling buttons and updating checkedPallets)
        
        const isNowCompleted = checkedPallets.length === currentTforData.palletNumbers.length;
        const updatePayload = {
            isCompleted: isNowCompleted,
            checkedPallets: checkedPallets,
            lastCheckedByUid: currentUser.uid,
            lastCheckedByName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`
        };

        if (isNowCompleted && currentTforData.checkStartTime) {
            updatePayload.checkEndTime = serverTimestamp();
            const startTimeMillis = currentTforData.checkStartTime.toMillis();
            const endTimeMillis = new Date().getTime(); // Use current time for immediate calculation
            updatePayload.checkDurationMinutes = Math.round((endTimeMillis - startTimeMillis) / 60000);
        }

        try {
            const transferDocRef = doc(db, "transfers", currentTforData.id);
            await updateDoc(transferDocRef, updatePayload);
            // ... (rest of the function including logging and notifications)
        } catch (error) {
            // ...
        }
    }
    
    // ... (renderCompletedView is the same)
    
    // --- MODIFIED: renderIssuesView for Status ---
    function renderIssuesView() {
        const container = document.getElementById('issues-container');
        container.innerHTML = '';
        
        const allIssues = Object.values(issuesData).flat().sort((a, b) => (a.status === 'Resolved' ? 1 : -1) || getMillis(b.createdAt) - getMillis(a.createdAt));
        
        if (allIssues.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center">ไม่พบรายการสินค้ามีปัญหา</p>`;
            return;
        }

        const issuesByType = {};
        allIssues.forEach(issue => {
            (issue.issueTypes || ['อื่นๆ']).forEach(type => {
                if (!issuesByType[type]) issuesByType[type] = [];
                issuesByType[type].push(issue);
            });
        });
        
        Object.keys(issuesByType).sort().forEach(category => {
            if (issuesByType[category]?.length > 0) {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'bg-white rounded-lg shadow-md';
                categoryDiv.innerHTML = `
                    <div class="issue-category-header p-4 flex justify-between items-center cursor-pointer">
                        <h3 class="font-semibold text-lg">${category} (${issuesByType[category].length})</h3>
                        <span class="text-gray-500">▼</span>
                    </div>
                    <div class="issue-list hidden p-4 border-t space-y-2"></div>
                `;
                const issueList = categoryDiv.querySelector('.issue-list');
                issuesByType[category].forEach(issue => {
                    const issueItem = document.createElement('div');
                    // ... (imageThumb, userDisplay, etc. logic is the same)
                    
                    const status = issue.status || 'Open';
                    let statusColorClass = 'bg-red-100 text-red-800';
                    if (status === 'In Progress') statusColorClass = 'bg-yellow-100 text-yellow-800';
                    else if (status === 'Resolved') statusColorClass = 'bg-green-100 text-green-800';

                    issueItem.className = `p-2 hover:bg-gray-100 rounded-md flex justify-between items-center ${status === 'Resolved' ? 'opacity-60' : ''}`;
                    issueItem.innerHTML = `
                        <div class="cursor-pointer flex-grow flex items-center">
                            </div>
                        <div class="flex items-center space-x-2">
                            <select class="issue-status-select text-xs rounded-md border-gray-300 p-1 ${statusColorClass}" data-issue-id="${issue.id}">
                                <option value="Open" ${status === 'Open' ? 'selected' : ''}>รอดำเนินการ</option>
                                <option value="In Progress" ${status === 'In Progress' ? 'selected' : ''}>กำลังแก้ไข</option>
                                <option value="Resolved" ${status === 'Resolved' ? 'selected' : ''}>แก้ไขแล้ว</option>
                            </select>
                            <button class="delete-issue-btn text-red-400 hover:text-red-600 flex-shrink-0" data-permission="canDelete" data-issue-id="${issue.id}">
                                 <svg class="w-4 h-4" ...></svg>
                            </button>
                        </div>`;
                    
                    const statusSelect = issueItem.querySelector('.issue-status-select');
                    if (!checkPermission('canPlanWork')) { // Simple check for now, can be more granular
                        statusSelect.disabled = true;
                    } else {
                        statusSelect.addEventListener('change', async (e) => {
                           // ... (updateDoc logic for status)
                        });
                    }

                    issueList.appendChild(issueItem);
                });
                // ... (rest of the function)
                container.appendChild(categoryDiv);
            }
        });
        updateUIForPermissions();
    }
    
    // ... (showDetailsModal is mostly the same)
    
    // ... (Chat functions are the same)

    // --- MODIFIED: showSchedulingModal to show linked TFORs ---
    function showSchedulingModal(dateString) {
        // ... (pendingToSchedule logic is the same)
        let modalHtml = `...`; // Header
        if (pendingToSchedule.length > 0) {
            pendingToSchedule.forEach(t => {
                const linkedTforsHtml = (t.linkedTfors && t.linkedTfors.length > 0)
                    ? `<span class="text-xs text-blue-600 ml-2">(พ่วง: ${t.linkedTfors.map(lt => lt.slice(-4)).join(', ')})</span>`
                    : '';
                modalHtml += `
                    <label class="flex items-center p-2 rounded-md hover:bg-gray-100">
                        <input type="checkbox" ... value="${t.id}">
                        <span class="ml-3">TFOR: ...${t.tforNumber} (${t.branch}) ${linkedTforsHtml}</span>
                        ...
                    </label>`;
            });
        }
        // ... (rest of modalHtml and event listeners)
        showDetailsModal(modalHtml, true);
    }
    
    // --- NEW: Notification Functions ---
    notificationBell.addEventListener('click', () => {
        notificationPanel.classList.toggle('hidden');
    });

    function updateNotifications() {
        const overdueItems = allTransfersData.filter(t => {
            const arrivalDate = parseThaiDate(t.deliveryDate);
            if (!arrivalDate) return false;
            const dueDate = calculateDueDate(arrivalDate);
            return new Date() > dueDate;
        });

        if (overdueItems.length > 0) {
            notificationCount.textContent = overdueItems.length;
            notificationCount.classList.remove('hidden');
        } else {
            notificationCount.classList.add('hidden');
        }

        if (overdueItems.length === 0) {
            notificationList.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center">ไม่มีการแจ้งเตือน</p>';
            return;
        }

        notificationList.innerHTML = overdueItems.map(item => `
            <div class="p-2 border-b hover:bg-gray-100 cursor-pointer notification-item" data-id="${item.id}">
                <p class="font-semibold text-sm text-red-600">TFOR เลยกำหนดเช็ค!</p>
                <p class="text-xs text-gray-700">TFOR ...${item.tforNumber} (${item.branch})</p>
                <p class="text-xs text-gray-500">วันที่มาถึง: ${item.deliveryDate}</p>
            </div>
        `).join('');

        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const transferId = e.currentTarget.dataset.id;
                const transferData = allTransfersData.find(t => t.id === transferId);
                if(transferData) {
                    currentTforData = transferData;
                    showMainView(views.transfers);
                    renderCheckView();
                    showSubView(checkView);
                    notificationPanel.classList.add('hidden');
                }
            });
        });
    }

    // ... (rest of the functions: calendar, stats, KPI, profile, etc. should be reviewed to replace role checks with permission checks where necessary)

});
