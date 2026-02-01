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
  avatar?: string; // For DMs
}

export interface AIConfig {
  model: string;
  temperature: number;
}