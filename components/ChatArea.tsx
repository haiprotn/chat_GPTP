import React, { useEffect, useRef } from 'react';
import { Message, SenderType } from '../types';
import ReactMarkdown from 'react-markdown';
import { Bot, Video, Phone, ArrowLeft, MoreHorizontal, Image as ImageIcon, Paperclip } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  activeChannelName: string;
  isAiChannel: boolean;
  onBackToMenu: () => void; // Cho mobile
  onStartCall: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, activeChannelName, isAiChannel, onBackToMenu, onStartCall }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#eef0f1] relative">
      
      {/* Header - Zalo Style (Trắng, Clean) */}
      <header className="h-16 flex items-center justify-between px-3 md:px-4 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center">
          {/* Nút Back chỉ hiện trên Mobile thông qua điều khiển từ App.tsx nhưng ở đây ta cứ render, App sẽ ẩn hiện ChatArea */}
          <button onClick={onBackToMenu} className="mr-3 md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={22} />
          </button>
          
          <div className="flex items-center">
            {isAiChannel ? (
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 border border-blue-100">
                    <Bot size={22} />
                </div>
            ) : (
                 <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center mr-3 font-bold text-sm shadow-sm">
                    {activeChannelName.substring(0, 1).toUpperCase()}
                </div>
            )}
            <div>
                <h2 className="text-base font-bold text-gray-900 leading-tight">{activeChannelName}</h2>
                <div className="flex items-center text-xs text-gray-500 mt-0.5">
                    {isAiChannel ? (
                         <span className="text-blue-500 font-medium">Luôn sẵn sàng hỗ trợ</span>
                    ) : (
                         <>
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                            <span>Vừa mới truy cập</span>
                         </>
                    )}
                </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
             <button onClick={onStartCall} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Phone size={20} />
             </button>
             <button onClick={onStartCall} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Video size={22} />
             </button>
             <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                <MoreHorizontal size={22} />
             </button>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 md:space-y-6 bg-[#b2c7d6]/10">
        {/* Nền background pattern mờ nếu muốn */}
        
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-70">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    {isAiChannel ? <Bot size={40} className="text-blue-400" /> : <ImageIcon size={40} className="text-gray-300" />}
                </div>
                <p className="text-sm font-medium">Bắt đầu trò chuyện ngay bây giờ</p>
            </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.senderType === SenderType.USER;
          const isAi = msg.senderType === SenderType.AI;
          const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId || (msg.timestamp - messages[index-1].timestamp > 60000);

          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group`}>
              <div className={`flex max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isMe ? 'ml-2' : 'mr-2'} w-8 flex flex-col justify-end`}>
                  {showAvatar && !isMe ? (
                    isAi ? (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shadow-sm border border-blue-200">
                            <Bot size={16} className="text-blue-600" />
                        </div>
                    ) : (
                         <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                            {msg.senderId.substring(0,1)}
                        </div>
                    )
                  ) : <div className="w-8" />}
                </div>

                {/* Content Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && !isMe && (
                      <span className="text-[10px] text-gray-500 font-medium mb-1 ml-2">
                          {isAi ? 'NexChat AI' : msg.senderId}
                      </span>
                  )}
                  
                  <div 
                    className={`
                      relative px-4 py-2.5 shadow-sm text-[15px] leading-relaxed break-words
                      ${isMe 
                        ? 'bg-[#0068ff] text-white rounded-2xl rounded-tr-sm' // Zalo Blue
                        : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                      }
                    `}
                  >
                     <div className={`
                        markdown-body prose prose-sm max-w-none 
                        prose-p:my-0 prose-headings:my-1 prose-ul:my-0 prose-li:my-0
                        ${isMe 
                            ? 'prose-invert text-white prose-a:text-blue-100 prose-code:bg-blue-700/50' 
                            : 'text-gray-800 prose-code:bg-gray-100 prose-a:text-blue-600'
                        }
                     `}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.isStreaming && <span className="inline-block w-1.5 h-3.5 ml-1 bg-current opacity-70 animate-pulse align-middle">|</span>}
                     </div>

                    {/* File Attachment */}
                    {msg.type === 'FILE' && msg.fileName && (
                         <div className={`flex items-center mt-2 p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-gray-100'} max-w-full`}>
                            <Paperclip size={18} className="flex-shrink-0 mr-2 opacity-80" />
                            <span className="truncate flex-1 text-sm">{msg.fileName}</span>
                         </div>
                    )}
                  </div>
                  
                  {/* Timestamp - Only show on hover or for last message */}
                  <span className="text-[10px] text-gray-400 mt-1 mx-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea;