import React, { useState, useEffect } from 'react';
import Icon from './Icons';
import hasarangaImg from '../assets/hasaranga.jpg';

export default function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  notify,
  apiUrl = 'http://localhost:5000/api',
  isFullScreen = false,
  theme = 'dark',
  onToggleTheme
}) {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Cashier');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset errors when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setLoading(false);
    }
  }, [isOpen, mode]);

  // Keyboard escape for modal mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isFullScreen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullScreen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? `${apiUrl}/auth/login` : `${apiUrl}/auth/signup`;
      const payload = mode === 'login'
        ? { email: email.trim(), password }
        : {
            name: name.trim(),
            email: email.trim(),
            password,
            role,
            phone: phone.trim()
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your credentials.');
      }

      // Success
      localStorage.setItem('upgrade-hub-token', data.token);
      localStorage.setItem('upgrade-hub-user', JSON.stringify(data.user));

      if (onAuthSuccess) {
        onAuthSuccess({ token: data.token, user: data.user });
      }

      if (notify) {
        notify.success(
          mode === 'login'
            ? `Welcome back, ${data.user.name} (${data.user.role})!`
            : `Staff account registered! Welcome, ${data.user.name}!`,
          'Authentication Verified'
        );
      }

      if (onClose && !isFullScreen) onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication error');
      if (notify) {
        notify.error(err.message, 'Authentication Failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // 1. FULL-SCREEN LOGIN GATEWAY (With Dedicated Developer Footer)
  // =========================================================================
  if (isFullScreen) {
    return (
      <div className={`login-fullscreen-container theme-${theme}`}>
        {/* Ambient Glowing Background Accents */}
        <div className="login-ambient-orb login-ambient-orb-1" />
        <div className="login-ambient-orb login-ambient-orb-2" />

        {/* Top Control Bar */}
        <header className="login-top-bar">
          <div className="login-status-chip">
            <span className="login-status-dot" />
            <span>Upgrade Hub OS v2.4 · Enterprise POS & Workshop Gateway</span>
          </div>
          {onToggleTheme && (
            <button
              type="button"
              className="login-theme-toggle"
              onClick={onToggleTheme}
              title="Toggle Light/Dark Theme"
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={15} />
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          )}
        </header>

        {/* Centered Main Login Gateway Card */}
        <main className="login-center-stage">
          <aside className="login-operations-panel" aria-label="Upgrade Hub capabilities">
            <div className="operations-kicker"><span className="login-status-dot" /> SHOP OPERATIONS OS</div>
            <h2>Everything your counter needs, in one calm workspace.</h2>
            <p>Move from a customer request to a completed sale without losing the details in between.</p>
            <div className="operations-flow">
              <div className="operation-step"><span className="operation-icon"><Icon name="cart" size={17} /></span><div><strong>Sell faster</strong><small>POS billing & printable receipts</small></div></div>
              <div className="operation-step"><span className="operation-icon"><Icon name="wrench" size={17} /></span><div><strong>Track every job</strong><small>Repairs and 3W modifications</small></div></div>
              <div className="operation-step"><span className="operation-icon"><Icon name="box" size={17} /></span><div><strong>Stay in control</strong><small>Stock levels and low alerts</small></div></div>
            </div>
            <div className="login-service-showcase" aria-label="Shop services">
              <div className="service-animation repair-animation">
                <div className="service-photo-wrap"><img src="/images/products/iphone-screen.jpg" alt="Mobile phone screen repair part" /><span className="photo-shine" /></div>
                <div><strong>Mobile repair</strong><small>Parts ready for Sri Lankan customers</small></div>
              </div>
              <div className="service-animation tuk-animation">
                <div className="service-photo-wrap"><img src="/images/products/mud-flaps.jpg" alt="Three-wheeler modification part" /><span className="photo-shine" /></div>
                <div><strong>3W upgrades</strong><small>Tuk-tuk parts & styling</small></div>
              </div>
            </div>
            <div className="operations-trust"><span className="trust-check"><Icon name="check" size={12} /></span><span><strong>Built for Upgrade Hub</strong><small>Secure staff access · Live shop data</small></span></div>
          </aside>
          <div className="login-card-centered" role="dialog" aria-modal="true">
            {/* Brand Header */}
            <div className="auth-header">
              <div className="auth-logo-badge auth-logo-badge-lg">
                <img src="/shop-mark.png" alt="Upgrade Hub Emblem" className="auth-logo-img-lg" />
              </div>

              <div className="auth-portal-tag">
                <Icon name="shield" size={12} />
                <span>OFFICIAL STAFF & WORKSHOP CONTROL GATEWAY</span>
              </div>

              <h1 className="auth-title">
                {mode === 'login' ? 'Sign In to Upgrade Hub' : 'Register Staff Account'}
              </h1>
              <p className="auth-subtitle">
                {mode === 'login'
                  ? 'Access Point of Sale, 3W workshop queue, and inventory control'
                  : 'Register an authorized team member with role-based permissions'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="auth-tab-bar">
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setErrorMsg(''); }}
              >
                <Icon name="user" size={15} />
                <span>Staff Sign In</span>
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
              >
                <Icon name="plus" size={15} />
                <span>Create Account</span>
              </button>
            </div>

            {/* Error Notification Banner */}
            {errorMsg && (
              <div className="auth-error-banner">
                <Icon name="alert" size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="auth-form gateway-form-scrollable">
              {mode === 'signup' && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      <Icon name="user" size={14} />
                      <span>Full Name</span>
                      <span className="req-dot">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Kasun Bandara"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icon name="shield" size={14} />
                      <span>Assigned Staff Role</span>
                      <span className="req-dot">*</span>
                    </label>
                    <div className="role-selector-grid">
                      {[
                        { id: 'Cashier', label: 'Cashier', desc: 'POS & Invoicing', icon: 'cart' },
                        { id: 'Technician', label: 'Technician', desc: 'Repairs & Mods', icon: 'wrench' },
                        { id: 'Admin', label: 'Super Admin', desc: 'Full System Control', icon: 'shield' }
                      ].map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          className={`role-select-card ${role === r.id ? 'active' : ''}`}
                          onClick={() => setRole(r.id)}
                        >
                          <Icon name={r.icon} size={15} />
                          <div className="role-card-info">
                            <strong>{r.label}</strong>
                            <small>{r.desc}</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icon name="phone" size={14} />
                      <span>Contact Telephone</span>
                    </label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 077 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">
                  <Icon name="info" size={14} />
                  <span>Staff Email Address</span>
                  <span className="req-dot">*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. admin@upgradehub.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Icon name="lock" size={14} />
                  <span>Account Password</span>
                  <span className="req-dot">*</span>
                </label>
                <div className="password-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'close' : 'sparkles'} size={15} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-btn-loading">
                    <span className="btn-spinner" />
                    <span>Verifying Credentials...</span>
                  </span>
                ) : (
                  <>
                    <Icon name={mode === 'login' ? 'arrowRight' : 'check'} size={17} />
                    <span>{mode === 'login' ? 'Sign In to Control Center' : 'Create Staff Account'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Footer */}
            <div className="auth-footer-help">
              <span>
                {mode === 'login' ? 'Need a new employee profile? ' : 'Already registered? '}
              </span>
              <button
                type="button"
                className="auth-link-switch"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setErrorMsg('');
                }}
              >
                {mode === 'login' ? 'Create an Account' : 'Sign in here'}
              </button>
            </div>
          </div>
        </main>

        {/* =========================================================================
            SYSTEM ARCHITECT & LEAD ENGINEER FOOTER (HASARANGA ABEYRATHNA)
            ========================================================================= */}
        <footer className="login-screen-footer">
          <div className="footer-dev-profile">
            <div className="footer-avatar-ring">
              <img
                src={hasarangaImg || '/hasaranga.jpg'}
                alt="Hasaranga Abeyrathna"
                className="footer-avatar-img"
                onError={(e) => { e.currentTarget.src = '/hasaranga.jpg'; }}
              />
              <div className="footer-verified-badge" title="Verified Lead Engineer">
                <Icon name="check" size={10} />
              </div>
            </div>

            <div className="footer-dev-meta">
              <div className="footer-dev-kicker">SYSTEM ARCHITECT & LEAD ENGINEER</div>
              <div className="footer-dev-name">Hasaranga Abeyrathna</div>
              <div className="footer-dev-badges">
                <span className="dev-tag-pill dev-tag-role">
                  <Icon name="sparkles" size={10} />
                  <span>Senior Software Engineer</span>
                </span>
                <span className="dev-tag-pill dev-tag-edu">
                  <Icon name="shield" size={10} />
                  <span>SLIIT Undergraduate</span>
                </span>
              </div>
            </div>
          </div>

          <div className="footer-dev-quote-box">
            <p className="footer-quote-text">
              “Engineered with enterprise-grade security hardening (Helmet, NoSQL sanitization, rate-limiting),
              reactive cloud sync, and optimized POS workflows. Dedicated to delivering robust,
              production-ready software solutions with uncompromising craft and reliability.”
            </p>
          </div>

          <div className="footer-meta-box">
            <div className="footer-security-pill">
              <Icon name="lock" size={11} />
              <span>256-Bit SSL Protected</span>
            </div>
            <div className="footer-copyright">
              © {new Date().getFullYear()} Upgrade Hub · Sri Lanka
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. POPUP MODAL GATEWAY (When switching accounts from active dashboard)
  // =========================================================================
  return (
    <div className="modal-backdrop auth-backdrop" onClick={onClose}>
      <div
        className="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {onClose && (
          <button
            type="button"
            className="auth-close-btn"
            onClick={onClose}
            title="Close dialog (Esc)"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        )}

        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src="/shop-mark.png" alt="Upgrade Hub Emblem" className="auth-logo-img" />
          </div>
          <h2 className="auth-title">
            {mode === 'login' ? 'Sign In to Upgrade Hub' : 'Register Staff Account'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Point of Sale, 3W workshop queue, and inventory control'
              : 'Register an authorized team member with role-based permissions'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="auth-tab-bar">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErrorMsg(''); }}
          >
            <Icon name="user" size={15} />
            <span>Staff Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
          >
            <Icon name="plus" size={15} />
            <span>Create Account</span>
          </button>
        </div>

        {errorMsg && (
          <div className="auth-error-banner">
            <Icon name="alert" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">
                  <Icon name="user" size={14} />
                  <span>Full Name</span>
                  <span className="req-dot">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Kasun Bandara"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Icon name="shield" size={14} />
                  <span>Assigned Staff Role</span>
                  <span className="req-dot">*</span>
                </label>
                <div className="role-selector-grid">
                  {[
                    { id: 'Cashier', label: 'Cashier', desc: 'POS & Invoicing', icon: 'cart' },
                    { id: 'Technician', label: 'Technician', desc: 'Repairs & Mods', icon: 'wrench' },
                    { id: 'Admin', label: 'Super Admin', desc: 'Full System Control', icon: 'shield' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`role-select-card ${role === r.id ? 'active' : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      <Icon name={r.icon} size={15} />
                      <div className="role-card-info">
                        <strong>{r.label}</strong>
                        <small>{r.desc}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Icon name="phone" size={14} />
                  <span>Contact Telephone</span>
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 077 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">
              <Icon name="info" size={14} />
              <span>Staff Email Address</span>
              <span className="req-dot">*</span>
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. admin@upgradehub.lk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Icon name="lock" size={14} />
              <span>Account Password</span>
              <span className="req-dot">*</span>
            </label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={mode === 'signup' ? 'Minimum 6 characters' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'close' : 'sparkles'} size={15} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-btn-loading">
                <span className="btn-spinner" />
                <span>Verifying Credentials...</span>
              </span>
            ) : (
              <>
                <Icon name={mode === 'login' ? 'arrowRight' : 'check'} size={17} />
                <span>{mode === 'login' ? 'Sign In to Control Center' : 'Create Staff Account'}</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer-help">
          <span>
            {mode === 'login' ? 'Need a new employee profile? ' : 'Already registered? '}
          </span>
          <button
            type="button"
            className="auth-link-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setErrorMsg('');
            }}
          >
            {mode === 'login' ? 'Create an Account' : 'Sign in here'}
          </button>
        </div>

        {/* Compact Developer Declaration in Modal */}
        <div className="dev-declaration-card dev-modal-compact">
          <div className="dev-profile-row">
            <div className="dev-avatar-ring">
              <img
                src={hasarangaImg || '/hasaranga.jpg'}
                alt="Hasaranga Abeyrathna"
                className="dev-avatar-img"
                onError={(e) => { e.currentTarget.src = '/hasaranga.jpg'; }}
              />
            </div>
            <div className="dev-profile-text">
              <div className="dev-lead-by">System Architecture & Lead Engineering</div>
              <div className="dev-name">Hasaranga Abeyrathna</div>
              <div className="dev-sub-creds">Senior Software Engineer · Student, SLIIT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
