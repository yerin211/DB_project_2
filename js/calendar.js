
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

    // 1. 핵심 필터링: 월간(MONTHLY)은 매달 표시, 연간(YEARLY)은 설정한 그 달(billing_month)에만 표시
    const monthSubs = cachedCalendarSubs.filter(sub => {
        if (sub.billing_cycle === 'YEARLY') {
            return Number(sub.billing_month) === calMonth;
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

    listEl.innerHTML = filtered.map(sub => {
        // 2. 하단 리스트 문구도 매년 / 매월 구분 표시
        const scheduleText = sub.billing_cycle === 'YEARLY'
            ? `매년 ${sub.billing_month}월 ${sub.billing_day}일`
            : `매월 ${sub.billing_day}일`;

        return `
            <div onclick="openSubscriptionDetail(${sub.id})"
                style="background:#f8f8fa; border-radius:14px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:38px; height:38px; border-radius:10px; background:#dbe2ef; color:#3b3d63; font-weight:700; display:flex; align-items:center; justify-content:center;">
                        ${sub.platform_name.charAt(0)}
                    </div>
                    <div>
                        <div style="font-size:14px; font-weight:700; color:#111111;">${sub.platform_name}</div>
                        <div style="font-size:12px; color:#666666;">${scheduleText} · ${sub.bank_name}</div>
                    </div>
                </div>
                <div style="font-size:14px; font-weight:700; color:#3b3d63;">
                    ${Number(sub.price).toLocaleString()}원
                </div>
            </div>
        `;
    }).join('');
}