const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // body 파싱 (string이면 JSON으로 변환)
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const name  = (body && body.name)  || '';
    const phone = (body && body.phone) || '';
    const date  = (body && body.date)  || '미정';
    const time  = (body && body.time)  || '미정';
    const floor = (body && body.floor) || '미지정';

    if (!name || !phone) {
      return res.status(400).json({ ok: false, error: '필수 항목 누락' });
    }

    const apiKey    = process.env.SOLAPI_API_KEY    || '';
    const apiSecret = process.env.SOLAPI_API_SECRET || '';
    const toPhone   = (process.env.TO_PHONE   || '').replace(/\D/g, '');
    const fromPhone = (process.env.FROM_PHONE || '').replace(/\D/g, '');

    console.log('ENV:', { hasKey: !!apiKey, hasSecret: !!apiSecret, to: toPhone, from: fromPhone });

    const text = '[일레븐타워 방문예약]\n성함: ' + name + '\n연락처: ' + phone + '\n날짜: ' + date + '\n시간: ' + time + '\n관심층: ' + floor;

    const dateStr   = new Date().toISOString();
    const salt      = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', apiSecret).update(dateStr + salt).digest('hex');
    const authorization = 'HMAC-SHA256 apiKey=' + apiKey + ', date=' + dateStr + ', salt=' + salt + ', signature=' + signature;

    const payload = JSON.stringify({ message: { to: toPhone, from: fromPhone, text } });
    console.log('payload:', payload);

    const response = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authorization },
      body: payload,
    });

    const resText = await response.text();
    console.log('Solapi 응답:', response.status, resText);

    if (!response.ok) {
      return res.status(500).json({ ok: false, error: resText });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('오류 전체:', err.message);
    console.error('스택:', err.stack);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
