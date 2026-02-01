
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS sender_type CASCADE;
DROP TYPE IF EXISTS channel_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;

CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'FILE');
CREATE TYPE sender_type AS ENUM ('USER', 'OTHER', 'AI');
CREATE TYPE channel_type AS ENUM ('channel', 'dm', 'ai');
CREATE TYPE user_status AS ENUM ('online', 'offline', 'busy');
CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE, -- Thêm số điện thoại
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    status user_status DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE channels (
    id VARCHAR(50) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    type channel_type NOT NULL,
    avatar_url TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channel Members (Quản lý ai ở trong nhóm/chat nào)
CREATE TABLE channel_members (
    channel_id VARCHAR(50) REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id VARCHAR(50) NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL, 
    sender_type sender_type NOT NULL,
    content TEXT,
    file_name TEXT,
    file_url TEXT,
    timestamp BIGINT NOT NULL, 
    type message_type DEFAULT 'TEXT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Friend Requests (Lời mời kết bạn)
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status request_status DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id) -- Không gửi trùng
);

-- Friendships (Danh sách bạn bè)
CREATE TABLE friendships (
    user_id_1 UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id_2 UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id_1, user_id_2)
);

-- Indexes
CREATE INDEX idx_messages_channel_timestamp ON messages(channel_id, timestamp DESC);
CREATE INDEX idx_users_search ON users(username, phone_number, full_name);

-- DATA SEEDING (Mẫu)
INSERT INTO channels (id, name, type) VALUES
('ai-assistant', 'AI Assistant', 'ai'),
('general', 'Thông báo chung', 'channel')
ON CONFLICT (id) DO NOTHING;
