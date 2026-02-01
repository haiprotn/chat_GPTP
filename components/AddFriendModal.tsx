import React, { useState } from 'react';
import { Search, UserPlus, MessageCircle, Check, Clock, X } from 'lucide-react';
import { User } from '../types';

interface SearchUserResult extends User {
    relationship: 'FRIEND' | 'SENT' | 'RECEIVED' | 'NONE';
    full_name: string; // From DB
}

interface AddFriendModalProps {
    onClose: () => void;
    currentUserId: string;
    onStartChat: (targetUserId: string) => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ onClose, currentUserId, onStartChat }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchUserResult[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&currentUserId=${currentUserId}`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (receiverId: string) => {
        try {
            const res = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senderId: currentUserId, receiverId })
            });
            if (res.ok) {
                // Update Local UI state
                setResults(prev => prev.map(u => u.id === receiverId ? { ...u, relationship: 'SENT' } : u));
            }
        } catch (error) {
            console.error("Failed to send request", error);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg">Thêm bạn bè</h3>
                    <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded-full"><X size={20} /></button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative flex items-center">
                        <input 
                            type="text" 
                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Nhập tên, số điện thoại hoặc username..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button 
                            onClick={handleSearch}
                            className="absolute right-2 p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                        >
                            <Search size={18} />
                        </button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Đang tìm kiếm...</div>
                    ) : results.length === 0 && query ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Không tìm thấy người dùng nào.</div>
                    ) : (
                        <div className="space-y-1">
                            {results.map(user => (
                                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <img 
                                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=random`} 
                                            alt="" 
                                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                        />
                                        <div>
                                            <h4 className="font-semibold text-gray-800 text-sm">{user.full_name}</h4>
                                            <p className="text-xs text-gray-500">@{user.username}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        {/* Nút Chat luôn hiện (Chat Stranger) */}
                                        <button 
                                            onClick={() => {
                                                onStartChat(user.id);
                                                onClose();
                                            }}
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"
                                            title="Nhắn tin"
                                        >
                                            <MessageCircle size={18} />
                                        </button>

                                        {/* Nút Kết bạn xử lý theo trạng thái */}
                                        {user.relationship === 'NONE' && (
                                            <button 
                                                onClick={() => handleSendRequest(user.id)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-full flex items-center"
                                            >
                                                <UserPlus size={14} className="mr-1" /> Kết bạn
                                            </button>
                                        )}
                                        {user.relationship === 'SENT' && (
                                            <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-full flex items-center">
                                                <Clock size={14} className="mr-1" /> Đã gửi
                                            </span>
                                        )}
                                        {user.relationship === 'FRIEND' && (
                                            <span className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-medium rounded-full flex items-center">
                                                <Check size={14} className="mr-1" /> Bạn bè
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddFriendModal;