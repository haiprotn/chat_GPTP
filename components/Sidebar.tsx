import React from 'react';
import { Channel } from '../types';
import { Hash, User, Bot, Plus, Settings, LogOut, Menu } from 'lucide-react';

interface SidebarProps {
  channels: Channel[];
  activeChannelId: string;
  onSelectChannel: (channelId: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ channels, activeChannelId, onSelectChannel, isOpen, onCloseMobile }) => {
  const groupChannels = channels.filter(c => c.type === 'channel');
  const dms = channels.filter(c => c.type === 'dm');
  const aiChannels = channels.filter(c => c.type === 'ai');

  const navClass = `
    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out flex flex-col
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onCloseMobile}
        ></div>
      )}

      <aside className={navClass}>
        {/* Header */}
        <div className="h-16 flex items-center px-4 bg-slate-950 border-b border-slate-800 shadow-md">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold">N</span>
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight">NexChat</h1>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          {/* AI Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trợ lý AI</h2>
            </div>
            <ul>
              {aiChannels.map(channel => (
                <li key={channel.id}>
                  <button
                    onClick={() => { onSelectChannel(channel.id); onCloseMobile(); }}
                    className={`w-full flex items-center px-2 py-2 rounded-md transition-colors ${
                      activeChannelId === channel.id ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800'
                    }`}
                  >
                    <Bot size={18} className={`mr-2 ${activeChannelId === channel.id ? 'text-indigo-200' : 'text-indigo-400'}`} />
                    <span className="truncate text-sm font-medium">{channel.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Channels Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group cursor-pointer">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">Kênh chung</h2>
              <Plus size={14} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <ul className="space-y-0.5">
              {groupChannels.map(channel => (
                <li key={channel.id}>
                  <button
                    onClick={() => { onSelectChannel(channel.id); onCloseMobile(); }}
                    className={`w-full flex items-center px-2 py-2 rounded-md transition-colors ${
                      activeChannelId === channel.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'
                    }`}
                  >
                    <Hash size={16} className="mr-2 text-slate-500" />
                    <span className="truncate text-sm font-medium">{channel.name}</span>
                    {channel.unreadCount ? (
                       <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{channel.unreadCount}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* DMs Section */}
          <div>
            <div className="flex items-center justify-between px-2 mb-2 group cursor-pointer">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 group-hover:text-slate-400 transition-colors">Tin nhắn</h2>
              <Plus size={14} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>
            <ul className="space-y-0.5">
              {dms.map(channel => (
                <li key={channel.id}>
                  <button
                    onClick={() => { onSelectChannel(channel.id); onCloseMobile(); }}
                    className={`w-full flex items-center px-2 py-2 rounded-md transition-colors ${
                      activeChannelId === channel.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-800'
                    }`}
                  >
                    <div className="relative mr-2">
                        {channel.avatar ? (
                            <img src={channel.avatar} alt="" className="w-5 h-5 rounded-full" />
                        ) : (
                            <User size={16} className="text-slate-500" />
                        )}
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 border border-slate-900 rounded-full"></span>
                    </div>
                    <span className="truncate text-sm font-medium">{channel.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center">
            <img src="https://picsum.photos/40/40" alt="Me" className="w-9 h-9 rounded-full border border-slate-600" />
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Minh Nguyen</p>
              <p className="text-xs text-slate-400 truncate">Sẵn sàng</p>
            </div>
            <div className="flex space-x-1">
                <button className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors">
                    <Settings size={16} />
                </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;