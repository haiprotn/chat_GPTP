-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums based on application types (matching types.ts)
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'FILE');
CREATE TYPE sender_type AS ENUM ('USER', 'OTHER', 'AI');
CREATE TYPE channel_type AS ENUM ('channel', 'dm', 'ai');
CREATE TYPE user_status AS ENUM ('online', 'offline', 'busy');

-- Users table: Stores user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    status user_status DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels table: Stores channels and DM conversations
-- ID is VARCHAR(50) here to support the string IDs used in the frontend demo (e.g., 'general'). 
-- In a pure production DB, you might prefer UUIDs everywhere.
CREATE TABLE channels (
    id VARCHAR(50) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    type channel_type NOT NULL,
    avatar_url TEXT, -- Specific for DM channels
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channel Members: Tracks which users are in which channel
CREATE TABLE channel_members (
    channel_id VARCHAR(50) REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

-- Messages table: Stores all chat history
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(50) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    -- sender_id is flexible (VARCHAR) to allow 'Gemini' or system messages 
    -- that don't map to a UUID user. For real users, this stores their UUID string.
    sender_id VARCHAR(255) NOT NULL, 
    sender_type sender_type NOT NULL,
    content TEXT,
    file_name TEXT,
    file_url TEXT,
    timestamp BIGINT NOT NULL, -- Storing Unix timestamp (ms) for frontend compatibility
    type message_type DEFAULT 'TEXT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
-- Quickly load messages for a channel, sorted by time
CREATE INDEX idx_messages_channel_timestamp ON messages(channel_id, timestamp DESC);

-- DATA SEEDING (Dữ liệu mẫu)

-- 1. Insert Channels
INSERT INTO channels (id, name, type) VALUES
('ai-assistant', 'AI Assistant', 'ai'),
('general', 'Thông báo chung', 'channel'),
('dev-team', 'Đội ngũ kỹ thuật', 'channel'),
('marketing', 'Marketing', 'channel'),
('random', 'Chém gió', 'channel');

-- 2. Insert DM Channels
INSERT INTO channels (id, name, type, avatar_url) VALUES
('dm-1', 'Nguyễn Văn A', 'dm', 'https://picsum.photos/41/41'),
('dm-2', 'Trần Thị B', 'dm', 'https://picsum.photos/42/42');

-- 3. Insert Sample Messages
-- Note: Timestamp values are examples.
INSERT INTO messages (channel_id, sender_id, sender_type, content, timestamp, type) VALUES
('general', 'Admin', 'OTHER', 'Chào mừng mọi người đến với hệ thống chat nội bộ NexChat!', 1672531200000, 'TEXT'),
('general', 'Nguyễn Văn A', 'OTHER', 'Giao diện đẹp quá admin ơi.', 1672534800000, 'TEXT'),
('ai-assistant', 'Gemini', 'AI', 'Xin chào! Tôi là trợ lý AI của bạn. Tôi có thể giúp gì cho công việc hôm nay?', 1704067200000, 'TEXT');
