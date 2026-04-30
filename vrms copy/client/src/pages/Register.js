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

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm_password: '',
    phone: '', date_of_birth: '', city: ''
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { confirm_password, ...submitData } = form;
      await API.post('/auth/register', submitData);
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
            <p style={styles.heroBadge}>JOIN THE FLEET</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 style={styles.heroTitle}>
              Create Your <span style={{ color: '#e94560' }}>JUNE.</span> Account
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p style={styles.heroSub}>
              Join thousands of happy renters. Quick signup, instant access to premium vehicles across Turkey.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <div className="auth-form-container" style={styles.authFormContainer}>
              <form onSubmit={handleSubmit} style={styles.form}>
                <div className="form-row" style={styles.formRow}>
                  <div style={styles.formHalf}>
                    <input 
                      style={styles.input} 
                      type="text" 
                      placeholder="Full Name *" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})} 
                      required 
                    />
                  </div>
                  <div style={styles.formHalf}>
                    <input 
                      style={styles.input} 
                      type="tel" 
                      placeholder="Phone Number" 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <input 
                    style={styles.input} 
                    type="email" 
                    placeholder="Email Address *" 
                    value={form.email} 
                    onChange={e => setForm({...form, email: e.target.value})} 
                    required 
                  />
                </div>

                <div className="form-row" style={styles.formRow}>
                  <div style={styles.formHalf}>
                    <input 
                      style={styles.input} 
                      type="date" 
                      placeholder="Date of Birth *" 
                      value={form.date_of_birth} 
                      onChange={e => setForm({...form, date_of_birth: e.target.value})} 
                      required 
                    />
                  </div>
                  <div style={styles.formHalf}>
                    <input 
                      style={styles.input} 
                      type="text" 
                      placeholder="City" 
                      value={form.city} 
                      onChange={e => setForm({...form, city: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <input
                    style={styles.input}
                    type="password"
                    placeholder="Password (min 8 chars) *"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    minLength={8}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <input
                    style={form.confirm_password && form.password !== form.confirm_password ? {
                      ...styles.input,
                      borderColor: '#ef4444'
                    } : styles.input}
                    type="password" 
                    placeholder="Confirm Password *" 
                    value={form.confirm_password} 
                    onChange={e => setForm({...form, confirm_password: e.target.value})} 
                    required 
                  />
                </div>

                {form.confirm_password && form.password !== form.confirm_password && (
                  <p style={styles.errorText}>Passwords do not match</p>
                )}

                <button className="hero-btn-primary" style={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account & Start Renting'}
                </button>

                <div style={styles.links}>
                  <Link to="/login" style={styles.link}>Already have account? Sign In</Link>
                </div>
              </form>
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
    maxWidth: '520px', 
    margin: '0 auto', 
    boxShadow: '0 25px 70px rgba(0,0,0,0.25)' 
  },
  form: { marginBottom: '0' },
  formRow: { display: 'flex', gap: '20px', marginBottom: '40px' },
  formHalf: { flex: 1 },
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

