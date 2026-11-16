const API_BASE_URL = 'http://localhost:3000/api';

// 1. 백엔드(MySQL) 통신용 DB 객체
const DB = {
    async deleteSubscription(id) {
        const res = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    async getSubscriptions() {
        try {
            const res = await fetch(`${API_BASE_URL}/subscriptions`);
            const result = await res.json();
            if (Array.isArray(result)) return result;
            return result.success ? result.data : [];
        } catch (err) {
            console.error('구독 목록 조회 실패:', err);
            return [];
        }
    },

    async saveSubscription(payload) {
        const res = await fetch(`${API_BASE_URL}/subscriptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    },

    calculateMonthlyTotal(subs) {
        return subs.reduce((total, sub) => {
            if (sub.billing_cycle === 'MONTHLY') {
                return total + Number(sub.price);
            } else if (sub.billing_cycle === 'YEARLY') {
                return total + Math.round(Number(sub.price) / 12);
            }
            return total;
        }, 0);
    }
};

// 2. 화면 동적 불러오기
async function loadScreen(screenName) {
    try {
        const response = await fetch(`screens/${screenName}`);
        const html = await response.text();
        document.getElementById('app-content').innerHTML = html;

        adjustUIForScreen(screenName);
        await initScreenEvents(screenName);
    } catch (error) {
        console.error('화면을 불러오는데 실패했습니다:', error);
    }
}

// 3. 하단 네비게이션 바 숨김/표시 제어
function adjustUIForScreen(screenName) {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const subScreens = ['card_plus_screen.html', 'sub_detail_screen.html'];
    bottomNav.style.display = subScreens.includes(screenName) ? 'none' : 'flex';
}

// 4. 화면별 초기화 라우터
async function initScreenEvents(screenName) {
    if (screenName === 'home_screen.html') {
        await renderHomeScreen();
    } else if (screenName === 'card_screen.html') {
        await renderCardScreen();
    } else if (screenName === 'card_plus_screen.html') {
        updateCardPreview();
    } else if (screenName === 'calendar_screen.html') {
        await renderCalendarScreen();
    } else if (screenName === 'sub_plus_screen.html') {
        await initSubPlusForm();
    } else if (screenName === 'sub_detail_screen.html') {
        await renderSubDetailScreen();
    }
}

// 5. 홈 화면 렌더링
async function renderHomeScreen() {
    const subs = await DB.getSubscriptions();

    const totalEl = document.getElementById('monthly-total-amount');
    const upcomingTitle = document.getElementById('upcoming-title');
    const upcomingList = document.getElementById('upcoming-list');
    const expenseList = document.getElementById('expense-list');
    const emptyState = document.getElementById('empty-expense-state');

    if (!expenseList) return;

    if (totalEl) {
        totalEl.textContent = DB.calculateMonthlyTotal(subs).toLocaleString() + '원';
    }

    if (subs.length === 0) {
        if (upcomingTitle) upcomingTitle.textContent = '0개의 구독이 곧 지출되어요';
        if (upcomingList) upcomingList.innerHTML = '';
        expenseList.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (upcomingTitle) upcomingTitle.textContent = `${subs.length}개의 구독이 곧 지출되어요`;

    if (upcomingList) {
        upcomingList.innerHTML = subs.map(sub => `
            <div class="upcoming-card" onclick="openSubscriptionDetail(${sub.id})" style="cursor:pointer;">
                <div class="upcoming-card-day">매월 ${sub.billing_day}일</div>
                <div>
                    <div class="upcoming-card-name">${sub.platform_name}</div>
                    <div class="upcoming-card-price">${Number(sub.price).toLocaleString()}원</div>
                </div>
            </div>
        `).join('');
    }

    expenseList.innerHTML = subs.map(sub => {
        const cycleLabel = sub.billing_cycle === 'YEARLY' ? '년' : '월';
        const firstLetter = sub.platform_name ? sub.platform_name.charAt(0) : '구';
        return `
            <div class="expense-item" onclick="openSubscriptionDetail(${sub.id})" style="cursor:pointer;">
                <div class="expense-icon">${firstLetter}</div>
                <div class="expense-info">
                    <div class="expense-name">${sub.platform_name}</div>
                    <div class="expense-price">${cycleLabel} ${Number(sub.price).toLocaleString()}원</div>
                </div>
            </div>
        `;
    }).join('');
}

// 6. 구독 상세 화면
let currentDetailSubId = null;

function openSubscriptionDetail(subId) {
    currentDetailSubId = subId;
    loadScreen('sub_detail_screen.html');
}

async function renderSubDetailScreen() {
    const subs = await DB.getSubscriptions();
    const sub = subs.find(item => item.id === currentDetailSubId);
    if (!sub) return;

    const isYearly = sub.billing_cycle === 'YEARLY';
    const price = Number(sub.price);
    const monthlyPrice = isYearly ? Math.round(price / 12) : price;

    const created = new Date(sub.created_at || Date.now());
    const now = new Date();
    const monthsElapsed = Math.max(1, (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth()) + 1);

    document.getElementById('detail-icon').textContent = sub.platform_name.charAt(0);
    document.getElementById('detail-title').textContent = sub.platform_name;
    document.getElementById('detail-category').textContent = sub.category;

    document.getElementById('detail-total-label').textContent = `현재까지 총액(${monthsElapsed}개월)`;
    document.getElementById('detail-total-value').textContent = `${(monthlyPrice * monthsElapsed).toLocaleString()}원`;
    document.getElementById('detail-unit-label').textContent = isYearly ? '연별 액' : '월별 액';
    document.getElementById('detail-unit-value').textContent = `${price.toLocaleString()}원`;

    document.getElementById('detail-cycle-box').textContent = isYearly ? '년' : '월';
    document.getElementById('detail-cycle-title').textContent = isYearly ? '매년' : '매월';
    document.getElementById('detail-calendar-month').textContent = `${now.getMonth() + 1}월`;
    document.getElementById('detail-months-count').textContent = monthsElapsed;
    document.getElementById('detail-bank-name').textContent = sub.bank_name;

    const daysContainer = document.getElementById('detail-calendar-days');
    const centerDay = Number(sub.billing_day);
    let daysHtml = '';
    for (let offset = -3; offset <= 3; offset++) {
        let d = centerDay + offset;
        if (d < 1) d += 30;
        if (d > 31) d -= 31;
        daysHtml += `<div class="day-item ${offset === 0 ? 'active' : ''}">${d}</div>`;
    }
    daysContainer.innerHTML = daysHtml;

    let isAlertOn = Boolean(sub.is_alert_on);
    const toggleSwitch = document.getElementById('detail-alert-toggle');
    const toggleBtn = document.getElementById('detail-alert-btn');
    const toggleOff = document.getElementById('detail-alert-off');

    const updateToggleUI = () => {
        if (isAlertOn) {
            toggleBtn.style.transform = 'translateX(0)';
            toggleBtn.textContent = 'ON';
            toggleOff.style.opacity = '1';
        } else {
            toggleBtn.style.transform = 'translateX(40px)';
            toggleBtn.textContent = 'OFF';
            toggleOff.style.opacity = '0';
        }
    };
    updateToggleUI();

    toggleSwitch.onclick = () => {
        isAlertOn = !isAlertOn;
        updateToggleUI();
    };

    document.getElementById('btn-cancel-sub').onclick = async () => {
        if (!confirm(`정말 '${sub.platform_name}' 구독을 취소하시겠습니까?`)) return;
        const result = await DB.deleteSubscription(sub.id);
        if (result.success) {
            alert('구독이 취소되었습니다.');
            loadScreen('home_screen.html');
        }
    };
}

// 7. 내 카드 목록 & 카드 추가 화면
async function renderCardScreen() {
    const countEl = document.getElementById('card-count-text');
    const listEl = document.getElementById('card-list');
    const emptyEl = document.getElementById('empty-card-state');

    if (!listEl) return;

    try {
        const res = await fetch(`${API_BASE_URL}/cards`);
        const cards = await res.json();

        if (countEl) {
            countEl.textContent = `총 ${cards.length}개의 카드가 등록되어 있어요`;
        }

        if (!Array.isArray(cards) || cards.length === 0) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'flex';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        listEl.innerHTML = cards.map(card => `
            <div class="card-item">
                <div class="bank-name">${card.bank_name}</div>
                <div class="card-detail-row">
                    <div class="card-chip-icon"></div>
                    <div class="card-info-text">${card.card_type} (${card.last_four_digits})</div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('카드 목록 불러오기 실패:', err);
    }
}

function updateCardPreview() {
    const bank = document.getElementById('card-bank-name')?.value;
    const type = document.getElementById('card-type')?.value;
    const digits = document.getElementById('card-last-digits')?.value;

    const previewBank = document.getElementById('preview-bank');
    const previewType = document.getElementById('preview-type');
    const previewDigits = document.getElementById('preview-digits');

    if (previewBank) previewBank.textContent = bank || '은행을 선택하세요';
    if (previewType) previewType.textContent = type || '카드 종류';
    if (previewDigits) previewDigits.textContent = digits ? digits.padEnd(4, '*') : '****';
}

async function submitNewCard() {
    const bank_name = document.getElementById('card-bank-name')?.value;
    const card_type = document.getElementById('card-type')?.value;
    const last_four_digits = document.getElementById('card-last-digits')?.value;

    if (!bank_name) return alert('은행 또는 카드사를 선택해 주세요.');
    if (!card_type) return alert('카드 종류를 선택해 주세요.');
    if (!last_four_digits || last_four_digits.length !== 4) return alert('카드 뒷자리 숫자 4자리를 정확히 입력해 주세요.');

    try {
        const res = await fetch(`${API_BASE_URL}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bank_name, card_type, last_four_digits })
        });
        const result = await res.json();

        if (result.success) {
            alert('새 카드가 등록되었습니다!');
            loadScreen('card_screen.html');
        } else {
            alert('등록 실패: ' + (result.message || '서버 오류'));
        }
    } catch (err) {
        console.error('카드 등록 통신 에러:', err);
        alert('백엔드 서버(node server.js)가 켜져 있는지 확인해 주세요!');
    }
}

// 8. 구독 추가 화면
let selectedBillingCycle = 'MONTHLY';

function selectBillingCycle(cycle) {
    selectedBillingCycle = cycle;
    const mEl = document.getElementById('cycle-monthly');
    const yEl = document.getElementById('cycle-yearly');
    if (mEl && yEl) {
        mEl.style.color = cycle === 'MONTHLY' ? '#3b3d63' : '#94a3b8';
        yEl.style.color = cycle === 'YEARLY' ? '#3b3d63' : '#94a3b8';
    }
}

function clampNumberInput(inputEl, min, max) {
    let val = parseInt(inputEl.value, 10);
    if (isNaN(val) || val < min) val = min;
    if (val > max) val = max;
    inputEl.value = val;
}

async function initSubPlusForm() {
    selectedBillingCycle = 'MONTHLY';
    selectBillingCycle('MONTHLY');

    const now = new Date();
    const monthInput = document.getElementById('sub-billing-month');
    const dayInput = document.getElementById('sub-billing-day');
    if (monthInput) monthInput.value = now.getMonth() + 1;
    if (dayInput) dayInput.value = now.getDate();

    const cardSelect = document.getElementById('sub-card-select');
    if (!cardSelect) return;

    try {
        const res = await fetch(`${API_BASE_URL}/cards`);
        const cards = await res.json();

        if (!Array.isArray(cards) || cards.length === 0) {
            cardSelect.innerHTML = '<option value="">등록된 카드가 없습니다 (먼저 카드를 등록해 주세요)</option>';
            return;
        }

        cardSelect.innerHTML = cards.map(card => `
            <option value="${card.id}">
                ${card.bank_name} · ${card.card_type} (${card.last_four_digits})
            </option>
        `).join('');
    } catch (err) {
        console.error('카드 목록 로드 에러:', err);
        cardSelect.innerHTML = '<option value="">카드를 불러오지 못했습니다</option>';
    }
}

async function submitNewSubscription() {
    const platform_name = document.getElementById('sub-name')?.value.trim();
    const category = document.getElementById('sub-category')?.value;
    const price = Number(document.getElementById('sub-price')?.value);
    const billing_month = Number(document.getElementById('sub-billing-month')?.value);
    const billing_day = Number(document.getElementById('sub-billing-day')?.value);
    const card_id = Number(document.getElementById('sub-card-select')?.value);

    if (!platform_name) return alert('구독 이름을 입력해 주세요.');
    if (!price || price <= 0) return alert('결제 금액을 올바르게 입력해 주세요.');
    if (!billing_day || billing_day < 1 || billing_day > 31) return alert('결제 일(1~31)을 올바르게 입력해 주세요.');
    if (!card_id) return alert('결제할 카드를 선택해 주세요.');

    try {
        const result = await DB.saveSubscription({
            platform_name,
            category,
            price,
            billing_cycle: selectedBillingCycle,
            billing_month,
            billing_day,
            card_id
        });

        if (result.success) {
            alert('구독이 추가되었습니다!');
            loadScreen('calendar_screen.html');
        } else {
            alert('구독 추가 실패: ' + (result.message || ''));
        }
    } catch (err) {
        console.error('구독 등록 통신 에러:', err);
        alert('백엔드 서버 연결을 확인해 주세요.');
    }
}

// 9. 달력 화면 (구독 이름 배지 + 월 이동 + 일자별 필터링)
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth() + 1;
let cachedCalendarSubs = [];

function changeCalendarMonth(diff) {
    calMonth += diff;
    if (calMonth < 1) {
        calMonth = 12;
        calYear -= 1;
    } else if (calMonth > 12) {
        calMonth = 1;
        calYear += 1;
    }
    drawCalendar();
}

async function renderCalendarScreen() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;

    cachedCalendarSubs = await DB.getSubscriptions();
    drawCalendar();
}

function drawCalendar(selectedDay = null) {
    const titleEl = document.getElementById('cal-current-title');
    const gridEl = document.getElementById('calendar-grid');
    if (!titleEl || !gridEl) return;

    titleEl.textContent = `${calYear} ${calMonth}월`;

    const firstWeekday = new Date(calYear, calMonth - 1, 1).getDay();
    const lastDate = new Date(calYear, calMonth, 0).getDate();

    const monthSubs = cachedCalendarSubs.filter(sub => {
        if (sub.billing_cycle === 'YEARLY') {
            const targetMonth = sub.billing_month || (sub.created_at ? new Date(sub.created_at).getMonth() + 1 : calMonth);
            return Number(targetMonth) === calMonth;
        }
        return true;
    });

    const subsByDay = {};
    monthSubs.forEach(sub => {
        const clampedDay = Math.min(Number(sub.billing_day), lastDate);
        if (!subsByDay[clampedDay]) subsByDay[clampedDay] = [];
        subsByDay[clampedDay].push(sub);
    });

    let html = '';

    for (let i = 0; i < firstWeekday; i++) {
        html += `<div style="min-height: 52px;"></div>`;
    }

    for (let day = 1; day <= lastDate; day++) {
        const daySubs = subsByDay[day] || [];
        const hasBilling = daySubs.length > 0;
        const isSelected = selectedDay === day;

        let badgeHtml = '';
        if (hasBilling) {
            const shortName = daySubs[0].platform_name.slice(0, 3);
            const label = daySubs.length > 1 ? `${shortName}+${daySubs.length - 1}` : shortName;
            badgeHtml = `
                <span style="margin-top: 3px; font-size: 9px; font-weight: 700; color: #3b3d63; background: #dbe2ef; padding: 1px 5px; border-radius: 6px; white-space: nowrap; max-width: 44px; overflow: hidden; text-overflow: ellipsis;">
                    ${label}
                </span>
            `;
        }

        html += `
            <div onclick="selectCalendarDay(${day})"
                style="min-height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; cursor: pointer;">
                <div class="day-cell ${hasBilling ? 'active' : ''}"
                    style="${isSelected ? 'outline: 2px solid #3b3d63; outline-offset: 2px;' : ''}">
                    ${day}
                </div>
                ${badgeHtml}
            </div>
        `;
    }

    gridEl.innerHTML = html;
    renderCalendarSubList(monthSubs, lastDate, selectedDay);
}

function selectCalendarDay(day) {
    drawCalendar(day);
}

function renderCalendarSubList(monthSubs, lastDate, selectedDay) {
    const listTitleEl = document.getElementById('cal-selected-date-title');
    const listEl = document.getElementById('cal-day-subs-list');
    if (!listEl || !listTitleEl) return;

    const filtered = selectedDay
        ? monthSubs.filter(sub => Math.min(Number(sub.billing_day), lastDate) === selectedDay)
        : monthSubs;

    if (selectedDay) {
        listTitleEl.innerHTML = `${calMonth}월 ${selectedDay}일 결제 내역 <span onclick="drawCalendar(null)" style="font-size:12px; color:#888888; font-weight:500; margin-left:8px; cursor:pointer; text-decoration:underline;">전체보기</span>`;
    } else {
        listTitleEl.textContent = `${calMonth}월 전체 결제 예정 (${filtered.length}건)`;
    }

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div style="background:#f8f8fa; border-radius:12px; padding:18px; text-align:center; font-size:13px; color:#777777;">
                예정된 구독 결제가 없어요
            </div>
        `;
        return;
    }

    listEl.innerHTML = filtered.map(sub => `
        <div onclick="openSubscriptionDetail(${sub.id})"
            style="background:#f8f8fa; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:38px; height:38px; border-radius:10px; background:#dbe2ef; color:#3b3d63; font-weight:700; display:flex; align-items:center; justify-content:center;">
                    ${sub.platform_name.charAt(0)}
                </div>
                <div>
                    <div style="font-size:14px; font-weight:700; color:#111111;">${sub.platform_name}</div>
                    <div style="font-size:12px; color:#666666;">매월 ${sub.billing_day}일 · ${sub.bank_name}</div>
                </div>
            </div>
            <div style="font-size:14px; font-weight:700; color:#3b3d63;">
                ${Number(sub.price).toLocaleString()}원
            </div>
        </div>
    `).join('');
}

window.onload = () => {
    loadScreen('home_screen.html');
};