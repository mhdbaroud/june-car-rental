import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function About() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      <Navbar />
      <div className="page-header">
        <h1>About JUNE.</h1>
        <p>Turkey's premier vehicle rental management platform</p>
      </div>

      {/* MISSION */}
      <div style={styles.section}>
        <div style={styles.missionGrid}>
          <div style={styles.missionText}>
            <h2 style={styles.sectionTitle}>Our Mission</h2>
            <p style={styles.text}>JUNE (Vehicle Rental Management System) was founded with a simple mission: to make vehicle rental accessible, transparent, and hassle-free for everyone in Turkey.</p>
            <p style={styles.text}>We believe that renting a car should be as easy as booking a hotel room. Our platform connects customers with a wide fleet of vehicles across 5 major Turkish cities, providing a seamless digital experience from booking to return.</p>
          </div>
          <div style={styles.missionStats}>
            {[
              { value: '50+', label: 'Vehicles in Fleet' },
              { value: '5', label: 'Cities Covered' },
              { value: '10+', label: 'Office Locations' },
              { value: '10,000+', label: 'Happy Customers' },
            ].map((s, i) => (
              <div key={i} style={styles.statCard}>
                <div style={styles.statValue}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VALUES */}
      <div style={{...styles.section, background: '#f8f9fa'}}>
        <h2 style={{...styles.sectionTitle, textAlign: 'center'}}>Our Values</h2>
        <div style={styles.valuesGrid}>
          {[
            { icon: '🤝', title: 'Trust', desc: 'We build lasting relationships with our customers through transparency and reliability.' },
            { icon: '⚡', title: 'Efficiency', desc: 'We streamline the rental process to save you time and reduce complexity.' },
            { icon: '🌍', title: 'Accessibility', desc: 'We make vehicle rental available to everyone across Turkey.' },
            { icon: '🔒', title: 'Security', desc: 'We protect your personal and payment information with the highest security standards.' },
          ].map((v, i) => (
            <div key={i} style={styles.valueCard}>
              <div style={styles.valueIcon}>{v.icon}</div>
              <h3 style={styles.valueTitle}>{v.title}</h3>
              <p style={styles.valueDesc}>{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TEAM */}
      <div style={styles.section}>
        <h2 style={{...styles.sectionTitle, textAlign: 'center'}}>Development Team</h2>
        <p style={{textAlign: 'center', color: '#666', marginBottom: '40px'}}>Built by students at Uskudar University</p>
        <div style={styles.teamGrid}>
          {[
            { name: 'MHD MONIR BAROUD', role: 'Backend Developer', id: '220209911', icon: '👨‍💻' },
            { name: 'Amira Saeid Abdelkawy', role: 'Frontend Developer', id: '220209390', icon: '👩‍💻' },
          ].map((m, i) => (
            <div key={i} style={styles.teamCard}>
              <div style={styles.teamAvatar}>{m.icon}</div>
              <h3 style={styles.teamName}>{m.name}</h3>
              <p style={styles.teamRole}>{m.role}</p>
              <p style={styles.teamId}>Student ID: {m.id}</p>
              <p style={styles.teamUniv}>Uskudar University</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={styles.cta}>
        <h2 style={styles.ctaTitle}>Ready to Get Started?</h2>
        <p style={styles.ctaSub}>Browse our fleet and book your perfect vehicle today.</p>
        <button style={styles.ctaBtn} onClick={() => navigate('/vehicles')}>Browse Vehicles</button>
      </div>

      <Footer />
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" },
  section: { padding: '80px 48px', background: '#fff' },
  sectionTitle: { fontSize: '32px', color: '#1a1a2e', margin: '0 0 20px' },
  missionGrid: { display: 'flex', gap: '60px', maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap' },
  missionText: { flex: 1, minWidth: '300px' },
  text: { color: '#555', lineHeight: 1.8, fontSize: '16px', marginBottom: '16px' },
  missionStats: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignSelf: 'flex-start' },
  statCard: { background: '#f0f2f5', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  statValue: { fontSize: '32px', fontWeight: 'bold', color: '#0f3460' },
  statLabel: { fontSize: '13px', color: '#666', marginTop: '4px' },
  valuesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '40px auto 0' },
  valueCard: { background: '#fff', borderRadius: '16px', padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  valueIcon: { fontSize: '40px', marginBottom: '16px' },
  valueTitle: { fontSize: '18px', color: '#1a1a2e', margin: '0 0 8px' },
  valueDesc: { color: '#666', fontSize: '14px', lineHeight: 1.6 },
  teamGrid: { display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' },
  teamCard: { background: '#f8f9fa', borderRadius: '16px', padding: '40px 32px', textAlign: 'center', width: '280px' },
  teamAvatar: { fontSize: '64px', marginBottom: '16px' },
  teamName: { fontSize: '18px', color: '#1a1a2e', margin: '0 0 6px' },
  teamRole: { color: '#e94560', fontSize: '14px', fontWeight: 'bold', margin: '0 0 6px' },
  teamId: { color: '#666', fontSize: '13px', margin: '0 0 4px' },
  teamUniv: { color: '#0f3460', fontSize: '13px', fontWeight: 'bold' },
  cta: { background: '#0f3460', color: '#fff', padding: '80px 48px', textAlign: 'center' },
  ctaTitle: { fontSize: '36px', margin: '0 0 16px' },
  ctaSub: { fontSize: '16px', opacity: 0.8, margin: '0 0 32px' },
  ctaBtn: { padding: '16px 40px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
  ctaBtn: { padding: '16px 40px', background: '#e94560', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }
};