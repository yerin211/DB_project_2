require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// .env 파일에서 불러온 환경변수로 MySQL 연결 풀 설정
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// 1. 구독 목록 조회 API
app.get('/api/subscriptions', async (req, res) => {
    const userId = 1; // 테스트용 고정 사용자 ID
    try {
        const [rows] = await pool.query(`
      SELECT 
        s.id,
        p.name AS platform_name,
        p.category,
        s.price,
        s.billing_cycle,
        s.billing_day,
        s.alert_day,
        s.is_alert_on,
        s.status,
        c.bank_name,
        c.last_four_digits
      FROM subscriptions s
      JOIN platforms p ON s.platform_id = p.id
      JOIN my_cards c ON s.card_id = c.id
      WHERE s.user_id = ? AND s.status = 'ACTIVE'
      ORDER BY s.billing_day ASC
    `, [userId]);

        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('구독 조회 에러:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 구독 추가 API (card_id 직접 연결 지원)
app.post('/api/subscriptions', async (req, res) => {
    try {
        const userId = 1;
        const {
            name,
            platform_name,
            category,
            price,
            billing_cycle,
            billing_month,
            billing_day,
            bank_name,
            last_four_digits
        } = req.body;

        const subName = platform_name || name;
        const digits = (last_four_digits || '0000').toString().slice(0, 4);
        const bank = bank_name || '기본은행';

        // 1. 플랫폼 조회 또는 등록
        let [platforms] = await pool.query('SELECT id FROM platforms WHERE name = ?', [subName]);
        let platformId;
        if (platforms.length > 0) {
            platformId = platforms[0].id;
        } else {
            const [pRes] = await pool.query(
                'INSERT INTO platforms (name, category) VALUES (?, ?)',
                [subName, category || '기타']
            );
            platformId = pRes.insertId;
        }

        // 2. 은행명 + 카드 뒷자리 4자리로 내 카드 조회 (없으면 자동 등록)
        let [cards] = await pool.query(
            'SELECT id FROM my_cards WHERE user_id = ? AND bank_name = ? AND last_four_digits = ? LIMIT 1',
            [userId, bank, digits]
        );

        let cardId;
        if (cards.length > 0) {
            cardId = cards[0].id;
        } else {
            const [cRes] = await pool.query(
                'INSERT INTO my_cards (user_id, bank_name, card_type, last_four_digits) VALUES (?, ?, ?, ?)',
                [userId, bank, '체크카드', digits]
            );
            cardId = cRes.insertId;
        }

        // 3. 구독 내역 저장 (YEARLY면 선택한 월 저장, MONTHLY면 NULL)
        const savedMonth = billing_cycle === 'YEARLY' ? Number(billing_month) : null;

        const [subRes] = await pool.query(
            `INSERT INTO subscriptions 
       (user_id, platform_id, card_id, price, billing_cycle, billing_month, billing_day, alert_day, is_alert_on, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 3, 1, 'ACTIVE')`,
            [userId, platformId, cardId, price, billing_cycle || 'MONTHLY', savedMonth, billing_day]
        );

        res.json({ success: true, id: subRes.insertId });
    } catch (err) {
        console.error('구독 등록 에러:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 내 보유 카드 목록 조회 API
app.get('/api/cards', async (req, res) => {
    try {
        const userId = 1; // 기본 테스트 유저
        const [rows] = await pool.query(
            'SELECT * FROM my_cards WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('카드 조회 에러:', err);
        res.status(500).json({ success: false, message: '카드 목록 조회 실패' });
    }
});

// 내 카드 추가 API
app.post('/api/cards', async (req, res) => {
    try {
        const userId = 1; // 기본 테스트 유저
        const { bank_name, card_type, last_four_digits } = req.body;

        if (!bank_name || !card_type || !last_four_digits) {
            return res.status(400).json({ success: false, message: '모든 항목을 입력해 주세요.' });
        }

        const [result] = await pool.query(
            'INSERT INTO my_cards (user_id, bank_name, card_type, last_four_digits) VALUES (?, ?, ?, ?)',
            [userId, bank_name, card_type, last_four_digits]
        );

        res.json({ success: true, id: result.insertId, message: '카드가 등록되었습니다.' });
    } catch (err) {
        console.error('카드 등록 에러:', err);
        res.status(500).json({ success: false, message: '카드 등록 실패' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`백엔드 서버 실행 중: http://localhost:${PORT}`);
});