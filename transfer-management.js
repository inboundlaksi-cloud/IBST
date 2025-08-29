import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification, showLoading, hideLoading, showConfirmation } from './ui-manager.js';
import { auth } from './firebase-config.js';

// Global variables
let transfersData = [];
let tforsData = [];
let issuesData = [];
let commentsData = [];

// Add TFOR field
export function addTforField() {
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
export function handleFiles(files) {
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
export async function saveInboundForm() {
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
            createdBy: auth.currentUser.uid,
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
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp()
            });
        }
        
        // Log activity
        await addDoc(collection(db, 'activity'), {
            userId: auth.currentUser.uid,
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
export async function showDetailsView() {
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
export function filterDetailsTable() {
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
export function sortDetailsTable() {
    const sortBy = document.getElementById('details-sort').value;
    
    // In a real app, you would sort the data and re-render the table
    // For this example, we'll just show a notification
    showNotification(`เรียงลำดับตาม: ${sortBy}`, 'success');
}

// Show check view
export async function showCheckView(tforId) {
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

// Toggle pallet check
export async function togglePalletCheck(tforId, palletNumber, button, type) {
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
                userId: auth.currentUser.uid,
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
                    userId: auth.currentUser.uid,
                    description: `เสร็จสิ้นการเช็ค TFOR ${tfor.tforNumber}`,
                    timestamp: serverTimestamp()
                });
                
                // Update summary data
                loadSummaryData();
            }
            
            // Log activity
            const action = receivedPallets.includes(palletNumber) ? 'รับ' : 'ยกเลิกการรับ';
            await addDoc(collection(db, 'activity'), {
                userId: auth.currentUser.uid,
                description: `${action}พาเลท ${palletNumber} ของ TFOR ${tfor.tforNumber}`,
                timestamp: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error toggling pallet check:', error);
        showNotification('เกิดข้อผิดพลาด', 'error');
    }
}
