import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

/* ── tiny hook: triggers true once el is in viewport ── */
function useOnScreen(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

/* ── fade-in wrapper ── */
function FadeIn({ children, delay = 0, style = {} }) {
  const ref = useRef();
  const visible = useOnScreen(ref);
  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s cubic-bezier(.22,1,.36,1) ${delay}s, transform 0.7s cubic-bezier(.22,1,.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      toast.success('Reset code sent!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email not found');
    }
    setLoading(false);
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!code || !newPassword || !confirmPassword) { toast.error('Fill all fields'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (newPassword.length < 8) { toast.error('Password min 8 characters'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email, token: code, new_password: newPassword });
      toast.success('Password reset! Login now.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <Navbar />

      {/* ─── HERO ─── */}
      <div style={styles.hero}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <FadeIn>
            <p style={styles.heroBadge}>PASSWORD RESET</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 style={styles.heroTitle}>
              Recover Your <span style={{ color: '#e94560' }}>JUNE.</span> Account
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p style={styles.heroSub}>
              Reset your password in 2 simple steps. We'll send you a secure code by email.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="auth-form-container" style={styles.authFormContainer}>
              {/* Step 1: Email */}
              {step === 1 && (
                <form onSubmit={sendCode} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <input 
                      style={styles.input} 
                      type="email" 
                      placeholder="Email Address" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                  <button className="hero-btn-primary" style={styles.submitBtn} type="submit" disabled={loading}>
                    {loading ? 'Sending Code...' : 'Send Reset Code'}
                  </button>
                  <div style={styles.links}>
                    <Link to="/login" style={styles.link}>Back to Login</Link>
                  </div>
                </form>
              )}

              {/* Step 2: Code + New Password */}
              {step === 2 && (
                <form onSubmit={resetPassword} style={styles.form}>
                  <div style={styles.codeGroup}>
                    <input 
                      style={styles.codeInput} 
                      type="text" 
                      placeholder="000000" 
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      required 
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      style={styles.input} 
                      type="password" 
                      placeholder="New Password (min 8 chars)"
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      required 
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      style={newPassword !== confirmPassword ? { ...styles.input, borderColor: '#ef4444' } : styles.input} 
                      type="password" 
                      placeholder="Confirm New Password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      required 
                    />
                  </div>
                  {newPassword && newPassword !== confirmPassword && (
                    <p style={styles.errorText}>Passwords do not match</p>
                  )}
                  <button className="hero-btn-primary" style={styles.submitBtn} type="submit" disabled={loading}>
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </button>
                  <div style={styles.resendGroup}>
                    <button type="button" style={styles.resendBtn} onClick={sendCode} disabled={loading}>
                      Resend Code
                    </button>
                    <button type="button" style={styles.backBtn} onClick={() => { setStep(1); setCode(''); setNewPassword(''); setConfirmPassword(''); }}>
                      ← Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </FadeIn>
        </div>
      </div>

      <Footer />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#1a1a2e' },

  /* HERO */
  hero: { 
    background: 'linear-gradient(160deg, #0a2647 0%, #0f3460 50%, #1a4b8c 100%)', 
    color: '#fff', 
    padding: '80px 48px 100px', 
    position: 'relative', 
    overflow: 'hidden' 
  },
  heroOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'radial-gradient(ellipse at 70% 20%, rgba(233,69,96,0.08) 0%, transparent 60%)', 
    pointerEvents: 'none' 
  },
  heroContent: { 
    maxWidth: '800px', 
    margin: '0 auto', 
    textAlign: 'center', 
    position: 'relative', 
    zIndex: 1 
  },
  heroBadge: { 
    display: 'inline-block', 
    background: 'rgba(233,69,96,0.15)', 
    color: '#e94560', 
    padding: '8px 20px', 
    borderRadius: '50px', 
    fontSize: '12px', 
    fontWeight: 700, 
    letterSpacing: '2px', 
    marginBottom: '28px' 
  },
  heroTitle: { 
    fontFamily: "'Playfair Display', serif", 
    fontSize: '52px', 
    fontWeight: 800, 
    margin: '0 0 24px', 
    lineHeight: 1.15, 
    letterSpacing: '-0.5px' 
  },
  heroSub: { 
    fontSize: '17px', 
    opacity: 0.9, 
    margin: '0 0 48px', 
    lineHeight: 1.7, 
    fontWeight: 400 
  },
  authFormContainer: { 
    background: 'rgba(255,255,255,0.08)', 
    backdropFilter: 'blur(20px)', 
    borderRadius: '24px', 
    border: '1px solid rgba(255,255,255,0.15)', 
    padding: '48px', 
    maxWidth: '480px', 
    margin: '0 auto', 
    boxShadow: '0 25px 70px rgba(0,0,0,0.25)' 
  },
  form: { marginBottom: '0' },
  inputGroup: { marginBottom: '40px', position: 'relative' },
  input: { 
    width: '100%', 
    height: '64px', 
    padding: '0 20px', 
    background: 'rgba(255,255,255,0.9)', 
    border: 'none', 
    borderRadius: '16px', 
    fontSize: '16px', 
    boxSizing: 'border-box', 
    fontWeight: '500', 
    transition: 'all 0.4s cubic-bezier(.22,1,.36,1)', 
    outline: 'none' 
  },
  codeGroup: { marginBottom: '40px', textAlign: 'center' },
  codeInput: { 
    width: '280px', 
    height: '80px', 
    fontSize: '36px', 
    fontWeight: '700', 
    letterSpacing: '12px', 
    textAlign: 'center', 
    textTransform: 'uppercase', 
    borderRadius: '20px', 
    border: '2px solid rgba(255,255,255,0.3)', 
    background: 'rgba(255,255,255,0.1)', 
    color: '#fff', 
    fontFamily: 'monospace', 
    backdropFilter: 'blur(10px)' 
  },
  errorText: { 
    color: '#ef4444', 
    fontSize: '15px', 
    marginTop: '-10px', 
    marginBottom: '20px',
    textAlign: 'center',
    fontWeight: '500' 
  },
  submitBtn: { 
    width: '100%', 
    height: '60px', 
    borderRadius: '16px', 
    fontSize: '17px', 
    fontWeight: '700', 
    border: 'none', 
    cursor: 'pointer', 
    marginBottom: '24px', 
    transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
    background: '#e94560',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(233,69,96,0.3)'
  },
  resendGroup: { display: 'flex', gap: '12px', marginBottom: '20px' },
  resendBtn: { 
    flex: 1, 
    padding: '14px', 
    background: 'rgba(255,255,255,0.15)', 
    color: '#fff', 
    border: '1px solid rgba(255,255,255,0.3)', 
    borderRadius: '12px', 
    fontSize: '15px', 
    cursor: 'pointer', 
    transition: 'all 0.3s' 
  },
  backBtn: { 
    flex: 1, 
    padding: '14px', 
    background: 'transparent', 
    color: 'rgba(255,255,255,0.8)', 
    border: '1px solid rgba(255,255,255,0.3)', 
    borderRadius: '12px', 
    fontSize: '15px', 
    cursor: 'pointer' 
  },
  links: { 
    display: 'flex', 
    justifyContent: 'center', 
    gap: '24px', 
    marginTop: '20px', 
    paddingTop: '24px', 
    borderTop: '1px solid rgba(255,255,255,0.1)' 
  },
  link: { color: '#e8f4fd', fontWeight: '600', textDecoration: 'none', fontSize: '15px' }
};

