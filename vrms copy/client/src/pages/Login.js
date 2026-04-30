import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
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

export default function Login() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', password: '' });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post('/auth/login', form);
      if (res.data.token) {
        // Admin: direct login, no code needed
        login(res.data.user, res.data.token);
        toast.success('Welcome back, Admin!');
        navigate('/admin');
      } else {
        toast.success('Verification code sent!');
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/verify-code', { email: form.email, code });
      login(res.data.user, res.data.token);
      toast.success('Welcome back!');
      if (['admin', 'call_center', 'shop_worker', 'callcenter'].includes(res.data.user.role)) navigate('/admin');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await API.post('/auth/login', form);
      toast.success('Code resent!');
      setCode('');
    } catch (err) {
      toast.error('Resend failed');
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
            <p style={styles.heroBadge}>SECURE SIGN IN</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 style={styles.heroTitle}>
              Welcome Back to <span style={{ color: '#e94560' }}>JUNE.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p style={styles.heroSub}>
              Access your account with 2FA protection. Your security is our priority.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="auth-form-container" style={styles.authFormContainer}>
              {/* Step 1: Email/Password */}
              {step === 1 && (
                <form onSubmit={handleLogin} style={styles.form}>
                  <div style={styles.inputGroup}>
                    <input 
                      style={styles.input} 
                      type="email" 
                      placeholder="Email Address" 
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      required 
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <input 
                      style={styles.input} 
                      type="password" 
                      placeholder="Password" 
                      value={form.password} 
                      onChange={e => setForm({...form, password: e.target.value})} 
                      required 
                    />
                  </div>
                  <button className="hero-btn-primary" style={styles.submitBtn} type="submit" disabled={loading}>
                    {loading ? 'Sending Code...' : 'Continue to Verify'}
                  </button>
                  <div style={styles.links}>
                    <Link to="/register" style={styles.link}>Create Account</Link>
                    <Link to="/forgot-password" style={styles.linkForgot}>Forgot Password?</Link>
                  </div>
                </form>
              )}

              {/* Step 2: Verification Code */}
              {step === 2 && (
                <form onSubmit={handleVerify} style={styles.form}>
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
                  <p style={styles.codeHelp}>
                    Code sent to <strong>{form.email}</strong>. Expires in 10 minutes.
                  </p>
                  <button className="hero-btn-primary" style={styles.submitBtn} type="submit" disabled={loading}>
                    {loading ? 'Verifying...' : 'Sign In Securely'}
                  </button>
                  <div style={styles.resendGroup}>
                    <button type="button" style={styles.resendBtn} onClick={handleResend} disabled={loading}>
                      Resend Code
                    </button>
                    <button type="button" style={styles.backBtn} onClick={() => { setStep(1); setCode(''); }}>
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
  /* Focus styles handled via CSS classes */
  codeGroup: { marginBottom: '24px', textAlign: 'center' },
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
  codeHelp: { 
    fontSize: '15px', 
    opacity: 0.9, 
    margin: '16px 0 36px', 
    lineHeight: 1.5 
  },
  submitBtn: { 
    width: '100%', 
    height: '60px', 
    borderRadius: '16px', 
    fontSize: '17px', 
    fontWeight: '700', 
    border: 'none', 
    cursor: 'pointer', 
    marginBottom: '20px', 
    transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
    background: '#e94560',
    color: '#fff',
    boxShadow: '0 4px 20px rgba(233,69,96,0.3)'
  },
        /* Hover styles in CSS classes */
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
    justifyContent: 'space-between', 
    gap: '24px', 
    marginTop: '24px', 
    paddingTop: '20px', 
    borderTop: '1px solid rgba(255,255,255,0.1)' 
  },
  link: { color: '#e8f4fd', fontWeight: '600', textDecoration: 'none', fontSize: '15px' },
  linkForgot: { color: '#a5d8ff', fontWeight: '500', textDecoration: 'none', fontSize: '15px' }
};

