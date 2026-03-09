const API_URL = "https://one-1-zlsw.onrender.com"; 

let user = localStorage.getItem("cb_user") || "Гость";
let role = localStorage.getItem("cb_role") || "user";
let activeOrder = null;
let chatTimer = null;

// Инициализация интерфейса
window.onload = () => {
    document.getElementById('n-disp').innerText = user;
    if (role === 'moderator') {
        document.getElementById('r-disp').innerText = 'MOD';
        document.getElementById('r-disp').className = 'rank-mod';
        document.getElementById('mod-list').classList.remove('hidden');
        refreshOrders();
    }
};

const openM = id => document.getElementById(id).style.display = 'flex';
const closeM = id => document.getElementById(id).style.display = 'none';

// Сохранение профиля
async function saveP() {
    const name = document.getElementById('in-name').value.trim() || "Аноним";
    const code = document.getElementById('in-code').value;
    try {
        const res = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, code})
        });
        const data = await res.json();
        user = data.name; 
        role = data.role;
        localStorage.setItem("cb_user", user);
        localStorage.setItem("cb_role", role);
        location.reload(); 
    } catch (e) { alert("Сервер Render не отвечает!"); }
}

// Отправка нового заказа
async function sendO() {
    if (user === "Гость") return alert("Сначала укажите имя в профиле!");
    const text = document.getElementById('o-text').value;
    if(!text.trim()) return alert("Опишите ваш проект!");
    
    await fetch(`${API_URL}/api/order`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: user, text})
    });
    alert("Заказ принят в обработку!"); 
    document.getElementById('o-text').value = '';
    closeM('oModal');
}

// Управление статусом (для модератора)
async function setStatus(id, s) {
    await fetch(`${API_URL}/api/order/status`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({order_id: id, status: s})
    });
    refreshOrders();
}

// Показ заказов пользователя
async function openMyOrders() {
    if (user === "Гость") return alert("Зайдите в настройки и укажите имя!");
    openM('myOrdersModal');
    const res = await fetch(`${API_URL}/api/orders`);
    const data = await res.json();
    const my = data.filter(o => o.customer === user);
    const box = document.getElementById('my-orders-box');
    
    box.innerHTML = my.length ? my.map(o => `
        <div class="order-card">
            <span class="status-badge status-${o.status}">${o.status}</span>
            <div style="font-weight:bold; margin-bottom:5px;">Заказ #${o.id}</div>
            <p style="margin: 5px 0 15px 0;">${o.text}</p>
            ${o.status === 'Принят' ? `<button class="btn" onclick="openChat(${o.id}); closeM('myOrdersModal')"><span class="material-icons">forum</span> ЧАТ</button>` : ''}
        </div>
    `).join('') : "<p>У вас пока нет заказов.</p>";
}

// Обновление всех заказов (для модератора)
async function refreshOrders() {
    const res = await fetch(`${API_URL}/api/orders`);
    const orders = await res.json();
    document.getElementById('orders-box').innerHTML = orders.map(o => {
        let controls = '';
        if (o.status === 'Ожидает') {
            controls = `
                <button class="btn" style="background:var(--accept); flex:1;" onclick="setStatus(${o.id},'Принят')"><span class="material-icons">done</span></button>
                <button class="btn" style="background:var(--reject); flex:1;" onclick="setStatus(${o.id},'Отклонен')"><span class="material-icons">close</span></button>
            `;
        } else if (o.status === 'Принят') {
            controls = `<button class="btn" style="width:100%;" onclick="openChat(${o.id})"><span class="material-icons">forum</span> ОТКРЫТЬ ЧАТ</button>`;
        }

        return `
        <div class="order-card">
            <span class="status-badge status-${o.status}">${o.status}</span>
            <div style="font-size:0.9rem;"><b>#${o.id}</b> от <b>${o.customer}</b></div>
            <p style="margin:10px 0;">${o.text}</p>
            <div style="display:flex; gap:10px;">${controls}</div>
        </div>`;
    }).join('');
}

function openOrderModal() {
    activeOrder = null;
    document.getElementById('chat-title').innerText = "Оформить заказ";
    document.getElementById('order-ui').classList.remove('hidden');
    document.getElementById('chat-ui').classList.add('hidden');
    openM('oModal');
}

async function openChat(id) {
    activeOrder = id;
    document.getElementById('chat-title').innerText = `Чат по заказу #${id}`;
    document.getElementById('order-ui').classList.add('hidden');
    document.getElementById('chat-ui').classList.remove('hidden');
    loadMsgs();
    if(chatTimer) clearInterval(chatTimer);
    chatTimer = setInterval(loadMsgs, 3000); // Опрос чата каждые 3 сек
    openM('oModal');
}

function closeChatModal() { 
    closeM('oModal'); 
    clearInterval(chatTimer); 
}

async function loadMsgs() {
    if(!activeOrder) return;
    try {
        const res = await fetch(`${API_URL}/api/chat/${activeOrder}`);
        const msgs = await res.json();
        const box = document.getElementById('chat-msgs');
        box.innerHTML = msgs.map(m => `
            <div class="${m.role==='moderator'?'msg-mod':'msg-user'}">
                <div style="font-size:0.7rem; opacity:0.7; font-weight:bold;">${m.sender}</div>
                <div>${m.text}</div>
            </div>
        `).join('');
        box.scrollTop = box.scrollHeight;
    } catch(e) {}
}

async function sendMsg() {
    const inp = document.getElementById('chat-input');
    if(!inp.value.trim()) return;
    await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({order_id: activeOrder, sender: user, text: inp.value, role})
    });
    inp.value = ""; 
    loadMsgs();
}
