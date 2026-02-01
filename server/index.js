const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');

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

// Kiểm tra kết nối khi khởi động
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Lỗi kết nối database:', err.stack);
  }
  console.log('✅ Đã kết nối thành công tới database "chat_GPTP"');
  release();
});

// --- AUTH ROUTES ---

// 1. Đăng ký
app.post('/api/register', async (req, res) => {
  const { username, password, fullName } = req.body;

  if (!username || !password || !fullName) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  try {
    // Kiểm tra user tồn tại
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Lưu vào DB
    const newUser = await pool.query(
      'INSERT INTO users (username, password_hash, full_name, status) VALUES ($1, $2, $3, $4) RETURNING id, username, full_name, status',
      [username, passwordHash, fullName, 'online']
    );

    res.json({ message: 'Đăng ký thành công', user: newUser.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng ký' });
  }
});

// 2. Đăng nhập
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    const user = result.rows[0];
    
    // Kiểm tra mật khẩu
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }

    // Trả về thông tin user (trừ password)
    res.json({
      id: user.id,
      username: user.username,
      name: user.full_name, // Map full_name to name for frontend
      status: user.status
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi đăng nhập' });
  }
});

// --- CHAT ROUTES ---

// 3. Lấy danh sách tin nhắn của một kênh
app.get('/api/messages/:channelId', async (req, res) => {
  const { channelId } = req.params;
  try {
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

// 4. Gửi tin nhắn mới
app.post('/api/messages', async (req, res) => {
  const { channelId, senderId, senderType, content, type, fileName } = req.body;
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

// 5. Lấy danh sách kênh
app.get('/api/channels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM channels ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server khi lấy danh sách kênh' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server Backend đang chạy tại http://localhost:${port}`);
});