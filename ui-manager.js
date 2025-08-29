// Import necessary modules
import { auth } from './firebase-config.js';
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Global variables
let currentView = 'login-register-view';
const views = document.querySelectorAll('.view');
const loadingContainer = document.getElementById('loading-container');
const notificationToast = document.getElementById('notification-toast');
const notificationMessage = document.getElementById('notification-message');

// Show view
export function showView(viewId) {
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
export function showLoading() {
    loadingContainer.classList.remove('hidden');
}

// Hide loading
export function hideLoading() {
    loadingContainer.classList.add('hidden');
}

// Show notification
export function showNotification(message, type = 'success') {
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
export function showConfirmation(title, message, onConfirm) {
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

// Setup all event listeners
export function setupEventListeners() {
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

// Transfers menu
export function showTransfersMenu() {
    document.getElementById('transfers-menu-view').classList.remove('hidden');
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('details-view').classList.add('hidden');
    document.getElementById('completed-view').classList.add('hidden');
    document.getElementById('issues-view').classList.add('hidden');
    document.getElementById('check-view').classList.add('hidden');
}

// Show form view
export function showFormView() {
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
