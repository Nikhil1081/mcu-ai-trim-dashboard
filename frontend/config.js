// MCU AI Trim Console - API Configuration
// Production Render Backend: https://mcu-ai-trim-backend-tu38.onrender.com
window.API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:5000'
  : 'https://mcu-ai-trim-backend-tu38.onrender.com';
