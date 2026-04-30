import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Static Google Maps embed URLs per city
const cityMapEmbeds = {
  Istanbul: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d192698.9525406946!2d28.847774!3d41.0082376!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14caa7040068086b%3A0xe1ccfe98bc01b0d0!2sIstanbul!5e0!3m2!1sen!2str!4v1700000000000',
  Ankara: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d196177.4!2d32.8597419!3d39.9333635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14d347d520732db5%3A0xbdc57b0c0842b8d!2sAnkara!5e0!3m2!1sen!2str!4v1700000000001',
  Izmir: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d200736.4!2d27.1428!3d38.4237!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14bbd862a762cacd%3A0x628cbba1a59ce8fe!2sIzmir!5e0!3m2!1sen!2str!4v1700000000002',
  Bursa: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d192970.4!2d29.0609754!3d40.1885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14ca16d1b6d94fb1%3A0x1c47c2c75e91a48!2sBursa!5e0!3m2!1sen!2str!4v1700000000003',
  Antalya: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d200736.4!2d30.7133!3d36.8969!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14c39f37f5f21769%3A0x7bc1cad9f7d90d52!2sAntalya!5e0!3m2!1sen!2str!4v1700000000004',
};

const cityImages = {
  Istanbul: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Hagia_Sophia_from_the_Marmara_July_2006.jpg/1280px-Hagia_Sophia_from_the_Marmara_July_2006.jpg',
  Ankara:   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Anitkabir_3.jpg/1280px-Anitkabir_3.jpg',
  Izmir:    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Izmir_Kordon.jpg/1280px-Izmir_Kordon.jpg',
  Bursa:    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bursa_Ulu_Camii.jpg/1280px-Bursa_Ulu_Camii.jpg',
  Antalya:  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Antalya_city.jpg/1280px-Antalya_city.jpg',
};

export default function Locations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [locations, setLocations] = useState([]);
  const [selectedCity, setSelectedCity] = useState(() => {
    const city = searchParams.get('city');
    return city && ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'].includes(city) ? city : 'All';
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const gridRef = useRef(null);
  const cities = ['All', 'Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'];
  const cityIcons = { Istanbul: '🌉', Ankara: '🏛️', Izmir: '🌊', Bursa: '🏔️', Antalya: '🌴' };

  useEffect(() => { loadLocations(); }, []);

  useEffect(() => {
    const city = searchParams.get('city');
    if (city && ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'].includes(city)) {
      setSelectedCity(city);
      setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [searchParams]);

  const loadLocations = async () => {
    try {
      const res = await API.get('/locations');
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  const filtered = selectedCity === 'All' ? locations : locations.filter(l => l.city === selectedCity);

  return (
    <div style={styles.page}>
      <Navbar />
      <div className="page-header">
        <h2>Our Locations</h2>
        <p>Find us across 5 major cities in Turkey</p>
      </div>

      {/* CITY TABS */}
      <div style={styles.cityTabs}>
        {cities.map(c => (
          <button key={c} style={{ ...styles.cityTab, background: selectedCity === c ? '#0f3460' : '#fff', color: selectedCity === c ? '#fff' : '#333' }}
            onClick={() => setSelectedCity(c)}>
            {c !== 'All' && cityIcons[c]} {c}
          </button>
        ))}
      </div>

      {/* LOCATIONS GRID */}
      <div ref={gridRef} style={styles.container}>
        <div style={styles.grid}>
          {filtered.map(l => (
            <div key={l.id} style={styles.card} onClick={() => setSelectedLocation(l)}>
              <div style={styles.cardHeader}>
                <span style={styles.cityIcon}>{cityIcons[l.city] || '📍'}</span>
                <div>
                  <h3 style={styles.cardTitle}>{l.name}</h3>
                  <span style={styles.cityBadge}>{l.city}</span>
                </div>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.infoRow}><span style={styles.infoIcon}>📍</span><span>{l.address}</span></div>
                <div style={styles.infoRow}><span style={styles.infoIcon}>📞</span><span>{l.phone}</span></div>
                <div style={styles.infoRow}><span style={styles.infoIcon}>🕐</span><span>{l.working_hours}</span></div>
              </div>
              <button style={styles.viewBtn} onClick={(e) => { e.stopPropagation(); setSelectedLocation(l); }}>
                📍 View on Map
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* LOCATION DETAIL MODAL */}
      {selectedLocation && (
        <div style={styles.overlay} onClick={() => setSelectedLocation(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setSelectedLocation(null)}>✕</button>

            {/* City image */}
            <div style={styles.modalImgWrapper}>
              <img
                src={cityImages[selectedLocation.city]}
                alt={selectedLocation.city}
                style={styles.modalImg}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <div style={styles.modalImgOverlay}>
                <span style={styles.modalCityIcon}>{cityIcons[selectedLocation.city]}</span>
                <h2 style={styles.modalLocationName}>{selectedLocation.name}</h2>
                <span style={styles.modalCityBadge}>{selectedLocation.city}</span>
              </div>
            </div>

            {/* Info */}
            <div style={styles.modalInfo}>
              <div style={styles.modalInfoGrid}>
                <div style={styles.modalInfoItem}>
                  <span style={styles.modalInfoIcon}>📍</span>
                  <div>
                    <div style={styles.modalInfoLabel}>Address</div>
                    <div style={styles.modalInfoValue}>{selectedLocation.address}</div>
                  </div>
                </div>
                <div style={styles.modalInfoItem}>
                  <span style={styles.modalInfoIcon}>📞</span>
                  <div>
                    <div style={styles.modalInfoLabel}>Phone</div>
                    <div style={styles.modalInfoValue}>{selectedLocation.phone}</div>
                  </div>
                </div>
                <div style={styles.modalInfoItem}>
                  <span style={styles.modalInfoIcon}>🕐</span>
                  <div>
                    <div style={styles.modalInfoLabel}>Working Hours</div>
                    <div style={styles.modalInfoValue}>{selectedLocation.working_hours}</div>
                  </div>
                </div>
                <div style={styles.modalInfoItem}>
                  <span style={styles.modalInfoIcon}>🌆</span>
                  <div>
                    <div style={styles.modalInfoLabel}>City</div>
                    <div style={styles.modalInfoValue}>{selectedLocation.city}, Turkey</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps embed */}
            <div style={styles.mapWrapper}>
              <iframe
                title={`Map of ${selectedLocation.city}`}
                src={cityMapEmbeds[selectedLocation.city]}
                width="100%"
                height="280"
                style={{ border: 0, borderRadius: '0 0 16px 16px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div style={styles.modalActions}>
              <button style={styles.bookBtn} onClick={() => { setSelectedLocation(null); navigate('/vehicles'); }}>
                🚗 Browse Vehicles Here
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAP SECTION */}
      <div style={styles.mapSection}>
        <h3 style={styles.mapTitle}>📍 We Are Across Turkey</h3>
        <div style={styles.mapPlaceholder}>
          <div style={styles.mapContent}>
            {['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'].map(c => (
              <div key={c} style={styles.mapCity} onClick={() => setSelectedCity(c)}>
                <span style={styles.mapDot}>●</span>
                <span>{cityIcons[c]} {c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'DM Sans', sans-serif" },
  cityTabs: { display: 'flex', gap: '12px', padding: '24px 48px', background: '#fff', flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cityTab: { padding: '10px 20px', border: '1px solid #ddd', borderRadius: '24px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  container: { padding: '40px 48px', maxWidth: '1200px', margin: '0 auto' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' },
  cityIcon: { fontSize: '40px' },
  cardTitle: { margin: '0 0 6px', fontSize: '17px', color: '#1a1a2e' },
  cityBadge: { background: '#e8eaf6', color: '#0f3460', padding: '2px 10px', borderRadius: '12px', fontSize: '12px' },
  cardBody: { marginBottom: '20px' },
  infoRow: { display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '14px', color: '#555', alignItems: 'flex-start' },
  infoIcon: { fontSize: '16px', flexShrink: 0 },
  viewBtn: { width: '100%', padding: '12px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },

  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  closeBtn: { position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalImgWrapper: { position: 'relative', height: '200px', overflow: 'hidden', borderRadius: '16px 16px 0 0' },
  modalImg: { width: '100%', height: '100%', objectFit: 'cover' },
  modalImgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,52,96,0.85), transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px' },
  modalCityIcon: { fontSize: '32px', marginBottom: '4px' },
  modalLocationName: { color: '#fff', margin: '0 0 6px', fontSize: '22px' },
  modalCityBadge: { background: '#e94560', color: '#fff', padding: '2px 12px', borderRadius: '12px', fontSize: '12px', alignSelf: 'flex-start' },
  modalInfo: { padding: '20px 24px' },
  modalInfoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  modalInfoItem: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  modalInfoIcon: { fontSize: '20px', flexShrink: 0 },
  modalInfoLabel: { fontSize: '11px', color: '#999', textTransform: 'uppercase', marginBottom: '2px' },
  modalInfoValue: { fontSize: '14px', color: '#333', fontWeight: '500' },
  mapWrapper: { borderTop: '1px solid #f0f0f0' },
  modalActions: { padding: '16px 24px' },
  bookBtn: { width: '100%', padding: '14px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },

  // Bottom map section
  mapSection: { background: '#fff', padding: '60px 48px', textAlign: 'center' },
  mapTitle: { fontSize: '24px', color: '#1a1a2e', margin: '0 0 32px' },
  mapPlaceholder: { background: '#f0f2f5', borderRadius: '16px', padding: '60px', maxWidth: '600px', margin: '0 auto' },
  mapContent: { display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' },
  mapCity: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', color: '#0f3460', fontWeight: 'bold', cursor: 'pointer' },
  mapDot: { color: '#e94560', fontSize: '20px' },
  footer: { background: '#16213e', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px', fontSize: '13px' },
};