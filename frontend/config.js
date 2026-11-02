// MCU AI Trim Console - API Configuration
// When deployed on Firebase, replace this URL with your actual Render backend URL (e.g., https://mcu-backend.onrender.com)
window.API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://127.0.0.1:5000'
  : 'https://mcu-ai-trim-backend.onrender.com';
