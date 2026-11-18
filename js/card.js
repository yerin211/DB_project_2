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
            <div class="card-item" style="position: relative;">
                <button type="button"
                    onclick="deleteCard(${card.id}, '${card.bank_name}', '${card.last_four_digits}')"
                    aria-label="카드 삭제"
                    style="position: absolute; top: 14px; right: 16px; background: none; border: none; color: #ef4444; font-size: 16px; font-weight: 700; line-height: 1; cursor: pointer; padding: 4px;">
                    ×
                </button>
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

async function deleteCard(cardId, bankName, lastDigits) {
    if (!confirm(`'${bankName} (${lastDigits})' 카드를 삭제할까요?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
            method: 'DELETE'
        });
        const result = await res.json();

        if (result.success) {
            await renderCardScreen();
        } else {
            alert(result.message || '삭제에 실패했습니다.');
        }
    } catch (err) {
        console.error('카드 삭제 통신 에러:', err);
        alert('백엔드 서버 연결을 확인해 주세요.');
    }
}