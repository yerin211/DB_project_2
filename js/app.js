
// 화면 동적 불러오기
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

//하단 네비게이션 바 숨김/표시 제어
function adjustUIForScreen(screenName) {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const subScreens = ['card_plus_screen.html', 'sub_detail_screen.html'];
    bottomNav.style.display = subScreens.includes(screenName) ? 'none' : 'flex';
}

// 화면별 초기화 라우터
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

window.onload = () => {
    loadScreen('home_screen.html');
};