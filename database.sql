
-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums based on application types (matching types.ts)
DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS sender_type CASCADE;
DROP TYPE IF EXISTS channel_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;

CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'FILE');
CREATE TYPE sender_type AS ENUM ('USER', 'OTHER', 'AI');
CREATE TYPE channel_type AS ENUM ('channel', 'dm', 'ai');
CREATE TYPE user_status AS ENUM ('online', 'offline', 'busy');

-- Users table: Stores user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- New column for security
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar_url TEXT,
    status user_status DEFAULT 'offline',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE channels (
    id VARCHAR(50) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL,
    type channel_type NOT NULL,
    avatar_url TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Indexes
CREATE INDEX idx_messages_channel_timestamp ON messages(channel_id, timestamp DESC);

-- DATA SEEDING

-- 1. Insert Channels
INSERT INTO channels (id, name, type) VALUES
('ai-assistant', 'AI Assistant', 'ai'),
('general', 'Thông báo chung', 'channel'),
('dev-team', 'Đội ngũ kỹ thuật', 'channel'),
('marketing', 'Marketing', 'channel'),
('random', 'Chém gió', 'channel')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert DM Channels
INSERT INTO channels (id, name, type, avatar_url) VALUES
('dm-1', 'Nguyễn Văn A', 'dm', 'https://picsum.photos/41/41'),
('dm-2', 'Trần Thị B', 'dm', 'https://picsum.photos/42/42')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Sample Messages (Optional cleanup/reset logic could go here)
