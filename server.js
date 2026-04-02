const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use('/upload', express.static(path.join(__dirname, 'upload')));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'yunxi2026chat_secret_key';

if (!fs.existsSync(path.join(__dirname, 'upload'))) {
  fs.mkdirSync(path.join(__dirname, 'upload'));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'upload/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.post('/api/login', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (code !== '123456') {
      return res.json({ ok: false, msg: '验证码错误' });
    }
    let user = await prisma.user.findUnique({
      where: { phone }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          nickname: `用户${phone.slice(-4)}`
        }
      });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, user, token });
  } catch (err) {
    res.json({ ok: false });
  }
});

app.get('/api/projects', (req, res) => {
  res.json([
    { id: 1, name: "皮肤检测", price: "99元", desc: "专业肤质分析" },
    { id: 2, name: "深层清洁", price: "199元", desc: "去黑头闭口" },
    { id: 3, name: "补水导入", price: "299元", desc: "深层保湿嫩肤" },
    { id: 4, name: "光子嫩肤", price: "599元", desc: "提亮收缩毛孔" },
    { id: 5, name: "射频紧致", price: "699元", desc: "提拉抗衰护理" },
    { id: 6, name: "水光针", price: "899元", desc: "水润透亮嫩肤" }
  ]);
});

app.get('/api/messages', async (req, res) => {
  const { userId, withUserId } = req.query;
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: withUserId },
        { fromUserId: withUserId, toUserId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json(messages);
});

app.post('/api/messages', async (req, res) => {
  const message = await prisma.message.create({
    data: req.body
  });
  io.emit('new_message', message);
  res.json(message);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  res.json({ url: '/upload/' + req.file.filename });
});

io.on('connection', (socket) => {
  socket.on('call_offer', (data) => {
    socket.broadcast.emit('call_offer', data);
  });
  socket.on('call_answer', (data) => {
    socket.broadcast.emit('call_answer', data);
  });
  socket.on('call_ice', (data) => {
    socket.broadcast.emit('call_ice', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
