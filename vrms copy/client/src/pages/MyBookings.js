import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FadeIn from '../components/FadeIn';
import ModernStyles from '../components/ModernStyles';
import RentalContract from '../components/RentalContract';

const CANCEL_REASONS = [
  { label: 'Change of plans', icon: '📋' },
  { label: 'Found a better deal', icon: '💰' },
  { label: 'Travel dates changed', icon: '📅' },
  { label: 'Vehicle not suitable', icon: '🚗' },
  { label: 'Other', icon: '✏️' },
];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [contractBooking, setContractBooking] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await API.get('/bookings/my');
      setBookings(res.data);
    } catch (err) {
      toast.error('Failed to load bookings');
    }
    setLoading(false);
  };

  const openCancelModal = (id) => { setCancelModal(id); setSelectedReason(''); setOtherReason(''); };
  const closeCancelModal = () => { setCancelModal(null); setSelectedReason(''); setOtherReason(''); };

  const submitCancellation = async () => {
    if (!selectedReason) { toast.error('Please select a reason'); return; }
    if (selectedReason === 'Other' && !otherReason.trim()) { toast.error('Please describe your reason'); return; }
    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    setSubmitting(true);
    try {
      await API.put(`/bookings/${cancelModal}/request-cancellation`, { reason: finalReason });
      toast.success('Cancellation request submitted!');
      closeCancelModal();
      loadBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Request failed');
    }
    setSubmitting(false);
  };

  const statusColor = (status) => ({
    pending: '#f59e0b', confirmed: '#22c55e', cancelled: '#ef4444',
    completed: '#6366f1', cancellation_requested: '#f97316',
    payment_pending: '#3b82f6', active: '#059669'
  }[status] || '#666');

  const statusLabel = (status) => ({
    pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled',
    completed: 'Completed', cancellation_requested: 'Cancellation Pending',
    payment_pending: 'Payment Pending', active: 'Active'
  }[status] || status);

  const paymentMethodLabel = (method) => ({
    credit_card: '💳 Credit Card', debit_card: '💳 Debit Card', cash: '💵 Cash on Pickup'
  }[method] || method);

  const canCancel = (status) => ['pending', 'confirmed', 'active', 'payment_pending'].includes(status);

  if (loading) return <div style={styles.loading}>Loading your bookings...</div>;

  return (
    <div style={styles.page}>
      <Navbar />
      <style>{`
        .bookings-hero { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%); 
          padding: 100px 48px 60px; 
          color: #fff; 
          position: relative; 
          overflow: hidden; 
        }
        .booking-card { 
          background: rgba(255,255,255,0.95); 
          backdrop-filter: blur(20px); 
          border-radius: 24px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.15); 
          transition: all 0.4s cubic-bezier(.22,1,.36,1); 
          border: 1px solid rgba(255,255,255,0.3); 
        }
        .booking-card:hover { 
          transform: translateY(-6px); 
          box-shadow: 0 30px 80px rgba(0,0,0,0.2); 
        }
        .status-badge-modern { 
          padding: 8px 16px; 
          border-radius: 25px; 
          font-size: 13px; 
          font-weight: 600; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
        }
        .cancel-btn-modern {
          position: relative;
          background: transparent;
          border: 1.5px solid rgba(239,68,68,0.35) !important;
          color: #dc2626;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.2px;
          transition: all 0.25s cubic-bezier(.22,1,.36,1);
          overflow: hidden;
        }
        .cancel-btn-modern::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .cancel-btn-modern:hover::before { opacity: 1; }
        .cancel-btn-modern:hover {
          color: #fff;
          border-color: transparent !important;
          box-shadow: 0 8px 24px rgba(239,68,68,0.35);
          transform: translateY(-1px);
        }
        .cancel-btn-modern span { position: relative; z-index: 1; }
        .cancel-btn-modern:hover .cancel-icon { transform: rotate(-10deg); }
        .modal-modern { 
          background: rgba(255,255,255,0.98); 
          backdrop-filter: blur(30px); 
          border-radius: 28px; 
          box-shadow: 0 40px 100px rgba(0,0,0,0.3); 
          border: 1px solid rgba(255,255,255,0.4); 
        }
        .reason-option {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          border: 2px solid #eee;
          border-radius: 14px;
          transition: all 0.25s cubic-bezier(.22,1,.36,1);
          cursor: pointer;
          background: #fafafa;
          width: 100%;
          text-align: left;
          font-family: 'DM Sans', sans-serif;
        }
        .reason-option:hover {
          border-color: #b0c4e8;
          background: rgba(15,52,96,0.04);
        }
        .reason-option.selected {
          border-color: #0f3460;
          background: rgba(15,52,96,0.06);
        }
        .reason-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid #ccc;
          margin-left: auto;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .reason-option.selected .reason-check {
          background: #0f3460;
          border-color: #0f3460;
          color: #fff;
          font-size: 13px;
        }
        .submit-cancel {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          box-shadow: 0 8px 24px rgba(239,68,68,0.35);
        }
        .submit-cancel:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(239,68,68,0.45);
        }
        .keep-booking-btn:hover {
          background: rgba(15,52,96,0.15);
        }
      `}</style>

      <div className="bookings-hero">
        <FadeIn>
          <div style={ModernStyles.heroContent}>
            <p style={ModernStyles.heroBadge}>YOUR RENTALS</p>
            <h1 style={ModernStyles.heroTitle}>My Bookings ({bookings.length})</h1>
            <p style={ModernStyles.heroSub}>Manage your active, upcoming, and past rentals</p>
          </div>
        </FadeIn>
      </div>

      <div style={styles.mainContainer}>
        {bookings.length === 0 ? (
          <FadeIn>
            <div className="no-bookings-hero" style={styles.noBookingsHero}>
              <div style={styles.noBookingsIconLarge}>📅</div>
              <h2 style={styles.noBookingsTitleLarge}>No Active Bookings</h2>
              <p style={styles.noBookingsSub}>Your next adventure is waiting. Browse our premium fleet to get started.</p>
              <div style={styles.actionButtons}>
                <button style={styles.browseBtn} onClick={() => navigate('/vehicles')}>🚗 Browse Vehicles</button>
                <button style={styles.historyBtn} onClick={() => navigate('/profile')}>
                  👤 View Profile
                </button>
              </div>
            </div>
          </FadeIn>
        ) : (
          <div style={styles.bookingsGrid}>
            {bookings.map((b, i) => (
              <FadeIn key={b.id} delay={i * 0.08}>
                <div className="booking-card" style={styles.bookingCardModern}>
                  <div style={styles.bookingHeaderModern}>
                    <div style={styles.vehicleAvatar}>
                      <span>{b.brand.charAt(0)}{b.model.charAt(0)}</span>
                    </div>
                    <div style={styles.bookingMainInfo}>
                      <h3 style={styles.bookingVehicleName}>{b.brand} {b.model}</h3>
                      <div style={styles.bookingPeriod}>
                        📅 {new Date(b.start_date).toLocaleDateString()} {b.pickup_time && `@ ${b.pickup_time}`} 
                        <span style={styles.arrow}>→</span> 
                        {new Date(b.end_date).toLocaleDateString()} {b.return_time && `@ ${b.return_time}`}
                      </div>
                      {b.pickup_location_name && (
                        <div style={styles.locationInfo}>
                          📍 {b.pickup_location_name}, {b.pickup_city}
                          {b.return_location_id !== b.pickup_location_id && (
                            <span> → {b.return_location_name}, {b.return_city}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={styles.bookingPriceTag}>
                      <div style={styles.priceAmount}>${b.total_price}</div>
                      <div style={styles.priceLabel}>Total</div>
                    </div>
                  </div>

                  <div style={styles.bookingStatusRow}>
                    <span className="status-badge-modern" style={{ 
                      background: statusColor(b.status), 
                      ...styles.statusBadgeModern 
                    }}>
                      {statusLabel(b.status)}
                    </span>
                    {b.status === 'cancellation_requested' && (
                      <div style={styles.pendingTag}>⏳ Awaiting Admin Review</div>
                    )}
                    {b.status === 'payment_pending' && (
                      <div style={styles.pendingTagBlue}>💳 Payment Pending</div>
                    )}
                  </div>

                  {b.payment_method && (
                    <div style={styles.paymentInfo}>
                      {paymentMethodLabel(b.payment_method)}
                      {b.payment_method === 'cash' && !['active', 'completed'].includes(b.status) && (
                        <span style={styles.cashReminder}>💵 Bring cash on pickup</span>
                      )}
                    </div>
                  )}

                  <div style={styles.bookingActionsRow}>
                    {b.status === 'pending' && (
                      <button style={{ ...styles.actionPrimary, background: 'linear-gradient(135deg, #0f3460, #1a4b8c)', color: '#fff', border: 'none' }}
                        onClick={() => navigate('/payment', { state: { booking_id: b.id, total_price: parseFloat(b.total_price) } })}>
                        <span style={{ fontSize: '16px' }}>💳</span>
                        <span>Pay Now</span>
                      </button>
                    )}
                    {canCancel(b.status) && (
                      <button className="cancel-btn-modern" style={styles.actionPrimary} onClick={() => openCancelModal(b.id)}>
                        <span className="cancel-icon" style={{ fontSize: '16px', transition: 'transform 0.25s' }}>✕</span>
                        <span>Request Cancellation</span>
                      </button>
                    )}
                    {!['pending', 'cancelled'].includes(b.status) && (
                      <button style={styles.contractBtn} onClick={() => setContractBooking(b)}>
                        <span style={{ fontSize: '15px' }}>🖨️</span>
                        <span>Print Contract</span>
                      </button>
                    )}
                    <div style={styles.secondaryActions}>
                      {b.status === 'cancellation_requested' && (
                        <span style={styles.statusAwaiting}>Review Pending</span>
                      )}
                      {b.status === 'payment_pending' && (
                        <span style={styles.statusPending}>Payment Review</span>
                      )}
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        )}

      </div>

      <Footer />

      {/* Rental Contract Modal */}
      {contractBooking && (
        <RentalContract booking={contractBooking} onClose={() => setContractBooking(null)} />
      )}

      {/* Cancellation Modal */}
      {cancelModal && (
        <div className="modal-overlay" style={styles.overlayModern}>
          <FadeIn>
            <div className="modal-modern" style={styles.modalModern}>

              {/* Accent header */}
              <div style={styles.modalAccent}>
                <div style={styles.modalAccentIcon}>⚠️</div>
                <button style={styles.closeModern} onClick={closeCancelModal}>✕</button>
              </div>

              <div style={styles.modalBody}>
                <h3 style={styles.modalTitleModern}>Request Cancellation</h3>
                <p style={styles.modalSubModern}>Tell us why you'd like to cancel. An admin will review your request within 24 hours.</p>

                <p style={styles.reasonsLabel}>Select a reason</p>
                <div style={styles.reasonsModern}>
                  {CANCEL_REASONS.map(({ label, icon }) => (
                    <button
                      key={label}
                      className={`reason-option ${selectedReason === label ? 'selected' : ''}`}
                      onClick={() => setSelectedReason(label)}
                    >
                      <span style={styles.reasonIcon}>{icon}</span>
                      <span style={styles.reasonText}>{label}</span>
                      <span className="reason-check">{selectedReason === label ? '✓' : ''}</span>
                    </button>
                  ))}
                </div>

                {selectedReason === 'Other' && (
                  <div style={styles.otherField}>
                    <label style={styles.otherLabelModern}>Please describe your reason</label>
                    <textarea
                      style={styles.otherInputModern}
                      placeholder="Tell us more..."
                      value={otherReason}
                      onChange={e => setOtherReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                <div style={styles.modalActionsModern}>
                  <button
                    className="submit-cancel"
                    style={styles.submitCancelModern}
                    onClick={submitCancellation}
                    disabled={submitting || !selectedReason}
                  >
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                  <button className="keep-booking-btn" style={styles.cancelModernBtn} onClick={closeCancelModal}>
                    Keep Booking
                  </button>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  mainContainer: { maxWidth: '1200px', margin: '0 auto', padding: '40px 48px 72px', flex: 1 },
  noBookingsHero: { 
    background: 'linear-gradient(135deg, rgba(248,250,252,0.8), rgba(232,234,246,0.8))', 
    borderRadius: '32px', 
    padding: '80px 60px', 
    textAlign: 'center', 
    boxShadow: '0 30px 80px rgba(0,0,0,0.1)' 
  },
  noBookingsIconLarge: { fontSize: '96px', marginBottom: '32px' },
  noBookingsTitleLarge: { 
    fontSize: '36px', 
    margin: '0 0 16px', 
    fontFamily: "'Playfair Display', serif", 
    color: '#1a1a2e' 
  },
  noBookingsSub: { 
    fontSize: '18px', 
    color: '#666', 
    marginBottom: '40px', 
    lineHeight: 1.6 
  },
  actionButtons: { display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' },
  browseBtnLarge: { padding: '18px 36px', fontSize: '16px' },
  browseBtn: { padding: '18px 36px', background: '#0f3460', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  historyBtn: { padding: '18px 36px', background: 'rgba(15,52,96,0.1)', color: '#0f3460', border: '2px solid rgba(15,52,96,0.3)', borderRadius: '50px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  bookingsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '28px' },
  bookingCardModern: { padding: '32px', height: 'fit-content' },
  bookingHeaderModern: { display: 'flex', gap: '20px', marginBottom: '24px', alignItems: 'flex-start' },
  vehicleAvatar: { 
    width: '64px', 
    height: '64px', 
    borderRadius: '16px', 
    background: 'linear-gradient(135deg, #0f3460, #e94560)', 
    color: '#fff', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '22px', 
    fontWeight: 'bold',
    flexShrink: 0,
    boxShadow: '0 8px 25px rgba(15,52,96,0.3)' 
  },
  bookingMainInfo: { flex: 1 },
  bookingVehicleName: { margin: '0 0 8px', fontSize: '22px', color: '#1a1a2e', fontWeight: '700', fontFamily: "'Playfair Display', serif" },
  bookingPeriod: { fontSize: '15px', color: '#666', marginBottom: '8px' },
  arrow: { margin: '0 8px', fontSize: '18px', fontWeight: 'bold' },
  locationInfo: { fontSize: '14px', color: '#888', opacity: 0.9 },
  bookingPriceTag: { 
    textAlign: 'right', 
    background: 'linear-gradient(135deg, rgba(15,52,96,0.05), rgba(233,69,96,0.05))', 
    padding: '16px 20px', 
    borderRadius: '16px', 
    flexShrink: 0 
  },
  priceAmount: { fontSize: '28px', fontWeight: '800', color: '#0f3460', display: 'block', marginBottom: '4px' },
  priceLabel: { fontSize: '13px', color: '#666', opacity: 0.8 },
  bookingStatusRow: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  statusBadgeModern: { padding: '10px 20px', borderRadius: '25px', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  pendingTag: { padding: '8px 16px', background: 'rgba(247,115,22,0.1)', color: '#f97316', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  pendingTagBlue: { background: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  paymentInfo: { background: 'rgba(248,250,252,0.8)', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', marginBottom: '24px' },
  cashReminder: { display: 'block', fontSize: '12px', color: '#f59e0b', marginTop: '4px', fontWeight: '500' },
  bookingActionsRow: { display: 'flex', gap: '16px', alignItems: 'center' },
  actionPrimary: { flex: 1, padding: '0 20px', fontSize: '14px', height: '46px', borderRadius: '14px', fontWeight: '600', cursor: 'pointer' },
  contractBtn: { display: 'flex', alignItems: 'center', gap: '7px', padding: '0 16px', height: '46px', borderRadius: '14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: 'rgba(15,52,96,0.07)', color: '#0f3460', border: '1.5px solid rgba(15,52,96,0.2)', whiteSpace: 'nowrap', flexShrink: 0 },
  secondaryActions: { display: 'flex', gap: '12px', flexShrink: 0 },
  overlayModern: { position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.65)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modalModern: { maxHeight: '90vh', overflowY: 'auto', maxWidth: '480px', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.35)' },
  modalAccent: { background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '28px 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalAccentIcon: { fontSize: '40px', lineHeight: 1 },
  modalBody: { background: '#fff', padding: '28px' },
  modalTitleModern: { margin: '0 0 8px', fontSize: '22px', fontFamily: "'Playfair Display', serif", color: '#1a1a2e', fontWeight: 700 },
  closeModern: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', flexShrink: 0 },
  modalSubModern: { color: '#777', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' },
  reasonsLabel: { fontSize: '11px', fontWeight: 700, color: '#999', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' },
  reasonsModern: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' },
  reasonIcon: { fontSize: '20px', flexShrink: 0 },
  reasonText: { flex: 1, fontSize: '14px', fontWeight: '500', color: '#1a1a2e' },
  otherField: { marginBottom: '20px' },
  otherLabelModern: { fontSize: '12px', color: '#555', marginBottom: '8px', display: 'block', fontWeight: '600', letterSpacing: '0.3px' },
  otherInputModern: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e0e0e0', fontSize: '14px', resize: 'vertical', minHeight: '80px', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' },
  modalActionsModern: { display: 'flex', gap: '12px', paddingTop: '4px' },
  submitCancelModern: { flex: 1, height: '52px', fontSize: '15px', fontWeight: '700', borderRadius: '14px', border: 'none', color: '#fff', cursor: 'pointer', transition: 'all 0.25s' },
  cancelModernBtn: { height: '52px', padding: '0 20px', background: 'rgba(15,52,96,0.08)', color: '#0f3460', border: '1.5px solid rgba(15,52,96,0.2)', borderRadius: '14px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' },
  statusAwaiting: { fontSize: '13px', color: '#f97316', fontWeight: '600' },
  statusPending: { fontSize: '13px', color: '#3b82f6', fontWeight: '600' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', fontSize: '18px', color: '#666' }
};

