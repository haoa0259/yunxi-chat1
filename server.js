const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: "*" } })

app.use(cors())
app.use(express.json())
app.use('/upload', express.static('upload'))

const PORT = process.env.PORT || 5000
const JWT_SECRET = 'yunxi2026secret'

if (!fs.existsSync('upload')) fs.mkdirSync('upload')

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'upload'),
  filename: (_, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})
const upload = multer({ storage })

app.post('/api/login', async (req, res) => {
  try {
    const { phone, code } = req.body
    if (code !== '123456') return res.json({ ok: false })
    let user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      user = await prisma.user.create({
        data: { phone, nickname: '用户'+phone.slice(-4) }
      })
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET)
    res.json({ ok: true, user, token })
  } catch (e) {
    res.json({ ok: false })
  }
})

app.get('/api/projects', (_, res) => {
  res.json([
    { id:1,name:"皮肤检测",price:"99元" },
    { id:2,name:"深层清洁",price:"199元" },
    { id:3,name:"补水导入",price:"299元" },
    { id:4,name:"光子嫩肤",price:"599元" },
    { id:5,name:"射频紧致",price:"699元" },
    { id:6,name:"水光针",price:"899元" }
  ])
})

app.get('/api/messages', async (req, res) => {
  const { userId, withUserId } = req.query
  const msgs = await prisma.message.findMany({
    where: {
      OR: [
        { fromUserId: userId, toUserId: withUserId },
        { fromUserId: withUserId, toUserId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' }
  })
  res.json(msgs)
})

app.post('/api/messages', async (req, res) => {
  const msg = await prisma.message.create({ data: req.body })
  io.emit('new_message', msg)
  res.json(msg)
})

server.listen(PORT, () => {
  console.log('启动成功', PORT)
})
