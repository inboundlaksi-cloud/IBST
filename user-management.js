// Import necessary modules
import { db } from './firebase-config.js';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { auth } from './firebase-config.js';
import { showNotification, showLoading, hideLoading, showConfirmation } from './ui-manager.js';

// Load user data
export async function loadUserData() {
    const currentUser = auth.currentUser;
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
export async function loadRecentActivity() {
    const container = document.getElementById('recent-activity-container');
    container.innerHTML = '<p class="text-gray-500 text-center">กำลังโหลด...</p>';
    
    try {
        const currentUser = auth.currentUser;
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
        const currentUser = auth.currentUser;
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

// Get user role
export async function getUserRole(uid) {
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
export function getRoleDisplayName(role) {
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
export function updateRoleBasedVisibility(role) {
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

// Save profile data
export async function saveProfileData() {
    showLoading();
    
    try {
        const currentUser = auth.currentUser;
        const firstname = document.getElementById('profile-firstname').value;
        const lastname = document.getElementById('profile-lastname').value;
        const profilePicPreview = document.getElementById('profile-pic-preview');
        
        // Update display name
        await updateProfile(currentUser, {
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

// Load profile data
export async function loadProfileData() {
    showLoading();
    
    try {
        const currentUser = auth.currentUser;
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



