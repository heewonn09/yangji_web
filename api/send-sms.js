const crypto = require('crypto');
const https  = require('https');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
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

    const apiKey    = (process.env.SOLAPI_API_KEY    || '').trim();
    const apiSecret = (process.env.SOLAPI_API_SECRET || '').trim();
    const toPhone   = (process.env.TO_PHONE   || '').replace(/\D/g, '').trim();
    const fromPhone = (process.env.FROM_PHONE || '').replace(/\D/g, '').trim();

    const text = '[일레븐타워 방문예약]\n성함: ' + name + '\n연락처: ' + phone + '\n날짜: ' + date + '\n시간: ' + time + '\n관심층: ' + floor;

    const dateStr   = new Date().toISOString();
    const salt      = crypto.randomBytes(16).toString('hex');
    const signature = crypto.createHmac('sha256', apiSecret).update(dateStr + salt).digest('hex');
    const authorization = 'HMAC-SHA256 apiKey=' + apiKey + ', date=' + dateStr + ', salt=' + salt + ', signature=' + signature;

    const payload = JSON.stringify({ message: { to: toPhone, from: fromPhone, text } });

    console.log('Solapi 요청:', toPhone, fromPhone);

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.solapi.com',
        path: '/messages/v4/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': authorization,
        },
      };

      const req2 = https.request(options, (r) => {
        let data = '';
        r.on('data', (chunk) => { data += chunk; });
        r.on('end', () => resolve({ status: r.statusCode, body: data }));
      });

      req2.on('error', reject);
      req2.write(payload);
      req2.end();
    });

    console.log('Solapi 응답:', result.status, result.body);

    if (result.status < 200 || result.status >= 300) {
      return res.status(500).json({ ok: false, error: result.body });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('오류:', err.message, err.stack);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
