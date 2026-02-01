import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import MessageInput from './components/MessageInput';
import VideoCallModal from './components/VideoCallModal';
import { Channel, Message, MessageType, SenderType } from './types';
import { sendMessageStream } from './services/geminiService';
import { INITIAL_CHANNELS, MOCK_MESSAGES } from './constants';

// API Configuration
const API_URL = 'http://localhost:3001/api';

// Fallback ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('ai-assistant');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  // Load Channels from Backend with Fallback
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch(`${API_URL}/channels`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        setChannels(data);
        
        // Ensure AI assistant is always there locally if not in DB
        if (!data.find((c: Channel) => c.type === 'ai')) {
            setChannels(prev => [{ id: 'ai-assistant', name: 'AI Assistant', type: 'ai' }, ...prev]);
        }
      } catch (error) {
        console.warn("Backend unreachable, switching to offline mode:", error);
        // Fallback to mock data if DB is down or unreachable
        setChannels(INITIAL_CHANNELS);
      }
    };
    fetchChannels();
  }, []);

  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0] || { id: 'loading', name: 'Loading...', type: 'channel' };

  // Load Messages when active channel changes
  useEffect(() => {
    if (!activeChannelId) return;

    // AI Channel logic (Local RAM only for this demo)
    if (activeChannel.type === 'ai') {
        const aiWelcome: Message = { 
            id: 'ai-welcome', 
            channelId: 'ai-assistant', 
            senderId: 'Gemini', 
            senderType: SenderType.AI, 
            content: 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho công việc hôm nay?', 
            timestamp: Date.now(), 
            type: MessageType.TEXT 
        };
        // Check if we already have messages for this channel in a local cache (not implemented here) or just reset
        // For simplicity, reset to welcome message if empty
        setMessages([aiWelcome]);
        return;
    }

    const fetchMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messages/${activeChannelId}`);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        // Convert DB fields to match Frontend interface
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
        console.warn(`Failed to fetch messages for ${activeChannelId}, using mock data.`);
        // Fallback to mock messages
        const mockMsgs = MOCK_MESSAGES[activeChannelId] || [];
        setMessages(mockMsgs);
      }
    };

    fetchMessages();
    
    // Polling for new messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);

  }, [activeChannelId, activeChannel.type]);

  const updateAiMessage = useCallback((messageId: string, content: string, isStreaming: boolean) => {
    setMessages(prev => 
        prev.map(msg => 
            msg.id === messageId ? { ...msg, content, isStreaming } : msg
        )
    );
  }, []);

  const handleSendMessage = async (text: string, file?: File) => {
    const tempId = generateId();
    const timestamp = Date.now();
    
    // 1. Prepare User Message Object
    const userMsg: Message = {
      id: tempId,
      channelId: activeChannelId,
      senderId: 'Me', 
      senderType: SenderType.USER,
      content: text,
      timestamp: timestamp,
      type: file ? MessageType.FILE : MessageType.TEXT,
      fileName: file ? file.name : undefined
    };

    // 2. Optimistic UI Update (Show immediately)
    setMessages(prev => [...prev, userMsg]);

    // 3. Handle Logic based on Channel Type
    if (activeChannel.type === 'ai') {
        // --- AI LOGIC (Client-side directly to Gemini) ---
        setIsAiProcessing(true);
        const aiMsgId = generateId();
        
        const aiMsg: Message = {
            id: aiMsgId,
            channelId: activeChannelId,
            senderId: 'Gemini',
            senderType: SenderType.AI,
            content: '',
            timestamp: Date.now(),
            type: MessageType.TEXT,
            isStreaming: true
        };
        setMessages(prev => [...prev, aiMsg]);

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
            console.error("AI Error:", error);
            updateAiMessage(aiMsgId, "Lỗi kết nối tới AI.", false);
        } finally {
            setIsAiProcessing(false);
        }

    } else {
        // --- NORMAL CHAT LOGIC (Send to Backend DB) ---
        try {
            const response = await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channelId: activeChannelId,
                    senderId: 'Minh Nguyen', 
                    senderType: 'USER',
                    content: text,
                    type: file ? 'FILE' : 'TEXT',
                    fileName: file ? file.name : null
                })
            });
            if (!response.ok) throw new Error('Failed to send to server');
        } catch (error) {
            console.error("Failed to send message to backend (Offline mode active)", error);
            // In a real app, we might queue this message to retry later
        }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar 
        channels={channels} 
        activeChannelId={activeChannelId} 
        onSelectChannel={setActiveChannelId}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <ChatArea 
            messages={messages} 
            activeChannelName={activeChannel.name}
            isAiChannel={activeChannel.type === 'ai'}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onStartCall={() => setIsInCall(true)}
        />
        <MessageInput 
            onSendMessage={handleSendMessage} 
            disabled={isAiProcessing && activeChannel.type === 'ai'}
            placeholder={activeChannel.type === 'ai' ? "Hỏi gì đó với Gemini..." : `Gửi tin nhắn tới #${activeChannel.name}`}
        />
      </main>

      {isInCall && (
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