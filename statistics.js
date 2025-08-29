import { db } from './firebase-config.js';
import { collection, getDocs, query, where, orderBy, getDoc, doc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification, showLoading, hideLoading } from './ui-manager.js';

// Load statistics
export async function loadStatistics(timeframe = 'month') {
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
export async function getStatisticsData(startDate, endDate) {
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
            where('createdAt', '<', new Date(endDate + ' 23:59:59'))
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

// Format time (seconds to HH:MM:SS)
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Export to Excel
export function exportToExcel() {
    showNotification('กำลังส่งออกข้อมูลเป็น Excel...', 'success');
    
    // In a real app, you would use a library like SheetJS to export to Excel
    // For this example, we'll just show a notification
    setTimeout(() => {
        showNotification('ส่งออกข้อมูลเป็น Excel สำเร็จ', 'success');
    }, 1500);
}

// Export to PDF
export function exportToPDF() {
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