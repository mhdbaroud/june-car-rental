import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const active = (path) =>
    location.pathname === path ? ' active' : '';

  return (
    <>
      <style>{`
        .nav-link { 
          color: rgba(255,255,255,0.8); 
          text-decoration: none; 
          font-size: 15px; 
          font-weight: 500; 
          padding: 8px 0; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
          position: relative; 
        }
        .nav-link:hover { 
          color: #fff; 
        }
        .nav-link.active { 
          color: #fff; 
          font-weight: 600; 
        }
        .nav-link.active::after { 
          content: ''; 
          position: absolute; 
          bottom: 0; 
          left: 0; 
          width: 100%; 
          height: 2px; 
          background: #e94560; 
        }
        .nav-btn { 
          padding: 8px 20px; 
          background: #e94560; 
          color: #fff; 
          border: none; 
          border-radius: 25px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
        }
        .nav-btn:hover { 
          background: #d63851; 
          transform: translateY(-1px); 
          box-shadow: 0 4px 15px rgba(233,69,96,0.4); 
        }
        .nav-btn-outline { 
          padding: 8px 20px; 
          background: transparent; 
          color: #fff; 
          border: 2px solid rgba(255,255,255,0.3); 
          border-radius: 25px; 
          cursor: pointer; 
          font-size: 14px; 
          font-weight: 500; 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
        }
        .nav-btn-outline:hover { 
          border-color: #fff; 
          background: rgba(255,255,255,0.1); 
          transform: translateY(-1px); 
        }
      `}</style>
      <nav style={{
        padding: '12px 48px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.35s ease',
        background: scrolled ? 'rgba(15,52,96,0.97)' : '#0f3460',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.15)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <img
            src={logo}
            alt="JUNE."
            style={{ width: '100px', height: 'auto', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
          <div style={{ display: 'flex', gap: '28px' }}>
            <Link to="/"         className={`nav-link${active('/')}`}>Home</Link>
            <Link to="/vehicles" className={`nav-link${active('/vehicles')}`}>Browse Vehicles</Link>
            <Link to="/locations" className={`nav-link${active('/locations')}`}>Locations</Link>
            <Link to="/about"    className={`nav-link${active('/about')}`}>About Us</Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', fontWeight: 500 }}>
                Hi, {user.name}
              </span>
              {['admin', 'call_center', 'shop_worker'].includes(user.role) && (
                <button className="nav-btn" onClick={() => navigate('/admin')}>Dashboard</button>
              )}
              <button className="nav-btn" onClick={() => navigate('/my-bookings')}>My Bookings</button>
              <button className="nav-btn-outline" onClick={() => navigate('/profile')}>My Profile</button>
              <button className="nav-btn-outline" onClick={() => { logout(); navigate('/login'); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" style={{ padding: '8px 4px' }}>Login</Link>
              <button className="nav-btn" onClick={() => navigate('/register')}>Register</button>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

