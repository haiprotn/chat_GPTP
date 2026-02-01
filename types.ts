export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE'
}

export enum SenderType {
  USER = 'USER',
  OTHER = 'OTHER',
  AI = 'AI'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  username?: string;
  phoneNumber?: string;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  timestamp: number;
  type: MessageType;
  fileName?: string;
  isStreaming?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  type: 'channel' | 'dm' | 'ai';
  unreadCount?: number;
  lastMessage?: string;
  avatar?: string;
  isFriend?: boolean; // Cờ đánh dấu đã là bạn bè chưa (cho DM)
}

export interface AIConfig {
  model: string;
  temperature: number;
}