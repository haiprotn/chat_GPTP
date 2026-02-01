const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001; // Chạy backend trên port 3001 để tránh xung đột với React (thường là 3000)

// Middleware
app.use(cors()); // Cho phép React Frontend gọi API
app.use(express.json());

// --- CẤU HÌNH KẾT NỐI DATABASE ---
const pool = new Pool({
  user: 'postgres',        // Tên user database (thường là postgres)
  host: 'localhost',       // Địa chỉ server (localhost nếu chạy trên máy cá nhân)
  database: 'chat_GPTP',   // Tên database bạn đã tạo
  password: 'Admin123',    // Mật khẩu bạn cung cấp
  port: 5432,              // Port mặc định của PostgreSQL
});

// Kiểm tra kết nối khi khởi động
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Lỗi kết nối database:', err.stack);
  }
  console.log('✅ Đã kết nối thành công tới database "chat_GPTP"');
  release();
});

// --- API ROUTES ---

// 1. Lấy danh sách tin nhắn của một kênh
app.get('/api/messages/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
    // Truy vấn SQL lấy tin nhắn
    const result = await pool.query(
      'SELECT * FROM messages WHERE channel_id = $1 ORDER BY timestamp ASC',
      [channelId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy tin nhắn' });
  }
});

// 2. Gửi tin nhắn mới
app.post('/api/messages', async (req, res) => {
  const { channelId, senderId, senderType, content, type, fileName } = req.body;
  
  // Tạo ID ngẫu nhiên (hoặc để DB tự tạo nếu dùng UUID v4 default) và timestamp
  const timestamp = Date.now();
  
  try {
    const query = `
      INSERT INTO messages (channel_id, sender_id, sender_type, content, timestamp, type, file_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [channelId, senderId, senderType, content, timestamp, type, fileName];
    
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi gửi tin nhắn' });
  }
});

// 3. Lấy danh sách kênh
app.get('/api/channels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM channels ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách kênh' });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${port}`);
});