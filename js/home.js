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