const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'mysecret';

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 上传目录
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename: (req, file, cb) => cb(Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// 登录接口
app.post('/api/login', async (req, res) => {
  const { phone, code } = req.body;
  if (code !== '12345') return res.json({ ok: false, msg: '验证码错误' });
  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({
      data: { phone, nickname: `用户${phone.slice(-4)}` }
    });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET);
  res.json({ ok: true, user, token });
});

// 项目列表
app.get('/api/projects', (req, res) => {
  res.json([
    { id: 1, name: '皮肤检测', price: '99元', desc: '专业检测' },
    { id: 2, name: '深层清洁', price: '199元', desc: '去黑头' },
    { id: 3, name: '补水导入', price: '299元', desc: '保湿嫩肤' },
    { id: 4, name: '光子嫩肤', price: '599元', desc: '提亮肤色' },
    { id: 5, name: '射频抗衰', price: '699元', desc:紧致 },
    { id: 6, name: '水光针', price: '899元', desc: '改善肤质' }
  ]);
});

// 消息接口
app.get('/api/messages', async (req, res) => {
  const { userId, withUser } = req.query;
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: userId, toId: withUser },
        { fromId: withUser, toId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  const data = await prisma.message.create({ data: req.body });
  io.emit('new_message', data);
  res.json(data);
});

// 上传文件
app.post('/api/upload', upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Socket 实时通讯
io.on('connection', (socket) => {
  socket.on('call', (data) => io.emit('call', data));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
