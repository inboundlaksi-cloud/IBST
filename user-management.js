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

// ฟังก์ชันอื่นๆ ตามเดิม...
