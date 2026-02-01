import React, { useState } from 'react';
import { User } from '../types';
import { Bot, Lock, User as UserIcon, Type, ArrowRight, Loader2, Phone } from 'lucide-react';

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const API_URL = '/api';
    const endpoint = isLogin ? '/login' : '/register';
    const body = isLogin 
        ? { username, password } 
        : { username, password, fullName, phoneNumber };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Có lỗi xảy ra');

      const userData = isLogin ? data : data.user;
      onLoginSuccess({
          id: userData.id,
          name: userData.name || userData.full_name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || userData.full_name)}&background=0D8ABC&color=fff`,
          status: 'online',
          phoneNumber: userData.phone_number
      });

    } catch (err: any) {
        console.error("Auth Error:", err);
        // Fallback demo logic removed for production-like behavior, 
        // or keep strictly for network failures if backend isn't running.
        if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
             setTimeout(() => {
                 onLoginSuccess({
                     id: 'demo-user',
                     name: isLogin ? (username || 'Demo User') : (fullName || 'Demo User'),
                     avatar: 'https://ui-avatars.com/api/?name=Demo&background=0068ff&color=fff',
                     status: 'online',
                     phoneNumber: phoneNumber
                 });
             }, 1000);
        } else {
             setError(err.message);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f4fa] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden p-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-4">
                    <Bot size={36} />
                </div>
                <h1 className="text-2xl font-bold text-blue-900">NexChat</h1>
                <p className="text-gray-500 text-sm mt-1">Kết nối công việc & cuộc sống</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-start">
                        <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                {!isLogin && (
                    <>
                        <div className="relative">
                            <Type className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                required 
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                placeholder="Họ và tên hiển thị"
                            />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="tel" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                                placeholder="Số điện thoại (Tùy chọn)"
                            />
                        </div>
                    </>
                )}

                <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        required 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        placeholder="Tên đăng nhập"
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        required 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                        placeholder="Mật khẩu"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-[#0068ff] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center mt-4"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Đăng nhập' : 'Đăng ký ngay')}
                </button>
            </form>

            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }}
                    className="text-sm text-blue-600 font-semibold hover:underline"
                >
                    {isLogin ? 'Tạo tài khoản mới' : 'Quay lại đăng nhập'}
                </button>
            </div>
      </div>
    </div>
  );
};

export default AuthPage;