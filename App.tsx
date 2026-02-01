import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import VideoCallModal from './components/VideoCallModal';
import AuthPage from './components/AuthPage';
import { Channel, Message, MessageType, SenderType, User } from './types';
import { sendMessageStream } from './services/geminiService';
import { INITIAL_CHANNELS, MOCK_MESSAGES } from './constants';
import { MessageCircle, Users, User as UserIcon } from 'lucide-react';

const API_URL = '/api';
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null); // Nullable for mobile state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  
  // Mobile Navigation State
  const [mobileTab, setMobileTab] = useState<'chats' | 'contacts' | 'me'>('chats');

  // Detect Mobile (Simple width check for rendering logic)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto select first channel on desktop
  useEffect(() => {
    if (!isMobile && !activeChannelId && channels.length > 0) {
        setActiveChannelId(channels[0].id);
    }
  }, [channels, isMobile]);

  // Load Channels
  useEffect(() => {
    if (!currentUser) return;
    const fetchChannels = async () => {
      try {
        const response = await fetch(`${API_URL}/channels`);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        setChannels(data);
        if (!data.find((c: Channel) => c.type === 'ai')) {
            setChannels(prev => [{ id: 'ai-assistant', name: 'AI Assistant', type: 'ai' }, ...prev]);
        }
      } catch (error) {
        setChannels(INITIAL_CHANNELS);
      }
    };
    fetchChannels();
  }, [currentUser]);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // Load Messages
  useEffect(() => {
    if (!currentUser || !activeChannelId || !activeChannel) return;

    if (activeChannel.type === 'ai') {
        const aiWelcome: Message = { 
            id: 'ai-welcome', 
            channelId: 'ai-assistant', 
            senderId: 'Gemini', 
            senderType: SenderType.AI, 
            content: `Xin chào ${currentUser.name}! Tôi là trợ lý AI.`, 
            timestamp: Date.now(), 
            type: MessageType.TEXT 
        };
        setMessages([aiWelcome]);
        return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messages/${activeChannelId}`);
        if (!response.ok) throw new Error('Error');
        const data = await response.json();
        const formattedMessages = data.map((msg: any) => ({
            id: msg.id,
            channelId: msg.channel_id,
            senderId: msg.sender_id,
            senderType: msg.sender_type,
            content: msg.content,
            timestamp: parseInt(msg.timestamp),
            type: msg.type,
            fileName: msg.file_name
        }));
        setMessages(formattedMessages);
      } catch (error) {
        const mockMsgs = MOCK_MESSAGES[activeChannelId] || [];
        setMessages(mockMsgs);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);

  }, [activeChannelId, activeChannel, currentUser]);

  const updateAiMessage = useCallback((messageId: string, content: string, isStreaming: boolean) => {
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, content, isStreaming } : msg));
  }, []);

  const handleSendMessage = async (text: string, file?: File) => {
    if (!currentUser || !activeChannelId) return;

    const tempId = generateId();
    const userMsg: Message = {
      id: tempId,
      channelId: activeChannelId,
      senderId: currentUser.name, 
      senderType: SenderType.USER,
      content: text,
      timestamp: Date.now(),
      type: file ? MessageType.FILE : MessageType.TEXT,
      fileName: file ? file.name : undefined
    };

    setMessages(prev => [...prev, userMsg]);

    if (activeChannel?.type === 'ai') {
        setIsAiProcessing(true);
        const aiMsgId = generateId();
        setMessages(prev => [...prev, {
            id: aiMsgId,
            channelId: activeChannelId,
            senderId: 'Gemini',
            senderType: SenderType.AI,
            content: '',
            timestamp: Date.now(),
            type: MessageType.TEXT,
            isStreaming: true
        }]);

        try {
            let prompt = text;
            if (file) prompt = `[File: ${file.name}]. ${text}`;
            const stream = sendMessageStream(prompt);
            let fullText = "";
            for await (const chunk of stream) {
                fullText += chunk;
                updateAiMessage(aiMsgId, fullText, true);
            }
            updateAiMessage(aiMsgId, fullText, false);
        } catch (error) {
            updateAiMessage(aiMsgId, "Lỗi kết nối AI.", false);
        } finally {
            setIsAiProcessing(false);
        }
    } else {
        try {
            await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: activeChannelId,
                    senderId: currentUser.name, 
                    senderType: 'USER',
                    content: text,
                    type: file ? 'FILE' : 'TEXT',
                    fileName: file ? file.name : null
                })
            });
        } catch (error) {
            console.error("Failed to send", error);
        }
    }
  };

  if (!currentUser) return <AuthPage onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white">
      
      {/* 
        LAYOUT STRATEGY:
        - Mobile: Sidebar is visible. If a channel is selected, ChatArea overlays everything (fixed).
        - Desktop: Sidebar (w-80) | ChatArea (flex-1)
      */}

      {/* --- SIDEBAR AREA (Desktop: Always, Mobile: Only if no chat active or active but z-index lower) --- */}
      <div className={`
        flex-shrink-0 w-full md:w-80 h-full bg-white z-0
        ${isMobile && activeChannelId ? 'hidden' : 'block'} 
        md:block
      `}>
          <Sidebar 
            channels={channels} 
            activeChannelId={activeChannelId || ''} 
            onSelectChannel={setActiveChannelId}
            currentUser={currentUser}
            onLogout={() => setCurrentUser(null)}
            isMobileView={isMobile}
          />
          
          {/* Mobile Bottom Nav */}
          <div className="md:hidden h-14 bg-white border-t border-gray-200 flex justify-around items-center absolute bottom-0 w-full z-10 safe-bottom">
             <button 
                onClick={() => setMobileTab('chats')} 
                className={`flex flex-col items-center p-1 ${mobileTab === 'chats' ? 'text-blue-600' : 'text-gray-400'}`}
             >
                <MessageCircle size={22} fill={mobileTab === 'chats' ? "currentColor" : "none"} />
                <span className="text-[10px] font-medium mt-0.5">Tin nhắn</span>
             </button>
             <button 
                onClick={() => setMobileTab('contacts')} 
                className={`flex flex-col items-center p-1 ${mobileTab === 'contacts' ? 'text-blue-600' : 'text-gray-400'}`}
             >
                <Users size={22} />
                <span className="text-[10px] font-medium mt-0.5">Danh bạ</span>
             </button>
             <button 
                onClick={() => setMobileTab('me')} 
                className={`flex flex-col items-center p-1 ${mobileTab === 'me' ? 'text-blue-600' : 'text-gray-400'}`}
             >
                <UserIcon size={22} />
                <span className="text-[10px] font-medium mt-0.5">Cá nhân</span>
             </button>
          </div>
      </div>
      
      {/* --- CHAT AREA (Desktop: Flex-1, Mobile: Overlay Full Screen) --- */}
      {activeChannelId && (
        <main className={`
            flex flex-col bg-[#eef0f1]
            ${isMobile 
                ? 'fixed inset-0 z-50 w-full h-[100dvh]' // Mobile Overlay
                : 'flex-1 min-w-0 h-full relative' // Desktop Flex
            }
        `}>
            <ChatArea 
                messages={messages} 
                activeChannelName={activeChannel?.name || 'Loading...'}
                isAiChannel={activeChannel?.type === 'ai'}
                onBackToMenu={() => setActiveChannelId(null)}
                onStartCall={() => setIsInCall(true)}
            />
            <MessageInput 
                onSendMessage={handleSendMessage} 
                disabled={isAiProcessing && activeChannel?.type === 'ai'}
            />
        </main>
      )}

      {isInCall && activeChannel && (
        <VideoCallModal 
            recipientName={activeChannel.name}
            isAiCall={activeChannel.type === 'ai'}
            onEndCall={() => setIsInCall(false)}
        />
      )}
    </div>
  );
};

export default App;