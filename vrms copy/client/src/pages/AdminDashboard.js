import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import logo from '../assets/logo.png';
import RentalContract from '../components/RentalContract';
import './AdminDashboard.css';

/* ─── Calendar helper ─────────────────────────────────────────────── */
const getDaysInMonth = (year, month) => {
  const days = [];
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);
  return days;
};
const toDateStr = (y, m, d) => `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

function VehicleCalendar({ vehicleId, bookings }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const days = getDaysInMonth(calYear, calMonth);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ranges = bookings
    .filter(b => b.vehicle_id === vehicleId && !['cancelled','cancellation_requested'].includes(b.status))
    .map(b => ({ start: b.start_date?.split('T')[0], end: b.end_date?.split('T')[0], id: b.id, customer: b.customer_name, status: b.status }));
  const getStatus = (day) => {
    if (!day) return null;
    const s = toDateStr(calYear, calMonth, day);
    return ranges.find(r => s >= r.start && s <= r.end) || null;
  };
  const prev = () => calMonth === 0 ? (setCalYear(y=>y-1), setCalMonth(11)) : setCalMonth(m=>m-1);
  const next = () => calMonth === 11 ? (setCalYear(y=>y+1), setCalMonth(0)) : setCalMonth(m=>m+1);
  return (
    <div style={cal.wrap}>
      <div style={cal.head}>
        <button style={cal.navBtn} onClick={prev}>‹</button>
        <span style={cal.title}>{MONTHS[calMonth]} {calYear}</span>
        <button style={cal.navBtn} onClick={next}>›</button>
      </div>
      <div style={cal.legend}>
        <span style={cal.legendItem}><span style={{...cal.dot,background:'#22c55e'}}/> Available</span>
        <span style={cal.legendItem}><span style={{...cal.dot,background:'#ef4444'}}/> Booked</span>
      </div>
      <div style={cal.grid}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} style={cal.dayLbl}>{d}</div>)}
        {days.map((day,i)=>{
          const st = getStatus(day);
          const isToday = day && toDateStr(calYear,calMonth,day)===today.toISOString().split('T')[0];
          return (
            <div key={i} title={st?`#${st.id} — ${st.customer}`:''} style={{
              ...cal.day,
              background: !day?'transparent':st?'#fecaca':'#f0fdf4',
              border: isToday?'2px solid #6366f1':'1px solid #e2e8f0',
              color: !day?'transparent':'#334155',
              position:'relative',
            }}>
              {day}{st&&<div style={cal.dot2}/>}
            </div>
          );
        })}
      </div>
      {ranges.length>0&&(
        <div style={cal.list}>
          <div style={cal.listTitle}>Active bookings</div>
          {ranges.map(r=>(
            <div key={r.id} style={cal.listRow}>
              <span style={{...cal.statusDot,background:r.status==='active'?'#22c55e':'#3b82f6'}}/>
              #{r.id} — {r.customer} &nbsp; {r.start} → {r.end}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const cal = {
  wrap:     { background:'#f8faff', border:'1px solid #e0e7ff', borderRadius:12, padding:18, marginTop:12 },
  head:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  title:    { fontWeight:700, color:'#0f172a', fontSize:14 },
  navBtn:   { background:'#fff', border:'1px solid #e2e8f0', borderRadius:6, padding:'4px 12px', cursor:'pointer', fontSize:16, color:'#334155' },
  legend:   { display:'flex', gap:16, marginBottom:12, fontSize:12, color:'#64748b' },
  legendItem:{ display:'flex', alignItems:'center', gap:5 },
  dot:      { width:8, height:8, borderRadius:'50%', display:'inline-block' },
  grid:     { display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 },
  dayLbl:   { textAlign:'center', fontSize:10, color:'#94a3b8', fontWeight:700, padding:'4px 0', textTransform:'uppercase', letterSpacing:'0.04em' },
  day:      { textAlign:'center', padding:'6px 2px', borderRadius:6, fontSize:12, minHeight:28, display:'flex', alignItems:'center', justifyContent:'center' },
  dot2:     { position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'#ef4444' },
  list:     { marginTop:14, borderTop:'1px solid #e0e7ff', paddingTop:12 },
  listTitle:{ fontSize:11, color:'#64748b', fontWeight:700, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em' },
  listRow:  { display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#334155', marginBottom:6 },
  statusDot:{ width:7, height:7, borderRadius:'50%', flexShrink:0 },
};

/* ─── Main component ──────────────────────────────────────────────── */
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ category_id:'', brand:'', model:'', year:'', plate_number:'', price_per_day:'', description:'' });
  const [vehicleImage, setVehicleImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [calendarVehicle, setCalendarVehicle] = useState(null);

  const [editingBooking, setEditingBooking] = useState(null);
  const [bookingEditForm, setBookingEditForm] = useState({});
  const [contractBooking, setContractBooking] = useState(null);
  const [originalBookingStatus, setOriginalBookingStatus] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', role: 'shop_worker' });
  const [staffLoading, setStaffLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', icon: '⚠️', onConfirm: null });
  const showConfirm = (title, message, icon, onConfirm) => setConfirmDialog({ open: true, title, message, icon: icon || '⚠️', onConfirm });
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }));

  useEffect(() => {
    if (!user || !['admin', 'call_center', 'shop_worker', 'callcenter'].includes(user.role)) { navigate('/'); return; }
    loadAll();
  }, []);

  const latestBookingIdRef = useRef(null);

  useEffect(() => {
    if (!user || !['admin', 'call_center', 'shop_worker', 'callcenter'].includes(user.role)) return;

    const poll = async () => {
      try {
        const r = await API.get('/bookings/all');
        const data = r.data;
        if (!data.length) return;

        const maxId = Math.max(...data.map(b => b.id));

        if (latestBookingIdRef.current === null) {
          latestBookingIdRef.current = maxId;
          return;
        }

        if (maxId > latestBookingIdRef.current) {
          const newOnes = data.filter(b => b.id > latestBookingIdRef.current);
          latestBookingIdRef.current = maxId;
          setBookings(data);

          newOnes.forEach(b => {
            toast.info(
              `New order #${b.id} from ${b.customer_name || 'a customer'} has been submitted!`,
              { autoClose: 10000, position: 'top-right' }
            );
          });

          loadStats();
        }
      } catch (_) {}
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const loadAll = () => { loadStats(); loadVehicles(); loadBookings(); loadUsers(); loadCategories(); loadLocations(); };
  const loadStats = async () => {
    try {
      const [v, b, u] = await Promise.all([API.get('/vehicles'), API.get('/bookings/all'), API.get('/admin/users')]);
      setStats({
        totalVehicles: v.data.length,
        availableVehicles: v.data.filter(x => x.status === 'available').length,
        totalBookings: b.data.length,
        pendingBookings: b.data.filter(x => x.status === 'pending').length,
        cancellationRequests: b.data.filter(x => x.status === 'cancellation_requested').length,
        paymentPending: b.data.filter(x => x.status === 'payment_pending').length,
        totalUsers: u.data.length,
        revenue: b.data.filter(x => ['active','completed'].includes(x.status)).reduce((s, x) => s + parseFloat(x.total_price), 0),
      });
    } catch(e) { console.error(e); }
  };
  const loadVehicles = async () => { try { const r = await API.get('/vehicles'); setVehicles(r.data); } catch(e){} };
  const loadBookings = async () => { try { const r = await API.get('/bookings/all'); setBookings(r.data); } catch(e){ console.error('loadBookings failed:', e?.response?.status, e?.response?.data); } };
  const loadUsers    = async () => { try { const r = await API.get('/admin/users'); setUsers(r.data); } catch(e){} };
  const loadCategories = async () => { try { const r = await API.get('/vehicles/categories'); setCategories(r.data); } catch(e){} };
  const loadLocations  = async () => { try { const r = await API.get('/locations'); setLocations(r.data); } catch(e){} };

  const addVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/vehicles', vehicleForm);
      const newId = res.data.id;
      if (vehicleImage && newId) {
        const fd = new FormData();
        fd.append('image', vehicleImage);
        await API.post(`/vehicles/${newId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success('Vehicle added!');
      setShowAddVehicle(false);
      setVehicleForm({ category_id:'', brand:'', model:'', year:'', plate_number:'', price_per_day:'', description:'' });
      setVehicleImage(null);
      setImagePreview(null);
      loadVehicles(); loadStats();
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const deleteVehicle = (id) => {
    showConfirm('Delete Vehicle', 'This will permanently remove the vehicle and all its data. This cannot be undone.', '🗑️', async () => {
      try { await API.delete(`/vehicles/${id}`); toast.success('Deleted'); loadVehicles(); loadStats(); }
      catch(err) { toast.error(err.response?.data?.message || 'Delete failed'); }
    });
  };
  const startEditVehicle = (v) => {
    setEditingVehicle(v.id); setCalendarVehicle(null);
    setEditForm({ category_id:v.category_id||'', brand:v.brand, model:v.model, year:v.year, plate_number:v.plate_number, price_per_day:v.price_per_day, status:v.status, description:v.description||'' });
  };
  const saveVehicle = async (id) => {
    try { await API.put(`/vehicles/${id}`, editForm); toast.success('Updated!'); setEditingVehicle(null); loadVehicles(); loadStats(); }
    catch(err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };
  const toggleCalendar = (id) => { setCalendarVehicle(p => p===id ? null : id); setEditingVehicle(null); };

  const startEditBooking = (b) => {
    setEditingBooking(b.id);
    setOriginalBookingStatus(b.status);
    setBookingEditForm({ start_date:b.start_date?.split('T')[0]||'', end_date:b.end_date?.split('T')[0]||'', pickup_time:b.pickup_time||'', return_time:b.return_time||'', pickup_location_id:b.pickup_location_id||'', return_location_id:b.return_location_id||'', status:b.status });
  };
  const saveBooking = async (id) => {
    try { await API.put(`/admin/bookings/${id}/status`, { status: bookingEditForm.status }); toast.success('Updated!'); setEditingBooking(null); loadBookings(); loadStats(); }
    catch(err) { toast.error(err.response?.data?.message || 'Update failed'); }
  };
  const updateBookingStatus = async (id, status) => {
    try { await API.put(`/admin/bookings/${id}/status`, { status }); toast.success('Updated'); loadBookings(); loadStats(); }
    catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const approveCancellation = (id) => {
    showConfirm('Approve Cancellation', 'The booking will be cancelled and the vehicle returned to available. This cannot be undone.', '✅', async () => {
      try { await API.put(`/bookings/${id}/approve-cancellation`); toast.success('Approved'); loadBookings(); loadStats(); }
      catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    });
  };
  const rejectCancellation = (id) => {
    showConfirm('Reject Cancellation', 'The cancellation request will be dismissed and the booking will remain active.', '❌', async () => {
      try { await API.put(`/bookings/${id}/reject-cancellation`); toast.success('Rejected'); loadBookings(); loadStats(); }
      catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    });
  };
  const confirmPayment = (id) => {
    showConfirm('Confirm Payment', 'Mark this payment as received and confirm the booking.', '💳', async () => {
      try { await API.put(`/payments/${id}/confirm-payment`); toast.success('Payment confirmed!'); loadBookings(); loadStats(); }
      catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    });
  };
  const rejectPayment = (id) => {
    showConfirm('Reject Payment', 'Reject this payment and reset the booking to pending. The customer will be notified.', '❌', async () => {
      try { await API.put(`/payments/${id}/reject-payment`); toast.success('Payment rejected.'); loadBookings(); loadStats(); }
      catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    });
  };

  const statusColor = (s) => ({ pending:'#f59e0b', confirmed:'#22c55e', cancelled:'#94a3b8', completed:'#6366f1', cancellation_requested:'#f97316', payment_pending:'#3b82f6', active:'#059669', available:'#22c55e', rented:'#ef4444', maintenance:'#f59e0b' }[s] || '#64748b');
  const statusLabel = (s) => ({ pending:'Pending', confirmed:'Confirmed', cancelled:'Cancelled', completed:'Completed', cancellation_requested:'Cancel Req.', payment_pending:'Payment Due', active:'Active', available:'Available', rented:'Rented', maintenance:'Maintenance' }[s] || s);
  const paymentLabel = (m) => !m ? '—' : m==='cash' ? 'Cash' : m==='credit_card' ? 'Credit Card' : m==='debit_card' ? 'Debit Card' : m;
  const initials = (name) => (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const avatarColor = (name) => { const colors=['#6366f1','#3b82f6','#059669','#f59e0b','#ef4444','#8b5cf6','#0f3460']; return colors[(name||'').charCodeAt(0)%colors.length]; };

  const cancellationRequests = bookings.filter(b => b.status === 'cancellation_requested');
  const paymentPendingBookings = bookings.filter(b => b.status === 'payment_pending');

  const statCards = [
    { label:'Total Vehicles', value:stats.totalVehicles||0, icon:'🚗', tab:'vehicles', color:'#3b82f6' },
    { label:'Available', value:stats.availableVehicles||0, icon:'✅', tab:'vehicles', color:'#22c55e' },
    { label:'Total Bookings', value:stats.totalBookings||0, icon:'📅', tab:'bookings', color:'#8b5cf6' },
    { label:'Pending', value:stats.pendingBookings||0, icon:'⏳', tab:'bookings', color:'#f59e0b' },
    { label:'Payment Due', value:stats.paymentPending||0, icon:'💳', tab:'bookings', color:'#3b82f6' },
    { label:'Cancel Reqs', value:stats.cancellationRequests||0, icon:'⚠️', tab:'bookings', color:'#ef4444' },
    { label:'Total Users', value:stats.totalUsers||0, icon:'👥', tab:'users', color:'#0f3460' },
    { label:'Total Revenue', value:`$${(stats.revenue||0).toFixed(2)}`, icon:'💰', tab:null, color:'#10b981', onClick:()=>setShowRevenueModal(true) },
  ];

  const TIME_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'];

  const filteredBookings = bookingFilter === 'all' ? bookings : bookings.filter(b => b.status === bookingFilter);
  const filteredUsers = users.filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()));

  /* ── Sidebar nav items ─────────────────────────────── */
  const navItems = [
    { key:'overview', label:'Overview',  icon:'⊞' },
    { key:'vehicles', label:'Vehicles',  icon:'◈' },
    { key:'bookings', label:'Bookings',  icon:'◉', badge:(cancellationRequests.length+paymentPendingBookings.length)||null },
    { key:'users',    label:'Users',     icon:'◎' },
    ...(user?.role === 'admin' ? [{ key:'workers', label:'Staff', icon:'🧑‍💼' }] : []),
  ];

  return (
    <div style={S.page}>

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav style={S.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <img src={logo} alt="JUNE" style={{ width:80, height:'auto', cursor:'pointer' }} onClick={()=>navigate('/')} />
          <div style={S.navDivider}/>
          <span style={S.navBrand}>Admin Panel</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={S.navUser}>
            <div style={{ ...S.navAvatar, background: avatarColor(user?.name) }}>{initials(user?.name)}</div>
            <span style={S.navUserName}>{user?.name}</span>
          </div>
          <button className="admin-nav-outline" style={S.navBtn} onClick={()=>navigate('/')}>← View Site</button>
          <button style={S.navBtnRed} onClick={()=>{ logout(); navigate('/login'); }}>Logout</button>
        </div>
      </nav>

      <div style={S.layout}>

        {/* ── SIDEBAR ────────────────────────────────────── */}
        <aside style={S.sidebar}>
          <div style={S.sideSection}>MENU</div>
          <div style={S.sideNav}>
            {navItems.map(item => (
              <button key={item.key} className="admin-side-btn" onClick={()=>setTab(item.key)}
                style={{ ...S.sideBtn, ...(tab===item.key ? S.sideBtnActive : {}) }}>
                <span style={{ ...S.sideBtnIcon, ...(tab===item.key ? { color:'#4f46e5' } : {}) }}>{item.icon}</span>
                <span style={S.sideBtnLabel}>{item.label}</span>
                {item.badge ? <span style={S.sideBadge}>{item.badge}</span> : null}
              </button>
            ))}
          </div>
        </aside>

        {/* ── MAIN ───────────────────────────────────────── */}
        <main style={S.main}>

          {/* ══ OVERVIEW ══════════════════════════════════ */}
          {tab==='overview' && (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

              {/* Page header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <h1 style={S.pageTitle}>Overview</h1>
                  <p style={S.pageSub}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
                </div>
                <button style={S.refreshBtn} onClick={loadAll}>↻ Refresh</button>
              </div>

              {/* ── Hero metric row ── */}
              <div style={OV.heroRow}>

                {/* Revenue — full-height left card */}
                <div className="admin-stat-card" onClick={()=>setShowRevenueModal(true)}
                  style={{ ...OV.heroCard, background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', cursor:'pointer', gridRow:'span 1' }}>
                  <div style={{ ...OV.heroIconWrap, background:'rgba(16,185,129,0.15)' }}>
                    <span style={{ fontSize:22 }}>💰</span>
                  </div>
                  <div style={{ ...OV.heroValue, color:'#10b981' }}>${(stats.revenue||0).toFixed(2)}</div>
                  <div style={OV.heroLabel}>Total Revenue</div>
                  <div style={OV.heroHint}>Click to see breakdown →</div>
                </div>

                {/* Right 3 cards */}
                <div style={OV.heroRight}>
                  {[
                    { label:'Total Bookings', value:stats.totalBookings||0,  color:'#8b5cf6', bg:'#f5f3ff', icon:'📅', tab:'bookings' },
                    { label:'Fleet Size',     value:stats.totalVehicles||0,   color:'#3b82f6', bg:'#eff6ff', icon:'🚗', tab:'vehicles' },
                    { label:'Registered Users',value:stats.totalUsers||0,    color:'#0f3460', bg:'#eef2ff', icon:'👥', tab:'users'    },
                  ].map(m=>(
                    <div key={m.label} className="admin-stat-card" onClick={()=>setTab(m.tab)}
                      style={{ ...OV.miniCard, background:m.bg, cursor:'pointer' }}>
                      <div style={{ ...OV.miniLeft }}>
                        <div style={{ ...OV.miniIconWrap, background:`${m.color}18` }}>
                          <span style={{ fontSize:18 }}>{m.icon}</span>
                        </div>
                        <div>
                          <div style={{ ...OV.miniValue, color:m.color }}>{m.value}</div>
                          <div style={OV.miniLabel}>{m.label}</div>
                        </div>
                      </div>
                      <span style={{ color:`${m.color}80`, fontSize:18 }}>›</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Status breakdown row ── */}
              <div style={OV.breakdownRow}>

                {/* Booking statuses */}
                <div style={OV.breakdownCard}>
                  <div style={OV.breakdownHead}>
                    <span style={OV.breakdownTitle}>Booking Status</span>
                    <button style={OV.breakdownLink} onClick={()=>setTab('bookings')}>View all →</button>
                  </div>
                  <div style={OV.statusList}>
                    {[
                      { label:'Active',       count: bookings.filter(b=>b.status==='active').length,                    color:'#059669' },
                      { label:'Confirmed',    count: bookings.filter(b=>b.status==='confirmed').length,                 color:'#22c55e' },
                      { label:'Pending',      count: stats.pendingBookings||0,                                          color:'#f59e0b' },
                      { label:'Payment Due',  count: stats.paymentPending||0,                                           color:'#3b82f6' },
                      { label:'Cancel Reqs',  count: stats.cancellationRequests||0,                                     color:'#ef4444' },
                      { label:'Completed',    count: bookings.filter(b=>b.status==='completed').length,                 color:'#6366f1' },
                      { label:'Cancelled',    count: bookings.filter(b=>b.status==='cancelled').length,                 color:'#94a3b8' },
                    ].map(s=>(
                      <div key={s.label} style={OV.statusRow}>
                        <span style={{ ...OV.statusDot, background:s.color }}/>
                        <span style={OV.statusLabel}>{s.label}</span>
                        <div style={OV.statusBarWrap}>
                          <div style={{ ...OV.statusBar, width: stats.totalBookings ? `${Math.max(4,(s.count/stats.totalBookings)*100)}%` : '4%', background:s.color }}/>
                        </div>
                        <span style={{ ...OV.statusCount, color:s.color }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle statuses */}
                <div style={OV.breakdownCard}>
                  <div style={OV.breakdownHead}>
                    <span style={OV.breakdownTitle}>Fleet Status</span>
                    <button style={OV.breakdownLink} onClick={()=>setTab('vehicles')}>Manage →</button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {[
                      { label:'Available',    count:stats.availableVehicles||0,                                          color:'#22c55e', bg:'#f0fdf4' },
                      { label:'Rented',       count:vehicles.filter(v=>v.status==='rented').length,                      color:'#ef4444', bg:'#fef2f2' },
                      { label:'Maintenance',  count:vehicles.filter(v=>v.status==='maintenance').length,                  color:'#f59e0b', bg:'#fffbeb' },
                    ].map(s=>(
                      <div key={s.label} style={{ ...OV.fleetPill, background:s.bg }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ ...OV.statusDot, width:10, height:10, background:s.color }}/>
                          <span style={{ fontSize:14, fontWeight:600, color:'#1e293b' }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.count}</span>
                      </div>
                    ))}
                    <div style={OV.fleetTotal}>
                      <span style={{ fontSize:13, color:'#64748b' }}>Total fleet</span>
                      <span style={{ fontSize:16, fontWeight:700, color:'#0f172a' }}>{stats.totalVehicles||0} vehicles</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Action required ── */}
              {(paymentPendingBookings.length > 0 || cancellationRequests.length > 0) && (
                <div style={OV.actionsCard}>
                  <div style={OV.actionsHead}>
                    <div style={OV.actionsHeadLeft}>
                      <span style={OV.actionsPulse}/>
                      <span style={OV.actionsTitle}>Action Required</span>
                      <span style={OV.actionsBadge}>{paymentPendingBookings.length + cancellationRequests.length}</span>
                    </div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {paymentPendingBookings.map(b=>(
                      <div key={`pay-${b.id}`} style={{ ...OV.actionRow, borderLeft:'3px solid #3b82f6' }}>
                        <div style={{ ...OV.actionTag, background:'#dbeafe', color:'#1d4ed8' }}>💳 Payment</div>
                        <div style={{ ...S.alertAvatar, background:avatarColor(b.customer_name), width:34, height:34, fontSize:12 }}>{initials(b.customer_name)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={OV.actionName}>{b.customer_name} <span style={S.alertEmail}>· {b.brand} {b.model}</span></div>
                          <div style={S.alertMeta}>${b.total_price} · {paymentLabel(b.payment_method)} · {new Date(b.start_date).toLocaleDateString()} – {new Date(b.end_date).toLocaleDateString()}</div>
                        </div>
                        <button style={{ ...S.actionBtn, background:'#3b82f6', fontSize:12, padding:'7px 14px' }} onClick={()=>confirmPayment(b.id)}>Confirm Payment</button>
                      </div>
                    ))}

                    {cancellationRequests.map(b=>(
                      <div key={`can-${b.id}`} style={{ ...OV.actionRow, borderLeft:'3px solid #f97316' }}>
                        <div style={{ ...OV.actionTag, background:'#ffedd5', color:'#c2410c' }}>⚠️ Cancel</div>
                        <div style={{ ...S.alertAvatar, background:avatarColor(b.customer_name), width:34, height:34, fontSize:12 }}>{initials(b.customer_name)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={OV.actionName}>{b.customer_name} <span style={S.alertEmail}>· {b.brand} {b.model} · #{b.id}</span></div>
                          {b.cancellation_reason && <div style={S.alertReason}>"{b.cancellation_reason}"</div>}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button style={{ ...S.actionBtn, background:'#22c55e', fontSize:12, padding:'7px 14px' }} onClick={()=>approveCancellation(b.id)}>Approve</button>
                          <button style={{ ...S.actionBtn, background:'#ef4444', fontSize:12, padding:'7px 14px' }} onClick={()=>rejectCancellation(b.id)}>Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All clear */}
              {paymentPendingBookings.length === 0 && cancellationRequests.length === 0 && (
                <div style={OV.allClear}>
                  <span style={{ fontSize:28 }}>✅</span>
                  <span style={{ fontSize:14, color:'#64748b', fontWeight:500 }}>All clear — no pending actions right now.</span>
                </div>
              )}
            </div>
          )}

          {/* ══ VEHICLES ══════════════════════════════════ */}
          {tab==='vehicles' && (
            <div>
              <div style={S.pageHead}>
                <div>
                  <h1 style={S.pageTitle}>Vehicles</h1>
                  <p style={S.pageSub}>{vehicles.length} vehicles · {vehicles.filter(v=>v.status==='available').length} available · {vehicles.filter(v=>v.status==='rented').length} rented</p>
                </div>
                <button style={S.addBtn} onClick={()=>setShowAddVehicle(p=>!p)}>
                  {showAddVehicle ? '✕ Cancel' : '+ Add Vehicle'}
                </button>
              </div>

              {/* Add Vehicle Form */}
              {showAddVehicle && (
                <form onSubmit={addVehicle} style={S.formCard}>
                  <h3 style={S.formTitle}>Add New Vehicle</h3>
                  <div style={S.formGrid}>
                    <div style={S.formField}>
                      <label style={S.label}>Category</label>
                      <select style={S.input} value={vehicleForm.category_id} onChange={e=>setVehicleForm({...vehicleForm,category_id:e.target.value})} required>
                        <option value="">Select category</option>
                        {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Brand</label>
                      <input style={S.input} placeholder="e.g. Toyota" value={vehicleForm.brand} onChange={e=>setVehicleForm({...vehicleForm,brand:e.target.value})} required/>
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Model</label>
                      <input style={S.input} placeholder="e.g. Corolla" value={vehicleForm.model} onChange={e=>setVehicleForm({...vehicleForm,model:e.target.value})} required/>
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Year</label>
                      <input style={S.input} type="number" placeholder="2024" value={vehicleForm.year} onChange={e=>setVehicleForm({...vehicleForm,year:e.target.value})}/>
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Plate Number</label>
                      <input style={S.input} placeholder="ABC-1234" value={vehicleForm.plate_number} onChange={e=>setVehicleForm({...vehicleForm,plate_number:e.target.value})}/>
                    </div>
                    <div style={S.formField}>
                      <label style={S.label}>Price per Day ($)</label>
                      <input style={S.input} type="number" placeholder="99" value={vehicleForm.price_per_day} onChange={e=>setVehicleForm({...vehicleForm,price_per_day:e.target.value})} required/>
                    </div>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Description</label>
                    <textarea style={S.textarea} rows={3} placeholder="Optional vehicle description..." value={vehicleForm.description} onChange={e=>setVehicleForm({...vehicleForm,description:e.target.value})}/>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Photo</label>
                    <label style={S.uploadArea}>
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" style={S.uploadPreview}/>
                      ) : (
                        <div style={S.uploadPlaceholder}>
                          <span style={{ fontSize:32 }}>📷</span>
                          <span style={{ fontSize:13, color:'#64748b', marginTop:6 }}>Click to upload a photo</span>
                          <span style={{ fontSize:11, color:'#94a3b8' }}>JPG, PNG, WEBP · max 5 MB</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        setVehicleImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      }}/>
                    </label>
                    {imagePreview && (
                      <button type="button" style={{ ...S.cancelBtn, marginTop:6, padding:'4px 12px', fontSize:12 }} onClick={()=>{ setVehicleImage(null); setImagePreview(null); }}>
                        Remove photo
                      </button>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:4 }}>
                    <button style={S.submitBtn} type="submit">Add Vehicle</button>
                    <button style={S.cancelBtn} type="button" onClick={()=>{ setShowAddVehicle(false); setVehicleImage(null); setImagePreview(null); }}>Cancel</button>
                  </div>
                </form>
              )}

              {/* Vehicle Cards */}
              {vehicles.length===0 ? (
                <div style={S.empty}><div style={S.emptyIcon}>🚗</div><h3 style={S.emptyTitle}>No vehicles yet</h3><p style={S.emptySub}>Add your first vehicle to get started.</p></div>
              ) : (
                <div style={S.vehicleGrid}>
                  {vehicles.map(v=>(
                    <div key={v.id} className="admin-vehicle-card" style={S.vehicleCard}>
                      {/* Image */}
                      <div style={S.cardImgWrap}>
                        {v.primary_image
                          ? <img src={v.primary_image} alt={`${v.brand} ${v.model}`} style={S.cardImg}/>
                          : <div style={S.cardImgFallback}>🚗</div>
                        }
                        <span style={{ ...S.statusPill, background:statusColor(v.status) }}>{statusLabel(v.status)}</span>
                        <span style={S.cardId}>#{v.id}</span>
                      </div>
                      {/* Body */}
                      <div style={S.cardBody}>
                        <div style={S.cardCategory}>{v.category_name}</div>
                        <h3 style={S.cardTitle}>{v.brand} {v.model}</h3>
                        <p style={S.cardSub}>{v.year} · {v.plate_number || 'No plate'}</p>
                        <div style={S.cardFooter}>
                          <span style={S.cardPrice}>${v.price_per_day}<small style={{ fontWeight:400, fontSize:11, color:'#94a3b8' }}>/day</small></span>
                          <div style={{ display:'flex', gap:6 }}>
                            <button className="admin-icon-btn" title="Availability Calendar" style={{ ...S.iconBtn, background:calendarVehicle===v.id?'#ede9fe':'#f1f5f9', color:calendarVehicle===v.id?'#6366f1':'#64748b' }} onClick={()=>toggleCalendar(v.id)}>📅</button>
                            <button className="admin-icon-btn" title="Edit" style={{ ...S.iconBtn, background:editingVehicle===v.id?'#e0f2fe':'#f1f5f9', color:editingVehicle===v.id?'#0284c7':'#64748b' }} onClick={()=>editingVehicle===v.id ? setEditingVehicle(null) : startEditVehicle(v)}>✏️</button>
                            <button className="admin-icon-btn" title="Delete" style={{ ...S.iconBtn, background:'#fef2f2', color:'#ef4444' }} onClick={()=>deleteVehicle(v.id)}>🗑</button>
                          </div>
                        </div>
                      </div>

                      {/* Inline Calendar */}
                      {calendarVehicle===v.id && <div style={{ padding:'0 12px 12px' }}><VehicleCalendar vehicleId={v.id} bookings={bookings}/></div>}

                      {/* Inline Edit Form */}
                      {editingVehicle===v.id && (
                        <div style={S.inlineEdit}>
                          <h4 style={S.inlineEditTitle}>Edit Vehicle #{v.id}</h4>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                            <div style={S.formField}><label style={S.label}>Category</label>
                              <select style={S.input} value={editForm.category_id} onChange={e=>setEditForm({...editForm,category_id:e.target.value})}>
                                <option value="">Select</option>
                                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div style={S.formField}><label style={S.label}>Brand</label><input style={S.input} value={editForm.brand} onChange={e=>setEditForm({...editForm,brand:e.target.value})}/></div>
                            <div style={S.formField}><label style={S.label}>Model</label><input style={S.input} value={editForm.model} onChange={e=>setEditForm({...editForm,model:e.target.value})}/></div>
                            <div style={S.formField}><label style={S.label}>Year</label><input style={S.input} type="number" value={editForm.year} onChange={e=>setEditForm({...editForm,year:e.target.value})}/></div>
                            <div style={S.formField}><label style={S.label}>Plate</label><input style={S.input} value={editForm.plate_number} onChange={e=>setEditForm({...editForm,plate_number:e.target.value})}/></div>
                            <div style={S.formField}><label style={S.label}>Price/Day</label><input style={S.input} type="number" value={editForm.price_per_day} onChange={e=>setEditForm({...editForm,price_per_day:e.target.value})}/></div>
                            <div style={S.formField}><label style={S.label}>Status</label>
                              <select style={S.input} value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value})}>
                                <option value="available">Available</option>
                                <option value="rented">Rented</option>
                                <option value="maintenance">Maintenance</option>
                              </select>
                            </div>
                          </div>
                          <div style={S.formField}><label style={S.label}>Description</label>
                            <textarea style={S.textarea} rows={2} value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})}/>
                          </div>
                          <div style={{ display:'flex', gap:8 }}>
                            <button style={S.submitBtn} onClick={()=>saveVehicle(v.id)}>Save Changes</button>
                            <button style={S.cancelBtn} onClick={()=>setEditingVehicle(null)}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ BOOKINGS ══════════════════════════════════ */}
          {tab==='bookings' && (
            <div>
              {/* Header */}
              <div style={BS.head}>
                <div>
                  <h1 style={S.pageTitle}>Bookings</h1>
                  <p style={S.pageSub}>{bookings.length} total · {bookings.filter(b=>b.status==='active').length} active</p>
                </div>
                <div style={BS.headStats}>
                  {[{label:'Pending', s:'pending', color:'#f59e0b'},{label:'Active', s:'active', color:'#059669'},{label:'Cancel Req.', s:'cancellation_requested', color:'#f97316'}].map(({label,s,color})=>(
                    <div key={s} style={BS.headStat} onClick={()=>setBookingFilter(s)}>
                      <span style={{ ...BS.headStatNum, color }}>{bookings.filter(b=>b.status===s).length}</span>
                      <span style={BS.headStatLabel}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Pills */}
              <div style={BS.filterRow}>
                {['all','pending','confirmed','active','payment_pending','cancellation_requested','completed','cancelled'].map(f=>(
                  <button key={f} onClick={()=>setBookingFilter(f)}
                    style={{ ...BS.pill, ...(bookingFilter===f ? BS.pillActive : {}) }}>
                    {f==='all' ? 'All' : statusLabel(f)}
                    {f!=='all' && <span style={{ ...BS.pillCount, ...(bookingFilter===f ? BS.pillCountActive : {}) }}>{bookings.filter(b=>b.status===f).length}</span>}
                  </button>
                ))}
              </div>

              {filteredBookings.length===0 ? (
                <div style={S.empty}><div style={S.emptyIcon}>📅</div><h3 style={S.emptyTitle}>No bookings found</h3><p style={S.emptySub}>No bookings match the selected filter.</p></div>
              ) : (
                <div style={BS.list}>
                  {filteredBookings.map(b=>(
                    <div key={b.id} style={{ display:'contents' }}>
                      <div style={{ ...BS.card, borderLeftColor: statusColor(b.status) }}>
                        <div style={BS.bookingId}>#{b.id}</div>

                        {/* Top: avatar + customer */}
                        <div style={BS.cardTop}>
                          <div style={{ ...BS.avatar, background: avatarColor(b.customer_name) }}>{initials(b.customer_name)}</div>
                          <div style={BS.col}>
                            <div style={BS.customerName}>{b.customer_name}</div>
                            <div style={BS.customerEmail}>{b.customer_email}</div>
                            <div style={BS.vehicleTag}>{b.brand} {b.model}</div>
                          </div>
                        </div>

                        {/* Mid: dates + payment */}
                        <div style={BS.cardMid}>
                          <div>
                            <div style={BS.metaLabel}>Dates</div>
                            <div style={BS.metaVal}>{new Date(b.start_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
                            <div style={BS.metaArrow}>↓</div>
                            <div style={BS.metaVal}>{new Date(b.end_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
                          </div>
                          <div>
                            <div style={BS.metaLabel}>Payment</div>
                            <div style={BS.metaVal}>{paymentLabel(b.payment_method)}</div>
                            <div style={BS.price}>${parseFloat(b.total_price).toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Extras */}
                        {(()=>{ const ex = typeof b.extras==='string' ? JSON.parse(b.extras||'null') : b.extras; return ex&&ex.length>0 ? (
                          <div style={{ margin:'0 0 10px', padding:'10px 14px', background:'#f8faff', borderRadius:8, border:'1px solid #dbeafe', fontSize:12 }}>
                            <div style={{ fontWeight:700, color:'#1d4ed8', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em', fontSize:10 }}>Extras</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                              {ex.map((e,i)=>(
                                <span key={i} style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:20, padding:'3px 10px', color:'#1e40af', fontWeight:600 }}>
                                  {e.name} × {e.quantity} <span style={{ color:'#6b7280', fontWeight:400 }}>(${parseFloat(e.price).toFixed(2)})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null; })()}

                        {/* ID info for payment_pending and pending (post-rejection) bookings */}
                        {['payment_pending','pending'].includes(b.status)&&(
                          <div style={{ margin:'0 0 10px', padding:'12px 14px', background:'#f0f4ff', borderRadius:8, border:'1px solid #c7d2fe', fontSize:12 }}>
                            <div style={{ fontWeight:700, color:'#4338ca', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.04em', fontSize:10 }}>Customer Identity</div>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', marginBottom: b.id_number ? 8 : 0 }}>
                              <div><span style={{ color:'#6b7280' }}>Name: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.customer_name}</span></div>
                              <div><span style={{ color:'#6b7280' }}>Email: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.customer_email}</span></div>
                            </div>
                            {b.id_number ? (
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', paddingTop:8, borderTop:'1px solid #c7d2fe' }}>
                                <div><span style={{ color:'#6b7280' }}>ID Name: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.id_first_name} {b.id_last_name}</span></div>
                                <div><span style={{ color:'#6b7280' }}>DOB: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.id_birth_date ? new Date(b.id_birth_date).toLocaleDateString('en-GB') : '—'}</span></div>
                                <div><span style={{ color:'#6b7280' }}>Nationality: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.id_nationality}</span></div>
                                <div><span style={{ color:'#6b7280' }}>{b.id_type==='national_id'?'National ID':b.id_type==='passport'?'Passport':b.id_type==='driver_license'?'License':'Permit'}: </span><span style={{ fontWeight:600, color:'#1a1a2e' }}>{b.id_number}</span></div>
                              </div>
                            ) : (
                              <div style={{ color:'#9ca3af', fontStyle:'italic', paddingTop:6, borderTop:'1px solid #c7d2fe' }}>No ID document provided — booking predates ID verification requirement.</div>
                            )}
                          </div>
                        )}

                        {/* Bottom: status badge + actions */}
                        <div style={BS.cardBottom}>
                          <div>
                            <span style={{ ...BS.badge, background: statusColor(b.status)+'18', color: statusColor(b.status), border:`1px solid ${statusColor(b.status)}35` }}>
                              {statusLabel(b.status)}
                            </span>
                            {b.status==='cancellation_requested'&&b.cancellation_reason&&(
                              <div style={BS.reason}>"{b.cancellation_reason}"</div>
                            )}
                          </div>
                          <div style={BS.actions}>
                            <button style={BS.editBtn} onClick={()=>editingBooking===b.id ? setEditingBooking(null) : startEditBooking(b)}>
                              {editingBooking===b.id ? '✕' : '✎ Edit'}
                            </button>
                            {!['pending','cancelled'].includes(b.status)&&(
                              <button style={{...BS.actionBtn, background:'#f0f4ff', color:'#0f3460', border:'1px solid #c7d2fe'}} onClick={()=>setContractBooking(b)}>🖨️ Contract</button>
                            )}
                            {b.status==='pending'&&<button style={{...BS.actionBtn, background:'#dcfce7', color:'#16a34a'}} onClick={()=>updateBookingStatus(b.id,'confirmed')}>Confirm</button>}
                            {b.status==='payment_pending'&&<>
                              <button style={{...BS.actionBtn, background:'#dbeafe', color:'#1d4ed8'}} onClick={()=>confirmPayment(b.id)}>Pay ✓</button>
                              <button style={{...BS.actionBtn, background:'#fee2e2', color:'#dc2626'}} onClick={()=>rejectPayment(b.id)}>Reject</button>
                            </>}
                            {b.status==='cancellation_requested'&&<>
                              <button style={{...BS.actionBtn, background:'#dcfce7', color:'#16a34a'}} onClick={()=>approveCancellation(b.id)}>Approve</button>
                              <button style={{...BS.actionBtn, background:'#fee2e2', color:'#dc2626'}} onClick={()=>rejectCancellation(b.id)}>Reject</button>
                            </>}
                            {b.status==='active'&&<button style={{...BS.actionBtn, background:'#ede9fe', color:'#6d28d9'}} onClick={()=>updateBookingStatus(b.id,'completed')}>Complete</button>}
                            {['pending','confirmed'].includes(b.status)&&<button style={{...BS.actionBtn, background:'#fee2e2', color:'#dc2626'}} onClick={()=>updateBookingStatus(b.id,'cancelled')}>Cancel</button>}
                          </div>
                        </div>
                      </div>

                      {/* Edit Panel */}
                      {editingBooking===b.id && (
                        <div style={BS.editPanel}>
                          <p style={BS.editTitle}>Edit Booking #{b.id}</p>
                          <div style={BS.editGrid}>
                            <div style={S.formField}><label style={BS.editLabel}>Start Date</label><input style={S.input} type="date" value={bookingEditForm.start_date} onChange={e=>setBookingEditForm({...bookingEditForm,start_date:e.target.value})}/></div>
                            <div style={S.formField}><label style={BS.editLabel}>Pickup Time</label>
                              <select style={S.input} value={bookingEditForm.pickup_time} onChange={e=>setBookingEditForm({...bookingEditForm,pickup_time:e.target.value})}>
                                {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div style={S.formField}><label style={BS.editLabel}>End Date</label><input style={S.input} type="date" value={bookingEditForm.end_date} onChange={e=>setBookingEditForm({...bookingEditForm,end_date:e.target.value})}/></div>
                            <div style={S.formField}><label style={BS.editLabel}>Return Time</label>
                              <select style={S.input} value={bookingEditForm.return_time} onChange={e=>setBookingEditForm({...bookingEditForm,return_time:e.target.value})}>
                                {TIME_SLOTS.map(t=><option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div style={S.formField}><label style={BS.editLabel}>Pickup Location</label>
                              <select style={S.input} value={bookingEditForm.pickup_location_id} onChange={e=>setBookingEditForm({...bookingEditForm,pickup_location_id:e.target.value})}>
                                <option value="">Select</option>
                                {locations.map(l=><option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
                              </select>
                            </div>
                            <div style={S.formField}><label style={BS.editLabel}>Return Location</label>
                              <select style={S.input} value={bookingEditForm.return_location_id} onChange={e=>setBookingEditForm({...bookingEditForm,return_location_id:e.target.value})}>
                                <option value="">Select</option>
                                {locations.map(l=><option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
                              </select>
                            </div>
                            <div style={S.formField}><label style={BS.editLabel}>Status</label>
                              <select style={S.input} value={bookingEditForm.status} onChange={e => {
                                const newStatus = e.target.value;
                                showConfirm('Change Booking Status', `Update status from "${statusLabel(originalBookingStatus)}" to "${statusLabel(newStatus)}"?`, '🔄', () => setBookingEditForm({...bookingEditForm, status: newStatus}));
                              }}>
                                {['pending','confirmed','active','completed','cancelled','payment_pending'].map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}
                              </select>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button style={S.submitBtn} onClick={()=>saveBooking(b.id)}>Save Changes</button>
                            <button style={S.cancelBtn} onClick={()=>setEditingBooking(null)}>Discard</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ USERS ════════════════════════════════════ */}
          {tab==='users' && (
            <div>
              <div style={S.pageHead}>
                <div>
                  <h1 style={S.pageTitle}>Users</h1>
                  <p style={S.pageSub}>{users.length} registered · {users.filter(u=>u.role==='admin').length} admins</p>
                </div>
                <input style={{ ...S.input, width:220, margin:0 }} placeholder="🔍 Search by name or email…" value={userSearch} onChange={e=>setUserSearch(e.target.value)}/>
              </div>

              {filteredUsers.length===0 ? (
                <div style={S.empty}><div style={S.emptyIcon}>👥</div><h3 style={S.emptyTitle}>No users found</h3><p style={S.emptySub}>Try a different search term.</p></div>
              ) : (
                <div style={S.userGrid}>
                  {filteredUsers.map(u=>(
                    <div key={u.id} className="admin-user-card" style={S.userCard}>
                      <div style={{ ...S.userAvatar, background:avatarColor(u.name) }}>{initials(u.name)}</div>
                      <div style={S.userName}>{u.name}</div>
                      <div style={S.userEmail}>{u.email}</div>
                      {u.phone && <div style={S.userPhone}>{u.phone}</div>}
                      <div style={S.userBadges}>
                        <span style={{ ...S.badge, background:u.role==='admin'?'#6366f1':'#0f3460' }}>{u.role}</span>
                        <span style={{ ...S.badge, background:u.status==='active'?'#22c55e':'#ef4444' }}>{u.status}</span>
                      </div>
                      <div style={S.userJoined}>Joined {new Date(u.created_at).toLocaleDateString()}</div>
                      {u.id !== user.id && user.role === 'admin' && (
                        <div style={{ display:'flex', gap:6, marginTop:10, width:'100%' }}>
                          <select
                            value={u.role}
                            onChange={e => {
                              const newRole = e.target.value;
                              const roleLabels = { admin:'Admin', call_center:'Call Center', shop_worker:'Shop Worker', user:'Regular User' };
                              showConfirm(
                                'Change Role',
                                `Set ${u.name}'s role to "${roleLabels[newRole]}"?`,
                                '🛡️',
                                async () => {
                                  try {
                                    await API.put(`/admin/users/${u.id}/role`, { role: newRole });
                                    toast.success(`${u.name} is now ${roleLabels[newRole]}`);
                                    loadUsers();
                                  } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                                }
                              );
                            }}
                            style={{ flex:1, padding:'7px 8px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#1a1a2e', fontSize:12, fontWeight:600, cursor:'pointer' }}
                          >
                            <option value="user">Regular User</option>
                            <option value="call_center">Call Center</option>
                            <option value="shop_worker">Shop Worker</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => showConfirm(
                              'Delete Account',
                              `Permanently delete ${u.name}'s account? All their data will be removed and this cannot be undone.`,
                              '🗑️',
                              async () => {
                                try {
                                  await API.delete(`/admin/users/${u.id}`);
                                  toast.success('User deleted');
                                  loadUsers(); loadStats();
                                } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                              }
                            )}
                            style={{ padding:'7px 10px', border:'none', borderRadius:8, background:'#fee2e2', color:'#dc2626', fontSize:13, fontWeight:700, cursor:'pointer' }}
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ WORKERS TAB ══════════════════════════════════ */}
          {tab === 'workers' && (() => {
            const ROLE_META = {
              admin:       { label:'Admin',        bg:'#6366f1', desc:'Full access to all features' },
              call_center: { label:'Call Center',  bg:'#0ea5e9', desc:'Can view bookings and users' },
              shop_worker: { label:'Shop Worker',  bg:'#10b981', desc:'Can view bookings' },
            };
            const workers = users.filter(u => ['admin', 'call_center', 'shop_worker'].includes(u.role));
            return (
              <div>
                <div style={S.pageHead}>
                  <div>
                    <h1 style={S.pageTitle}>Staff</h1>
                    <p style={S.pageSub}>{workers.length} staff members · {workers.filter(w=>w.role==='admin').length} admins · {workers.filter(w=>w.role==='call_center').length} call center · {workers.filter(w=>w.role==='shop_worker').length} shop workers</p>
                  </div>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setShowCreateStaff(true)}
                      style={{ padding:'10px 20px', background:'#0f3460', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}
                    >
                      + Create Staff Account
                    </button>
                  )}
                </div>

                {/* Role legend */}
                <div style={{ display:'flex', gap:12, marginBottom:28, flexWrap:'wrap' }}>
                  {Object.entries(ROLE_META).map(([role, meta]) => (
                    <div key={role} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:'1.5px solid #f0f4f8' }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:meta.bg, display:'inline-block' }}/>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>{meta.label}</div>
                        <div style={{ fontSize:11, color:'#94a3b8' }}>{meta.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {workers.length === 0 ? (
                  <div style={S.empty}><div style={S.emptyIcon}>🧑‍💼</div><h3 style={S.emptyTitle}>No staff yet</h3><p style={S.emptySub}>Promote users from the Users tab to assign them a staff role.</p></div>
                ) : (
                  <div style={S.userGrid}>
                    {workers.map(w => (
                      <div key={w.id} className="admin-user-card" style={S.userCard}>
                        <div style={{ ...S.userAvatar, background: avatarColor(w.name) }}>{initials(w.name)}</div>
                        <div style={S.userName}>{w.name}</div>
                        <div style={S.userEmail}>{w.email}</div>
                        {w.phone && <div style={S.userPhone}>{w.phone}</div>}
                        <div style={S.userBadges}>
                          <span style={{ ...S.badge, background: ROLE_META[w.role]?.bg || '#64748b' }}>
                            {ROLE_META[w.role]?.label || w.role}
                          </span>
                          <span style={{ ...S.badge, background: w.status==='active'?'#22c55e':'#ef4444' }}>{w.status}</span>
                        </div>
                        <div style={S.userJoined}>Joined {new Date(w.created_at).toLocaleDateString()}</div>
                        {w.id !== user.id && (
                          <div style={{ display:'flex', gap:6, marginTop:10, width:'100%' }}>
                            <select
                              value={w.role}
                              onChange={e => {
                                const newRole = e.target.value;
                                const roleLabels = { admin:'Admin', call_center:'Call Center', shop_worker:'Shop Worker', user:'Regular User' };
                                showConfirm('Change Role', `Set ${w.name}'s role to "${roleLabels[newRole]}"?`, '🛡️', async () => {
                                  try {
                                    await API.put(`/admin/users/${w.id}/role`, { role: newRole });
                                    toast.success(`${w.name} is now ${roleLabels[newRole]}`);
                                    loadUsers();
                                  } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                                });
                              }}
                              style={{ flex:1, padding:'7px 8px', border:'1.5px solid #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#1a1a2e', fontSize:12, fontWeight:600, cursor:'pointer' }}
                            >
                              <option value="user">Regular User</option>
                              <option value="call_center">Call Center</option>
                              <option value="shop_worker">Shop Worker</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => showConfirm('Delete Account', `Permanently delete ${w.name}'s account?`, '🗑️', async () => {
                                try {
                                  await API.delete(`/admin/users/${w.id}`);
                                  toast.success('Worker deleted');
                                  loadUsers(); loadStats();
                                } catch(e) { toast.error(e.response?.data?.message || 'Failed'); }
                              })}
                              style={{ padding:'7px 10px', border:'none', borderRadius:8, background:'#fee2e2', color:'#dc2626', fontSize:13, fontWeight:700, cursor:'pointer' }}
                            >🗑</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

        </main>
      </div>

      {/* ══ CREATE STAFF MODAL ══════════════════════════ */}
      {showCreateStaff && (
        <div style={S.overlay} onClick={() => setShowCreateStaff(false)}>
          <div style={{ ...S.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div style={S.modalHead}>
              <div>
                <h2 style={S.modalTitle}>Create Staff Account</h2>
                <p style={S.modalSub}>A welcome email with login credentials will be sent automatically.</p>
              </div>
              <button style={S.modalClose} onClick={() => setShowCreateStaff(false)}>✕</button>
            </div>
            <form onSubmit={async e => {
              e.preventDefault();
              if (!staffForm.name || !staffForm.email) { toast.error('Name and email are required'); return; }
              setStaffLoading(true);
              try {
                const res = await API.post('/admin/staff', staffForm);
                toast.success(res.data.message);
                setShowCreateStaff(false);
                setStaffForm({ name: '', email: '', role: 'shop_worker' });
                loadUsers();
              } catch(err) {
                toast.error(err.response?.data?.message || 'Failed to create account');
              }
              setStaffLoading(false);
            }} style={{ padding: '0 32px 32px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Full Name</label>
                <input
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
                  placeholder="e.g. John Smith"
                  value={staffForm.name}
                  onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Email Address</label>
                <input
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }}
                  type="email"
                  placeholder="e.g. john@june.com"
                  value={staffForm.email}
                  onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:600, color:'#374151', marginBottom:6 }}>Role</label>
                <select
                  style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, background:'#fff' }}
                  value={staffForm.role}
                  onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="shop_worker">Shop Worker</option>
                  <option value="call_center">Call Center</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={staffLoading}
                style={{ width:'100%', padding:'12px', background:'#0f3460', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer' }}
              >
                {staffLoading ? 'Creating…' : 'Create & Send Welcome Email'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ REVENUE MODAL ═══════════════════════════════ */}
      {showRevenueModal && (() => {
        const vehicleMap = Object.fromEntries(vehicles.map(v=>[v.id,v]));
        const grouped = bookings.filter(b=>['active','completed'].includes(b.status)).reduce((acc,b) => {
          if (!acc[b.vehicle_id]) acc[b.vehicle_id]={ vehicle_id:b.vehicle_id, brand:b.brand, model:b.model, year:b.year, bookingList:[] };
          acc[b.vehicle_id].bookingList.push(b);
          return acc;
        },{});
        const groups = Object.values(grouped).map(g=>({ ...g, total:g.bookingList.reduce((s,b)=>s+parseFloat(b.total_price),0) })).sort((a,b)=>b.total-a.total);
        const grandTotal = groups.reduce((s,g)=>s+g.total,0);
        return (
          <div style={S.overlay} onClick={()=>setShowRevenueModal(false)}>
            <div style={S.modal} onClick={e=>e.stopPropagation()}>
              <div style={S.modalHead}>
                <div>
                  <h2 style={S.modalTitle}>Revenue by Vehicle</h2>
                  <p style={S.modalSub}>{groups.length} vehicle{groups.length!==1?'s':''} · active &amp; completed bookings</p>
                </div>
                <button style={S.modalClose} onClick={()=>setShowRevenueModal(false)}>✕</button>
              </div>
              {groups.length===0 ? (
                <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>No revenue data yet.</div>
              ) : (
                <div style={{ overflowY:'auto', flex:1, padding:'8px 24px' }}>
                  {groups.map(g=>(
                    <div key={g.vehicle_id} style={S.rvGroup}>
                      <div style={S.rvHeader}>
                        {vehicleMap[g.vehicle_id]?.primary_image
                          ? <img src={vehicleMap[g.vehicle_id].primary_image} alt={g.brand} style={S.rvImg}/>
                          : <div style={S.rvImgFallback}>🚗</div>
                        }
                        <div style={{ flex:1 }}>
                          <div style={S.rvName}>{g.brand} {g.model} <span style={{ fontWeight:400, color:'#94a3b8' }}>({g.year})</span></div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{g.bookingList.length} booking{g.bookingList.length!==1?'s':''}</div>
                        </div>
                        <div style={S.rvTotal}>${g.total.toFixed(2)}</div>
                      </div>
                      <div style={S.rvBookings}>
                        {g.bookingList.map(b=>(
                          <div key={b.id} style={S.rvRow}>
                            <span style={S.rvId}>#{b.id}</span>
                            <span style={S.rvCustomer}>{b.customer_name}</span>
                            <span style={S.rvDates}>{new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}</span>
                            <span style={{ ...S.badge, background:statusColor(b.status), fontSize:10, padding:'2px 8px' }}>{statusLabel(b.status)}</span>
                            <span style={S.rvAmount}>${parseFloat(b.total_price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={S.modalFoot}>
                <span style={{ fontSize:13, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' }}>Grand Total</span>
                <span style={{ fontSize:22, fontWeight:800, color:'#0f172a' }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Rental Contract Modal ────────────────────────── */}
      {contractBooking && (
        <RentalContract booking={contractBooking} onClose={() => setContractBooking(null)} />
      )}

      {/* ── Custom Confirm Dialog ─────────────────────────── */}
      {confirmDialog.open && (
        <div style={CD.overlay} onClick={closeConfirm}>
          <div style={CD.box} onClick={e => e.stopPropagation()}>
            <div style={CD.iconWrap}>{confirmDialog.icon}</div>
            <h3 style={CD.title}>{confirmDialog.title}</h3>
            <p style={CD.message}>{confirmDialog.message}</p>
            <div style={CD.actions}>
              <button style={CD.cancelBtn} onClick={closeConfirm}>Cancel</button>
              <button style={CD.confirmBtn} onClick={() => { confirmDialog.onConfirm?.(); closeConfirm(); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Overview styles ────────────────────────────────────────────── */
const OV = {
  /* Hero row */
  heroRow:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  heroCard:   { borderRadius:16, padding:'28px 24px', display:'flex', flexDirection:'column', gap:8, boxShadow:'0 4px 16px rgba(0,0,0,0.12)' },
  heroIconWrap:{ width:48, height:48, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:4 },
  heroValue:  { fontSize:34, fontWeight:900, letterSpacing:'-0.5px', lineHeight:1 },
  heroLabel:  { fontSize:13, color:'rgba(255,255,255,0.6)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em' },
  heroHint:   { fontSize:12, color:'rgba(16,185,129,0.7)', marginTop:4 },
  heroRight:  { display:'flex', flexDirection:'column', gap:12 },
  miniCard:   { borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', cursor:'pointer' },
  miniLeft:   { display:'flex', alignItems:'center', gap:14 },
  miniIconWrap:{ width:42, height:42, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' },
  miniValue:  { fontSize:24, fontWeight:800, lineHeight:1, marginBottom:2 },
  miniLabel:  { fontSize:12, color:'#64748b', fontWeight:500 },

  /* Breakdown row */
  breakdownRow:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 },
  breakdownCard:{ background:'#fff', borderRadius:16, padding:'24px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' },
  breakdownHead:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 },
  breakdownTitle:{ fontSize:15, fontWeight:700, color:'#0f172a' },
  breakdownLink:{ background:'none', border:'none', color:'#6366f1', fontSize:12, fontWeight:600, cursor:'pointer', padding:0 },
  statusList: { display:'flex', flexDirection:'column', gap:10 },
  statusRow:  { display:'flex', alignItems:'center', gap:10 },
  statusDot:  { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  statusLabel:{ fontSize:13, color:'#334155', width:90, flexShrink:0 },
  statusBarWrap:{ flex:1, height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden' },
  statusBar:  { height:'100%', borderRadius:999, transition:'width 0.4s ease' },
  statusCount:{ fontSize:13, fontWeight:700, width:24, textAlign:'right', flexShrink:0 },
  fleetPill:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 16px', borderRadius:12 },
  fleetTotal: { display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid #f1f5f9', marginTop:4 },

  /* Action required */
  actionsCard:{ background:'#fff', borderRadius:16, padding:'24px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' },
  actionsHead:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  actionsHeadLeft:{ display:'flex', alignItems:'center', gap:10 },
  actionsPulse:{ width:10, height:10, borderRadius:'50%', background:'#ef4444', boxShadow:'0 0 0 3px rgba(239,68,68,0.2)', flexShrink:0 },
  actionsTitle:{ fontSize:15, fontWeight:700, color:'#0f172a' },
  actionsBadge:{ background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:20 },
  actionRow:  { display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background:'#f8fafc', borderRadius:10 },
  actionTag:  { fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:6, flexShrink:0 },
  actionName: { fontSize:13, fontWeight:600, color:'#1e293b' },

  /* All clear */
  allClear:   { background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:14, padding:'20px 24px', display:'flex', alignItems:'center', gap:14 },
};

/* ─── Styles ──────────────────────────────────────────────────────── */
const S = {
  page:     { minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Inter',Arial,sans-serif" },

  /* Nav */
  nav:       { background:'#0f172a', padding:'0 32px', height:60, display:'flex', justifyContent:'space-between', alignItems:'center' },
  navDivider:{ width:1, height:28, background:'rgba(255,255,255,0.15)', margin:'0 4px' },
  navBrand:  { color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase' },
  navUser:   { display:'flex', alignItems:'center', gap:8 },
  navAvatar: { width:30, height:30, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' },
  navUserName:{ color:'rgba(255,255,255,0.8)', fontSize:13 },
  navBtn:    { padding:'6px 14px', background:'transparent', color:'#fff', border:'1px solid rgba(255,255,255,0.25)', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500 },
  navBtnRed: { padding:'6px 14px', background:'#dc2626', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500 },

  /* Layout */
  layout:  { display:'flex', minHeight:'calc(100vh - 60px)' },

  /* Sidebar */
  sidebar:      { width:220, background:'#0f172a', padding:'24px 12px', flexShrink:0, display:'flex', flexDirection:'column' },
  sideSection:  { padding:'0 8px 16px', fontSize:10, fontWeight:700, color:'#475569', letterSpacing:'0.12em', textTransform:'uppercase' },
  sideNav:      { display:'flex', flexDirection:'column', gap:4 },
  sideBtn:      { display:'flex', alignItems:'center', width:'100%', padding:'11px 14px', border:'none', cursor:'pointer', textAlign:'left', fontSize:14, borderRadius:10, gap:10, background:'transparent', color:'#94a3b8', fontWeight:500, transition:'all 0.15s' },
  sideBtnActive:{ background:'#1e293b', color:'#f1f5f9', fontWeight:600 },
  sideBtnIcon:  { fontSize:16, width:20, textAlign:'center', flexShrink:0, color:'#475569' },
  sideBtnLabel: { flex:1 },
  sideBadge:    { background:'#ef4444', color:'#fff', borderRadius:10, padding:'1px 7px', fontSize:11, fontWeight:700 },

  /* Main */
  main:     { flex:1, padding:'28px 32px', overflowX:'auto' },
  pageHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  pageTitle:{ margin:0, fontSize:22, fontWeight:800, color:'#0f172a' },
  pageSub:  { margin:'4px 0 0', fontSize:13, color:'#64748b' },
  refreshBtn:{ padding:'8px 16px', background:'#fff', color:'#0f3460', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 },
  addBtn:   { padding:'9px 20px', background:'#0f3460', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:14, whiteSpace:'nowrap' },

  /* Stat cards */
  statsGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:16, marginBottom:28 },
  statCard: { background:'#fff', padding:'20px 16px', borderRadius:12, textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' },
  statIcon: { fontSize:24, width:48, height:48, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' },
  statValue:{ fontSize:28, fontWeight:800, marginBottom:4 },
  statLabel:{ fontSize:11, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' },
  statHint: { fontSize:11, color:'#94a3b8', marginTop:8 },

  /* Alert boxes */
  alertBox:  { border:'1px solid', borderRadius:12, padding:20, marginTop:16 },
  alertHead: { display:'flex', alignItems:'center', gap:10, marginBottom:14 },
  alertDot:  { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  alertTitle:{ margin:0, fontSize:15, fontWeight:700, flex:1 },
  alertCount:{ padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 },
  alertBody: { display:'flex', flexDirection:'column', gap:10 },
  alertRow:  { display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'rgba(255,255,255,0.6)', borderRadius:8 },
  alertAvatar:{ width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 },
  alertName: { fontSize:13, fontWeight:600, color:'#1e293b' },
  alertEmail:{ fontWeight:400, color:'#64748b', fontSize:12 },
  alertMeta: { fontSize:12, color:'#64748b', marginTop:2 },
  alertReason:{ fontSize:12, color:'#f97316', fontStyle:'italic', marginTop:4 },
  actionBtn: { padding:'7px 16px', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:13, fontWeight:600, whiteSpace:'nowrap' },

  allGood:  { background:'#fff', borderRadius:12, padding:'32px 24px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginTop:16 },

  /* Vehicles */
  vehicleGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 },
  vehicleCard:{ background:'#fff', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column' },
  cardImgWrap:{ position:'relative', height:160, background:'#f1f5f9', flexShrink:0 },
  cardImg:    { width:'100%', height:'100%', objectFit:'cover' },
  cardImgFallback:{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 },
  statusPill: { position:'absolute', top:10, right:10, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20 },
  cardId:     { position:'absolute', top:10, left:10, background:'rgba(0,0,0,0.45)', color:'#fff', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6 },
  cardBody:   { padding:'14px 14px 12px', flex:1, display:'flex', flexDirection:'column', gap:4 },
  cardCategory:{ fontSize:11, color:'#6366f1', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em' },
  cardTitle:  { margin:0, fontSize:16, fontWeight:700, color:'#0f172a' },
  cardSub:    { margin:0, fontSize:12, color:'#94a3b8' },
  cardFooter: { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  cardPrice:  { fontSize:18, fontWeight:800, color:'#0f172a' },
  iconBtn:    { width:32, height:32, border:'none', borderRadius:8, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' },
  inlineEdit: { margin:'0 12px 12px', padding:16, background:'#f8faff', borderRadius:10, border:'1px solid #e0e7ff', boxSizing:'border-box', overflow:'hidden' },
  inlineEditTitle:{ margin:'0 0 14px', fontSize:14, fontWeight:700, color:'#0f3460' },

  /* Bookings */
  filterBar:  { display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 },
  filterBtn:  { padding:'6px 14px', border:'1px solid', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:500, display:'flex', alignItems:'center', gap:6 },
  filterCount:{ padding:'1px 7px', borderRadius:10, fontSize:11, fontWeight:700 },
  bookingList:{ display:'flex', flexDirection:'column', gap:10 },
  bookingCard:{ background:'#fff', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  bAvatar:    { width:42, height:42, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#fff', flexShrink:0 },
  bInfo:      { flex:1, minWidth:0 },
  bCustomer:  { fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:2 },
  bEmail:     { fontWeight:400, color:'#64748b', fontSize:12 },
  bVehicle:   { fontSize:13, color:'#334155', fontWeight:500, marginBottom:4 },
  bMeta:      { fontSize:12, color:'#64748b', display:'flex', flexWrap:'wrap', gap:4 },
  bReason:    { fontSize:12, color:'#f97316', fontStyle:'italic', marginTop:4 },
  bRight:     { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 },
  bId:        { fontSize:11, color:'#94a3b8', fontWeight:600 },
  bActions:   { display:'flex', flexWrap:'wrap', gap:5, justifyContent:'flex-end' },
  smallBtn:   { padding:'5px 12px', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600 },
  bookingEditPanel:{ margin:'0 0 8px', padding:20, background:'#f8faff', borderRadius:10, border:'1px solid #e0e7ff' },

  /* Users */
  userGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 },
  userCard: { background:'#fff', borderRadius:14, padding:'24px 20px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.07)', display:'flex', flexDirection:'column', alignItems:'center', gap:6 },
  userAvatar:{ width:60, height:60, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'#fff', marginBottom:4 },
  userName:  { fontSize:15, fontWeight:700, color:'#0f172a' },
  userEmail: { fontSize:12, color:'#64748b' },
  userPhone: { fontSize:12, color:'#94a3b8' },
  userBadges:{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center', marginTop:4 },
  userJoined:{ fontSize:11, color:'#94a3b8', marginTop:4 },

  /* Shared form */
  formCard:  { background:'#fff', padding:24, borderRadius:14, marginBottom:24, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  formTitle: { margin:'0 0 18px', fontSize:16, fontWeight:700, color:'#0f172a' },
  formGrid:  { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:14 },
  formField: { display:'flex', flexDirection:'column', gap:5 },
  label:     { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em' },
  input:     { padding:'9px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, color:'#334155', background:'#f8fafc', outline:'none', width:'100%', boxSizing:'border-box' },
  textarea:  { padding:'9px 12px', borderRadius:8, border:'1px solid #e2e8f0', fontSize:13, color:'#334155', background:'#f8fafc', resize:'vertical', fontFamily:'inherit', width:'100%', boxSizing:'border-box' },
  submitBtn: { padding:'9px 22px', background:'#0f3460', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 },
  cancelBtn: { padding:'9px 22px', background:'#f1f5f9', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontWeight:500, fontSize:13 },
  uploadArea: { display:'block', border:'2px dashed #e2e8f0', borderRadius:10, cursor:'pointer', overflow:'hidden', background:'#f8fafc', minHeight:130, transition:'border-color 0.2s' },
  uploadPreview: { width:'100%', height:160, objectFit:'cover', display:'block' },
  uploadPlaceholder: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 16px', gap:4 },

  /* Empty state */
  empty:     { background:'#fff', borderRadius:14, padding:'60px 24px', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  emptyIcon: { fontSize:48, marginBottom:12 },
  emptyTitle:{ margin:'0 0 6px', color:'#1e293b', fontSize:18, fontWeight:700 },
  emptySub:  { margin:0, color:'#94a3b8', fontSize:13 },

  /* Shared badge */
  badge: { padding:'3px 10px', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, display:'inline-block' },

  /* Revenue modal */
  overlay:   { position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(3px)' },
  modal:     { background:'#fff', borderRadius:16, width:'100%', maxWidth:680, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.3)', margin:16 },
  modalHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'22px 24px 16px', borderBottom:'1px solid #f1f5f9' },
  modalTitle:{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' },
  modalSub:  { margin:'4px 0 0', fontSize:13, color:'#64748b' },
  modalClose:{ background:'#f1f5f9', border:'none', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:14, color:'#64748b', flexShrink:0 },
  modalFoot: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderTop:'1px solid #f1f5f9', background:'#f8fafc', borderRadius:'0 0 16px 16px' },
  rvGroup:   { borderBottom:'1px solid #f1f5f9', paddingBottom:8, marginBottom:4 },
  rvHeader:  { display:'flex', alignItems:'center', gap:14, padding:'14px 0 10px' },
  rvImg:     { width:58, height:44, objectFit:'cover', borderRadius:8, flexShrink:0 },
  rvImgFallback:{ width:58, height:44, background:'#f1f5f9', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 },
  rvName:    { fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:2 },
  rvTotal:   { fontSize:16, fontWeight:800, color:'#10b981', flexShrink:0 },
  rvBookings:{ paddingLeft:72, paddingBottom:8, display:'flex', flexDirection:'column', gap:5 },
  rvRow:     { display:'flex', alignItems:'center', gap:10, fontSize:12, color:'#334155', background:'#f8fafc', borderRadius:7, padding:'6px 10px' },
  rvId:      { color:'#94a3b8', fontWeight:700, width:32, flexShrink:0 },
  rvCustomer:{ fontWeight:600, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  rvDates:   { color:'#64748b', flexShrink:0, fontSize:11 },
  rvAmount:  { fontWeight:800, color:'#0f172a', flexShrink:0 },
};

/* ─── Bookings tab styles ─────────────────────────────────────────── */
const BS = {
  head:           { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 },
  headStats:      { display:'flex', gap:24 },
  headStat:       { textAlign:'center', cursor:'pointer', padding:'8px 16px', borderRadius:12, background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  headStatNum:    { display:'block', fontSize:26, fontWeight:900, lineHeight:1 },
  headStatLabel:  { display:'block', fontSize:11, color:'#94a3b8', fontWeight:600, marginTop:2, textTransform:'uppercase', letterSpacing:'0.05em' },

  filterRow:      { display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 },
  pill:           { padding:'6px 14px', border:'1.5px solid #e2e8f0', borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:600, background:'#fff', color:'#64748b', display:'flex', alignItems:'center', gap:6, transition:'all 0.15s', fontFamily:"'DM Sans', sans-serif" },
  pillActive:     { background:'#0f3460', borderColor:'#0f3460', color:'#fff' },
  pillCount:      { padding:'1px 7px', borderRadius:10, fontSize:11, fontWeight:700, background:'#f1f5f9', color:'#64748b' },
  pillCountActive:{ background:'rgba(255,255,255,0.2)', color:'#fff' },

  list:           { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 },
  card:           { background:'#fff', borderRadius:14, padding:'16px 16px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', position:'relative', overflow:'hidden', borderLeft:'4px solid transparent' },
  stripe:         { position:'absolute', left:0, top:0, bottom:0, width:4 },
  avatar:         { width:38, height:38, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#fff', flexShrink:0 },

  cardTop:        { display:'flex', alignItems:'center', gap:12, marginBottom:12 },
  col:            { display:'flex', flexDirection:'column', gap:1, flex:1, minWidth:0 },
  customerName:   { fontSize:14, fontWeight:700, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  customerEmail:  { fontSize:11, color:'#94a3b8' },
  vehicleTag:     { marginTop:3, fontSize:11, fontWeight:700, color:'#0f3460', background:'#eff6ff', borderRadius:6, padding:'2px 8px', display:'inline-block' },

  cardMid:        { display:'flex', gap:16, marginBottom:12, paddingBottom:12, borderBottom:'1px solid #f1f5f9' },
  metaLabel:      { fontSize:10, fontWeight:700, color:'#cbd5e1', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 },
  metaVal:        { fontSize:12, fontWeight:600, color:'#334155' },
  metaArrow:      { fontSize:10, color:'#cbd5e1', lineHeight:1, margin:'1px 0' },
  price:          { fontSize:16, fontWeight:900, color:'#0f3460', marginTop:2 },

  cardBottom:     { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 },
  badge:          { display:'inline-block', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:'nowrap' },
  reason:         { fontSize:10, color:'#f97316', fontStyle:'italic', marginTop:3 },

  actions:        { display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' },
  editBtn:        { padding:'5px 10px', border:'1.5px solid #e2e8f0', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600, background:'#f8fafc', color:'#475569', fontFamily:"'DM Sans', sans-serif" },
  actionBtn:      { padding:'5px 10px', border:'none', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:"'DM Sans', sans-serif" },

  bookingId:      { position:'absolute', top:10, right:12, fontSize:10, fontWeight:700, color:'#e2e8f0' },

  editPanel:      { background:'#f8faff', border:'1px solid #e0e7ff', borderRadius:14, padding:20, gridColumn:'1 / -1' },
  editTitle:      { margin:'0 0 16px', fontSize:12, fontWeight:800, color:'#0f3460', textTransform:'uppercase', letterSpacing:'0.05em' },
  editGrid:       { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 },
  editLabel:      { display:'block', fontSize:10, fontWeight:700, color:'#94a3b8', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' },
};

const CD = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.55)',
    backdropFilter: 'blur(8px)', zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  box: {
    background: '#fff', borderRadius: 24, padding: '40px 36px 32px',
    maxWidth: 420, width: '100%', textAlign: 'center',
    boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
    animation: 'fadeInScale 0.18s cubic-bezier(.22,1,.36,1)',
  },
  iconWrap: { fontSize: 48, marginBottom: 16, lineHeight: 1 },
  title: { margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#0f172a', fontFamily: "'Playfair Display', serif" },
  message: { margin: '0 0 28px', fontSize: 14, color: '#64748b', lineHeight: 1.6 },
  actions: { display: 'flex', gap: 12 },
  cancelBtn: {
    flex: 1, height: 48, border: '1.5px solid #e2e8f0', borderRadius: 14,
    background: '#f8fafc', color: '#64748b', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s',
  },
  confirmBtn: {
    flex: 1, height: 48, border: 'none', borderRadius: 14,
    background: 'linear-gradient(135deg, #0f3460, #1a4b8c)', color: '#fff',
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: '0 6px 20px rgba(15,52,96,0.35)', transition: 'all 0.2s',
  },
};
