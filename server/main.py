from fastapi import FastAPI, HTTPException, status, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union
import psycopg
from psycopg_pool import AsyncConnectionPool
from passlib.context import CryptContext
import hashlib
import time
from uuid import uuid4

app = FastAPI()

# --- CẤU HÌNH ---
# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connection Info
DB_CONFIG = "dbname=chat_GPTP user=postgres password=Admin123 host=localhost port=5432"
pool = AsyncConnectionPool(DB_CONFIG, open=False)

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- LIFECYCLE ---
@app.on_event("startup")
async def open_pool():
    await pool.open()
    print("✅ Đã kết nối thành công tới database PostgreSQL (Python/FastAPI)")

@app.on_event("shutdown")
async def close_pool():
    await pool.close()

# --- HELPER FUNCTIONS ---
def get_user_avatar(name: str):
    return f"https://ui-avatars.com/api/?name={name}&background=random"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# --- PYDANTIC MODELS (Input/Output Schemas) ---
class RegisterRequest(BaseModel):
    username: str
    password: str
    fullName: str
    phoneNumber: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class FriendRequestInput(BaseModel):
    senderId: str
    receiverId: str

class AcceptFriendRequest(BaseModel):
    requestId: str
    senderId: str
    receiverId: str

class DMChannelRequest(BaseModel):
    user1Id: str
    user2Id: str

class MessageInput(BaseModel):
    channelId: str
    senderId: str
    senderType: str
    content: Optional[str] = ""
    type: str = "TEXT"
    fileName: Optional[str] = None

# --- AUTH ROUTES ---

@app.post("/api/register")
async def register(req: RegisterRequest):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            # Check exist
            await cur.execute("SELECT * FROM users WHERE username = %s", (req.username,))
            if await cur.fetchone():
                raise HTTPException(status_code=400, detail="Tên đăng nhập đã tồn tại")

            hashed_pw = get_password_hash(req.password)
            
            # Insert User
            await cur.execute(
                """
                INSERT INTO users (username, password_hash, full_name, phone_number, status) 
                VALUES (%s, %s, %s, %s, %s) 
                RETURNING id, username, full_name, status, phone_number
                """,
                (req.username, hashed_pw, req.fullName, req.phoneNumber, 'online')
            )
            new_user = await cur.fetchone()
            
            # Add to 'general' channel
            await cur.execute(
                "INSERT INTO channel_members (channel_id, user_id) VALUES (%s, %s)",
                ('general', new_user[0])
            )
            await conn.commit()

            return {
                "message": "Đăng ký thành công",
                "user": {
                    "id": str(new_user[0]),
                    "username": new_user[1],
                    "full_name": new_user[2],
                    "status": new_user[3],
                    "phone_number": new_user[4]
                }
            }

@app.post("/api/login")
async def login(req: LoginRequest):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT id, username, full_name, status, password_hash FROM users WHERE username = %s", (req.username,))
            user = await cur.fetchone()
            
            if not user or not verify_password(req.password, user[4]):
                raise HTTPException(status_code=400, detail="Sai thông tin đăng nhập")
            
            return {
                "id": str(user[0]),
                "username": user[1],
                "name": user[2],
                "status": user[3]
            }

# --- FRIEND ROUTES ---

@app.get("/api/users/search")
async def search_users(q: str, currentUserId: str):
    if not q:
        return []
    
    query_str = f"%{q}%"
    
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            # Get users
            await cur.execute(
                """
                SELECT id, username, full_name, phone_number, avatar_url 
                FROM users 
                WHERE (username ILIKE %s OR phone_number ILIKE %s OR full_name ILIKE %s)
                AND id != %s
                LIMIT 10
                """,
                (query_str, query_str, query_str, currentUserId)
            )
            rows = await cur.fetchall()
            
            results = []
            for row in rows:
                user_id = str(row[0])
                
                # Check status
                relationship = "NONE"
                
                # Check friend
                await cur.execute(
                    "SELECT 1 FROM friendships WHERE (user_id_1 = %s AND user_id_2 = %s) OR (user_id_1 = %s AND user_id_2 = %s)",
                    (currentUserId, user_id, user_id, currentUserId)
                )
                if await cur.fetchone():
                    relationship = "FRIEND"
                else:
                    # Check sent request
                    await cur.execute(
                        "SELECT 1 FROM friend_requests WHERE sender_id = %s AND receiver_id = %s AND status = 'PENDING'",
                        (currentUserId, user_id)
                    )
                    if await cur.fetchone():
                        relationship = "SENT"
                    else:
                        # Check received request
                        await cur.execute(
                            "SELECT 1 FROM friend_requests WHERE sender_id = %s AND receiver_id = %s AND status = 'PENDING'",
                            (user_id, currentUserId)
                        )
                        if await cur.fetchone():
                            relationship = "RECEIVED"

                results.append({
                    "id": user_id,
                    "username": row[1],
                    "full_name": row[2],
                    "phone_number": row[3],
                    "avatar_url": row[4],
                    "relationship": relationship
                })
            
            return results

@app.post("/api/friends/request")
async def send_friend_request(req: FriendRequestInput):
    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                await cur.execute(
                    "INSERT INTO friend_requests (sender_id, receiver_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (req.senderId, req.receiverId)
                )
                await conn.commit()
        return {"success": True}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Lỗi gửi lời mời")

@app.get("/api/friends/requests/{user_id}")
async def get_friend_requests(user_id: str):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT fr.id, u.id, u.full_name, u.avatar_url, fr.created_at
                FROM friend_requests fr
                JOIN users u ON fr.sender_id = u.id
                WHERE fr.receiver_id = %s AND fr.status = 'PENDING'
                """,
                (user_id,)
            )
            rows = await cur.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "senderId": str(r[1]),
                    "senderName": r[2],
                    "senderAvatar": r[3] or get_user_avatar(r[2]),
                    "status": "PENDING",
                    "createdAt": str(r[4])
                } for r in rows
            ]

@app.post("/api/friends/accept")
async def accept_friend_request(req: AcceptFriendRequest):
    try:
        async with pool.connection() as conn:
            async with conn.cursor() as cur:
                # Update request
                await cur.execute(
                    "UPDATE friend_requests SET status = 'ACCEPTED' WHERE id = %s",
                    (req.requestId,)
                )
                
                # Insert friendship (order IDs to avoid duplicates logic from Node)
                u1, u2 = sorted([req.senderId, req.receiverId])
                await cur.execute(
                    "INSERT INTO friendships (user_id_1, user_id_2) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (u1, u2)
                )
                await conn.commit()
        return {"success": True}
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Lỗi chấp nhận")

# --- CHANNELS & DM ROUTES ---

@app.post("/api/channels/dm")
async def create_dm_channel(req: DMChannelRequest):
    u1, u2 = sorted([req.user1Id, req.user2Id])
    
    # Create MD5 hash like Node.js: crypto.createHash('md5').update(`${u1}_${u2}`).digest('hex')
    hash_str = hashlib.md5(f"{u1}_{u2}".encode()).hexdigest()
    channel_id = f"dm_{hash_str}"

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            # Check exist
            await cur.execute("SELECT * FROM channels WHERE id = %s", (channel_id,))
            if not await cur.fetchone():
                # Get User 2 info for channel name
                await cur.execute("SELECT full_name FROM users WHERE id = %s", (req.user2Id,))
                row = await cur.fetchone()
                name = row[0] if row else "Chat"

                # Create Channel
                await cur.execute("INSERT INTO channels (id, name, type) VALUES (%s, %s, 'dm')", (channel_id, name))
                # Add Members
                await cur.execute("INSERT INTO channel_members (channel_id, user_id) VALUES (%s, %s), (%s, %s)", (channel_id, req.user1Id, channel_id, req.user2Id))
                await conn.commit()

    return {"id": channel_id, "name": "Direct Message", "type": "dm"}

@app.get("/api/channels/{user_id}")
async def get_channels(user_id: str):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            # 1. Get participated channels
            await cur.execute(
                """
                SELECT c.id, c.name, c.type, c.avatar_url
                FROM channels c
                JOIN channel_members cm ON c.id = cm.channel_id
                WHERE cm.user_id = %s
                """,
                (user_id,)
            )
            rows = await cur.fetchall()
            
            channels = []
            existing_channel_ids = set()

            for r in rows:
                c_id, c_name, c_type, c_avatar = r
                existing_channel_ids.add(c_id)

                # Get Last Message info
                await cur.execute(
                    "SELECT content, timestamp, sender_id FROM messages WHERE channel_id = %s ORDER BY timestamp DESC LIMIT 1",
                    (c_id,)
                )
                msg_row = await cur.fetchone()
                last_msg = msg_row[0] if msg_row else ('Sẵn sàng hỗ trợ' if c_type == 'ai' else 'Chưa có tin nhắn')
                last_time = msg_row[1] if msg_row else 0
                last_sender = msg_row[2] if msg_row else None

                final_name = c_name
                final_avatar = c_avatar
                is_friend = False
                other_user_id = None

                if c_type == 'dm':
                    # Find other member
                    await cur.execute(
                        """
                        SELECT u.id, u.full_name, u.avatar_url 
                        FROM channel_members cm 
                        JOIN users u ON cm.user_id = u.id 
                        WHERE cm.channel_id = %s AND cm.user_id != %s
                        """,
                        (c_id, user_id)
                    )
                    other_member = await cur.fetchone()
                    if other_member:
                        other_user_id = str(other_member[0])
                        final_name = other_member[1]
                        final_avatar = other_member[2] or get_user_avatar(final_name)
                        
                        # Check friendship
                        await cur.execute(
                            "SELECT 1 FROM friendships WHERE (user_id_1 = %s AND user_id_2 = %s) OR (user_id_1 = %s AND user_id_2 = %s)",
                            (user_id, other_user_id, other_user_id, user_id)
                        )
                        if await cur.fetchone():
                            is_friend = True
                
                channels.append({
                    "id": c_id,
                    "name": final_name,
                    "type": c_type,
                    "lastMessage": last_msg,
                    "lastMessageTime": int(last_time),
                    "lastMessageSender": last_sender,
                    "avatar": final_avatar,
                    "isFriend": is_friend,
                    "otherUserId": other_user_id
                })

            # 2. Get Friends (for contacts view)
            await cur.execute(
                """
                SELECT u.id, u.full_name, u.avatar_url 
                FROM friendships f
                JOIN users u ON (f.user_id_1 = u.id OR f.user_id_2 = u.id)
                WHERE (f.user_id_1 = %s OR f.user_id_2 = %s) AND u.id != %s
                """,
                (user_id, user_id, user_id)
            )
            friends = await cur.fetchall()

            for f in friends:
                f_id = str(f[0])
                f_name = f[1]
                f_avatar = f[2] or get_user_avatar(f_name)

                u1, u2 = sorted([user_id, f_id])
                hash_str = hashlib.md5(f"{u1}_{u2}".encode()).hexdigest()
                expected_channel_id = f"dm_{hash_str}"

                if expected_channel_id not in existing_channel_ids:
                    channels.append({
                        "id": expected_channel_id,
                        "name": f_name,
                        "type": "dm",
                        "lastMessage": "Các bạn đã trở thành bạn bè",
                        "lastMessageTime": 0,
                        "avatar": f_avatar,
                        "isFriend": True,
                        "otherUserId": f_id
                    })

            # Add AI if not exist
            if not any(c['type'] == 'ai' for c in channels):
                channels.insert(0, {
                    "id": "ai-assistant", 
                    "name": "AI Assistant", 
                    "type": "ai", 
                    "avatar": None
                })
            
            return channels

@app.get("/api/messages/{channel_id}")
async def get_messages(channel_id: str):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT * FROM messages WHERE channel_id = %s ORDER BY timestamp ASC",
                (channel_id,)
            )
            rows = await cur.fetchall()
            
            # Map columns to dict (psycopg returns tuples by default)
            # Assuming table structure: id, channel_id, sender_id, sender_type, content, file_name, file_url, timestamp, type, created_at
            # We need to be careful with column indices or use row_factory=dict_row
            
            # Using simple mapping based on CREATE TABLE order
            results = []
            for r in rows:
                results.append({
                    "id": str(r[0]),
                    "channel_id": r[1],
                    "sender_id": r[2],
                    "sender_type": r[3],
                    "content": r[4],
                    "file_name": r[5],
                    "file_url": r[6],
                    "timestamp": r[7],
                    "type": r[8]
                })
            return results

@app.post("/api/messages")
async def send_message(msg: MessageInput):
    timestamp = int(time.time() * 1000)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO messages (channel_id, sender_id, sender_type, content, timestamp, type, file_name) 
                VALUES (%s, %s, %s, %s, %s, %s, %s) 
                RETURNING id, channel_id, sender_id, sender_type, content, file_name, file_url, timestamp, type
                """,
                (msg.channelId, msg.senderId, msg.senderType, msg.content, timestamp, msg.type, msg.fileName)
            )
            r = await cur.fetchone()
            await conn.commit()
            
            return {
                "id": str(r[0]),
                "channel_id": r[1],
                "sender_id": r[2],
                "sender_type": r[3],
                "content": r[4],
                "file_name": r[5],
                "file_url": r[6],
                "timestamp": r[7],
                "type": r[8]
            }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
