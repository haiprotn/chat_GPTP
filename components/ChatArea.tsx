import React, { useEffect, useRef } from 'react';
import { Message, SenderType } from '../types';
import ReactMarkdown from 'react-markdown';
import { Bot, User as UserIcon, Loader2, File, Download, Video, Phone } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  activeChannelName: string;
  isAiChannel: boolean;
  onOpenSidebar: () => void;
  onStartCall: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, activeChannelName, isAiChannel, onOpenSidebar, onStartCall }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={onOpenSidebar} className="mr-3 md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          </button>
          <div className="flex items-center">
            {isAiChannel ? (
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-3">
                    <Bot size={20} />
                </div>
            ) : (
                 <div className="w-8 h-8 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center mr-3 font-semibold">
                    #
                </div>
            )}
            <div>
                <h2 className="text-base font-bold text-gray-900">{activeChannelName}</h2>
                {isAiChannel && <p className="text-xs text-indigo-500 font-medium">Được hỗ trợ bởi Gemini 3 Flash</p>}
            </div>
          </div>
        </div>
        {/* Right actions */}
        <div className="flex items-center space-x-1 text-gray-400">
             <button 
                onClick={onStartCall}
                className="p-2 hover:bg-gray-100 hover:text-indigo-600 rounded-full transition-colors"
                title="Gọi Video"
             >
                <Video size={20} />
             </button>
             <button className="p-2 hover:bg-gray-100 hover:text-green-600 rounded-full transition-colors hidden sm:block">
                <Phone size={20} />
             </button>
             <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="p-2 box-content cursor-pointer hover:text-gray-600"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="p-2 box-content cursor-pointer hover:text-gray-600"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                {isAiChannel ? (
                    <>
                        <Bot size={48} className="mb-2 text-indigo-300" />
                        <p>Bắt đầu trò chuyện với AI...</p>
                    </>
                ) : (
                    <>
                         <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">#</div>
                        <p>Đây là khởi đầu của kênh {activeChannelName}</p>
                    </>
                )}
            </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.senderType === SenderType.USER;
          const isAi = msg.senderType === SenderType.AI;
          const showAvatar = index === 0 || messages[index - 1].senderId !== msg.senderId || (msg.timestamp - messages[index-1].timestamp > 60000);

          return (
            <div 
                key={msg.id} 
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isMe ? 'ml-3' : 'mr-3'} w-8`}>
                  {showAvatar ? (
                    isAi ? (
                        <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                            <Bot size={16} className="text-white" />
                        </div>
                    ) : isMe ? (
                        <img src="https://picsum.photos/40/40" alt="Me" className="w-8 h-8 rounded-full border border-gray-200" />
                    ) : (
                         <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {msg.senderId.substring(0,2).toUpperCase()}
                        </div>
                    )
                  ) : <div className="w-8" />}
                </div>

                {/* Content Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && !isMe && (
                      <span className="text-xs text-gray-500 font-medium mb-1 ml-1">
                          {isAi ? 'NexChat AI' : msg.senderId}
                      </span>
                  )}
                  
                  <div 
                    className={`
                      relative px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed
                      ${isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : isAi 
                            ? 'bg-white border border-indigo-100 text-gray-800 rounded-tl-none shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
                      }
                    `}
                  >
                     <div className={`
                        markdown-body prose prose-sm max-w-none 
                        prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0
                        ${isMe 
                            ? 'prose-invert text-white prose-p:text-white prose-headings:text-white prose-a:text-blue-100 prose-code:text-blue-100 prose-code:bg-blue-700/50 prose-pre:bg-blue-800 prose-strong:text-white' 
                            : 'prose-code:bg-gray-100 prose-code:text-indigo-600 prose-code:rounded prose-code:px-1 prose-pre:bg-gray-900 prose-pre:text-gray-100'
                        }
                     `}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                        {msg.isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse align-middle"></span>}
                     </div>

                    {/* File Attachment Mockup */}
                    {msg.type === 'FILE' && msg.fileName && (
                         <div className={`flex items-center mt-2 p-2 rounded-lg ${isMe ? 'bg-blue-700/50' : 'bg-gray-100'} max-w-full overflow-hidden`}>
                            <File size={20} className="flex-shrink-0 mr-2" />
                            <span className="truncate flex-1 font-medium">{msg.fileName}</span>
                            <Download size={16} className="ml-2 cursor-pointer opacity-70 hover:opacity-100" />
                         </div>
                    )}

                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[10px] text-gray-400 mt-1 mx-1">
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