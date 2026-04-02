import { useState, useEffect, useRef } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';

// 这里先写好后端地址占位符，等部署完成后再替换
const API_URL = "https://your-server-url.up.railway.app";
const socket = io(API_URL);

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/" element={<Home user={user} />} />
        <Route path="/chat" element={<Chat user={user} />} />
      </Routes>
    </div>
  );
}

function Login({ setUser }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('123456');
  const nav = useNavigate();

  const handleLogin = async () => {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      nav('/');
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-screen">
      <h1 className="text-3xl font-bold text-primary mb-4">云 光 速</h1>
      <p className="text-secondary mb-8">轻医美在线咨询平台</p>
      <input
        className="="w-full border rounded-lg p-3 mb-4"
        placeholder="手机号"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button
        className="="w-full bg-primary text-white py-3 rounded-lg"
        onClick={handleLogin}
      >
        登录/注册
      </button>
    </div>
  );
}

function Home({ user }) {
  const nav = useNavigate();
  const projects = [
    { name: "皮肤检测", price: "99元", desc: "专业肤质分析" },
    { name: "清洁管理", price: "199元", desc: "深层清洁毛孔" },
    { name: "补水导入", price: "299元", desc: "保湿焕活" },
    { name: "光子嫩肤", price: "599元", desc: "提亮肤色" },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">项目列表</h2>
      <div className="grid grid-cols-2 gap-3">
        {projects.map((item, i) => (
          <div key={i} className="="bg-gray-100 rounded-lg p-3">
            <p className="font-semibold">{item.name}</p>
            <p className="="text-sm text-gray-500">{item.desc}</p>
            <p className="="text-primary font-bold mt-1">{item.price}</p>
            <button
              className="="mt-2 bg-primary text-white text-sm py-1 rounded w-full"
              onClick={() => nav('/chat')}
            >
              咨询
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const ref = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    socket.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
  }, []);

  const send = async () => {
    if (!input) return;
    const data = {
      from: user.id,
      to: "service",
      content: input,
      type: "text",
    };
    await fetch(`${API_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setInput('');
  };

  return (
    <div className="="flex flex-col h-screen">
      <div className="="bg-white p-4 shadow flex items-center gap-3">
        <button onClick={() => nav('/')}>&lt;</button>
        <p className="font-semibold">客服</p>
      </div>
      <div className="="flex-1 overflow-auto p-4 space-y-3 bg-gray-100">
        {messages.map((m, i) => (
          <div key={i} className={`="flex ${m.from === user.id ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`="rounded-lg p-3 max-w-xs ${
                m.from === user.id ? 'bg-primary text-white' : 'bg-white'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        <div ref={ref} />
      </div>
      <div className="="bg-white p-3 flex items-center gap-2">
        <input
          className="="flex-1 border rounded-lg p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="="bg-primary text-white px-4 py-2 rounded-lg" onClick={send}>
          发送
        </button>
      </div>
    </div>
  );
}
