import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { showNotification, showLoading, hideLoading, showConfirmation } from './ui-manager.js';

// Backup data
export async function backupData() {
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
export async function restoreData() {
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
export async function deleteAllData() {
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