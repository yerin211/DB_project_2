async function initSubPlusForm() {
    const form = document.getElementById('subscription-form');
    if (!form) return;

    const editingSub = window.editingSubscription || null;
    window.editingSubscription = null; // 1회 사용 후 초기화

    // 제출 버튼 및 상단 '구독 추가하기' 텍스트를 직접 찾아 수정 모드로 변경
    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button:last-of-type');
    const titleEl = Array.from(document.querySelectorAll('h1, h2, h3, div, span, p'))
        .find(el => el.children.length === 0 && el.textContent.trim() === '구독 추가하기');

    if (editingSub) {
        if (titleEl) titleEl.textContent = '구독 수정하기';
        if (submitBtn) submitBtn.textContent = '구독 수정하기';
    }

    let selectedCycle = '년';

    const optYear = document.getElementById('opt-year');
    const optMonth = document.getElementById('opt-month');
    const monthContainer = document.getElementById('pay-month-container');
    const monthInput = document.getElementById('pay-month');
    const btnMonthUp = document.getElementById('btn-month-up');
    const btnMonthDown = document.getElementById('btn-month-down');
    const dayInput = document.getElementById('pay-day');
    const btnDayUp = document.getElementById('btn-day-up');
    const btnDayDown = document.getElementById('btn-day-down');
    const priceInput = document.getElementById('sub-price');
    const digitsInput = document.getElementById('sub-card-digits');

    if (priceInput) {
        priceInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        };
    }

    if (digitsInput) {
        digitsInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 4);
        };
    }

    if (monthInput) {
        monthInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 2);
        };
        monthInput.onblur = function () {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 1) v = 1;
            if (v > 12) v = 12;
            this.value = v;
        };
    }

    if (dayInput) {
        dayInput.oninput = function () {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 2);
        };
        dayInput.onblur = function () {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 1) v = 1;
            if (v > 31) v = 31;
            this.value = v;
        };
    }

    window.setCycle = function (cycle) {
        selectedCycle = cycle;
        const dayLabel = document.getElementById('pay-day-label');

        if (cycle === '년') {
            optYear.className = 'period-option active';
            optMonth.className = 'period-option inactive';
            if (monthContainer) monthContainer.classList.remove('disabled');
            if (monthInput) monthInput.disabled = false;
            if (dayLabel) dayLabel.textContent = '결제 일';
        } else {
            optYear.className = 'period-option inactive';
            optMonth.className = 'period-option active';
            if (monthContainer) monthContainer.classList.add('disabled');
            if (monthInput) monthInput.disabled = true;
            if (dayLabel) dayLabel.textContent = '결제 날짜 (매월)';
        }
    };

    if (optYear) optYear.onclick = () => setCycle('년');
    if (optMonth) optMonth.onclick = () => setCycle('월');

    if (btnMonthUp) btnMonthUp.onclick = () => updateSpinner(monthInput, 1, 1, 12);
    if (btnMonthDown) btnMonthDown.onclick = () => updateSpinner(monthInput, -1, 1, 12);
    if (btnDayUp) btnDayUp.onclick = () => updateSpinner(dayInput, 1, 1, 31);
    if (btnDayDown) btnDayDown.onclick = () => updateSpinner(dayInput, -1, 1, 31);

    // 수정 모드일 경우 기존 구독 값 폼에 자동 채우기
    if (editingSub) {
        document.getElementById('sub-name').value = editingSub.platform_name || '';
        document.getElementById('sub-category').value = editingSub.category || '';
        if (priceInput) priceInput.value = editingSub.price || '';
        setCycle(editingSub.billing_cycle === 'YEARLY' ? '년' : '월');
        if (monthInput && editingSub.billing_month) monthInput.value = editingSub.billing_month;
        if (dayInput && editingSub.billing_day) dayInput.value = editingSub.billing_day;
        document.getElementById('sub-bank').value = editingSub.bank_name || '';
        if (digitsInput) digitsInput.value = editingSub.last_four_digits || '';
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        const last_four_digits = digitsInput ? digitsInput.value.trim() : '';
        if (last_four_digits.length !== 4) {
            alert('카드 뒷자리 숫자 4자리를 입력해 주세요.');
            return;
        }

        const payload = {
            platform_name: document.getElementById('sub-name').value.trim(),
            category: document.getElementById('sub-category').value.trim() || '기타',
            price: Number(priceInput.value),
            billing_cycle: selectedCycle === '년' ? 'YEARLY' : 'MONTHLY',
            billing_month: Number(monthInput.value),
            billing_day: Number(dayInput.value),
            bank_name: document.getElementById('sub-bank').value.trim(),
            last_four_digits
        };

        try {
            const result = editingSub
                ? await DB.updateSubscription(editingSub.id, payload)
                : await DB.saveSubscription(payload);

            if (result.success) {
                alert(editingSub
                    ? `'${payload.platform_name}' 구독이 수정되었습니다!`
                    : `'${payload.platform_name}' 구독이 저장되었습니다!`
                );
                if (editingSub) {
                    openSubscriptionDetail(editingSub.id);
                } else {
                    loadScreen('home_screen.html');
                }
            } else {
                alert('저장 실패: ' + (result.message || '서버 오류'));
            }
        } catch (error) {
            console.error('저장 통신 오류:', error);
            alert('백엔드 서버(node server.js)가 실행 중인지 확인해주세요.');
        }
    };
}

function updateSpinner(inputEl, delta, min, max) {
    let val = parseInt(inputEl.value, 10) + delta;
    if (val < min) val = max;
    if (val > max) val = min;
    inputEl.value = val;
}