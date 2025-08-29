// Import necessary modules
import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification } from './ui-manager.js';

// Month names in Thai
const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Render calendar
export function renderCalendar() {
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
// Render calendar for specific month
export function renderCalendarMonth(year, month) {
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
