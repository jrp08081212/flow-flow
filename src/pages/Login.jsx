// Screen 2: Login
// Demo login with hardcoded credentials + CAPTCHA verification.
// Valid credentials: Registration Number = 26BCE2885, Password = PETERVIT26

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// --- CAPTCHA Generator ---
// Draws a random 5-character code on a small canvas with noise/distortion
// so it looks like a real CAPTCHA image.
function generateCaptchaText() {
  // Characters that are easy to tell apart (no 0/O, 1/I/l confusion)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 5; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function drawCaptcha(canvas, text) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear and fill background
  ctx.fillStyle = '#f0f2f5';
  ctx.fillRect(0, 0, w, h);

  // Draw random noise lines
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.strokeStyle = `rgba(${Math.random()*150|0},${Math.random()*150|0},${Math.random()*150|0},0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw each character with slight rotation and random color
  ctx.textBaseline = 'middle';
  for (let i = 0; i < text.length; i++) {
    const x = 18 + i * 30;
    const y = h / 2 + (Math.random() - 0.5) * 12;
    const angle = (Math.random() - 0.5) * 0.4;
    const size = 24 + Math.random() * 6;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `bold ${size}px 'Courier New', monospace`;
    ctx.fillStyle = `rgb(${Math.random()*80|0},${Math.random()*80|0},${Math.random()*120+50|0})`;
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  // Sprinkle random dots
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${Math.random()*200|0},${Math.random()*200|0},${Math.random()*200|0},0.4)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

// --- Login Component ---
function Login() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [regNumber, setRegNumber] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [error, setError] = useState('');

  // Generate a new CAPTCHA code and draw it on the canvas
  const refreshCaptcha = useCallback(() => {
    const text = generateCaptchaText();
    setCaptchaText(text);
    setCaptchaInput('');
    // Small delay to ensure canvas is rendered
    setTimeout(() => drawCaptcha(canvasRef.current, text), 50);
  }, []);

  // Draw the initial CAPTCHA when the page loads
  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page reload
    setError('');

    // Check CAPTCHA first
    if (captchaInput.toUpperCase() !== captchaText) {
      setError('CAPTCHA is incorrect. Please try again.');
      refreshCaptcha();
      return;
    }

    // Check credentials (hardcoded for demo)
    if (regNumber.trim().toUpperCase() === '26BCE2885' && password === 'PETERVIT26') {
      // Save login info so other pages know the user is logged in
      sessionStorage.setItem('flow_user', JSON.stringify({
        regNumber: regNumber.trim().toUpperCase(),
        campus: 'VIT Vellore'
      }));
      navigate('/facilities');
    } else {
      setError('Invalid registration number or password.');
      refreshCaptcha();
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>🌊 Flow</h1>
          <p>VIT Vellore — Student Login</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Registration Number</label>
            <input
              type="text"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g. 26BCE2885"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          <div className="captcha-container">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 6 }}>
              Security Check
            </label>
            <div className="captcha-display">
              <canvas ref={canvasRef} width={180} height={50} />
              <button type="button" className="captcha-refresh" onClick={refreshCaptcha} title="Generate new CAPTCHA">
                🔄
              </button>
            </div>
            <input
              type="text"
              className="captcha-input"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              placeholder="Type the code above"
              autoComplete="off"
            />
          </div>

          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>
      </div>

      <Link to="/" className="login-back">← Back to campus selection</Link>
    </div>
  );
}

export default Login;
