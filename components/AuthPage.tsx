import React, { useState } from 'react';
import { User } from '../types';
import { Bot, Lock, User as UserIcon, Type, ArrowRight, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const API_URL = 'http://localhost:3001/api';
    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin 
        ? { username, password }
        : { username, password, fullName };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra');
      }

      if (isLogin) {
          // data is the user object
          onLoginSuccess({
              id: data.id,
              name: data.name,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
              status: 'online'
          });
      } else {
          // Registration successful, verify and log them in or ask to login
          // Here we just auto-login the user returned
           onLoginSuccess({
              id: data.user.id,
              name: data.user.full_name, // Note: DB returns full_name
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.full_name)}&background=random`,
              status: 'online'
          });
      }

    } catch (err: any) {
        console.error("Auth Error:", err);
        setError(err.message);
        // Fallback for Demo without Backend
        if (err.message.includes("Failed to fetch")) {
             setError("Không kết nối được Server. Đang vào chế độ Demo...");
             setTimeout(() => {
                 onLoginSuccess({
                     id: 'demo-user',
                     name: isLogin ? (username || 'Demo User') : (fullName || 'Demo User'),
                     avatar: 'https://picsum.photos/40/40',
                     status: 'online'
                 });
             }, 1000);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row">
        
        {/* Mobile/Compact Form Container */}
        <div className="w-full p-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white mb-4 shadow-lg shadow-indigo-600/30">
                    <Bot size={28} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">NexChat AI</h1>
                <p className="text-gray-500 text-sm mt-2">Kết nối đội ngũ, nâng tầm hiệu suất</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-start">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                {!isLogin && (
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-700 uppercase">Họ và Tên</label>
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                required 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="Ví dụ: Nguyễn Văn A"
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase">Tên đăng nhập</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            required 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="username"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase">Mật khẩu</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md shadow-indigo-600/20 transition-all transform active:scale-95 flex items-center justify-center"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin mr-2" size={20} />
                    ) : (
                        <>
                            {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
                            <ArrowRight className="ml-2" size={18} />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                    {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
                    <button 
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-indigo-600 font-semibold hover:underline"
                    >
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;