const API_BASE_URL = 'http://localhost:3000/api';

// 1. 백엔드(MySQL) 통신용 DB 객체
const DB = {
    async deleteSubscription(id) {
        const res = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    async updateSubscription(id, payload) {
        const res = await fetch(`${API_BASE_URL}/subscriptions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
