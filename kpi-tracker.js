// Import necessary modules
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, query, where, orderBy, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification, showLoading, hideLoading, showConfirmation } from './ui-manager.js';
import { getRoleDisplayName } from './user-management.js';

// Load KPI data
export async function loadKpiData() {
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
export function showKpiDetails(userStat) {
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
export function showEditRoleModal(userId, currentRole) {
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
export async function saveScore() {
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
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const giverName = userDoc.exists() ? 
            `${userDoc.data().firstname} ${userDoc.data().lastname}` : 
            auth.currentUser.displayName || 'Unknown User';
        
        // Save score
        await addDoc(collection(db, 'scores'), {
            userId: userId,
            giverId: auth.currentUser.uid,
            giverName: giverName,
            value: value,
            reason: reason,
            notes: notes,
            timestamp: serverTimestamp()
        });
        
        // Log activity
        await addDoc(collection(db, 'activity'), {
            userId: auth.currentUser.uid,
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
export async function saveStarPoints() {
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
            userId: auth.currentUser.uid,
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

// Format time (seconds to HH:MM:SS)
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

}
