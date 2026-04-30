import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';
import FadeIn from '../components/FadeIn';
import ModernStyles from '../components/ModernStyles';

const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00'
];

const getTodayStr = () => {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getAvailablePickupSlots = (date) => {
  if (date !== getTodayStr()) return TIME_SLOTS;
  const min = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const minH = min.getHours(), minM = min.getMinutes();
  return TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    return h > minH || (h === minH && m >= minM);
  });
};

const getDatesInRange = (start, end) => {
  const dates = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};

export default function VehicleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const [vehicle, setVehicle] = useState(null);
  const [extras, setExtras] = useState([]);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    start_date: '', start_time: '10:00',
    end_date: '', end_time: '10:00',
    pickup_location_id: '', return_location_id: ''
  });
  const [datesConfirmed, setDatesConfirmed] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);

  useEffect(() => {
    loadVehicle();
    loadExtras();
    loadBookedDates();
    loadLocations();
    const saved = sessionStorage.getItem('bookingSearch');
    if (saved) {
      try {
        const { pickup_location_id, start_date, end_date } = JSON.parse(saved);
        setForm(f => ({
          ...f,
          start_date: start_date || '',
          end_date: end_date || '',
          pickup_location_id: pickup_location_id || '',
        }));
      } catch {}
    }
  }, [id]);
  useEffect(() => { calculatePrice(); }, [form, selectedExtras, vehicle]);

  const loadVehicle = async () => {
    try {
      const res = await API.get(`/vehicles/${id}`);
      setVehicle(res.data);
    } catch (err) { toast.error('Vehicle not found'); navigate('/'); }
  };

  const loadExtras = async () => {
    try {
      const res = await API.get('/extras');
      setExtras(res.data);
    } catch (err) { console.error(err); }
  };

  const loadLocations = async () => {
    try {
      const res = await API.get('/locations');
      setLocations(res.data);
    } catch (err) { console.error(err); }
  };

  const loadBookedDates = async () => {
    try {
      const res = await API.get(`/bookings/booked-dates/${id}`);
      const allDates = [];
      res.data.forEach(({ start_date, end_date }) => {
        getDatesInRange(start_date, end_date).forEach(d => allDates.push(d));
      });
      setBookedDates(allDates);
    } catch (err) { console.error('Could not load booked dates', err); }
  };

  const isDateBooked = (dateStr) => bookedDates.includes(dateStr);

  const rangeHasBookedDates = (start, end) => {
    if (!start || !end) return false;
    return getDatesInRange(start, end).some(d => bookedDates.includes(d));
  };

  const calculatePrice = () => {
    if (!vehicle || !form.start_date || !form.end_date) return;
    const days = Math.ceil((new Date(form.end_date) - new Date(form.start_date)) / (1000 * 60 * 60 * 24));
    if (days <= 0) return;
    let total = vehicle.price_per_day * days;
    selectedExtras.forEach(extra => { total += extra.price_per_day * days; });
    setTotalPrice(total);
  };

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const closeCalendar = (ref) => {
    if (ref.current) ref.current.blur();
    document.body.click();
  };

  const handleStartDateChange = (e) => {
    const newVal = e.target.value;
    if (isDateBooked(newVal)) {
      toast.error('This date is already booked. Please choose another date.');
      return;
    }
    const newForm = { ...form, start_date: newVal };
    if (form.end_date && new Date(newVal) >= new Date(form.end_date)) {
      newForm.end_date = '';
    }
    if (newVal === getTodayStr()) {
      const available = getAvailablePickupSlots(newVal);
      if (available.length === 0) {
        toast.error('No pickup slots available for today. Please select a future date.');
        setForm({ ...form, start_date: '' });
        setDatesConfirmed(false);
        return;
      }
      if (!available.includes(newForm.start_time)) {
        newForm.start_time = available[0];
      }
    }
    setForm(newForm);
    setDatesConfirmed(false);
    closeCalendar(startDateRef);
    setTimeout(() => {
      if (endDateRef.current) {
        endDateRef.current.focus();
        endDateRef.current.click();
      }
    }, 300);
  };

  const handleEndDateChange = (e) => {
    const newVal = e.target.value;
    if (isDateBooked(newVal)) {
      toast.error('This date is already booked. Please choose another date.');
      return;
    }
    if (rangeHasBookedDates(form.start_date, newVal)) {
      toast.error('Your selected range includes booked dates. Please choose different dates.');
      return;
    }
    setForm({ ...form, end_date: newVal });
    setDatesConfirmed(false);
    closeCalendar(endDateRef);
  };

  const handleConfirmDates = () => {
    if (!form.start_date || !form.end_date) {
      toast.error('Please select both dates');
      return;
    }
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      toast.error('Return date must be after pickup date');
      return;
    }
    if (rangeHasBookedDates(form.start_date, form.end_date)) {
      toast.error('Your selected range includes booked dates. Please choose different dates.');
      return;
    }
    if (!form.pickup_location_id) {
      toast.error('Please select a pickup location');
      return;
    }
    if (!form.return_location_id) {
      toast.error('Please select a return location');
      return;
    }
    if (form.start_date === getTodayStr()) {
      const available = getAvailablePickupSlots(form.start_date);
      if (!available.includes(form.start_time)) {
        const earliest = available[0];
        toast.error(earliest
          ? `Same-day bookings require at least 3 hours notice. Earliest pickup today is ${earliest}.`
          : 'No pickup slots available for today. Please select a future date.');
        return;
      }
    }
    setDatesConfirmed(true);
    toast.success('Dates and locations confirmed!');
  };

  const handleBooking = () => {
    if (!user) { navigate('/login'); return; }
    if (!datesConfirmed) { toast.error('Please confirm your dates first'); return; }
    navigate('/payment', {
      state: {
        bookingData: {
          vehicle_id: id,
          start_date: form.start_date,
          end_date: form.end_date,
          pickup_time: form.start_time,
          return_time: form.end_time,
          pickup_location_id: form.pickup_location_id,
          return_location_id: form.return_location_id,
          extras: selectedExtras.map(e => ({ id: e.id, quantity: 1 })),
        },
        total_price: totalPrice,
        vehicle_name: `${vehicle.brand} ${vehicle.model}`,
      }
    });
  };

  const getMinEndDate = () => {
    if (!form.start_date) return new Date().toISOString().split('T')[0];
    const next = new Date(form.start_date);
    next.setDate(next.getDate() + 1);
    return next.toISOString().split('T')[0];
  };

  const getLocationName = (locId) => {
    const loc = locations.find(l => l.id === parseInt(locId));
    return loc ? `${loc.name} — ${loc.city}` : '';
  };

  if (!vehicle) return <div style={styles.loading}>Loading...</div>;

  return (
    <div style={styles.page}>
<Navbar />
      <style>{`
        .detail-hero { 
          background: linear-gradient(rgba(15,52,96,0.9), rgba(26,75,140,0.8)), url('${vehicle.primary_image || ''}'); 
          background-size: cover; 
          background-position: center; 
          color: #fff; 
          padding: '120px 48px 80px'; 
          position: relative; 
        }
        .detail-card { 
          background: #fff; 
          border-radius: 20px; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.12); 
          overflow: hidden; 
          transition: all 0.4s cubic-bezier(.22,1,.36,1); 
        }
        .detail-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 30px 80px rgba(0,0,0,0.18); 
        }
        .booking-form-input { 
          transition: all 0.3s cubic-bezier(.22,1,.36,1); 
          border: 2px solid #e8eaf6; 
        }
        .booking-form-input:focus { 
          border-color: #0f3460; 
          box-shadow: 0 0 0 3px rgba(15,52,96,0.1); 
          transform: translateY(-1px); 
        }
        .confirm-btn { 
          background: linear-gradient(135deg, #22c55e, #16a34a); 
          box-shadow: 0 8px 25px rgba(34,197,94,0.3); 
        }
        .book-now-btn { 
          background: linear-gradient(135deg, #e94560, #d63851); 
          box-shadow: 0 12px 40px rgba(233,69,96,0.4); 
        }
      `}</style>
      <div className="detail-hero" style={{ padding: '120px 48px 80px' }}>
        <FadeIn>
          <div style={ModernStyles.heroContent}>
            <p style={ModernStyles.heroBadge}>PREMIUM VEHICLE</p>
            <h1 style={ModernStyles.heroTitle}>{vehicle.brand} {vehicle.model}</h1>
            <p style={styles.heroSub}>{vehicle.category_name} • {vehicle.year} • {vehicle.fuel_type}</p>
          </div>
        </FadeIn>
      </div>

      <div style={styles.container}>
        <div style={styles.left}>
          <div style={styles.imgBox}>
            {vehicle.images && vehicle.images.length > 0 ? (
              <img
                src={(vehicle.images.find(i => i.is_primary) || vehicle.images[0]).image_url}
                alt={`${vehicle.brand} ${vehicle.model}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
              />
            ) : (
              <span style={{ fontSize: '96px' }}>🚙</span>
            )}
          </div>
          <div style={styles.info}>
            <h2>{vehicle.brand} {vehicle.model}</h2>
            <p style={styles.sub}>{vehicle.category_name} • {vehicle.year}</p>
            <p style={styles.plate}>Plate: {vehicle.plate_number}</p>
            <p style={styles.desc}>{vehicle.description}</p>
            <p style={styles.price}>${vehicle.price_per_day}/day</p>
            <span style={{ ...styles.badge, background: vehicle.status === 'available' ? '#22c55e' : '#ef4444' }}>
              {vehicle.status}
            </span>
          </div>

          {bookedDates.length > 0 && (
            <div style={styles.availNote}>
              <span style={styles.availDot}>●</span> Some dates are unavailable for this vehicle.
              Select dates carefully — booked dates will be rejected.
            </div>
          )}

          {vehicle.reviews && vehicle.reviews.length > 0 && (
            <div style={styles.reviews}>
              <h3>Customer Reviews</h3>
              {vehicle.reviews.map(r => (
                <div key={r.id} style={styles.review}>
                  <strong>{r.user_name}</strong> — {'⭐'.repeat(r.rating)}
                  <p>{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.right}>
          <div style={styles.bookingCard}>
            <h3 style={styles.bookTitle}>Book This Vehicle</h3>

            {/* PICKUP */}
            <div style={styles.dateGroup}>
              <div style={styles.dateGroupTitle}>🟢 Pickup</div>
              <div style={styles.dateRow}>
                <div style={styles.dateHalf}>
                  <label style={styles.label}>Date</label>
                  <input ref={startDateRef} style={styles.input} type="date" value={form.start_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={handleStartDateChange} />
                </div>
                <div style={styles.dateHalf}>
                  <label style={styles.label}>Time</label>
                  <select style={styles.input} value={form.start_time}
                    onChange={e => { setForm({ ...form, start_time: e.target.value }); setDatesConfirmed(false); }}
                    disabled={form.start_date === getTodayStr() && getAvailablePickupSlots(form.start_date).length === 0}>
                    {form.start_date === getTodayStr() && getAvailablePickupSlots(form.start_date).length === 0
                      ? <option value="">No slots available today</option>
                      : getAvailablePickupSlots(form.start_date).map(t => <option key={t} value={t}>{t}</option>)
                    }
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <label style={styles.label}>Pickup Location</label>
                <select style={styles.input} value={form.pickup_location_id}
                  onChange={e => { setForm({ ...form, pickup_location_id: e.target.value }); setDatesConfirmed(false); }}>
                  <option value="">Select pickup location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* RETURN */}
            <div style={styles.dateGroup}>
              <div style={styles.dateGroupTitle}>🔴 Return</div>
              <div style={styles.dateRow}>
                <div style={styles.dateHalf}>
                  <label style={styles.label}>Date</label>
                  <input ref={endDateRef} style={styles.input} type="date" value={form.end_date}
                    min={getMinEndDate()}
                    onChange={handleEndDateChange} />
                </div>
                <div style={styles.dateHalf}>
                  <label style={styles.label}>Time</label>
                  <select style={styles.input} value={form.end_time}
                    onChange={e => { setForm({ ...form, end_time: e.target.value }); setDatesConfirmed(false); }}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '8px' }}>
                <label style={styles.label}>Return Location</label>
                <select style={styles.input} value={form.return_location_id}
                  onChange={e => { setForm({ ...form, return_location_id: e.target.value }); setDatesConfirmed(false); }}>
                  <option value="">Select return location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booked dates warning */}
            {form.start_date && form.end_date && rangeHasBookedDates(form.start_date, form.end_date) && (
              <div style={styles.bookedWarning}>
                ⚠️ Your selected range includes already booked dates. Please choose different dates.
              </div>
            )}

            {/* Confirm button */}
            {form.start_date && form.end_date && !datesConfirmed && !rangeHasBookedDates(form.start_date, form.end_date) && (
              <button style={styles.confirmDatesBtn} onClick={handleConfirmDates}>
                ✅ Confirm Dates & Locations
              </button>
            )}

            {/* Confirmed summary */}
            {datesConfirmed && (
              <div style={styles.confirmedBadge}>
                <div>✅ {form.start_date} {form.start_time} → {form.end_date} {form.end_time}</div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  📍 Pickup: {getLocationName(form.pickup_location_id)}
                </div>
                <div style={{ fontSize: '12px' }}>
                  📍 Return: {getLocationName(form.return_location_id)}
                </div>
                <span style={styles.editDates} onClick={() => setDatesConfirmed(false)}>(Edit)</span>
              </div>
            )}

            {/* Add-ons */}
            {datesConfirmed && extras.length > 0 && (
              <div style={styles.extrasSection}>
                <h4 style={styles.extrasTitle}>Add-ons (optional)</h4>
                {extras.map(extra => (
                  <div key={extra.id} style={styles.extraItem}>
                    <label style={styles.extraLabel}>
                      <input type="checkbox"
                        checked={!!selectedExtras.find(e => e.id === extra.id)}
                        onChange={() => toggleExtra(extra)} />
                      {' '}{extra.name} — ${extra.price_per_day}/day
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {datesConfirmed && totalPrice > 0 && (
              <div style={styles.totalBox}>
                <span>Total Price:</span>
                <strong style={styles.totalPrice}>${totalPrice.toFixed(2)}</strong>
              </div>
            )}

            <button
              style={{
                ...styles.bookBtn,
                background: !datesConfirmed || vehicle.status !== 'available' ? '#ccc' : '#0f3460',
                cursor: !datesConfirmed || vehicle.status !== 'available' ? 'not-allowed' : 'pointer'
              }}
              onClick={handleBooking}
              disabled={loading || vehicle.status !== 'available' || !datesConfirmed}>
              {loading ? 'Booking...' : vehicle.status !== 'available' ? 'Not Available' : !datesConfirmed ? 'Confirm Dates First' : 'Book Now'}
            </button>

            {!user && <p style={styles.loginNote}>You need to <span style={styles.loginLink} onClick={() => navigate('/login')}>login</span> to book</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f2f5', fontFamily: "'DM Sans', sans-serif" },
  container: { display: 'flex', gap: '32px', padding: '32px', maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap' },
  left: { flex: 1, minWidth: '300px' },
  right: { width: '400px' },
  imgBox: { background: '#e8eaf6', height: '260px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '96px', marginBottom: '24px', overflow: 'hidden' },
  info: { background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px' },
  sub: { color: '#666', fontSize: '14px' },
  plate: { color: '#666', fontSize: '14px' },
  desc: { color: '#444', margin: '12px 0' },
  price: { fontSize: '28px', fontWeight: 'bold', color: '#0f3460' },
  badge: { padding: '4px 12px', borderRadius: '20px', color: '#fff', fontSize: '13px' },
  availNote: { background: '#fff8e1', border: '1px solid #f59e0b', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400e', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  availDot: { color: '#ef4444', fontSize: '18px' },
  reviews: { background: '#fff', padding: '24px', borderRadius: '12px' },
  review: { borderBottom: '1px solid #eee', padding: '12px 0' },
  bookingCard: { background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', position: 'sticky', top: '20px' },
  bookTitle: { marginTop: 0, color: '#1a1a2e' },
  dateGroup: { background: '#f8f9fa', borderRadius: '8px', padding: '12px', marginBottom: '12px' },
  dateGroupTitle: { fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#333' },
  dateRow: { display: 'flex', gap: '10px' },
  dateHalf: { flex: 1 },
  label: { fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' },
  input: { width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' },
  bookedWarning: { background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '12px' },
  confirmDatesBtn: { width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px' },
  confirmedBadge: { background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#166534', marginBottom: '12px' },
  editDates: { color: '#0f3460', cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px', display: 'inline-block', marginTop: '4px' },
  extrasSection: { marginBottom: '16px' },
  extrasTitle: { margin: '0 0 8px', fontSize: '14px', color: '#444' },
  extraItem: { marginBottom: '8px' },
  extraLabel: { fontSize: '14px', color: '#444', cursor: 'pointer' },
  totalBox: { display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f0f2f5', borderRadius: '8px', marginBottom: '16px', fontSize: '16px' },
  totalPrice: { fontSize: '20px', color: '#0f3460' },
  bookBtn: { width: '100%', padding: '14px', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', marginTop: '4px' },
  loginNote: { textAlign: 'center', fontSize: '13px', color: '#666', marginTop: '12px' },
  loginLink: { color: '#0f3460', cursor: 'pointer', textDecoration: 'underline' },
  loading: { textAlign: 'center', padding: '100px', fontSize: '18px' }
};