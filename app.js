let activeUser = null;
let activeUserId = null;
let homeworkList = [];

// โหลดข้อมูลเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
    loadHomeworkData();
    checkSession();
});

// ตรวจสอบเซสชันว่าเข้าสู่ระบบค้างไว้หรือไม่
function checkSession() {
    const savedUserId = localStorage.getItem("current_user_id");
    if (savedUserId && STUDENT_DATABASE[savedUserId]) {
        loginUser(savedUserId);
    }
}

// ฟังก์ชัน Login
function handleLogin() {
    const idInput = document.getElementById("student-id").value.trim();
    if (STUDENT_DATABASE[idInput]) {
        localStorage.setItem("current_user_id", idInput);
        loginUser(idInput);
        document.getElementById("student-id").value = "";
    } else {
        alert("❌ ไม่พบรหัสนักเรียนนี้ในระบบห้อง 7 กรุณาลองใหม่");
    }
}

// ตั้งค่าสถานะการล็อกอิน
function loginUser(id) {
    activeUserId = id;
    activeUser = STUDENT_DATABASE[id];
    
    document.getElementById("login-page").classList.add("hidden");
    document.getElementById("dashboard-page").classList.remove("hidden");
    
    // แสดงชื่อและตำแหน่งในหน้าเว็บ
    document.getElementById("user-display-name").innerText = `${activeUser.title}${activeUser.fname} ${activeUser.lname} เลขที่ ${activeUser.no}`;
    
    let roleText = "นักเรียนทั่วไป";
    if (activeUser.role === 'admin') roleText = "ผู้ดูแลระบบ (Admin)";
    if (activeUser.role === 'head') roleText = "หัวหน้าห้อง";
    document.getElementById("user-display-role").innerText = roleText;

    // ตรวจสอบสิทธิ์เพื่อเปิดแผงจัดการการบ้าน (เปิดเฉพาะ admin และ head)
    const mgtSection = document.getElementById("management-section");
    if (activeUser.role === "admin" || activeUser.role === "head") {
        mgtSection.classList.remove("hidden");
    } else {
        mgtSection.classList.add("hidden");
    }

    renderHomeworkTable();
}

// ฟังก์ชัน Logout
function handleLogout() {
    localStorage.removeItem("current_user_id");
    activeUser = null;
    activeUserId = null;
    document.getElementById("dashboard-page").classList.add("hidden");
    document.getElementById("login-page").classList.remove("hidden");
}

// ดึงข้อมูลการบ้าน
function loadHomeworkData() {
    const savedHomework = localStorage.getItem("m4_7_homework_data");
    homeworkList = savedHomework ? JSON.parse(savedHomework) : [];
}

// บันทึกข้อมูลการบ้าน
function saveHomeworkData() {
    localStorage.setItem("m4_7_homework_data", JSON.stringify(homeworkList));
    renderHomeworkTable();
}

// หัวหน้า/แอดมินสร้างการบ้านใหม่
function createNewHomework() {
    const subject = document.getElementById("hw-subject").value.trim();
    const detail = document.getElementById("hw-detail").value.trim();
    const deadline = document.getElementById("hw-deadline").value;

    if (!subject || !detail || !deadline) {
        alert("⚠️ กรุณากรอกข้อมูลการบ้านให้ครบทุกช่อง");
        return;
    }

    const newJob = {
        id: "hw_" + Date.now(),
        subject: subject,
        detail: detail,
        deadline: deadline,
        created_by: activeUser.fname,
        status_map: {} // เก็บสถานะการส่งรายคน เช่น {"690778": "done"}
    };

    homeworkList.push(newJob);
    saveHomeworkData();

    // ล้างค่าข้อมูลในฟอร์ม
    document.getElementById("hw-subject").value = "";
    document.getElementById("hw-detail").value = "";
    document.getElementById("hw-deadline").value = "";
}

// ลบการบ้าน (เฉพาะ แอดมิน หรือ หัวหน้าห้อง)
function deleteHomework(hwId) {
    if (activeUser.role === "admin" || activeUser.role === "head") {
        if(confirm("คุณแน่ใจหรือไม่ที่จะลบรายการงานนี้?")) {
            homeworkList = homeworkList.filter(item => item.id !== hwId);
            saveHomeworkData();
        }
    } else {
        alert("⛔ คุณไม่มีสิทธิ์ลบรายการนี้");
    }
}

// สลับสถานะการส่งการบ้านสำหรับนักเรียนแต่ละคน
function toggleMyStatus(hwId) {
    const job = homeworkList.find(item => item.id === hwId);
    if (job) {
        if (!job.status_map) job.status_map = {};
        
        // สลับระหว่าง ยังไม่ส่ง กับ ส่งแล้ว
        if (job.status_map[activeUserId] === "done") {
            job.status_map[activeUserId] = "pending";
        } else {
            job.status_map[activeUserId] = "done";
        }
        saveHomeworkData();
    }
}

// เรนเดอร์ตารางออกมาแสดงผล
function renderHomeworkTable() {
    const tbody = document.getElementById("homework-table-body");
    const noDataAlert = document.getElementById("no-data-alert");
    tbody.innerHTML = "";

    if (homeworkList.length === 0) {
        noDataAlert.classList.remove("hidden");
        return;
    } else {
        noDataAlert.classList.add("hidden");
    }

    // เรียงลำดับตามวันกำหนดส่งที่ใกล้ที่สุดก่อน
    homeworkList.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    homeworkList.forEach(item => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50/80 transition-all";

        // ตรวจสอบสถานะส่วนตัวของผู้ใช้ปัจจุบัน
        const isDone = item.status_map && item.status_map[activeUserId] === "done";
        
        // รูปแบบสถานะปุ่มและ Badge
        const statusBadge = isDone 
            ? `<span class="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">✔ ส่งแล้ว</span>`
            : `<span class="bg-amber-50 text-amber-600 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-100">⏳ ยังไม่ส่ง</span>`;

        const actionBtnText = isDone ? "ทำเครื่องหมายเป็นยังไม่ส่ง" : "กดส่งงาน";
        const actionBtnClass = isDone 
            ? "text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
            : "text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-all shadow-sm";

        // คอลัมน์ปุ่มลบ (แสดงเฉพาะผู้มีสิทธิ์)
        let deleteBtnHtml = "";
        if (activeUser && (activeUser.role === "admin" || activeUser.role === "head")) {
            deleteBtnHtml = `<button onclick="deleteHomework('${item.id}')" class="text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-all ml-2">ลบ</button>`;
        }

        // แปลงฟอร์แมตวันที่ให้สวยงาม
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = new Date(item.deadline).toLocaleDateString('th-TH', dateOptions);

        tr.innerHTML = `
            <td class="py-4 px-6 font-semibold text-slate-900">${item.subject}</td>
            <td class="py-4 px-6 text-slate-600">${item.detail}</td>
            <td class="py-4 px-6 font-medium text-slate-500">${formattedDate}</td>
            <td class="py-4 px-6 text-center">${statusBadge}</td>
            <td class="py-4 px-6 text-right whitespace-nowrap">
                <button onclick="toggleMyStatus('${item.id}')" class="${actionBtnClass}">${actionBtnText}</button>
                ${deleteBtnHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });
}