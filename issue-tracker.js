// Import necessary modules
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, getDoc, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification, showConfirmation } from './ui-manager.js';
import { auth } from './firebase-config.js';

// Global variables
let issuesData = [];

// Show issues view
export async function showIssuesView() {
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
                    userId: auth.currentUser.uid,
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
export function showIssueForm(tfor, palletNumber, existingIssues) {
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
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });
            
            showNotification('บันทึกรายงานปัญหาสำเร็จ', 'success');
            
            // Log activity
            await addDoc(collection(db, 'activity'), {
                userId: auth.currentUser.uid,
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
