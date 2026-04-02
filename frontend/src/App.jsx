import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const API = "https://yunxi-chat1.up.railway.app";
const socket = io(API);
const SERVICE_ID = "yunci_service";
const SERVICE_NAME = "云熹医美在线客服";

export default function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/chat/service" element={user ? <ChatPage /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginPage() {
  const [phone, setPhone] = useState('');
  const nav = useNavigate();
  const login = async () => {
    const res = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code: "123456" })
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      nav('/home');
    }
  };
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-[#FF7E5E] text-4xl font-bold mb-1">云熹畅聊</h1>
      <p className="text-[#E8C39E] text-lg mb-10">轻医美咨询·即时沟通</p>
      <div className="w-full max-w-sm">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="手机号"
          className="w-full border border-gray-200 rounded-xl p-4 mb-4"
        />
        <button
          onClick={login}
          className="w-full bg-[#FF7E5E] text-white rounded-xl p-4 text-lg font-semibold"
        >
          登录/注册
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const nav = useNavigate();
  const list = [
    { id: 1, name: "皮肤检测", p: "99元", d: "肤质分析" },
    { id: 2, name: "深层清洁", p: "199元", d: "去黑头" },
    { id: 3, name: "补水导入", p: "299元", d: "保湿嫩肤" },
    { id: 4, name: "光子嫩肤", p: "599元", d: "提亮肤色" },
    { id: 5, name: "射频紧致", p: "699元", d: "提拉抗衰" },
    { id: 6, name: "水光针", p: "899元", d: "水润透亮" },
  ];
  return (
    <div className="max-w-[375px] mx-auto pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold">云熹轻医美</h1>
        <p className="text-[#E8C39E] mb-4">科学护肤·安全变美</p>
        <div className="grid grid-cols-2 gap-3">
          {list.map(item => (
            <div key={item.id} className="bg-gray-50 rounded-2xl p-4">
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-1">{item.d}</p>
              <p className="text-[#FF7E5E] font-bold mb-2">{item.p}</p>
              <button onClick={() => nav('/chat/service')} className="bg-[#FF7E5E] text-white text-sm py-2 rounded-xl w-full">咨询</button>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 w-full max-w-[375px] bg-white border-t h-14 flex justify-around items-center">
        <span className="text-[#FF7E5E] font-bold">首页</span>
        <span onClick={() => nav('/chat/service')} className="text-gray-500">消息</span>
        <span className="text-gray-500">我的</span>
      </div>
    </div>
  );
}

function ChatPage() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [msg, setMsg] = useState('');
  const [list, setList] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    socket.on('new_message', (data) => {
      setList(prev => [...prev, data]);
    });
    return () => {
      socket.off('new_message');
    };
  }, []);

  const send = async () => {
    if (!msg || !user) return;
    const data = {
      fromUserId: user.id,
      toUserId: SERVICE_ID,
      type: 'text',
      content: msg
    };
    await fetch(`${API}/api/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    setMsg('');
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col max-w-[375px] mx-auto">
      <div className="bg-white p-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => nav(-1)}>返回</button>
        <h3 className="font-semibold text-lg">{SERVICE_NAME}</h3>
      </div>
      <div className="flex-1 p-4 space-y-3">
        {list.map((m, idx) => (
          <div key={idx} className={`flex ${m.fromUserId === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-2xl p-3 text-sm ${m.fromUserId === user.id ? 'bg-[#FF7E5E] text-white rounded-br-none' : 'bg-white'}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={ref} />
      </div>
      <div className="bg-white p-3 flex items-center gap-2">
        <span>📷</span>
        <span>🎤</span>
        <span>📞</span>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="输入消息"
          className="flex-1 bg-gray-100 rounded-xl p-3"
        />
        <button onClick={send} className="bg-[#FF7E5E] text-white px-4 py-2 rounded-xl">发送</button>
      </div>
    </div>
  );
}
