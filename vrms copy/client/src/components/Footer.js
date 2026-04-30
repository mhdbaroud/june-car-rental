import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <>
      <style>{`
        .footer-link { 
          color: rgba(255,255,255,0.6); 
          text-decoration: none; 
          font-size: 14px; 
          display: block; 
          margin-bottom: 12px; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
        }
        .footer-link:hover { 
          color: #fff; 
          padding-left: 8px; 
        }
      `}</style>
      <footer style={{ background: 'linear-gradient(180deg, #0a1628 0%, #0f3460 100%)', color: '#fff', padding: '70px 48px 0', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
          maxWidth: '1100px',
          margin: '0 auto',
          paddingBottom: '48px'
        }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', margin: '0 0 14px', fontWeight: 700, letterSpacing: '1px', color: '#e94560' }}>JUNE.</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.7 }}>
              Premium car rental service serving customers across Turkey since 2026.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: '0 0 18px', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Quick Links</h4>
            <Link to="/" className="footer-link">Home</Link>
            <Link to="/vehicles" className="footer-link">Browse Vehicles</Link>
            <Link to="/locations" className="footer-link">Locations</Link>
            <Link to="/about" className="footer-link">About Us</Link>
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: '0 0 18px', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Cities</h4>
            {['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya'].map(c => (
              <Link key={c} to={`/locations?city=${c}`} className="footer-link">
                🌆 {c}
              </Link>
            ))}
          </div>
          <div>
            <h4 style={{ color: '#fff', margin: '0 0 18px', fontSize: '14px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Contact</h4>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 10px' }}>📞 +90 212 123 4567</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 10px' }}>✉️ support@junecarrental.com</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', marginBottom: '10px' }}>🕐 24/7 Support</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 48px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
          <p>© 2026 JUNE. Car Rental. All rights reserved. | Made by Uskudar University students</p>
        </div>
      </footer>
    </>
  );
}

