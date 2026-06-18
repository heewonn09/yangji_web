require('dotenv').config();
const express = require('express');
const SolapiMessageService = require('solapi');
const path = require('path');

const app = express();
app.use(express.json());

// 정적 파일 서빙 (HTML, 이미지, JS 등)
app.use(express.static(__dirname));

// 한글 파일명 처리
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '일레븐 타워.dc.html'));
});

// SMS 전송 API
app.post('/api/send-sms', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ ok: false, error: '메시지 내용이 없습니다.' });
  }

  if (!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET) {
    console.error('SOLAPI_API_KEY 또는 SOLAPI_API_SECRET 환경변수가 설정되지 않았습니다.');
    return res.status(500).json({ ok: false, error: 'SMS 서비스 설정 오류' });
  }

  const messageService = new SolapiMessageService(
    process.env.SOLAPI_API_KEY,
    process.env.SOLAPI_API_SECRET
  );

  const toPhone = (process.env.TO_PHONE || '01082280143').replace(/\D/g, '');
  const fromPhone = (process.env.FROM_PHONE || '').replace(/\D/g, '');

  try {
    await messageService.sendOne({
      to: toPhone,
      from: fromPhone,
      text: message,
    });
    console.log(`SMS 전송 완료 → ${toPhone}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('SMS 전송 오류:', err.message || err);
    res.status(500).json({ ok: false, error: '문자 전송에 실패했습니다.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
