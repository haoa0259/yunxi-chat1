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
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/upload', express.static(path.join(__dirname, 'upload')));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'yunxi2026chat_full_version';

if (!fs.existsSync(path.join(__dirname, 'upload'))) {
  fs.mkdirSync(path.join(__dirname, 'upload'), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'upload/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: '云熹畅聊后端服务正常运行',
    time: new Date().toISOString()
  });
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ ok: false, msg: '手机号和验证码不能为空' });
    }

    if (code !== '123456') {
      return res.status(401).json({ ok: false, msg: '验证码错误' });
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

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      ok: true,
      msg: '登录成功',
      user,
      token
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ ok: false, msg: '服务器异常', error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = [
      { id: 1, name: "皮肤检测", price: "99元", desc: "专业肤质分析", type: "基础" },
      { id: 2, name: "深层清洁", price: "199元", desc: "去黑头闭口", type: "清洁" },
      { id: 3, name: "补水导入", price: "299元", desc: "深层保湿嫩肤", type: "补水" },
      { id: 4, name: "光子嫩肤", price: "599元", desc: "提亮收缩毛孔", type: "美白" },
      { id: 5, name: "射频紧致", price: "699元", desc: "提拉抗衰护理", type: "抗衰" },
      { id: 6, name: "水光针", price: "899元", desc: "水润透亮嫩肤", type: "嫩肤" }
    ];
    res.status(200).json({ ok: true, data: projects });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const { userId, withUserId } = req.query;

    if (!userId || !withUserId) {
      return res.status(400).json({ ok: false, msg: '参数缺失' });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: withUserId },
          { fromUserId: withUserId, toUserId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.status(200).json({ ok: true, data: messages });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { fromUserId, toUserId, content, type } = req.body;

    if (!fromUserId || !toUserId || !content) {
      return res.status(400).json({ ok: false, msg: '参数不完整' });
    }

    const message = await prisma.message.create({
      data: {
        fromUserId,
        toUserId,
        content,
        type: type || 'text'
      }
    });

    io.emit('new_message', message);
    res.status(200).json({ ok: true, data: message });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, msg: '请上传文件' });
    }

    const fileUrl = `/upload/${req.file.filename}`;
    res.status(200).json({ ok: true, url: fileUrl });
  } catch (error) {
    res.status(500).json({ ok: false, msg: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);

  socket.on('send_message', (data) => {
    io.emit('new_message', data);
  });

  socket.on('disconnect', () => {
    console.log('客户端已断开:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`服务器启动成功 => 端口: ${PORT}`);
  console.log(`服务运行中 => ${new Date().toLocaleString()}`);
});
