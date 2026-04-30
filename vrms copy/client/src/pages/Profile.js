import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const NATIONALITIES = [
  'Afghan','Albanian','Algerian','American','Andorran','Angolan','Argentine','Armenian','Australian',
  'Austrian','Azerbaijani','Bahamian','Bahraini','Bangladeshi','Barbadian','Belarusian','Belgian',
  'Belizean','Beninese','Bhutanese','Bolivian','Bosnian','Botswanan','Brazilian','British','Bruneian',
  'Bulgarian','Burkinabe','Burundian','Cambodian','Cameroonian','Canadian','Cape Verdean','Central African',
  'Chadian','Chilean','Chinese','Colombian','Comorian','Congolese','Costa Rican','Croatian','Cuban',
  'Cypriot','Czech','Danish','Djiboutian','Dominican','Dutch','Ecuadorian','Egyptian','Emirati',
  'Equatorial Guinean','Eritrean','Estonian','Eswatini','Ethiopian','Fijian','Finnish','French',
  'Gabonese','Gambian','Georgian','German','Ghanaian','Greek','Grenadian','Guatemalan','Guinean',
  'Guinea-Bissauan','Guyanese','Haitian','Honduran','Hungarian','Icelandic','Indian','Indonesian',
  'Iranian','Iraqi','Irish','Israeli','Italian','Ivorian','Jamaican','Japanese','Jordanian',
  'Kazakhstani','Kenyan','Kiribatian','Kuwaiti','Kyrgyz','Laotian','Latvian','Lebanese','Lesothan',
  'Liberian','Libyan','Liechtensteiner','Lithuanian','Luxembourgish','Malagasy','Malawian','Malaysian',
  'Maldivian','Malian','Maltese','Marshallese','Mauritanian','Mauritian','Mexican','Micronesian',
  'Moldovan','Monegasque','Mongolian','Montenegrin','Moroccan','Mozambican','Namibian','Nauruan',
  'Nepalese','New Zealander','Nicaraguan','Nigerien','Nigerian','North Korean','North Macedonian',
  'Norwegian','Omani','Pakistani','Palauan','Palestinian','Panamanian','Papua New Guinean','Paraguayan',
  'Peruvian','Filipino','Polish','Portuguese','Qatari','Romanian','Russian','Rwandan','Samoan',
  'San Marinese','Saudi','Senegalese','Serbian','Seychellois','Sierra Leonean','Singaporean','Slovak',
  'Slovenian','Solomon Islander','Somali','South African','South Korean','South Sudanese','Spanish',
  'Sri Lankan','Sudanese','Surinamese','Swedish','Swiss','Syrian','Taiwanese','Tajik','Tanzanian',
  'Thai','Timorese','Togolese','Tongan','Trinidadian','Tunisian','Turkish','Turkmen','Tuvaluan',
  'Ugandan','Ukrainian','Uruguayan','Uzbek','Vanuatuan','Venezuelan','Vietnamese','Yemeni',
  'Zambian','Zimbabwean',
];
const ID_TYPE_LABELS = { national_id:'National ID', passport:'Passport', driver_license:"Driver's License", residence_permit:'Residence Permit' };

export default function Profile() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', city: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [savedCards, setSavedCards] = useState([]);
  const [addCardMode, setAddCardMode] = useState(false);
  const [addCardForm, setAddCardForm] = useState({ card_name: '', card_number: '', expiry: '' });
  const [addingCard, setAddingCard] = useState(false);
  const [savedIds, setSavedIds] = useState([]);
  const [addIdMode, setAddIdMode] = useState(false);
  const [addIdForm, setAddIdForm] = useState({ id_label: '', id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
  const [addingId, setAddingId] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [confirmRemoveCard, setConfirmRemoveCard] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadProfile();
    loadBookings();
    loadSavedCards();
    loadSavedIds();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await API.get('/auth/profile');
      setProfile(res.data);
      setEditForm({ name: res.data.name, phone: res.data.phone || '', city: res.data.city || '' });
    } catch {
      toast.error('Failed to load profile');
    }
    setLoading(false);
  };

  const loadBookings = async () => {
    try {
      const res = await API.get('/bookings/my');
      setBookings(res.data);
    } catch (e) { console.error(e); }
  };

  const loadSavedCards = async () => {
    try {
      const res = await API.get('/saved-cards');
      setSavedCards(res.data);
    } catch (e) { console.error(e); }
  };

  const loadSavedIds = async () => {
    try {
      const res = await API.get('/saved-ids');
      setSavedIds(res.data);
    } catch (e) { console.error(e); }
  };

  const removeConfirmedCard = async () => {
    const id = confirmRemoveCard;
    setConfirmRemoveCard(null);
    try {
      await API.delete(`/saved-cards/${id}`);
      setSavedCards(prev => prev.filter(c => c.id !== id));
      toast.success('Card removed');
    } catch {
      toast.error('Failed to remove card');
    }
  };

  const removeSavedId = async () => {
    const id = confirmRemoveId;
    setConfirmRemoveId(null);
    try {
      await API.delete(`/saved-ids/${id}`);
      setSavedIds(prev => prev.filter(i => i.id !== id));
      toast.success('ID removed');
    } catch {
      toast.error('Failed to remove ID');
    }
  };

  const handleAddId = async () => {
    const { id_label, id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality } = addIdForm;
    if (!id_label || !id_type || !id_number || !id_first_name || !id_last_name || !id_birth_date || !id_nationality) {
      toast.error('Please fill in all ID fields'); return;
    }
    setAddingId(true);
    try {
      const res = await API.post('/saved-ids', addIdForm);
      setSavedIds(prev => [res.data, ...prev]);
      setAddIdForm({ id_label: '', id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
      setAddIdMode(false);
      toast.success('ID saved!');
    } catch (err) {
      const msg = err.response?.data?.message;
      toast.error(msg || 'Failed to save ID');
    }
    setAddingId(false);
  };

  const formatCard = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => {
    const c = val.replace(/\D/g, '');
    return c.length >= 2 ? c.slice(0, 2) + '/' + c.slice(2, 4) : c;
  };
  const getCardType = (num) => {
    const n = num.replace(/\s/g, '');
    if (n.startsWith('4')) return 'Visa';
    if (n.startsWith('5')) return 'Mastercard';
    if (n.startsWith('3')) return 'Amex';
    return 'Card';
  };

  const isExpiryValid = (expiry) => {
    const [mm, yy] = expiry.split('/');
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) return false;
    const month = parseInt(mm, 10);
    const year = 2000 + parseInt(yy, 10);
    if (month < 1 || month > 12) return false;
    return new Date(year, month, 1) > new Date();
  };

  const handleAddCard = async () => {
    if (!addCardForm.card_name || addCardForm.card_number.replace(/\s/g, '').length < 16 || addCardForm.expiry.length < 5) {
      toast.error('Please fill in all card details'); return;
    }
    if (!isExpiryValid(addCardForm.expiry)) {
      toast.error('Card has expired or expiry date is invalid'); return;
    }
    setAddingCard(true);
    try {
      const last_four = addCardForm.card_number.replace(/\s/g, '').slice(-4);
      const res = await API.post('/saved-cards', {
        card_name: addCardForm.card_name,
        card_number: addCardForm.card_number,
        last_four,
        expiry: addCardForm.expiry,
        card_type: getCardType(addCardForm.card_number),
      });
      setSavedCards(prev => [res.data, ...prev]);
      setAddCardForm({ card_name: '', card_number: '', expiry: '' });
      setAddCardMode(false);
      toast.success('Card saved!');
    } catch (err) {
      const msg = err.response?.data?.message;
      const status = err.response?.status;
      console.error('Save card error:', err.response || err.message);
      toast.error(msg || (status ? `Error ${status}` : `Network error — is the server running?`));
    }
    setAddingCard(false);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await API.put('/auth/profile', editForm);
      login({ ...user, name: editForm.name }, token);
      toast.success('Profile updated!');
      setEditMode(false);
      loadProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Please fill in all password fields'); return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match'); return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      await API.put('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed!');
      setPasswordMode(false);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
    setSaving(false);
  };

  const statusColor = (s) => ({ pending:'#f59e0b', confirmed:'#22c55e', cancelled:'#94a3b8', completed:'#6366f1', cancellation_requested:'#f97316', active:'#059669', payment_pending:'#3b82f6' }[s] || '#64748b');
  const statusLabel = (s) => ({ pending:'Pending', confirmed:'Confirmed', cancelled:'Cancelled', completed:'Completed', cancellation_requested:'Cancel Requested', active:'Active', payment_pending:'Payment Due' }[s] || s);

  const initials = (name) => (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const activeBookings  = bookings.filter(b => ['pending','confirmed','active'].includes(b.status)).length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  const totalSpent = bookings.filter(b => ['active','completed'].includes(b.status)).reduce((s, b) => s + parseFloat(b.total_price || 0), 0);
  const mismatch = passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password;

  if (loading) return (
    <div style={S.page}>
      <Navbar />
      <div style={{ textAlign:'center', padding:'120px 24px', color:'#64748b', fontSize:16 }}>Loading profile…</div>
      <Footer />
    </div>
  );

  return (
    <div style={S.page}>
      <Navbar />

      {/* ── HEADER BANNER ─────────────────────────────── */}
      <div style={S.banner}>
        <div style={S.bannerInner}>
          <div style={S.avatarCircle}>{initials(profile?.name)}</div>
          <div style={S.bannerInfo}>
            <h1 style={S.bannerName}>{profile?.name}</h1>
            <p style={S.bannerEmail}>{profile?.email}</p>
            <p style={S.bannerSince}>Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month:'long', year:'numeric' })}</p>
          </div>
          <div style={S.statsRow}>
            <div style={S.statPill}>
              <span style={S.statNum}>{bookings.length}</span>
              <span style={S.statLbl}>Total</span>
            </div>
            <div style={S.statDivider}/>
            <div style={S.statPill}>
              <span style={S.statNum}>{activeBookings}</span>
              <span style={S.statLbl}>Active</span>
            </div>
            <div style={S.statDivider}/>
            <div style={S.statPill}>
              <span style={S.statNum}>{completedBookings}</span>
              <span style={S.statLbl}>Completed</span>
            </div>
            <div style={S.statDivider}/>
            <div style={S.statPill}>
              <span style={{ ...S.statNum, color:'#10b981' }}>${totalSpent.toFixed(0)}</span>
              <span style={S.statLbl}>Spent</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────── */}
      <div style={S.wrap}>
        <div style={S.grid}>

          {/* ── LEFT COLUMN ─────────────────────────── */}
          <div style={S.leftCol}>

            {/* Profile Information */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <h2 style={S.cardTitle}>Profile Information</h2>
                <button style={editMode ? S.btnGhost : S.btnPrimary} onClick={() => setEditMode(p => !p)}>
                  {editMode ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {!editMode ? (
                <div style={S.infoGrid}>
                  {[
                    { label:'Full Name',    value: profile?.name },
                    { label:'Email',        value: profile?.email },
                    { label:'Phone',        value: profile?.phone || '—' },
                    { label:'City',         value: profile?.city  || '—' },
                  ].map(row => (
                    <div key={row.label} style={S.infoRow}>
                      <span style={S.infoLabel}>{row.label}</span>
                      <span style={S.infoValue}>{row.value}</span>
                    </div>
                  ))}
                  <div style={{ ...S.infoRow, background:'#f0fdf4', borderColor:'#bbf7d0' }}>
                    <span style={S.infoLabel}>Account Status</span>
                    <span style={{ ...S.badge, background:'#22c55e' }}>Active</span>
                  </div>
                </div>
              ) : (
                <div style={S.formBox}>
                  <div style={S.formField}>
                    <label style={S.label}>Full Name *</label>
                    <input style={S.input} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Phone Number</label>
                    <input style={S.input} value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}/>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>City</label>
                    <input style={S.input} value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})}/>
                  </div>
                  <div style={S.formActions}>
                    <button style={S.btnSave} onClick={handleSaveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    <button style={S.btnGhost} onClick={() => setEditMode(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Account Security */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <h2 style={S.cardTitle}>Account Security</h2>
                <button style={passwordMode ? S.btnGhost : S.btnPrimary} onClick={() => setPasswordMode(p => !p)}>
                  {passwordMode ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {!passwordMode ? (
                <div style={S.securityList}>
                  <div style={S.securityItem}>
                    <div style={S.secIcon}>🔒</div>
                    <div>
                      <div style={S.secTitle}>Password Protected</div>
                      <div style={S.secDesc}>Your account is secured with a hashed password</div>
                    </div>
                  </div>
                  <div style={S.securityItem}>
                    <div style={S.secIcon}>📧</div>
                    <div>
                      <div style={S.secTitle}>Email Linked</div>
                      <div style={S.secDesc}>{profile?.email}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={S.formBox}>
                  <div style={S.formField}>
                    <label style={S.label}>Current Password</label>
                    <input style={S.input} type="password" placeholder="Enter current password" value={passwordForm.current_password} onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})}/>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>New Password</label>
                    <input style={S.input} type="password" placeholder="Min. 8 characters" value={passwordForm.new_password} onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}/>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Confirm New Password</label>
                    <input style={{ ...S.input, borderColor: mismatch ? '#ef4444' : '#e2e8f0' }} type="password" placeholder="Repeat new password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})}/>
                    {mismatch && <span style={S.fieldError}>Passwords do not match</span>}
                  </div>
                  <div style={S.formActions}>
                    <button style={S.btnSave} onClick={handleChangePassword} disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</button>
                    <button style={S.btnGhost} onClick={() => { setPasswordMode(false); setPasswordForm({ current_password:'', new_password:'', confirm_password:'' }); }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            {/* Saved Cards */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <h2 style={S.cardTitle}>Saved Cards</h2>
                {savedCards.length < 5 && (
                  <button style={addCardMode ? S.btnGhost : S.btnPrimary} onClick={() => { setAddCardMode(p => !p); setAddCardForm({ card_name:'', card_number:'', expiry:'' }); }}>
                    {addCardMode ? 'Cancel' : '+ Add Card'}
                  </button>
                )}
              </div>

              {/* Add Card Form */}
              {addCardMode && (
                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginBottom:16, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={S.formField}>
                    <label style={S.label}>Cardholder Name</label>
                    <input style={S.input} placeholder="John Doe"
                      value={addCardForm.card_name}
                      onChange={e => setAddCardForm({ ...addCardForm, card_name: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Card Number</label>
                    <input style={S.input} placeholder="1234 5678 9012 3456"
                      value={addCardForm.card_number}
                      onChange={e => setAddCardForm({ ...addCardForm, card_number: formatCard(e.target.value) })}
                      maxLength={19} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Expiry</label>
                    <input style={S.input} placeholder="MM/YY"
                      value={addCardForm.expiry}
                      onChange={e => setAddCardForm({ ...addCardForm, expiry: formatExpiry(e.target.value.replace(/\D/g,'').slice(0,4)) })}
                      maxLength={5} />
                  </div>
                  <button style={S.btnSave} onClick={handleAddCard} disabled={addingCard}>
                    {addingCard ? 'Saving…' : 'Save Card'}
                  </button>
                </div>
              )}

              {savedCards.length === 0 && !addCardMode ? (
                <div style={{ textAlign:'center', padding:'20px 16px' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>💳</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:4 }}>No saved cards</div>
                  <div style={{ fontSize:13, color:'#94a3b8' }}>Add a card to reuse it at checkout</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {savedCards.map(card => (
                    <div key={card.id} style={S.cardTile}>
                      <div style={S.cardTileVisual}>
                        <div style={S.cardTileChip}>▪▪</div>
                        <div style={S.cardTileNum}>•••• {card.last_four}</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{card.card_name}</div>
                        <div style={{ fontSize:12, color: isExpiryValid(card.expiry) ? '#64748b' : '#ef4444', marginTop:2 }}>
                          {card.card_type} · {isExpiryValid(card.expiry) ? `Expires ${card.expiry}` : `Expired ${card.expiry}`}
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
                        <button style={S.btnUseCard} onClick={() => navigate('/vehicles')} title="Book a vehicle to use this card">Use Card</button>
                        <button style={S.btnRemoveCard} onClick={() => setConfirmRemoveCard(card.id)}>Remove</button>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'4px 0 0', textAlign:'center' }}>
                    💡 Your saved cards auto-appear at checkout
                  </p>
                </div>
              )}
            </div>

            {/* Saved IDs */}
            <div style={S.card}>
              <div style={S.cardHead}>
                <h2 style={S.cardTitle}>Saved IDs</h2>
                {savedIds.length < 5 && (
                  <button style={addIdMode ? S.btnGhost : S.btnPrimary} onClick={() => { setAddIdMode(p => !p); setAddIdForm({ id_label: '', id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' }); }}>
                    {addIdMode ? 'Cancel' : '+ Add ID'}
                  </button>
                )}
              </div>

              {addIdMode && (
                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16, marginBottom:16, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={S.formField}>
                    <label style={S.label}>Label</label>
                    <input style={S.input} placeholder="e.g. My Passport" value={addIdForm.id_label} onChange={e => setAddIdForm({ ...addIdForm, id_label: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>ID Type</label>
                    <select style={S.input} value={addIdForm.id_type} onChange={e => setAddIdForm({ ...addIdForm, id_type: e.target.value })}>
                      <option value="">Select…</option>
                      <option value="national_id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="residence_permit">Residence Permit</option>
                    </select>
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>ID Number</label>
                    <input style={S.input} placeholder="Document number" value={addIdForm.id_number} onChange={e => setAddIdForm({ ...addIdForm, id_number: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>First Name</label>
                    <input style={S.input} placeholder="As on document" value={addIdForm.id_first_name} onChange={e => setAddIdForm({ ...addIdForm, id_first_name: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Last Name</label>
                    <input style={S.input} placeholder="As on document" value={addIdForm.id_last_name} onChange={e => setAddIdForm({ ...addIdForm, id_last_name: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Date of Birth</label>
                    <input style={S.input} type="date" value={addIdForm.id_birth_date} onChange={e => setAddIdForm({ ...addIdForm, id_birth_date: e.target.value })} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Nationality</label>
                    <select style={S.input} value={addIdForm.id_nationality} onChange={e => setAddIdForm({ ...addIdForm, id_nationality: e.target.value })}>
                      <option value="">Select nationality…</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button style={S.btnSave} onClick={handleAddId} disabled={addingId}>
                    {addingId ? 'Saving…' : 'Save ID'}
                  </button>
                </div>
              )}

              {savedIds.length === 0 && !addIdMode ? (
                <div style={{ textAlign:'center', padding:'20px 16px' }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>🪪</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:4 }}>No saved IDs</div>
                  <div style={{ fontSize:13, color:'#94a3b8' }}>Save an ID to speed up future bookings</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {savedIds.map(idDoc => (
                    <div key={idDoc.id} style={S.idTile}>
                      <div style={S.idTileIcon}>🪪</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{idDoc.id_label}</div>
                        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                          {ID_TYPE_LABELS[idDoc.id_type] || idDoc.id_type} · {idDoc.id_number}
                        </div>
                        <div style={{ fontSize:12, color:'#94a3b8', marginTop:1 }}>
                          {idDoc.id_first_name} {idDoc.id_last_name} · {idDoc.id_nationality}
                        </div>
                      </div>
                      <button style={S.btnRemoveCard} onClick={() => setConfirmRemoveId(idDoc.id)}>Remove</button>
                    </div>
                  ))}
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'4px 0 0', textAlign:'center' }}>
                    💡 Your saved IDs auto-appear at booking checkout
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN ────────────────────────── */}
          <div style={S.rightCol}>
            <div style={S.card}>
              <div style={S.cardHead}>
                <h2 style={S.cardTitle}>Recent Bookings</h2>
                <button style={S.btnPrimary} onClick={() => navigate('/my-bookings')}>View All →</button>
              </div>

              {bookings.length === 0 ? (
                <div style={S.empty}>
                  <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
                  <h3 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:'#1e293b' }}>No bookings yet</h3>
                  <p style={{ margin:'0 0 20px', color:'#94a3b8', fontSize:14 }}>Your rental adventures await!</p>
                  <button style={S.btnPrimary} onClick={() => navigate('/vehicles')}>Browse Vehicles</button>
                </div>
              ) : (
                <div style={S.bookingList}>
                  {bookings.slice(0, 5).map(b => (
                    <div key={b.id} style={{ ...S.bookingRow, borderLeft:`4px solid ${statusColor(b.status)}` }}>
                      <div style={S.bookingAvatar}>{b.brand?.charAt(0)}{b.model?.charAt(0)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={S.bookingCar}>{b.brand} {b.model}</div>
                        <div style={S.bookingDates}>
                          {new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <span style={{ ...S.badge, background:statusColor(b.status), marginBottom:4, display:'block' }}>{statusLabel(b.status)}</span>
                        <span style={S.bookingPrice}>${parseFloat(b.total_price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  {bookings.length > 5 && (
                    <button style={{ ...S.btnGhost, width:'100%', marginTop:4 }} onClick={() => navigate('/my-bookings')}>
                      View {bookings.length - 5} more booking{bookings.length - 5 !== 1 ? 's' : ''} →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* ── REMOVE CARD CONFIRM MODAL ─────────────── */}
      {confirmRemoveCard && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={{ fontSize:40, lineHeight:1 }}>💳</div>
              <button style={S.modalClose} onClick={() => setConfirmRemoveCard(null)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <h3 style={S.modalTitle}>Remove Saved Card?</h3>
              <p style={S.modalSub}>This card will be permanently removed from your profile and won't appear at checkout.</p>
              <div style={S.modalActions}>
                <button style={S.modalBtnDanger} onClick={removeConfirmedCard}>Yes, Remove</button>
                <button style={S.modalBtnCancel} onClick={() => setConfirmRemoveCard(null)}>Keep Card</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE ID CONFIRM MODAL ───────────────── */}
      {confirmRemoveId && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <div style={{ fontSize:40, lineHeight:1 }}>🗑️</div>
              <button style={S.modalClose} onClick={() => setConfirmRemoveId(null)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <h3 style={S.modalTitle}>Remove Saved ID?</h3>
              <p style={S.modalSub}>This ID will be permanently removed from your profile and won't appear at checkout.</p>
              <div style={S.modalActions}>
                <button style={S.modalBtnDanger} onClick={removeSavedId}>Yes, Remove</button>
                <button style={S.modalBtnCancel} onClick={() => setConfirmRemoveId(null)}>Keep ID</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:   { minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Inter',Arial,sans-serif" },

  /* Banner */
  banner: { background:'linear-gradient(135deg, #0f172a 0%, #0f3460 60%, #1e3a5f 100%)', padding:'48px 0 40px', color:'#fff' },
  bannerInner: { maxWidth:1100, margin:'0 auto', padding:'0 32px', display:'flex', alignItems:'center', gap:28, flexWrap:'wrap' },
  avatarCircle: { width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#e94560)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, fontWeight:800, color:'#fff', flexShrink:0 },
  bannerInfo: { flex:1, minWidth:200 },
  bannerName:  { margin:'0 0 4px', fontSize:26, fontWeight:800, color:'#fff' },
  bannerEmail: { margin:'0 0 4px', fontSize:14, color:'rgba(255,255,255,0.65)' },
  bannerSince: { margin:0, fontSize:12, color:'rgba(255,255,255,0.45)' },
  statsRow:    { display:'flex', alignItems:'center', gap:0, background:'rgba(255,255,255,0.08)', borderRadius:16, padding:'14px 20px', flexShrink:0 },
  statPill:    { display:'flex', flexDirection:'column', alignItems:'center', padding:'0 18px' },
  statNum:     { fontSize:22, fontWeight:800, color:'#fff', lineHeight:1 },
  statLbl:     { fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em' },
  statDivider: { width:1, height:36, background:'rgba(255,255,255,0.15)' },

  /* Layout */
  wrap: { maxWidth:1100, margin:'0 auto', padding:'32px' },
  grid: { display:'grid', gridTemplateColumns:'380px 1fr', gap:24, alignItems:'start' },
  leftCol:  { display:'flex', flexDirection:'column', gap:24 },
  rightCol: { display:'flex', flexDirection:'column', gap:24 },

  /* Card */
  card:     { background:'#fff', borderRadius:16, padding:'28px', boxShadow:'0 1px 4px rgba(0,0,0,0.07)' },
  cardHead: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 },
  cardTitle:{ margin:0, fontSize:17, fontWeight:700, color:'#0f172a' },

  /* Info rows */
  infoGrid: { display:'flex', flexDirection:'column', gap:8 },
  infoRow:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' },
  infoLabel:{ fontSize:13, color:'#64748b', fontWeight:500 },
  infoValue:{ fontSize:14, fontWeight:600, color:'#1e293b' },

  /* Security */
  securityList: { display:'flex', flexDirection:'column', gap:12 },
  securityItem: { display:'flex', gap:14, padding:'16px', background:'#f8fafc', borderRadius:12, alignItems:'flex-start' },
  secIcon:  { fontSize:22, flexShrink:0, marginTop:1 },
  secTitle: { fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:3 },
  secDesc:  { fontSize:13, color:'#64748b', margin:0 },

  /* Forms */
  formBox:    { display:'flex', flexDirection:'column', gap:16 },
  formField:  { display:'flex', flexDirection:'column', gap:5 },
  label:      { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em' },
  input:      { padding:'10px 14px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:14, color:'#1e293b', background:'#f8fafc', outline:'none', transition:'border-color 0.2s' },
  fieldError: { fontSize:12, color:'#ef4444', marginTop:2 },
  formActions:{ display:'flex', gap:10, marginTop:4 },

  /* Buttons */
  btnPrimary: { padding:'9px 18px', background:'#0f3460', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600, whiteSpace:'nowrap' },
  btnGhost:   { padding:'9px 18px', background:'transparent', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:500 },
  btnSave:    { padding:'10px 22px', background:'#22c55e', color:'#fff', border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700 },

  /* Badge */
  badge: { padding:'3px 10px', borderRadius:20, color:'#fff', fontSize:11, fontWeight:700, display:'inline-block' },

  /* Bookings */
  bookingList: { display:'flex', flexDirection:'column', gap:10 },
  bookingRow:  { display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'#f8fafc', borderRadius:12 },
  bookingAvatar:{ width:42, height:42, borderRadius:10, background:'linear-gradient(135deg,#0f3460,#e94560)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, flexShrink:0 },
  bookingCar:  { fontSize:14, fontWeight:600, color:'#1e293b', marginBottom:3 },
  bookingDates:{ fontSize:12, color:'#64748b' },
  bookingPrice:{ fontSize:14, fontWeight:700, color:'#0f172a', marginTop:2 },

  /* Empty */
  empty: { textAlign:'center', padding:'48px 24px' },

  /* Saved Cards */
  cardTile:        { display:'flex', alignItems:'center', gap:14, padding:'14px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' },
  cardTileVisual:  { width:60, height:38, borderRadius:8, background:'linear-gradient(135deg, #1a1a2e, #0f3460)', padding:'6px 8px', display:'flex', flexDirection:'column', justifyContent:'space-between', flexShrink:0 },
  cardTileChip:    { fontSize:8, color:'rgba(255,255,255,0.6)', letterSpacing:1 },
  cardTileNum:     { fontSize:10, color:'#fff', fontWeight:700, letterSpacing:1 },
  btnUseCard:      { padding:'5px 12px', background:'#0f3460', color:'#fff', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600 },
  btnRemoveCard:   { padding:'5px 12px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fee2e2', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600 },

  /* Saved IDs */
  idTile: { display:'flex', alignItems:'center', gap:14, padding:'14px', background:'#f8fafc', borderRadius:12, border:'1px solid #e2e8f0' },
  idTileIcon: { fontSize:28, flexShrink:0 },

  /* Confirm modal */
  overlay:      { position:'fixed', inset:0, background:'rgba(10,10,20,0.65)', backdropFilter:'blur(6px)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  modal:        { maxWidth:420, width:'100%', borderRadius:24, overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,0.35)' },
  modalHeader:  { background:'linear-gradient(135deg,#1a1a2e 0%,#0f3460 100%)', padding:'28px 28px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  modalClose:   { background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:36, height:36, cursor:'pointer', fontSize:16, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  modalBody:    { background:'#fff', padding:28 },
  modalTitle:   { margin:'0 0 8px', fontSize:22, fontFamily:"'Playfair Display',serif", color:'#1a1a2e', fontWeight:700 },
  modalSub:     { color:'#777', fontSize:14, lineHeight:1.6, margin:'0 0 24px' },
  modalActions: { display:'flex', gap:12 },
  modalBtnDanger: { flex:1, height:52, fontSize:15, fontWeight:700, borderRadius:14, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer' },
  modalBtnCancel: { height:52, padding:'0 20px', background:'rgba(15,52,96,0.08)', color:'#0f3460', border:'1.5px solid rgba(15,52,96,0.2)', borderRadius:14, fontSize:14, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' },
};
