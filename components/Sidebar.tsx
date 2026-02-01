import React, { useState } from 'react';
import { Channel, User as UserType } from '../types';
import { Search, Bot, Users, MessageCircle, Plus, LogOut, Video } from 'lucide-react';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isMobileView?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ channels, activeChannelId, onSelectChannel, currentUser, onLogout, isMobileView }) => {
  const [activeTab, setActiveTab] = useState<'messages' | 'contacts'>('messages');
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc channels dựa trên tab và search
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'messages') {
        // Tab tin nhắn hiện tất cả các cuộc hội thoại gần đây
        return true; 
    } else {
        // Tab danh bạ chỉ hiện người hoặc nhóm
        return channel.type !== 'ai';
    }
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80 shadow-sm">
      
      {/* Header & Search */}
      <div className="px-4 py-3 bg-white z-10">
        <div className="flex items-center justify-between mb-3">
             <div className="flex items-center space-x-2">
                 <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="Avatar"/>
                 <span className="font-bold text-gray-800 text-lg">Tin nhắn</span>
             </div>
             <button title="Tạo mới" className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md">
                 <Plus size={20} />
             </button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Tìm kiếm bạn bè, tin nhắn..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
        </div>
      </div>

      {/* Tabs (Giống Zalo PC) */}
      <div className="flex border-b border-gray-100 px-2">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Tất cả
          </button>
          <button 
             onClick={() => setActiveTab('contacts')}
             className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Phân loại
          </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredChannels.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                 <p className="text-sm">Không tìm thấy kết quả</p>
             </div>
        ) : (
            <ul className="divide-y divide-gray-50">
            {filteredChannels.map(channel => {
                const isActive = activeChannelId === channel.id && !isMobileView; // Trên mobile không highlight khi chưa vào
                
                return (
                    <li key={channel.id}>
                    <button
                        onClick={() => onSelectChannel(channel.id)}
                        className={`w-full flex items-center px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50' : ''}`}
                    >
                        <div className="relative mr-3.5">
                            {channel.type === 'ai' ? (
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200">
                                    <Bot size={24} className="text-blue-600" />
                                </div>
                            ) : channel.type === 'channel' ? (
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                                    <Users size={20} className="text-gray-500" />
                                </div>
                            ) : (
                                <img src={channel.avatar || 'https://via.placeholder.com/48'} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                            )}
                            
                            {/* Online status dot */}
                            {channel.type === 'dm' && (
                                <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className={`truncate text-[15px] ${isActive ? 'font-bold text-blue-900' : 'font-medium text-gray-900'}`}>
                                    {channel.name}
                                </h3>
                                <span className="text-[11px] text-gray-400 font-medium">12:30</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`truncate text-[13px] pr-2 ${channel.unreadCount ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                                    {channel.type === 'ai' ? 'Tôi có thể giúp gì cho bạn?' : (channel.lastMessage || 'Bạn: Hình ảnh đính kèm')}
                                </p>
                                {channel.unreadCount && (
                                    <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                                        {channel.unreadCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
                    </li>
                );
            })}
            </ul>
        )}
      </div>

      {/* Logout / User Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
              {currentUser?.status === 'online' ? '● Đang hoạt động' : '○ Ngoại tuyến'}
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
              <LogOut size={14} className="mr-1" /> Đăng xuất
          </button>
      </div>
    </div>
  );
};

export default Sidebar;