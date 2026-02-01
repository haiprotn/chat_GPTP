import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import VideoCallModal from './components/VideoCallModal';
import AddFriendModal from './components/AddFriendModal'; // New Modal
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
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false); // Modal state
  
  const [mobileTab, setMobileTab] = useState<'chats' | 'contacts' | 'me'>('chats');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Store last known message timestamp for each channel to detect new ones
  const channelTimestampsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    // Request notification permission on load
    if ('Notification' in window && Notification.permission !== 'granted') {
       Notification.requestPermission();
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sendNotification = (title: string, body: string, icon?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Check if window is hidden (tab inactive/minimized)
      if (document.visibilityState === 'hidden') {
         const notification = new Notification(title, {
           body: body,
           icon: icon || '/vite.svg',
           tag: 'nexchat-message' // Prevent duplicate spam
         });
         notification.onclick = () => {
           window.focus();
           notification.close();
         };
      }
    }
  };

  // Update logic to fetch channels specific to user (using updated backend)
  useEffect(() => {
    if (!currentUser) return;
    const fetchChannels = async () => {
      try {
        const response = await fetch(`${API_URL}/channels/${currentUser.id}`); // Endpoint updated to support User specific channels
        if (!response.ok) throw new Error('Network error');
        const data: Channel[] = await response.json();
        
        // Check for new messages for notification
        data.forEach(ch => {
            const prevTime = channelTimestampsRef.current[ch.id] || 0;
            const newTime = ch.lastMessageTime || 0;
            
            // If new message exists AND it's newer than what we knew AND it's not sent by me
            if (newTime > prevTime && prevTime !== 0) { // prevTime !== 0 ensures we don't notify on initial load
                if (ch.lastMessageSender !== currentUser.name) {
                     // Condition: Notify if tab is hidden OR if the message is from a channel NOT currently active
                     if (document.visibilityState === 'hidden' || ch.id !== activeChannelId) {
                         sendNotification(ch.name, ch.lastMessage || 'Tin nhắn mới', ch.avatar);
                     }
                }
            }
            // Update ref
            channelTimestampsRef.current[ch.id] = newTime;
        });

        // Initial population of ref without notifying
        if (Object.keys(channelTimestampsRef.current).length === 0) {
            data.forEach(ch => {
                channelTimestampsRef.current[ch.id] = ch.lastMessageTime || 0;
            });
        }

        setChannels(data);
      } catch (error) {
        setChannels(INITIAL_CHANNELS);
      }
    };
    fetchChannels();
    const interval = setInterval(fetchChannels, 5000); // Poll channels for new DMs
    return () => clearInterval(interval);
  }, [currentUser, activeChannelId]);

  // Handle auto-select (only if channels load and desktop)
  useEffect(() => {
     if (!isMobile && !activeChannelId && channels.length > 0) {
        // Prefer AI or first channel
        const defaultCh = channels.find(c => c.type === 'ai') || channels[0];
        setActiveChannelId(defaultCh.id);
     }
  }, [channels, isMobile]);

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
        setMessages([]);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);

  }, [activeChannelId, activeChannel?.id, currentUser]); // Use ID dependency safely

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
        } catch (error: any) {
            console.error("AI Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Lỗi kết nối AI.";
            updateAiMessage(aiMsgId, `⚠️ ${errorMessage}`, false);
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
            // Update local timestamp to prevent notification for own message
            channelTimestampsRef.current[activeChannelId] = Date.now();
        } catch (error) {
            console.error("Failed to send", error);
        }
    }
  };

  const handleStartChat = async (targetUserId: string) => {
      if (!currentUser) return;
      try {
          const res = await fetch(`${API_URL}/channels/dm`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ user1Id: currentUser.id, user2Id: targetUserId })
          });
          const channel = await res.json();
          // Force reload channels or manually add to state
          setChannels(prev => {
              if (prev.find(p => p.id === channel.id)) return prev;
              return [channel, ...prev]; // Add to top
          });
          setActiveChannelId(channel.id);
      } catch (e) {
          console.error("Cannot create DM", e);
      }
  };

  const handleAddFriendCurrentChat = async () => {
      setShowAddFriend(true);
  };

  if (!currentUser) return <AuthPage onLoginSuccess={setCurrentUser} />;

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-white">
      
      {/* Sidebar */}
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
            onOpenAddFriend={() => setShowAddFriend(true)}
          />
          
          <div className="md:hidden h-14 bg-white border-t border-gray-200 flex justify-around items-center absolute bottom-0 w-full z-10 safe-bottom">
             <button onClick={() => setMobileTab('chats')} className={`flex flex-col items-center p-1 ${mobileTab === 'chats' ? 'text-blue-600' : 'text-gray-400'}`}><MessageCircle size={22} /><span className="text-[10px] mt-0.5">Tin nhắn</span></button>
             <button onClick={() => { setMobileTab('contacts'); }} className={`flex flex-col items-center p-1 ${mobileTab === 'contacts' ? 'text-blue-600' : 'text-gray-400'}`}><Users size={22} /><span className="text-[10px] mt-0.5">Danh bạ</span></button>
             <button onClick={() => setMobileTab('me')} className={`flex flex-col items-center p-1 ${mobileTab === 'me' ? 'text-blue-600' : 'text-gray-400'}`}><UserIcon size={22} /><span className="text-[10px] mt-0.5">Cá nhân</span></button>
          </div>
      </div>
      
      {/* Chat Area */}
      {activeChannelId && (
        <main className={`
            flex flex-col bg-[#eef0f1]
            ${isMobile ? 'fixed inset-0 z-50 w-full h-[100dvh]' : 'flex-1 min-w-0 h-full relative'}
        `}>
            <ChatArea 
                messages={messages} 
                activeChannelName={activeChannel?.name || 'Loading...'}
                isAiChannel={activeChannel?.type === 'ai'}
                isFriend={activeChannel?.isFriend}
                onBackToMenu={() => setActiveChannelId(null)}
                onStartCall={() => setIsInCall(true)}
                onAddFriend={handleAddFriendCurrentChat}
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

      {/* Add Friend Modal */}
      {showAddFriend && (
          <AddFriendModal 
            onClose={() => setShowAddFriend(false)}
            currentUserId={currentUser.id}
            onStartChat={handleStartChat}
          />
      )}
    </div>
  );
};

export default App;