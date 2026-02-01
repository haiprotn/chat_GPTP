import React, { useState, useEffect } from 'react';
import { Channel, User as UserType, FriendRequest } from '../types';
import { Search, Bot, Users, MessageCircle, Plus, LogOut, Video, UserPlus, Check, X } from 'lucide-react';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  currentUser: UserType | null;
  onLogout: () => void;
  isMobileView?: boolean;
  onOpenAddFriend: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ channels, activeChannelId, onSelectChannel, currentUser, onLogout, isMobileView, onOpenAddFriend }) => {
  const [activeTab, setActiveTab] = useState<'messages' | 'contacts'>('messages');
  const [searchTerm, setSearchTerm] = useState('');
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Fetch friend requests periodically
  useEffect(() => {
    if (!currentUser) return;
    const fetchRequests = async () => {
        try {
            const res = await fetch(`/api/friends/requests/${currentUser.id}`);
            if (res.ok) {
                const data = await res.json();
                setFriendRequests(data);
            }
        } catch (e) { console.error(e); }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleAcceptRequest = async (req: FriendRequest) => {
      try {
          await fetch('/api/friends/accept', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ requestId: req.id, senderId: req.senderId, receiverId: currentUser?.id })
          });
          // Remove from local list
          setFriendRequests(prev => prev.filter(r => r.id !== req.id));
      } catch (e) { console.error(e); }
  };

  // Logic hiển thị
  const renderContent = () => {
    if (activeTab === 'contacts') {
        // --- CONTACTS TAB: Show Requests + Friends (Friends are technically DM channels in this simple app logic) ---
        const friendChannels = channels.filter(c => c.type === 'dm' && c.isFriend);
        
        return (
            <div className="pb-4">
                {/* Pending Requests Section */}
                {friendRequests.length > 0 && (
                    <div className="mb-4">
                        <h4 className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Lời mời kết bạn ({friendRequests.length})</h4>
                        <ul>
                            {friendRequests.map(req => (
                                <li key={req.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <img src={req.senderAvatar} className="w-10 h-10 rounded-full" alt=""/>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{req.senderName}</p>
                                            <p className="text-xs text-gray-500">Muốn kết bạn</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-1">
                                        <button onClick={() => handleAcceptRequest(req)} className="p-1.5 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"><Check size={16}/></button>
                                        <button className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200"><X size={16}/></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Friend List Section */}
                 <h4 className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">Bạn bè ({friendChannels.length})</h4>
                 {friendChannels.length === 0 ? (
                     <div className="p-4 text-center text-sm text-gray-400">Chưa có bạn bè nào</div>
                 ) : (
                     <ul>
                        {friendChannels.map(channel => (
                            <li key={channel.id}>
                                <button onClick={() => onSelectChannel(channel.id)} className="w-full flex items-center px-4 py-2 hover:bg-gray-50">
                                    <img src={channel.avatar} className="w-10 h-10 rounded-full border border-gray-200 mr-3" alt="" />
                                    <span className="text-sm font-medium text-gray-900">{channel.name}</span>
                                </button>
                            </li>
                        ))}
                     </ul>
                 )}
            </div>
        );
    }

    // --- MESSAGES TAB ---
    const displayedChannels = channels.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return (
        <ul className="divide-y divide-gray-50">
            {displayedChannels.map(channel => {
                const isActive = activeChannelId === channel.id && !isMobileView;
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
                                    {channel.type === 'ai' ? 'Tôi có thể giúp gì cho bạn?' : (channel.lastMessage || 'Tin nhắn mới')}
                                </p>
                            </div>
                        </div>
                    </button>
                    </li>
                );
            })}
        </ul>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-80 shadow-sm">
      
      {/* Header & Search */}
      <div className="px-4 py-3 bg-white z-10">
        <div className="flex items-center justify-between mb-3">
             <div className="flex items-center space-x-2">
                 <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="Avatar"/>
                 <span className="font-bold text-gray-800 text-lg">Tin nhắn</span>
             </div>
             <button 
                onClick={onOpenAddFriend}
                title="Thêm bạn" 
                className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
                 <UserPlus size={20} />
             </button>
        </div>
        
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-2">
          <button 
            onClick={() => setActiveTab('messages')}
            className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'messages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Tin nhắn
          </button>
          <button 
             onClick={() => setActiveTab('contacts')}
             className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Danh bạ
            {friendRequests.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1 rounded-full">{friendRequests.length}</span>}
          </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {renderContent()}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="text-xs text-gray-500">
              {currentUser?.status === 'online' ? '● Đang hoạt động' : '○ Ngoại tuyến'}
          </div>
          <button onClick={onLogout} className="flex items-center text-xs font-medium text-gray-500 hover:text-red-600 transition-colors">
              <LogOut size={14} className="mr-1" /> Đăng xuất
          </button>
      </div>
    </div>
  );
};

export default Sidebar;