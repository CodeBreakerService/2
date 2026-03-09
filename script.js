const API_URL = "https://one-1-zlsw.onrender.com"; 

let user = localStorage.getItem("cb_user") || "Пользователь";
let role = localStorage.getItem("cb_role") || "user";
let isPremium = localStorage.getItem("cb_premium") === "true"; 
let activeOrder = null;
let chatTimer = null;

window.onload = () => {
    updateUserDisplay();
    if (role === 'moderator') {
        document.getElementById('r-disp').innerText = 'MOD';
        document.getElementById('r-disp').className = 'rank-mod';
        document.getElementById('mod-list').classList.remove('hidden');
        refreshOrders();
    }
};

const openM = id => document.getElementById(id).style.display = 'flex';
const closeM = id => document.getElementById(id).style.display = 'none';

function updateUserDisplay() {
    let disp = user;
    if (isPremium) disp += ` <span class="material-icons premium-icon" title="PLUS">stars</span>`;
    document.getElementById('n-disp').innerHTML = disp;
}

function buyPremium() {
    if (isPremium) {
        alert("У вас уже активен тариф PLUS!");
        return;
    }
    // Здесь позже можно вставить ссылку на бота в Telegram для оплаты
    let confirmBuy = confirm("Для оформления тарифа PLUS (50 ₽/мес) необходимо связаться с администратором. \n\n(Демонстрация: Нажмите ОК, чтобы активировать тестовый PLUS)");
    if (confirmBuy) {
        isPremium = true;
        localStorage.setItem("cb_premium", "true");
        updateUserDisplay();
        alert("Тариф PLUS успешно активирован!");
        closeM('tariffModal');
    }
}

async function saveP() {
    const name = document.getElementById('in-name').value.trim() || "Пользователь";
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
    } catch (e) { alert("Сервер не отвечает!"); }
}

function openOrderModal() {
    activeOrder = null;
    document.getElementById('chat-title').innerText = "Оформить проект";
    document.getElementById('order-ui').classList.remove('hidden');
    document.getElementById('chat-ui').classList.add('hidden');
    openM('oModal');
}

async function sendO() {
    if (user === "Пользователь") return alert("Пожалуйста, укажите имя в настройках профиля!");
    const text = document.getElementById('o-text').value;
    const domain = document.getElementById('o-domain').value.trim();
    if(!text.trim()) return alert("Опишите техническое задание!");
    
    await fetch(`${API_URL}/api/order`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: user, text, is_premium: isPremium, domain})
    });
    alert("Проект отправлен в очередь!"); 
    document.getElementById('o-text').value = '';
    document.getElementById('o-domain').value = '';
    closeM('oModal');
}

async function setStatus(id, s) {
    let acceptedBy = (s === 'Принят') ? user : null;
    await fetch(`${API_URL}/api/order/status`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({order_id: id, status: s, accepted_by: acceptedBy})
    });
    refreshOrders();
}

async function openMyOrders() {
    openM('myOrdersModal');
    const res = await fetch(`${API_URL}/api/orders`);
    const data = await res.json();
    const my = data.filter(o => o.customer === user);
    const box = document.getElementById('my-orders-box');
    
    box.innerHTML = my.length ? my.map(o => {
        let domainStr = o.domain ? `<br><small>🔗 Домен: ${o.domain}</small>` : '';
        let modStr = o.accepted_by ? `<span class="mod-tag">Модератор: ${o.accepted_by}</span>` : '';
        let premiumClass = o.is_premium ? 'premium' : '';
        
        return `
        <div class="order-card ${premiumClass}">
            ${modStr}
            <span class="status-badge status-${o.status}">${o.status}</span>
            <div style="font-weight:bold; margin-bottom:5px;">Заказ #${o.id} ${o.is_premium ? '⚡' : ''}</div>
            <p style="margin: 5px 0 10px 0;">${o.text}${domainStr}</p>
            ${o.status === 'Принят' ? `<button class="btn" onclick="openChat(${o.id}); closeM('myOrdersModal')"><span class="material-icons">forum</span> ЧАТ С ТП</button>` : ''}
        </div>
    `}).join('') : "<p>У вас пока нет проектов.</p>";
}

async function refreshOrders() {
    const res = await fetch(`${API_URL}/api/orders`);
    const orders = await res.json();
    document.getElementById('orders-box').innerHTML = orders.map(o => {
        let controls = '';
        let domainStr = o.domain ? `<br><small>🔗 Домен: <b>${o.domain}</b></small>` : '';
        let premiumClass = o.is_premium ? 'premium' : '';
        
        if (o.status === 'Ожидает') {
            controls = `
                <button class="btn" style="background:var(--accept); flex:1;" onclick="setStatus(${o.id},'Принят')"><span class="material-icons">done</span></button>
                <button class="btn" style="background:var(--reject); flex:1;" onclick="setStatus(${o.id},'Отклонен')"><span class="material-icons">close</span></button>
            `;
        } else if (o.status === 'Принят') {
            controls = `<button class="btn" style="width:100%;" onclick="openChat(${o.id})"><span class="material-icons">forum</span> ЧАТ</button>`;
        }

        let modStr = o.accepted_by ? `<span class="mod-tag">Принял: ${o.accepted_by}</span>` : '';

        return `
        <div class="order-card ${premiumClass}">
            ${modStr}
            <span class="status-badge status-${o.status}">${o.status}</span>
            <div style="font-size:0.9rem;"><b>#${o.id}</b> от <b>${o.customer}</b> ${o.is_premium ? '<span style="color:#fbc02d;">(PLUS)</span>' : ''}</div>
            <p style="margin:10px 0;">${o.text}${domainStr}</p>
            <div style="display:flex; gap:10px;">${controls}</div>
        </div>`;
    }).join('');
}

async function openChat(id) {
    activeOrder = id;
    document.getElementById('chat-title').innerText = `Чат (Заказ #${id})`;
    document.getElementById('order-ui').classList.add('hidden');
    document.getElementById('chat-ui').classList.remove('hidden');
    loadMsgs();
    if(chatTimer) clearInterval(chatTimer);
    chatTimer = setInterval(loadMsgs, 3000); 
    openM('oModal');
}

function closeChatModal() { closeM('oModal'); clearInterval(chatTimer); }

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
    inp.value = ""; loadMsgs();
        }
