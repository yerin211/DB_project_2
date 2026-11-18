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
    const displayMonth = isYearly && sub.billing_month ? sub.billing_month : (now.getMonth() + 1);
    document.getElementById('detail-calendar-month').textContent = `${displayMonth}월`;
    document.getElementById('detail-months-count').textContent = monthsElapsed;
    const cardDigits = sub.last_four_digits ? ` (${sub.last_four_digits})` : '';
    document.getElementById('detail-bank-name').textContent = `${sub.bank_name}${cardDigits}`;

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

    // 구독 수정하기 버튼 동적
    const cancelBtn = document.getElementById('btn-cancel-sub');
    if (cancelBtn && !document.getElementById('btn-edit-sub')) {
        const editBtn = cancelBtn.cloneNode(false);
        editBtn.id = 'btn-edit-sub';
        editBtn.textContent = '구독 수정하기';
        editBtn.style.marginBottom = '10px';

        editBtn.onclick = () => {
            window.editingSubscription = sub;
            loadScreen('sub_plus_screen.html');
        };

        cancelBtn.parentNode.insertBefore(editBtn, cancelBtn);
    }

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
