const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001; 

// Middleware
app.use(cors()); 
app.use(express.json());

// --- CẤU HÌNH KẾT NỐI DATABASE ---
const pool = new Pool({
  user: 'postgres',        
  host: 'localhost',       
  database: 'chat_GPTP',   
  password: 'Admin123',    
  port: 5432,              
});

pool.connect((err) => {
  if (err) return console.error('❌ Lỗi kết nối database:', err.stack);
  console.log('✅ Đã kết nối thành công tới database "chat_GPTP"');
});

// --- HELPER ---
const getUserAvatar = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
  const { username, password, fullName, phoneNumber } = req.body; // Thêm phoneNumber
  if (!username || !password || !fullName) return res.status(400).json({ error: 'Thiếu thông tin' });

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, phone_number, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, status',
      [username, passwordHash, fullName, phoneNumber || null, 'online']
    );

    // Mặc định cho user mới vào kênh chung
    await pool.query('INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2)', ['general', newUser.rows[0].id]);

    res.json({ message: 'Đăng ký thành công', user: newUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'Sai thông tin đăng nhập' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(400).json({ error: 'Sai thông tin đăng nhập' });

    res.json({
      id: user.id,
      username: user.username,
      name: user.full_name,
      status: user.status
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// --- FRIEND ROUTES ---

// 1. Tìm kiếm User (để kết bạn)
app.get('/api/users/search', async (req, res) => {
  const { q, currentUserId } = req.query; // q: username, phone, or name
  if (!q) return res.json([]);

  try {
    const query = `
        SELECT id, username, full_name, phone_number, avatar_url 
        FROM users 
        WHERE (username ILIKE $1 OR phone_number ILIKE $1 OR full_name ILIKE $1)
        AND id != $2
        LIMIT 10
    `;
    const result = await pool.query(query, [`%${q}%`, currentUserId]);
    
    // Check trạng thái bạn bè cho mỗi kết quả
    const usersWithStatus = await Promise.all(result.rows.map(async (user) => {
        // Check friendship
        const friendCheck = await pool.query(
            'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
            [currentUserId, user.id]
        );
        // Check pending request
        const requestCheck = await pool.query(
            'SELECT * FROM friend_requests WHERE (sender_id = $1 AND receiver_id = $2 AND status = \'PENDING\')',
            [currentUserId, user.id]
        );
         const receivedCheck = await pool.query(
            'SELECT * FROM friend_requests WHERE (sender_id = $2 AND receiver_id = $1 AND status = \'PENDING\')',
            [currentUserId, user.id]
        );

        let relationship = 'NONE';
        if (friendCheck.rows.length > 0) relationship = 'FRIEND';
        else if (requestCheck.rows.length > 0) relationship = 'SENT';
        else if (receivedCheck.rows.length > 0) relationship = 'RECEIVED';

        return { ...user, relationship };
    }));

    res.json(usersWithStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi tìm kiếm' });
  }
});

// 2. Gửi lời mời kết bạn
app.post('/api/friends/request', async (req, res) => {
    const { senderId, receiverId } = req.body;
    try {
        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [senderId, receiverId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi gửi lời mời' });
    }
});

// 3. Lấy danh sách lời mời đã nhận
app.get('/api/friends/requests/:userId', async (req, res) => {
    try {
        const query = `
            SELECT fr.id, u.id as "senderId", u.full_name as "senderName", u.avatar_url, fr.created_at
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.receiver_id = $1 AND fr.status = 'PENDING'
        `;
        const result = await pool.query(query, [req.params.userId]);
        res.json(result.rows.map(r => ({
            id: r.id,
            senderId: r.senderId,
            senderName: r.senderName,
            senderAvatar: r.avatar_url || getUserAvatar(r.senderName),
            status: 'PENDING',
            createdAt: r.created_at
        })));
    } catch (err) {
        res.status(500).json({ error: 'Lỗi lấy lời mời' });
    }
});

// 4. Chấp nhận lời mời
app.post('/api/friends/accept', async (req, res) => {
    const { requestId, senderId, receiverId } = req.body; // requestId is friend_requests.id
    try {
        // Update request status
        await pool.query('UPDATE friend_requests SET status = \'ACCEPTED\' WHERE id = $1', [requestId]);
        
        // Insert friendship (đảm bảo id nhỏ đứng trước để tránh duplicate)
        const [u1, u2] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
        await pool.query('INSERT INTO friendships (user_id_1, user_id_2) VALUES ($1, $2) ON CONFLICT DO NOTHING', [u1, u2]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi chấp nhận' });
    }
});

// --- CHANNELS & DM ROUTES ---

// Tạo hoặc lấy DM Channel giữa 2 người
app.post('/api/channels/dm', async (req, res) => {
    const { user1Id, user2Id } = req.body;
    
    // Quy ước ID kênh DM = dm_minID_maxID
    const [u1, u2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
    const channelId = `dm_${u1}_${u2}`;

    try {
        // Kiểm tra kênh tồn tại chưa
        const check = await pool.query('SELECT * FROM channels WHERE id = $1', [channelId]);
        
        if (check.rows.length === 0) {
            // Lấy tên người kia để đặt tên kênh (tạm thời)
            const user2Info = await pool.query('SELECT full_name FROM users WHERE id = $1', [user2Id]);
            const name = user2Info.rows[0]?.full_name || 'Chat';

            // Tạo kênh
            await pool.query('INSERT INTO channels (id, name, type) VALUES ($1, $2, \'dm\')', [channelId, name]);
            // Thêm thành viên
            await pool.query('INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2), ($1, $3)', [channelId, user1Id, user2Id]);
        }

        res.json({ id: channelId, name: 'Direct Message', type: 'dm' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi tạo DM' });
    }
});

// Lấy danh sách kênh CỦA USER (bao gồm Friends list dưới dạng contacts)
app.get('/api/channels/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // 1. Lấy các kênh User tham gia (bao gồm Group và DM đã chat)
        const channelsQuery = `
            SELECT c.*, 
            (SELECT content FROM messages m WHERE m.channel_id = c.id ORDER BY timestamp DESC LIMIT 1) as "lastMessage"
            FROM channels c
            JOIN channel_members cm ON c.id = cm.channel_id
            WHERE cm.user_id = $1
        `;
        const channelsRes = await pool.query(channelsQuery, [userId]);
        
        // Format lại dữ liệu kênh
        const channels = await Promise.all(channelsRes.rows.map(async (c) => {
             let name = c.name;
             let avatar = c.avatar_url;
             let isFriend = false;

             if (c.type === 'dm') {
                 // Tìm người còn lại trong DM để lấy tên và avatar
                 const otherMember = await pool.query(
                     'SELECT u.id, u.full_name, u.avatar_url FROM channel_members cm JOIN users u ON cm.user_id = u.id WHERE cm.channel_id = $1 AND cm.user_id != $2',
                     [c.id, userId]
                 );
                 if (otherMember.rows.length > 0) {
                     const otherUser = otherMember.rows[0];
                     name = otherUser.full_name;
                     avatar = otherUser.avatar_url || getUserAvatar(name);
                     
                     // Check friendship
                     const friendCheck = await pool.query(
                         'SELECT * FROM friendships WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)',
                         [userId, otherUser.id]
                     );
                     isFriend = friendCheck.rows.length > 0;
                 }
             }

             return {
                 id: c.id,
                 name: name,
                 type: c.type,
                 lastMessage: c.lastMessage || (c.type === 'ai' ? 'Sẵn sàng hỗ trợ' : 'Chưa có tin nhắn'),
                 avatar: avatar,
                 isFriend: isFriend
             };
        }));
        
        // Thêm kênh AI mặc định nếu chưa có
        if (!channels.find(c => c.type === 'ai')) {
             channels.unshift({ id: 'ai-assistant', name: 'AI Assistant', type: 'ai', avatar: null });
        }

        res.json(channels);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi lấy kênh' });
    }
});

// Lấy tin nhắn
app.get('/api/messages/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM messages WHERE channel_id = $1 ORDER BY timestamp ASC', [channelId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Lỗi server' }); }
});

// Gửi tin nhắn
app.post('/api/messages', async (req, res) => {
  const { channelId, senderId, senderType, content, type, fileName } = req.body;
  const timestamp = Date.now();
  try {
    const query = `INSERT INTO messages (channel_id, sender_id, sender_type, content, timestamp, type, file_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const result = await pool.query(query, [channelId, senderId, senderType, content, timestamp, type, fileName]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Lỗi server' }); }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});