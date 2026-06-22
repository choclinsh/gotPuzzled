import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import './Login.css';
import UserContext from '../context/UserContext';
import { authService } from '../services/authService';
import { userService } from '../services/userService';

// ── Puzzle geometry ───────────────────────────────────────────────────────────

const COLS  = 7;
const ROWS  = 5;
const VB_W  = 700;
const VB_H  = 500;
const CW    = VB_W / COLS;  // 100
const CH    = VB_H / ROWS;  // 100

// Classic jigsaw shape: KNOB > BODY creates the characteristic narrow-neck, round-knob form
const TAB   = 20;   // protrusion from cell edge
const BODY  = 8;    // half-width at the neck (narrow)
const KNOB  = 15;   // half-width at the round knob tip (wide)

// Missing piece sits in the bottom-right quadrant — well clear of the left-aligned form card
const MISSING = { col: 5, row: 3 };

// Procedural navy/indigo shades with subtle per-cell variation
function pieceColor(col, row) {
  const v   = ((col * 3 + row * 7) % 14) - 7;
  const hue = Math.round(224 + v * 1.3);
  const sat = 60 + ((col + row * 2) % 5) * 4;
  const lgt = 17 + ((col * 2 + row) % 6) * 2;
  return `hsl(${hue},${sat}%,${lgt}%)`;
}

const HOLE_COLOR  = '#050914';
const FLOAT_COLOR = 'hsl(225,72%,44%)';

// ── Jigsaw connectors ─────────────────────────────────────────────────────────

const hConn = (r, c) => ((r + c) % 2 === 0 ? 1 : -1);
const vConn = (r, c) => ((r + c) % 2 === 0 ? 1 : -1);

function getConnectors(col, row) {
  return {
    top:    row === 0        ? 0 : -vConn(row - 1, col),
    right:  col === COLS - 1 ? 0 :  hConn(row, col),
    bottom: row === ROWS - 1 ? 0 :  vConn(row, col),
    left:   col === 0        ? 0 : -hConn(row, col - 1),
  };
}

// ── Path segment helpers ──────────────────────────────────────────────────────
// Each tab is a cubic bezier pair: base→ctrl→tip (left half) + tip→ctrl→base (right half).
// Having KNOB > BODY makes the bezier spread wider at the tip than at the neck.

function hSeg(x0, x1, baseY, dir) {
  if (dir === 0) return `L ${x1} ${baseY}`;
  const mid  = (x0 + x1) / 2;
  const tip  = baseY + dir * TAB;
  const ctrl = baseY + dir * TAB * 0.5;
  return [
    `L ${mid - BODY} ${baseY}`,
    `C ${mid - BODY} ${ctrl} ${mid - KNOB} ${tip} ${mid} ${tip}`,
    `C ${mid + KNOB} ${tip} ${mid + BODY} ${ctrl} ${mid + BODY} ${baseY}`,
    `L ${x1} ${baseY}`,
  ].join(' ');
}

function vSeg(y0, y1, baseX, dir) {
  if (dir === 0) return `L ${baseX} ${y1}`;
  const mid  = (y0 + y1) / 2;
  const tip  = baseX + dir * TAB;
  const ctrl = baseX + dir * TAB * 0.5;
  return [
    `L ${baseX} ${mid - BODY}`,
    `C ${ctrl} ${mid - BODY} ${tip} ${mid - KNOB} ${tip} ${mid}`,
    `C ${tip} ${mid + KNOB} ${ctrl} ${mid + BODY} ${baseX} ${mid + BODY}`,
    `L ${baseX} ${y1}`,
  ].join(' ');
}

function piecePath(col, row) {
  const x = col * CW;
  const y = row * CH;
  const { top, right, bottom, left } = getConnectors(col, row);
  return [
    `M ${x} ${y}`,
    hSeg(x,      x + CW, y,      -top),
    vSeg(y,      y + CH, x + CW,  right),
    hSeg(x + CW, x,      y + CH,  bottom),
    vSeg(y + CH, y,      x,      -left),
    'Z',
  ].join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login() {
  const { setUser }  = useContext(UserContext);
  const navigate     = useNavigate();
  const emailRegex   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]       = useState('');
  const [signupEmail,    setSignupEmail]    = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const userRole = 'player';
  const [signupError,    setSignupError]    = useState('');
  const [isRegistering,  setIsRegistering]  = useState(false);

  const [isLoginView, setIsLoginView] = useState(true);
  const [isFalling,   setIsFalling]   = useState(false);

  async function finishAuth(userId, role) {
    const profileData = await userService.getProfile(userId, role);
    setUser(profileData.data);
    setIsFalling(true);
    setTimeout(() => navigate('/dashboard'), 950);
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email)                  { setError('Email is required.'); return; }
    if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!password)               { setError('Password is required.'); return; }
    if (password.length < 6)     { setError('Password must be at least 6 characters.'); return; }
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      const { userId, userRole: role } = result.data.user;
      await finishAuth(userId, role);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setSignupError('');
    if (!firstName.trim() || !lastName.trim()) { setSignupError('First and last name are required.'); return; }
    if (!signupEmail)                          { setSignupError('Email is required.'); return; }
    if (!emailRegex.test(signupEmail))         { setSignupError('Please enter a valid email address.'); return; }
    if (!signupPassword)                       { setSignupError('Password is required.'); return; }
    if (signupPassword.length < 6)             { setSignupError('Password must be at least 6 characters.'); return; }
    setIsRegistering(true);
    try {
      const reg = await authService.register({
        firstName, lastName,
        email: signupEmail, password: signupPassword, userRole,
      });
      await finishAuth(reg.data.userId, userRole);
    } catch (err) {
      setSignupError(err.message);
      setIsRegistering(false);
    }
  }

  const bgPieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c === MISSING.col && r === MISSING.row) continue;
      bgPieces.push({ col: c, row: r, path: piecePath(c, r), color: pieceColor(c, r) });
    }
  }
  const holePath = piecePath(MISSING.col, MISSING.row);
  const busy = isLoading || isRegistering || isFalling;

  return (
    <div className="login-page">

      {/* Background puzzle — all pieces except the missing one */}
      <svg
        className="puzzle-bg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="ps" x="-6%" y="-6%" width="112%" height="112%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.8"
              floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {bgPieces.map(({ col, row, path, color }) => (
          <path
            key={`${col}-${row}`}
            d={path}
            fill={color}
            stroke="#040810"
            strokeWidth="0.5"
            filter="url(#ps)"
          />
        ))}

        <path d={holePath} fill={HOLE_COLOR} stroke="#040810" strokeWidth="0.5" />
        <path d={holePath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
      </svg>

      {/* Floating piece — translates down from above viewport into the hole on auth success */}
      <svg
        className={`puzzle-float${isFalling ? ' puzzle-float--falling' : ''}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <filter id="pf" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="10"
              floodColor="#000" floodOpacity="0.65" />
          </filter>
        </defs>
        <path
          d={holePath}
          fill={FLOAT_COLOR}
          stroke="hsl(225,80%,65%)"
          strokeWidth="1"
          filter="url(#pf)"
        />
      </svg>

      {/* Auth card — left-aligned so the hole in the bottom-right stays fully visible */}
      <div className="login-card">
        <div className="login-card__brand">
          <span className="login-card__brand-name">GotPuzzled!</span>
        </div>

        {isLoginView ? (
          <form onSubmit={handleLoginSubmit}>
            <h2>Welcome back</h2>
            <p className="login-card__sub">Sign in to continue solving</p>

            {error && <div className="error-message">{error}</div>}

            <div className="input-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>
            <div className="input-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={busy}
              />
            </div>

            <button type="submit" className="login-card__btn" disabled={busy}>
              {isFalling ? '✓ Entering…' : isLoading ? 'Signing in…' : 'Sign In'}
            </button>

            <p className="toggle-text">
              No account?{' '}
              <span className="toggle-link" onClick={() => { setIsLoginView(false); setError(''); }}>
                Create one
              </span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <h2>Join gotPuzzled</h2>
            <p className="login-card__sub">Create your account to start playing</p>

            {signupError && <div className="error-message">{signupError}</div>}

            <div className="login-card__name-row">
              <div className="input-group">
                <label htmlFor="signup-firstName">First Name</label>
                <input
                  id="signup-firstName" type="text" value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First" disabled={busy}
                />
              </div>
              <div className="input-group">
                <label htmlFor="signup-lastName">Last Name</label>
                <input
                  id="signup-lastName" type="text" value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last" disabled={busy}
                />
              </div>
            </div>
            <div className="input-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email" type="email" value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                placeholder="you@example.com" disabled={busy}
              />
            </div>
            <div className="input-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password" type="password" value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                placeholder="Min. 6 characters" disabled={busy}
              />
            </div>

            <button type="submit" className="login-card__btn" disabled={busy}>
              {isFalling ? '✓ Entering…' : isRegistering ? 'Creating account…' : 'Create Account'}
            </button>

            <p className="toggle-text">
              Already a member?{' '}
              <span className="toggle-link" onClick={() => { setIsLoginView(true); setSignupError(''); }}>
                Sign in
              </span>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
