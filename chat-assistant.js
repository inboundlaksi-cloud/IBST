// Import necessary modules
import { showNotification } from './ui-manager.js';

// Initialize chat
export function initializeChat() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `
        <div class="flex justify-center items-center h-full">
            <div class="text-center">
                <div class="text-4xl mb-4">👋</div>
                <h3 class="text-xl font-bold mb-2">ยินดีต้อนรับสู่ Inbound Assistant</h3>
                <p class="text-gray-600">ฉันสามารถช่วยคุณเกี่ยวกับข้อมูลในระบบ Inbound ได้</p>
                <p class="text-gray-600 mt-2">ลองถามคำถามเกี่ยวกับ Transfer, TFOR, สถิติ หรืออื่นๆ</p>
            </div>
        </div>
    `;
    
    // Focus on chat input
    document.getElementById('chat-input').focus();
}

// Send chat message
export async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Add user message
    const userMessage = document.createElement('div');
    userMessage.className = 'chat-bubble user-bubble';
    userMessage.textContent = message;
    chatMessages.appendChild(userMessage);
    
    // Clear input
    input.value = '';
    
    // Add loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-bubble ai-bubble flex items-center';
    loadingMessage.innerHTML = `
        <span>กำลังพิมพ์</span>
        <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
    `;
    chatMessages.appendChild(loadingMessage);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // In a real app, you would send this to an AI service
    // For this example, we'll simulate a response
    setTimeout(() => {
        // Remove loading indicator
        chatMessages.removeChild(loadingMessage);
        
        // Add AI response
        const aiMessage = document.createElement('div');
        aiMessage.className = 'chat-bubble ai-bubble';
        
        // Simple response based on keywords
        let response = 'ฉันไม่แน่ใจว่าคุณหมายถึงอะไร กรุณาถามคำถามเกี่ยวกับ Transfer, TFOR, สถิติ หรืออื่นๆ ในระบบ Inbound';
        
        if (message.toLowerCase().includes('transfer') || message.toLowerCase().includes('รถ')) {
            response = 'Transfer คือข้อมูลการขนส่งสินค้าเข้าสาขา ประกอบด้วยทะเบียนรถ วันที่ส่ง และรูปภาพสินค้าบนรถ คุณสามารถดูข้อมูล Transfer ได้ในเมนู Transfers > รายละเอียดข้อมูล TRANFERS';
        } else if (message.toLowerCase().includes('tfor')) {
            response = 'TFOR คือหมายเลขการขนส่ง ประกอบด้วย 4 ตัวท้าย ระบุสาขาปลายทาง จำนวนพาเลท และประเภทสินค้า คุณสามารถเช็คสถานะ TFOR ได้ในหน้าเช็คสินค้า';
        } else if (message.toLowerCase().includes('สถิติ') || message.toLowerCase().includes('stat')) {
            response = 'คุณสามารถดูสถิติการทำงานได้ในเมนูสถิติ มีทั้งแบบสัปดาห์ เดือน และปี สถิติประกอบด้วยจำนวน Transfer, TFOR, อัตราการเสร็จสิ้น และปัญหาที่เกิดขึ้น';
        } else if (message.toLowerCase().includes('ปัญหา') || message.toLowerCase().includes('issue')) {
            response = 'เมื่อพบปัญหากับสินค้า คุณสามารถรายงานปัญหาได้ในหน้าเช็คสินค้า โดยเลือกพาเลทที่มีปัญหาและกรอกรายละเอียดปัญหา หัวหน้างานสามารถติดตามสถานะการแก้ไขปัญหาได้';
        } else if (message.toLowerCase().includes('kpi')) {
            response = 'KPI พนักงานแสดงประสิทธิภาพการทำงานของแต่ละบุคคล ประกอบด้วยจำนวน TFOR ที่ทำ อัตราการเสร็จสิ้น และปัญหาที่เกิดขึ้น หัวหน้างานและผู้ดูแลระบบสามารถเข้าดูได้';
        }
        
        aiMessage.textContent = response;
        chatMessages.appendChild(aiMessage);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500);
}
