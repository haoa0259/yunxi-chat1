const express = require('express')
const cors = require('cors')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('项目正常运行')
})

app.post('/api/login', async (req, res) => {
  const { phone, code } = req.body
  if (code !== '123456') {
    return res.json({ ok: false })
  }
  let user = await prisma.user.findUnique({ where: { phone } })
  if (!user) {
    user = await prisma.user.create({ data: { phone } })
  }
  res.json({ ok: true, user })
})

app.listen(PORT, () => {
  console.log('启动成功')
})
