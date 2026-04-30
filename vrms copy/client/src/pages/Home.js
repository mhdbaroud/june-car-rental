import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function Home() {
  useAuth();
  const navigate = useNavigate();
  const [featuredVehicles, setFeaturedVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [search, setSearch] = useState({ pickup_location_id: '', start_date: '', end_date: '' });
  const categoriesRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadFeatured();
    loadCategories();
    loadLocations();
  }, []);

  const loadFeatured = async () => {
    setLoadingVehicles(true);
    try {
      const res = await API.get('/vehicles?status=available');
      setFeaturedVehicles(res.data.slice(0, 6));
    } catch (err) { console.error(err); }
    setLoadingVehicles(false);
  };

  const loadCategories = async () => {
    try {
      const res = await API.get('/vehicles/categories');
      setCategories(res.data);
    } catch (err) { console.error(err); }
  };

  const loadLocations = async () => {
    try {
      const res = await API.get('/locations');
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.start_date || !search.end_date) return;
    sessionStorage.setItem('bookingSearch', JSON.stringify(search));
    navigate('/vehicles');
  };

  const categoryIcons = {
    'Sedan': '🚗', 'SUV': '🚙', 'Truck': '🛻', 'Van': '🚐', 'Luxury': '🏎️', 'Economy': '🚘'
  };

  return (
    <div style={styles.page}>
      <style>{`
        .hero-btn-primary { padding: 16px 40px; background: #e94560; color: #fff; border: none; border-radius: 50px; font-size: 15px; cursor: pointer; font-weight: 600; letter-spacing: 0.5px; transition: all 0.3s; font-family: 'DM Sans', sans-serif; }
        .hero-btn-primary:hover { background: #d63851; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(233,69,96,0.4); }
        .hero-btn-secondary { padding: 16px 40px; background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.4); border-radius: 50px; font-size: 15px; cursor: pointer; font-weight: 500; transition: all 0.3s; font-family: 'DM Sans', sans-serif; }
        .hero-btn-secondary:hover { border-color: #fff; background: rgba(255,255,255,0.08); transform: translateY(-2px); }
        .vehicle-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.04); transition: all 0.4s cubic-bezier(.22,1,.36,1); cursor: pointer; }
        .vehicle-card:hover { transform: translateY(-8px); box-shadow: 0 20px 50px rgba(0,0,0,0.12); border-color: transparent; }
        .vehicle-card:hover .v-img { transform: scale(1.05); }
        .book-btn { padding: 8px 20px; background: #0f3460; color: #fff; border: none; border-radius: 50px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.3s; font-family: 'DM Sans', sans-serif; }
        .book-btn:hover { background: #e94560; transform: scale(1.05); }
        .cat-card { background: #fff; border-radius: 16px; padding: 28px 16px; text-align: center; cursor: pointer; box-shadow: 0 2px 12px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.04); transition: all 0.4s cubic-bezier(.22,1,.36,1); }
        .cat-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); border-color: #e94560; }
        .cat-card:hover .cat-icon { transform: scale(1.15); }
        .cat-icon { font-size: 44px; margin-bottom: 14px; transition: transform 0.4s cubic-bezier(.22,1,.36,1); display: block; }
        .view-all-btn { padding: 16px 40px; background: transparent; color: #0f3460; border: 2px solid #0f3460; border-radius: 50px; font-size: 15px; cursor: pointer; font-weight: 600; transition: all 0.3s; font-family: 'DM Sans', sans-serif; }
        .view-all-btn:hover { background: #0f3460; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(15,52,96,0.3); }
        .feature-card { text-align: center; padding: 32px 20px; border-radius: 16px; transition: all 0.4s; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
        .feature-card:hover { background: rgba(255,255,255,0.1); transform: translateY(-4px); }
        .search-btn { padding: 0 32px; background: #e94560; color: #fff; border: none; border-radius: 0 16px 16px 0; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.25s; font-family: 'DM Sans', sans-serif; white-space: nowrap; min-height: 72px; }
        .search-btn:hover { background: #d63851; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        .step-card { text-align: center; padding: 40px 28px 32px; border-radius: 20px; background: #fff; position: relative; border: 1px solid rgba(0,0,0,0.04); box-shadow: 0 4px 20px rgba(0,0,0,0.04); transition: all 0.4s; }
        .step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.08); }
      `}</style>

      <Navbar />

      {/* ─── HERO ─── */}
      <div style={styles.hero}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <FadeIn>
            <p style={styles.heroBadge}>PREMIUM CAR RENTAL IN TURKEY</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 style={styles.heroTitle}>
              Drive Your <span style={{ color: '#e94560' }}>Dream</span> Car Today
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p style={styles.heroSub}>
              Explore our fleet of 50+ premium vehicles across 5 cities.<br />
              Book in minutes, pick up and go.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <form onSubmit={handleSearch} style={styles.searchBox}>
              <div style={styles.searchField}>
                <label style={styles.searchLabel}>📍 Pickup Location</label>
                <select
                  style={styles.searchInput}
                  value={search.pickup_location_id}
                  onChange={e => setSearch({ ...search, pickup_location_id: e.target.value })}
                >
                  <option value="">Any location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                  ))}
                </select>
              </div>
              <div style={styles.searchDivider} />
              <div style={styles.searchField}>
                <label style={styles.searchLabel}>📅 Pickup Date</label>
                <input
                  style={styles.searchInput}
                  type="date"
                  min={today}
                  value={search.start_date}
                  onChange={e => setSearch({ ...search, start_date: e.target.value, end_date: '' })}
                  required
                />
              </div>
              <div style={styles.searchDivider} />
              <div style={styles.searchField}>
                <label style={styles.searchLabel}>🏁 Return Date</label>
                <input
                  style={styles.searchInput}
                  type="date"
                  min={search.start_date || today}
                  value={search.end_date}
                  onChange={e => setSearch({ ...search, end_date: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="search-btn">Search Cars →</button>
            </form>
          </FadeIn>
          <FadeIn delay={0.45}>
            <div style={styles.heroStats}>
              {[
                { num: '50+', label: 'Vehicles' },
                { num: '5', label: 'Cities' },
                { num: '10K+', label: 'Customers' },
                { num: '24/7', label: 'Support' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                  {i > 0 && <div style={styles.statDivider} />}
                  <div style={styles.stat}>
                    <strong style={styles.statNum}>{s.num}</strong>
                    <span style={styles.statLabel}>{s.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>

      {/* ─── HOW IT WORKS ─── */}
      <div style={{ ...styles.section, background: '#fafbfc' }}>
        <FadeIn>
          <p style={styles.sectionTag}>SIMPLE PROCESS</p>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSub}>Rent a car in 3 simple steps</p>
        </FadeIn>
        <div style={styles.stepsGrid}>
          {[
            { icon: '🔍', step: '01', title: 'Choose Your Vehicle', desc: 'Browse our fleet and select the perfect vehicle for your needs.', onClick: () => categoriesRef.current?.scrollIntoView({ behavior: 'smooth' }) },
            { icon: '📅', step: '02', title: 'Book & Pay', desc: 'Select your dates, pickup location and complete your booking online.' },
            { icon: '🚗', step: '03', title: 'Hit the Road', desc: 'Pick up your vehicle at the chosen location and enjoy your journey.' }
          ].map((s, i) => (
            <FadeIn key={i} delay={i * 0.12}>
              <div className="step-card" onClick={s.onClick} style={s.onClick ? { cursor: 'pointer' } : {}}>
                <div style={styles.stepNum}>{s.step}</div>
                <div style={styles.stepIcon}>{s.icon}</div>
                <h3 style={styles.stepTitle}>{s.title}</h3>
                <p style={styles.stepDesc}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* ─── CATEGORIES ─── */}
      <div ref={categoriesRef} style={styles.section}>
        <FadeIn>
          <p style={styles.sectionTag}>OUR FLEET</p>
          <h2 style={styles.sectionTitle}>Browse by Category</h2>
          <p style={styles.sectionSub}>Find the right vehicle for every occasion</p>
        </FadeIn>
        <div style={styles.categoriesGrid}>
          {categories.map((c, i) => (
            <FadeIn key={c.id} delay={i * 0.08}>
              <div className="cat-card" onClick={() => navigate(`/vehicles?category_id=${c.id}`)}>
                <span className="cat-icon">{categoryIcons[c.name] || '🚗'}</span>
                <h3 style={styles.categoryName}>{c.name}</h3>
                <p style={styles.categoryDesc}>{c.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      {/* ─── FEATURED VEHICLES ─── */}
      <div style={{ ...styles.section, background: '#fafbfc' }}>
        <FadeIn>
          <p style={styles.sectionTag}>TOP PICKS</p>
          <h2 style={styles.sectionTitle}>Featured Vehicles</h2>
          <p style={styles.sectionSub}>Our most popular rentals</p>
        </FadeIn>
        <div style={styles.vehiclesGrid}>
          {loadingVehicles ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#888', fontSize: '16px' }}>
              Loading vehicles…
            </div>
          ) : featuredVehicles.map((v, i) => (
            <FadeIn key={v.id} delay={i * 0.08}>
              <div className="vehicle-card" onClick={() => navigate(`/vehicles/${v.id}`)}>
                <div style={styles.vehicleImgWrapper}>
                  {v.primary_image
                    ? <img src={v.primary_image} alt={`${v.brand} ${v.model}`} className="v-img" style={styles.vehicleImg} />
                    : <div style={styles.vehicleImgFallback}>🚙</div>
                  }
                </div>
                <div style={styles.vehicleBody}>
                  <span style={styles.vehicleCat}>{v.category_name}</span>
                  <h3 style={styles.vehicleName}>{v.brand} {v.model}</h3>
                  <p style={styles.vehicleSub}>{v.year} • Available</p>
                  <div style={styles.vehicleFooter}>
                    <span style={styles.vehiclePrice}>${v.price_per_day}<small style={{ fontSize: '13px', fontWeight: 400, opacity: 0.6 }}>/day</small></span>
                    <button className="book-btn" onClick={(e) => { e.stopPropagation(); navigate(`/vehicles/${v.id}`); }}>Book Now</button>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.2}>
          <div style={styles.viewAllWrapper}>
            <button className="view-all-btn" onClick={() => navigate('/vehicles')}>View All Vehicles →</button>
          </div>
        </FadeIn>
      </div>

      {/* ─── WHY CHOOSE US ─── */}
      <div style={{ ...styles.section, background: 'linear-gradient(160deg, #0a2647 0%, #0f3460 40%, #162a50 100%)', color: '#fff' }}>
        <FadeIn>
          <p style={{ ...styles.sectionTag, color: '#e94560' }}>OUR ADVANTAGES</p>
          <h2 style={{ ...styles.sectionTitle, color: '#fff' }}>Why Choose <span style={{ color: '#e94560' }}>JUNE.</span>?</h2>
        </FadeIn>
        <div style={styles.featuresGrid}>
          {[
            { icon: '🔒', title: 'Secure Payments', desc: 'Your payment information is always protected.' },
            { icon: '📍', title: '5 City Coverage', desc: 'Istanbul, Ankara, Izmir, Bursa and Antalya.' },
            { icon: '🚗', title: 'Wide Selection', desc: 'From economy to luxury, we have it all.' },
            { icon: '📞', title: '24/7 Support', desc: 'Our call center is always available to help.' },
            { icon: '⚡', title: 'Instant Booking', desc: 'Book online in minutes, no paperwork needed.' },
            { icon: '🔄', title: 'Flexible Returns', desc: 'Return to any of our locations across Turkey.' },
          ].map((f, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="feature-card">
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#1a1a2e' },

  /* NAV */
  nav: { padding: '12px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, transition: 'all 0.35s ease' },
  navLeft: { display: 'flex', alignItems: 'center', gap: '40px' },
  navLinks: { display: 'flex', gap: '28px' },
  navRight: { display: 'flex', alignItems: 'center', gap: '12px' },
  welcome: { color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 500 },

  /* HERO */
  hero: { background: 'linear-gradient(160deg, #0a2647 0%, #0f3460 50%, #1a4b8c 100%)', color: '#fff', padding: '100px 48px 80px', position: 'relative', overflow: 'hidden' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 70% 20%, rgba(233,69,96,0.08) 0%, transparent 60%)', pointerEvents: 'none' },
  heroContent: { maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 },
  heroBadge: { display: 'inline-block', background: 'rgba(233,69,96,0.15)', color: '#e94560', padding: '8px 20px', borderRadius: '50px', fontSize: '12px', fontWeight: 700, letterSpacing: '2px', marginBottom: '28px' },
  heroTitle: { fontFamily: "'Playfair Display', serif", fontSize: '56px', fontWeight: 800, margin: '0 0 24px', lineHeight: 1.15, letterSpacing: '-0.5px' },
  heroSub: { fontSize: '17px', opacity: 0.75, margin: '0 0 40px', lineHeight: 1.7, fontWeight: 400 },
  heroButtons: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  searchBox: { display: 'flex', alignItems: 'stretch', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', margin: '0 auto 40px', maxWidth: '820px', border: '1px solid rgba(255,255,255,0.1)' },
  searchField: { flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 20px', minWidth: 0 },
  searchLabel: { fontSize: '11px', fontWeight: 700, color: '#999', letterSpacing: '0.5px', marginBottom: '4px', textAlign: 'left' },
  searchInput: { border: 'none', outline: 'none', fontSize: '14px', color: '#1a1a2e', fontWeight: 500, background: 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', padding: '2px 0' },
  searchDivider: { width: '1px', background: '#f0f0f0', margin: '12px 0' },
  heroStats: { display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '64px', background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px 12px', maxWidth: '620px', margin: '64px auto 0', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 28px', gap: '4px' },
  statNum: { fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' },
  statLabel: { fontSize: '13px', opacity: 0.6, fontWeight: 500, letterSpacing: '0.5px' },
  statDivider: { width: '1px', height: '36px', background: 'rgba(255,255,255,0.12)' },

  /* SECTIONS */
  section: { padding: '90px 48px', background: '#fff' },
  sectionTag: { textAlign: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '3px', color: '#e94560', marginBottom: '12px' },
  sectionTitle: { textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: '38px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 12px', letterSpacing: '-0.3px' },
  sectionSub: { textAlign: 'center', color: '#888', fontSize: '16px', margin: '0 0 52px', fontWeight: 400 },

  /* STEPS */
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '28px', maxWidth: '920px', margin: '0 auto' },
  stepNum: { position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #e94560, #d63851)', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', boxShadow: '0 4px 14px rgba(233,69,96,0.35)' },
  stepIcon: { fontSize: '44px', margin: '8px 0 16px' },
  stepTitle: { fontSize: '17px', color: '#1a1a2e', margin: '0 0 10px', fontWeight: 700 },
  stepDesc: { color: '#777', fontSize: '14px', lineHeight: 1.7 },

  /* CATEGORIES */
  categoriesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '780px', margin: '0 auto' },
  categoryName: { fontSize: '15px', color: '#1a1a2e', margin: '0 0 6px', fontWeight: 700 },
  categoryDesc: { fontSize: '12px', color: '#999', margin: 0, lineHeight: 1.5 },

  /* VEHICLES */
  vehiclesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', maxWidth: '1100px', margin: '0 auto' },
  vehicleImgWrapper: { height: '200px', overflow: 'hidden', background: 'linear-gradient(135deg, #e8eaf6 0%, #f5f5fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vehicleImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s cubic-bezier(.22,1,.36,1)' },
  vehicleImgFallback: { fontSize: '64px' },
  vehicleBody: { padding: '20px' },
  vehicleCat: { display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#e94560', background: 'rgba(233,69,96,0.08)', padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px', marginBottom: '8px' },
  vehicleName: { margin: '0 0 4px', fontSize: '18px', color: '#1a1a2e', fontWeight: 700 },
  vehicleSub: { color: '#999', fontSize: '13px', margin: '0 0 16px', fontWeight: 400 },
  vehicleFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid #f0f0f0' },
  vehiclePrice: { fontSize: '22px', fontWeight: 700, color: '#0f3460' },
  viewAllWrapper: { textAlign: 'center', marginTop: '48px' },

  /* FEATURES */
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '780px', margin: '0 auto' },
  featureIcon: { fontSize: '36px', marginBottom: '18px' },
  featureTitle: { fontSize: '15px', color: '#fff', margin: '0 0 10px', fontWeight: 700 },
  featureDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 },

  /* FOOTER */
  footer: { background: '#0a1628', color: '#fff', padding: '70px 48px 0' },
  footerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '40px', maxWidth: '1100px', margin: '0 auto', paddingBottom: '48px' },
  footerLogo: { fontFamily: "'Playfair Display', serif", fontSize: '26px', margin: '0 0 14px', fontWeight: 700, letterSpacing: '1px' },
  footerDesc: { color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.7 },
  footerTitle: { color: '#fff', margin: '0 0 18px', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' },
  footerText: { color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 10px' },
  footerBottom: { borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 0', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }
};