import { Channel, Message, MessageType, SenderType } from './types';

export const INITIAL_CHANNELS: Channel[] = [
  { id: 'ai-assistant', name: 'AI Assistant', type: 'ai' },
  { id: 'general', name: 'Thông báo chung', type: 'channel', unreadCount: 3 },
  { id: 'dev-team', name: 'Đội ngũ kỹ thuật', type: 'channel' },
  { id: 'marketing', name: 'Marketing', type: 'channel' },
  { id: 'random', name: 'Chém gió', type: 'channel' },
  { id: 'dm-1', name: 'Nguyễn Văn A', type: 'dm', avatar: 'https://picsum.photos/41/41', lastMessage: 'Okay, chốt vậy nhé.' },
  { id: 'dm-2', name: 'Trần Thị B', type: 'dm', avatar: 'https://picsum.photos/42/42', lastMessage: 'Gửi mình file báo cáo với.' },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  'general': [
    { id: '1', channelId: 'general', senderId: 'Admin', senderType: SenderType.OTHER, content: 'Chào mừng mọi người đến với hệ thống chat nội bộ NexChat!', timestamp: Date.now() - 10000000, type: MessageType.TEXT },
    { id: '2', channelId: 'general', senderId: 'Nguyễn Văn A', senderType: SenderType.OTHER, content: 'Giao diện đẹp quá admin ơi.', timestamp: Date.now() - 5000000, type: MessageType.TEXT },
  ],
  'ai-assistant': [
     { id: 'ai-welcome', channelId: 'ai-assistant', senderId: 'Gemini', senderType: SenderType.AI, content: 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho công việc hôm nay?', timestamp: Date.now(), type: MessageType.TEXT }
  ]
};