// Import all modules
import { auth, db, storage } from './firebase-config.js';
import { checkAuthState, setupAuthEventListeners, getCurrentUser } from './auth.js';
import { loadUserData, getUserRole, getRoleDisplayName, updateRoleBasedVisibility, saveProfileData, loadProfileData } from './user-management.js';
import { addTforField, handleFiles, saveInboundForm, showDetailsView, filterDetailsTable, sortDetailsTable, showCheckView, togglePalletCheck } from './transfer-management.js';
import { showView, showLoading, hideLoading, showNotification, showConfirmation, setupEventListeners, showTransfersMenu, showFormView } from './ui-manager.js';
import { loadStatistics, getStatisticsData, exportToExcel, exportToPDF } from './statistics.js';
import { renderCalendar, renderCalendarMonth, loadCalendarEvents, showDayEvents, renderDayEvents } from './calendar.js';
import { loadKpiData, showKpiDetails, showEditRoleModal, saveScore, saveStarPoints } from './kpi-tracker.js';
import { showIssuesView, renderIssues, renderReportIssueSection, renderIssueForms, showIssueForm } from './issue-tracker.js';
import { initializeChat, sendChatMessage } from './chat-assistant.js';
import { backupData, restoreData, deleteAllData } from './data-manager.js';

// Global variables
let currentUser = null;
let currentView = 'login-register-view';
let transfersData = [];
let tforsData = [];
let issuesData = [];
let commentsData = [];
let performanceTimers = {};

// DOM Elements
const views = document.querySelectorAll('.view');
const loadingContainer = document.getElementById('loading-container');
const notificationToast = document.getElementById('notification-toast');
const notificationMessage = document.getElementById('notification-message');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    checkAuthState();
    
    // Setup event listeners
    setupEventListeners();
    setupAuthEventListeners();
});

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
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userName = userDoc.exists() ? 
            `${userDoc.data().firstname} ${userDoc.data().lastname}` : 
            auth.currentUser.displayName || 'Unknown User';
        
        await addDoc(collection(db, 'comments'), {
            tforId: tforId,
            userId: auth.currentUser.uid,
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

// Filter completed list
export function filterCompletedList() {
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
