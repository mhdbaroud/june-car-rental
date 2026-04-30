import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FadeIn from '../components/FadeIn';
import ModernStyles from '../components/ModernStyles';

export default function Vehicles() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({
    category_id: params.get('category_id') || '',
    min_price: '',
    max_price: '',
    brand: '',
    transmission: '',
    pickup_location_id: ''
  });
  const [priceInputs, setPriceInputs] = useState({ min_price: '', max_price: '' });
  const [search, setSearch] = useState({ pickup_location_id: '', start_date: '', end_date: '' });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadStatic = async () => {
      try {
        const [categoriesRes, locationsRes] = await Promise.all([
          API.get('/vehicles/categories'),
          API.get('/locations')
        ]);
        setCategories(categoriesRes.data);
        setLocations(locationsRes.data);
      } catch (err) { console.error(err); }
    };
    loadStatic();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, min_price: priceInputs.min_price, max_price: priceInputs.max_price }));
    }, 500);
    return () => clearTimeout(timer);
  }, [priceInputs.min_price, priceInputs.max_price]);

  useEffect(() => {
    const doLoad = async () => {
      setLoading(true);
      const data = await loadVehicles(filters);
      setVehicles(data);
      const uniqueBrands = [...new Set(data.map(v => v.brand))].sort();
      setBrands(uniqueBrands);
      setLoading(false);
    };
    doLoad();
  }, [filters.category_id, filters.brand, filters.min_price, filters.max_price, filters.transmission, filters.pickup_location_id]);

  const makeQuery = (filters) => {
    const q = new URLSearchParams();
    if (filters.category_id) q.append('category_id', filters.category_id);
    if (filters.min_price) q.append('min_price', filters.min_price);
    if (filters.max_price) q.append('max_price', filters.max_price);
    if (filters.brand) q.append('brand', filters.brand);
    if (filters.transmission) q.append('transmission', filters.transmission);
    if (filters.pickup_location_id) q.append('pickup_location_id', filters.pickup_location_id);
    q.append('status', 'available');
    return `?${q.toString()}`;
  };

  const loadVehicles = async (filters) => {
    try {
      const query = makeQuery(filters);
      const res = await API.get(`/vehicles${query}`);
      return res.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.start_date || !search.end_date) return;
    sessionStorage.setItem('bookingSearch', JSON.stringify(search));
    navigate('/vehicles');
  };

  const handleReset = () => {
    setPriceInputs({ min_price: '', max_price: '' });
    setFilters({ category_id: '', min_price: '', max_price: '', brand: '', transmission: '', pickup_location_id: '' });
  };

  return (
    <div style={styles.page}>
      <style jsx>{`
        .vehicle-card { 
          background: #fff; 
          border-radius: 16px; 
          overflow: hidden; 
          box-shadow: 0 2px 16px rgba(0,0,0,0.06); 
          border: 1px solid rgba(0,0,0,0.04); 
          transition: all 0.4s cubic-bezier(.22,1,.36,1); 
          cursor: pointer; 
        }
        .vehicle-card:hover { 
          transform: translateY(-8px); 
          box-shadow: 0 20px 50px rgba(0,0,0,0.12); 
          border-color: transparent; 
        }
        .vehicle-card:hover .v-img { 
          transform: scale(1.05); 
        }
        .book-btn { 
          padding: 8px 20px; 
          background: #0f3460; 
          color: #fff; 
          border: none; 
          border-radius: 50px; 
          cursor: pointer; 
          font-size: 13px; 
          font-weight: 600; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
        }
        .book-btn:hover { 
          background: #e94560; 
          transform: scale(1.05); 
        }
        .filter-card { 
          background: #fff; 
          border-radius: 16px; 
          padding: 24px; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.06); 
        }
        .search-btn { 
          padding: 0 32px; 
          background: #e94560; 
          color: #fff; 
          border: none; 
          border-radius: 0 16px 16px 0; 
          font-size: 15px; 
          font-weight: 700; 
          cursor: pointer; 
          transition: all 0.25s cubic-bezier(.22,1,.36,1); 
          min-height: 72px; 
        }
        .search-btn:hover { 
          background: #d63851; 
        }
        .hero-btn-primary { 
          padding: 16px 40px; 
          background: #e94560; 
          color: #fff; 
          border: none; 
          border-radius: 50px; 
          font-size: 15px; 
          cursor: pointer; 
          font-weight: 600; 
          letter-spacing: 0.5px; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
        }
        .hero-btn-primary:hover { 
          background: #d63851; 
          transform: translateY(-2px); 
          box-shadow: 0 8px 30px rgba(233,69,96,0.4); 
        }
      `}</style>
      <Navbar />
      <div style={ModernStyles.hero}>
        <div style={ModernStyles.heroOverlay} />
        <div style={ModernStyles.heroContent}>
          <FadeIn>
            <p style={ModernStyles.heroBadge}>FIND YOUR PERFECT VEHICLE</p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 style={ModernStyles.heroTitle}>
              Browse Our <span style={{ color: '#e94560' }}>Fleet</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p style={styles.heroSub}>
              Discover premium vehicles available for rent across Turkey. 
              Filter by category, price, and location to find your match.
            </p>
          </FadeIn>
          <FadeIn delay={0.3}>
            <form onSubmit={handleSearch} style={styles.heroSearchBox}>
              <div style={styles.heroSearchField}>
                <label style={styles.heroSearchLabel}>📍 Pickup Location</label>
                <select
                  style={styles.heroSearchInput}
                  value={search.pickup_location_id}
                  onChange={e => setSearch({ ...search, pickup_location_id: e.target.value })}
                >
                  <option value="">Any location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                  ))}
                </select>
              </div>
              <div style={styles.heroSearchDivider} />
              <div style={styles.heroSearchField}>
                <label style={styles.heroSearchLabel}>📅 Start Date</label>
                <input
                  style={styles.heroSearchInput}
                  type="date"
                  min={today}
                  value={search.start_date}
                  onChange={e => setSearch({ ...search, start_date: e.target.value })}
                />
              </div>
              <div style={styles.heroSearchDivider} />
              <div style={styles.heroSearchField}>
                <label style={styles.heroSearchLabel}>🏁 End Date</label>
                <input
                  style={styles.heroSearchInput}
                  type="date"
                  min={search.start_date || today}
                  value={search.end_date}
                  onChange={e => setSearch({ ...search, end_date: e.target.value })}
                />
              </div>
              <button type="submit" className="search-btn">Search Vehicles</button>
            </form>
          </FadeIn>
        </div>
      </div>

      <div style={ModernStyles.section}>
        <FadeIn>
          <p style={ModernStyles.sectionTag}>OUR FLEET</p>
          <h2 style={ModernStyles.sectionTitle}>All Available Vehicles ({vehicles.length})</h2>
        </FadeIn>
        <div style={styles.filterLayout}>
          <div style={styles.filterCard}>
            <div style={styles.filterHeader}>
              <h3 style={styles.filterTitle}>Filters</h3>
              <button className="hero-btn-primary" style={{padding: '8px 16px', fontSize: '13px'}} onClick={handleReset}>Reset All</button>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Category</label>
              <select style={styles.select} value={filters.category_id}
                onChange={e => setFilters({...filters, category_id: e.target.value})}>
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Brand</label>
              <select style={styles.select} value={filters.brand}
                onChange={e => setFilters({...filters, brand: e.target.value})}>
                <option value="">All Brands</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Transmission</label>
              <select style={styles.select} value={filters.transmission}
                onChange={e => setFilters({...filters, transmission: e.target.value})}>
                <option value="">All Types</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Price per Day</label>
              <div style={styles.priceRow}>
                <input style={styles.priceInput} type="number" placeholder="Min $" min="0"
                  value={priceInputs.min_price}
                  onChange={e => setPriceInputs(p => ({ ...p, min_price: e.target.value }))} />
                <span style={styles.priceSep}>—</span>
                <input style={styles.priceInput} type="number" placeholder="Max $" min="0"
                  value={priceInputs.max_price}
                  onChange={e => setPriceInputs(p => ({ ...p, max_price: e.target.value }))} />
              </div>
            </div>
          </div>

          {vehicles.length === 0 ? (
            <FadeIn>
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🚗</div>
                <h3 style={styles.emptyTitle}>No vehicles found</h3>
                <p style={styles.emptyText}>Try adjusting your filters or browse all available vehicles.</p>
                <button className="hero-btn-primary" onClick={handleReset}>Reset Filters</button>
              </div>
            </FadeIn>
          ) : (
            <>
              <div style={styles.vehiclesGrid}>
                {vehicles.map((v, i) => (
                  <FadeIn key={v.id} delay={(i % 4) * 0.05}>
                    <div className="vehicle-card" onClick={() => navigate(`/vehicles/${v.id}`)}>
                      <div style={styles.vehicleImgWrapper}>
                        {v.primary_image ? (
                          <img 
                            src={v.primary_image} 
                            alt={`${v.brand} ${v.model}`} 
                            className="v-img" 
                            style={styles.vehicleImg} 
                          />
                        ) : (
                          <div style={styles.vehicleImgFallback}>🚙</div>
                        )}
                      </div>
                      <div style={styles.vehicleBody}>
                        <span style={styles.vehicleCat}>{v.category_name}</span>
                        <h3 style={styles.vehicleName}>{v.brand} {v.model}</h3>
                        <p style={styles.vehicleSub}>{v.year} • {v.transmission === 'manual' ? 'Manual' : 'Automatic'} • {v.fuel_type || 'Gasoline'}</p>
                        <div style={styles.vehicleFooter}>
                          <span style={styles.vehiclePrice}>${v.price_per_day}
                            <small style={styles.priceSmall}>/day</small>
                          </span>
                          <button className="book-btn">View Details</button>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
              {loading && (
                <div style={styles.loadingIndicator}>
                  <span>🔄 Loading vehicles...</span>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      <div style={styles.ctaSection}>
        <FadeIn>
          <h2 style={styles.ctaTitle}>Ready to Book?</h2>
          <p style={styles.ctaSub}>Can't find what you're looking for? Contact us for special requests.</p>
          <button className="hero-btn-primary" style={{padding: '16px 40px', fontSize: '15px'}} onClick={() => navigate('/')}>
            Back to Home
          </button>
        </FadeIn>
      </div>

      <Footer />
    </div>
  );
}

const styles = {
  page: { fontFamily: "'DM Sans', sans-serif" },
  heroSub: { fontSize: '17px', opacity: 0.9, lineHeight: 1.6, marginBottom: '40px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' },
  heroSearchBox: { 
    display: 'flex', 
    alignItems: 'stretch', 
    background: '#fff', 
    borderRadius: '16px', 
    overflow: 'hidden', 
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)', 
    margin: '40px auto', 
    maxWidth: '820px', 
    border: '1px solid rgba(255,255,255,0.1)' 
  },
  heroSearchField: { flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', minWidth: 0 },
  heroSearchLabel: { fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '0.5px', marginBottom: '6px' },
  heroSearchInput: { border: 'none', outline: 'none', fontSize: '15px', color: '#1a1a2e', fontWeight: 500, background: 'transparent', fontFamily: "'DM Sans', sans-serif", width: '100%', padding: '4px 0' },
  heroSearchDivider: { width: '1px', background: '#f0f0f0', margin: '20px 0' },
  filterLayout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '32px', maxWidth: '1400px', margin: '0 auto' },
  filterCard: { position: 'sticky', top: '120px', height: 'fit-content' },
  filterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  filterTitle: { margin: 0, color: '#1a1a2e', fontSize: '18px', fontFamily: "'Playfair Display', serif" },
  filterGroup: { marginBottom: '24px' },
  filterLabel: { display: 'block', fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px' },
  select: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '14px', background: '#fafbfc', transition: 'all 0.2s' },
  priceRow: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px', background: '#f8f9fa', borderRadius: '8px', overflow: 'hidden' },
  priceInput: { flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', width: '100%' },
  priceSep: { color: '#999', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 },
  vehiclesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' },
  vehicleImgWrapper: { height: '220px', overflow: 'hidden', background: 'linear-gradient(135deg, #e8eaf6 0%, #f5f5fa 100%)' },
  vehicleImg: { width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s cubic-bezier(.22,1,.36,1)' },
  vehicleImgFallback: { fontSize: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  vehicleBody: { padding: '24px' },
  vehicleCat: { display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#e94560', background: 'rgba(233,69,96,0.08)', padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' },
  vehicleName: { margin: '8px 0 6px', fontSize: '20px', color: '#1a1a2e', fontWeight: 700, fontFamily: "'Playfair Display', serif" },
  vehicleSub: { color: '#888', fontSize: '14px', margin: '0 0 16px', opacity: 0.8 },
  vehicleFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f0f0f0' },
  vehiclePrice: { fontSize: '24px', fontWeight: 800, color: '#0f3460' },
  priceSmall: { fontSize: '14px', fontWeight: 500, opacity: 0.6, marginLeft: '4px' },
  emptyState: { textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
  emptyIcon: { fontSize: '64px', marginBottom: '24px' },
  emptyTitle: { color: '#1a1a2e', fontSize: '24px', margin: '0 0 12px', fontFamily: "'Playfair Display', serif" },
  emptyText: { color: '#666', fontSize: '16px', marginBottom: '24px', lineHeight: 1.6 },
  ctaSection: { background: 'linear-gradient(135deg, #0f3460 0%, #1a4b8c 100%)', color: '#fff', padding: '80px 48px', textAlign: 'center' },
  ctaTitle: { fontSize: '38px', margin: '0 0 16px', fontFamily: "'Playfair Display', serif", fontWeight: 700 },
  ctaSub: { fontSize: '17px', opacity: 0.9, margin: '0 0 32px', lineHeight: 1.6 },
  loadingIndicator: { textAlign: 'center', padding: '40px', color: '#666', fontSize: '16px' }
};

