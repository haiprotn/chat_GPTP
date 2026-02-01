import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép truy cập từ mạng LAN (0.0.0.0)
    port: 3000,
    proxy: {
      // Mọi request bắt đầu bằng /api sẽ được chuyển tiếp sang backend port 8000 (Python FastAPI)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});