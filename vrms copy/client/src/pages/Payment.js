import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import FadeIn from '../components/FadeIn';

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

export default function Payment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookingData, total_price, vehicle_name } = location.state || {};
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = payment, 2 = ID info
  const [form, setForm] = useState({ card_name: '', card_number: '', expiry: '', cvv: '', method: 'credit_card' });
  const [idForm, setIdForm] = useState({ id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
  const [savedCards, setSavedCards] = useState([]);
  const [saveCard, setSaveCard] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [selectedSavedIdId, setSelectedSavedIdId] = useState(null);
  const [saveId, setSaveId] = useState(false);
  const [useAnotherPersonId, setUseAnotherPersonId] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!bookingData) { navigate('/'); return; }
    API.get('/saved-cards').then(r => setSavedCards(r.data)).catch(() => {});
    API.get('/saved-ids').then(r => setSavedIds(r.data)).catch(() => {});
  }, []);

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
    const now = new Date();
    const expDate = new Date(year, month, 1); // first day of month after expiry
    return expDate > now;
  };

  // Step 1 → Step 2: validate payment fields then show ID form
  const handlePaymentNext = (e) => {
    e.preventDefault();
    if (form.method === 'credit_card') {
      if (form.card_number.replace(/\s/g, '').length < 16) {
        toast.error('Please enter a valid card number');
        return;
      }
      if (!isExpiryValid(form.expiry)) {
        toast.error('Card has expired or expiry date is invalid');
        return;
      }
    }
    setStep(2);
  };

  // Step 2: submit payment + ID info
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { id_type, id_number, id_first_name, id_last_name, id_birth_date, id_nationality } = idForm;
    if (!id_type || !id_number.trim() || !id_first_name.trim() || !id_last_name.trim() || !id_birth_date || !id_nationality.trim()) {
      toast.error('Please fill in all ID fields');
      return;
    }
    setLoading(true);
    try {
      if (saveId) {
        try {
          const saved = await API.post('/saved-ids', {
            id_type, id_number: id_number.trim(),
            id_first_name: id_first_name.trim(), id_last_name: id_last_name.trim(),
            id_birth_date, id_nationality: id_nationality.trim(),
          });
          setSavedIds(prev => [saved.data, ...prev]);
          toast.success('ID saved for future bookings!');
        } catch (saveErr) {
          const msg = saveErr.response?.data?.message;
          if (msg !== 'ID already saved') toast.warn(msg || 'ID could not be saved');
        }
      }
      if (form.method === 'credit_card' && saveCard) {
        const last_four = form.card_number.replace(/\s/g, '').slice(-4);
        try {
          const saved = await API.post('/saved-cards', {
            card_name: form.card_name,
            card_number: form.card_number,
            last_four,
            expiry: form.expiry,
            card_type: getCardType(form.card_number),
          });
          setSavedCards(prev => [saved.data, ...prev]);
          toast.success('Card saved for future payments!');
        } catch (saveErr) {
          const msg = saveErr.response?.data?.message;
          if (msg !== 'Card already saved') toast.warn(msg || 'Card could not be saved');
        }
      }
      await API.post('/bookings/complete', {
        ...bookingData,
        method: form.method,
        id_type,
        id_number: id_number.trim(),
        id_first_name: id_first_name.trim(),
        id_last_name: id_last_name.trim(),
        id_birth_date,
        id_nationality: id_nationality.trim(),
      });
      toast.success('Payment submitted! Awaiting admin confirmation.');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    }
    setLoading(false);
  };

  const showConfirm = (message, onConfirm) => setConfirmDialog({ open: true, message, onConfirm });
  const closeConfirm = () => setConfirmDialog({ open: false, message: '', onConfirm: null });

  const removeSavedCard = (id, e) => {
    e.stopPropagation();
    showConfirm('Remove this saved card?', async () => {
      await API.delete(`/saved-cards/${id}`).catch(() => {});
      setSavedCards(prev => prev.filter(c => c.id !== id));
      if (selectedCardId === id) setSelectedCardId(null);
    });
  };

  const selectSavedCard = (card) => {
    if (!isExpiryValid(card.expiry)) {
      toast.error('This card has expired and cannot be used');
      return;
    }
    if (selectedCardId === card.id) {
      setSelectedCardId(null);
      setForm(f => ({ ...f, card_name: '', expiry: '', card_number: '' }));
    } else {
      setSelectedCardId(card.id);
      setForm(f => ({ ...f, card_name: card.card_name, expiry: card.expiry, card_number: card.card_number || '' }));
    }
  };

  const removeSavedId = (id, e) => {
    e.stopPropagation();
    showConfirm('Remove this saved ID?', async () => {
      await API.delete(`/saved-ids/${id}`).catch(() => {});
      setSavedIds(prev => prev.filter(s => s.id !== id));
      if (selectedSavedIdId === id) {
        setSelectedSavedIdId(null);
        setIdForm({ id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
      }
    });
  };

  const selectSavedId = (savedId) => {
    if (selectedSavedIdId === savedId.id) {
      setSelectedSavedIdId(null);
      setUseAnotherPersonId(false);
      setIdForm({ id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
    } else {
      setSelectedSavedIdId(savedId.id);
      setUseAnotherPersonId(false);
      setSaveId(false);
      setIdForm({
        id_type: savedId.id_type,
        id_number: savedId.id_number,
        id_first_name: savedId.id_first_name,
        id_last_name: savedId.id_last_name,
        id_birth_date: savedId.id_birth_date ? savedId.id_birth_date.split('T')[0] : '',
        id_nationality: savedId.id_nationality,
      });
    }
  };

  const handleUseAnotherPerson = () => {
    setUseAnotherPersonId(true);
    setSelectedSavedIdId(null);
    setSaveId(false);
    setIdForm({ id_type: '', id_number: '', id_first_name: '', id_last_name: '', id_birth_date: '', id_nationality: '' });
  };

  const ID_TYPE_LABELS = { national_id: 'National ID', passport: 'Passport', driver_license: "Driver's License", residence_permit: 'Residence Permit' };

  const formatCard = (val) => val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (val) => {
    const c = val.replace(/\D/g, '');
    return c.length >= 2 ? c.slice(0, 2) + '/' + c.slice(2, 4) : c;
  };
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setForm({ ...form, expiry: formatExpiry(raw) });
  };

  const cardDigits = form.card_number.replace(/\s/g, '').padEnd(16, '•');
  const cardDisplay = [cardDigits.slice(0,4), cardDigits.slice(4,8), cardDigits.slice(8,12), cardDigits.slice(12,16)].join('  ');

  return (
    <div style={s.page}>
      <Navbar />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .pay-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          background: #f8fafc;
          color: #1a1a2e;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }
        .pay-input:focus {
          border-color: #0f3460;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(15,52,96,0.08);
        }
        .pay-input::placeholder { color: #b0bec5; }
        .method-tab {
          flex: 1;
          padding: 14px;
          border: 2px solid transparent;
          border-radius: 14px;
          background: transparent;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: #888;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .method-tab.active {
          border-color: #0f3460;
          background: #fff;
          color: #0f3460;
          box-shadow: 0 4px 16px rgba(15,52,96,0.12);
        }
        .method-tab:hover:not(.active) { background: rgba(15,52,96,0.04); }
        .pay-btn {
          width: 100%;
          height: 58px;
          border: none;
          border-radius: 16px;
          background: linear-gradient(135deg, #e94560, #c73652);
          color: #fff;
          font-size: 17px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: all 0.25s cubic-bezier(.22,1,.36,1);
          box-shadow: 0 8px 28px rgba(233,69,96,0.38);
        }
        .pay-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(233,69,96,0.5);
        }
        .pay-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .step-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .step-line { width: 2px; height: 20px; margin-left: 13px; background: #e2e8f0; }
        .step-line.done { background: #22c55e; }
        .saved-card-tile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.18s;
          position: relative;
        }
        .saved-card-tile:hover { border-color: #0f3460; background: #fff; }
        .saved-card-tile.selected { border-color: #0f3460; background: #eef2ff; }
        .saved-card-delete {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: #fee2e2;
          color: #dc2626;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .saved-card-tile:hover .saved-card-delete { opacity: 1; }
        .save-checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 14px 16px;
          background: #f0f4ff;
          border-radius: 12px;
          border: 1.5px solid #c7d2fe;
          cursor: pointer;
          user-select: none;
        }
        .save-checkbox-row input[type=checkbox] {
          width: 18px;
          height: 18px;
          accent-color: #4f46e5;
          cursor: pointer;
          flex-shrink: 0;
        }
      `}</style>

      {/* Hero */}
      <div style={s.hero}>
        <FadeIn>
          <p style={s.heroBadge}>SECURE CHECKOUT</p>
          <h1 style={s.heroTitle}>Complete Your Booking</h1>
          <p style={s.heroSub}>{vehicle_name} — your payment is processed securely</p>
        </FadeIn>
      </div>

      <div style={s.layout}>

        {/* LEFT — Order Summary (always visible) */}
        <FadeIn>
          <div style={s.summaryCard}>
            <p style={s.sectionTag}>ORDER SUMMARY</p>

            <div style={s.amountBlock}>
              <span style={s.amountLabel}>Total Due</span>
              <span style={s.amountValue}>${total_price?.toFixed(2)}</span>
            </div>

            <div style={s.summaryRow}>
              <span style={s.summaryKey}>Vehicle</span>
              <span style={s.summaryVal}>{vehicle_name}</span>
            </div>
            <div style={s.summaryRow}>
              <span style={s.summaryKey}>Status</span>
              <span style={s.statusPill}>Pending Confirmation</span>
            </div>

            <div style={s.divider} />

            <p style={s.sectionTag}>PAYMENT FLOW</p>
            <div style={s.steps}>
              {[
                { label: 'Dates & vehicle selected', done: true },
                { label: 'Payment details', done: step === 2, active: step === 1 },
                { label: 'ID verification', done: false, active: step === 2 },
                { label: 'Admin approval', done: false },
                { label: 'Booking confirmed', done: false },
              ].map(({ label, done, active }, i, arr) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      className="step-dot"
                      style={{
                        background: done ? '#22c55e' : active ? '#e94560' : '#e2e8f0',
                        color: done || active ? '#fff' : '#999',
                      }}
                    >
                      {done ? '✓' : active ? '→' : i + 1}
                    </div>
                    <span style={{ fontSize: '14px', color: done ? '#22c55e' : active ? '#1a1a2e' : '#aaa', fontWeight: active ? 700 : 500 }}>
                      {label}
                    </span>
                  </div>
                  {i < arr.length - 1 && <div className={`step-line${done ? ' done' : ''}`} />}
                </div>
              ))}
            </div>

            <div style={s.securityNote}>
              🔒 256-bit SSL encryption · PCI compliant · No charge until approved
            </div>
          </div>
        </FadeIn>

        {/* RIGHT — Payment / ID Form */}
        <FadeIn>
          <div style={s.formCard}>
            {step === 1 && (
              <>
                <p style={s.sectionTag}>PAYMENT METHOD</p>
                <div style={s.methodTabs}>
                  <button type="button" className={`method-tab ${form.method === 'credit_card' ? 'active' : ''}`} onClick={() => { setForm({ card_name: '', card_number: '', expiry: '', cvv: '', method: 'credit_card' }); setSelectedCardId(null); }}>
                    <span style={{ fontSize: '22px' }}>💳</span>Card
                  </button>
                  <button type="button" className={`method-tab ${form.method === 'cash' ? 'active' : ''}`} onClick={() => { setForm({ card_name: '', card_number: '', expiry: '', cvv: '', method: 'cash' }); setSelectedCardId(null); }}>
                    <span style={{ fontSize: '22px' }}>💵</span>Cash on Pickup
                  </button>
                </div>
              </>
            )}

            {step === 2 ? (
              /* ── Step 2: ID Verification ── */
              <form onSubmit={handleSubmit}>
                <p style={s.sectionTag}>IDENTITY VERIFICATION</p>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
                  Required before your booking is confirmed. Your information is kept secure and only shared with our admin team.
                </p>

                {/* Saved IDs */}
                {savedIds.length > 0 && !useAnotherPersonId && (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ ...s.sectionTag, marginBottom: 12 }}>SAVED IDs</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {savedIds.map(sid => (
                        <div
                          key={sid.id}
                          className={`saved-card-tile${selectedSavedIdId === sid.id ? ' selected' : ''}`}
                          onClick={() => selectSavedId(sid)}
                        >
                          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                            🪪
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                              {sid.id_first_name} {sid.id_last_name}
                            </div>
                            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                              {ID_TYPE_LABELS[sid.id_type] || sid.id_type} · {sid.id_number} · {sid.id_nationality}
                            </div>
                          </div>
                          {selectedSavedIdId === sid.id && (
                            <span style={{ fontSize: 18, color: '#4f46e5' }}>✓</span>
                          )}
                          <button
                            className="saved-card-delete"
                            onClick={(e) => removeSavedId(sid.id, e)}
                            title="Remove ID"
                            type="button"
                          >×</button>
                        </div>
                      ))}
                    </div>

                    {/* Use another person's ID */}
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        onClick={handleUseAnotherPerson}
                        style={{ width: '100%', padding: '12px 16px', border: '1.5px dashed #c7d2fe', borderRadius: 12, background: '#f8fafc', color: '#4338ca', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                      >
                        + Use a different person's ID
                      </button>
                    </div>

                    {selectedSavedIdId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 0', color: '#aaa', fontSize: 12 }}>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        <span>or enter details manually below</span>
                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Back button when "another person" was clicked */}
                {useAnotherPersonId && savedIds.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <button type="button" onClick={() => setUseAnotherPersonId(false)}
                      style={{ background: 'none', border: 'none', color: '#4338ca', fontSize: 13, cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                      ← Back to saved IDs
                    </button>
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
                      You are booking on behalf of another person. Enter their ID details below.
                    </div>
                  </div>
                )}

                <div style={s.row}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>First Name</label>
                    <input className="pay-input" placeholder="John" value={idForm.id_first_name}
                      onChange={e => setIdForm({ ...idForm, id_first_name: e.target.value })} required />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Last Name</label>
                    <input className="pay-input" placeholder="Doe" value={idForm.id_last_name}
                      onChange={e => setIdForm({ ...idForm, id_last_name: e.target.value })} required />
                  </div>
                </div>

                <div style={s.row}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Date of Birth</label>
                    <input className="pay-input" type="date" value={idForm.id_birth_date}
                      onChange={e => setIdForm({ ...idForm, id_birth_date: e.target.value })} required />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Nationality</label>
                    <select className="pay-input" value={idForm.id_nationality}
                      onChange={e => setIdForm({ ...idForm, id_nationality: e.target.value })} required>
                      <option value="">Select nationality…</option>
                      {NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                <div style={s.row}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>ID Type</label>
                    <select className="pay-input" value={idForm.id_type}
                      onChange={e => setIdForm({ ...idForm, id_type: e.target.value })} required>
                      <option value="">Select…</option>
                      <option value="national_id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="driver_license">Driver's License</option>
                      <option value="residence_permit">Residence Permit</option>
                    </select>
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>ID Number</label>
                    <input className="pay-input" placeholder="ID number" value={idForm.id_number}
                      onChange={e => setIdForm({ ...idForm, id_number: e.target.value })} required />
                  </div>
                </div>

                {/* Save ID checkbox — only when not using a saved ID */}
                {!selectedSavedIdId && (
                  <label className="save-checkbox-row">
                    <input
                      type="checkbox"
                      checked={saveId}
                      onChange={e => setSaveId(e.target.checked)}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Save ID for future bookings</div>
                      <div style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>Your ID details are stored securely and only accessible by you</div>
                    </div>
                  </label>
                )}

                <div style={{ background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#4338ca', marginBottom: 24 }}>
                  🔒 Your ID is used for identity verification only and handled securely.
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ flex: 1, height: 52, border: '1.5px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', color: '#555', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    ← Back
                  </button>
                  <button className="pay-btn" type="submit" disabled={loading} style={{ flex: 2 }}>
                    {loading ? 'Submitting…' : '✓  Submit Booking'}
                  </button>
                </div>
              </form>
            ) : form.method === 'credit_card' ? (
              /* ── Step 1: Card Payment ── */
              <form onSubmit={handlePaymentNext}>

                {/* Saved Cards */}
                {savedCards.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ ...s.sectionTag, marginBottom: '12px' }}>SAVED CARDS</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {savedCards.map(card => (
                        <div
                          key={card.id}
                          className={`saved-card-tile${selectedCardId === card.id ? ' selected' : ''}`}
                          onClick={() => selectSavedCard(card)}
                        >
                          <div style={{ width: 36, height: 24, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                            💳
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                              •••• •••• •••• {card.last_four}
                            </div>
                            <div style={{ fontSize: 12, color: isExpiryValid(card.expiry) ? '#888' : '#ef4444', marginTop: 2 }}>
                              {card.card_name} · {card.card_type} · {isExpiryValid(card.expiry) ? card.expiry : `Expired ${card.expiry}`}
                            </div>
                          </div>
                          {selectedCardId === card.id && (
                            <span style={{ fontSize: 18, color: '#4f46e5' }}>✓</span>
                          )}
                          <button
                            className="saved-card-delete"
                            onClick={(e) => removeSavedCard(card.id, e)}
                            title="Remove card"
                          >×</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 0', color: '#aaa', fontSize: 12 }}>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                      <span>or enter a new card</span>
                      <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                    </div>
                  </div>
                )}

                {/* Card visual */}
                <div style={s.cardVisual}>
                  <div style={s.cardChip}>▪▪▪</div>
                  <div style={s.cardNumber}>{cardDisplay}</div>
                  <div style={s.cardMeta}>
                    <div>
                      <div style={s.cardMetaLabel}>CARDHOLDER</div>
                      <div style={s.cardMetaVal}>{form.card_name || 'YOUR NAME'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={s.cardMetaLabel}>EXPIRES</div>
                      <div style={s.cardMetaVal}>{form.expiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>

                <div style={s.fieldGroup}>
                  <label style={s.label}>Cardholder Name</label>
                  <input className="pay-input" placeholder="John Doe"
                    value={form.card_name}
                    onChange={e => setForm({ ...form, card_name: e.target.value })} required />
                </div>

                <div style={s.fieldGroup}>
                  <label style={s.label}>Card Number</label>
                  <input className="pay-input" placeholder="1234 5678 9012 3456"
                    value={form.card_number}
                    onChange={e => setForm({ ...form, card_number: formatCard(e.target.value) })}
                    maxLength={19} required />
                </div>

                <div style={s.row}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Expiry</label>
                    <input className="pay-input" placeholder="MM/YY"
                      value={form.expiry} onChange={handleExpiryChange} maxLength={5} required />
                  </div>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>CVV</label>
                    <input className="pay-input" placeholder="•••" type="password"
                      value={form.cvv}
                      onChange={e => setForm({ ...form, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                      maxLength={3} required />
                  </div>
                </div>

                {/* Save card checkbox */}
                <label className="save-checkbox-row">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={e => setSaveCard(e.target.checked)}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>Save card for future payments</div>
                    <div style={{ fontSize: 12, color: '#6366f1', marginTop: 2 }}>Only last 4 digits are stored — CVV is never saved</div>
                  </div>
                </label>

                <button className="pay-btn" type="submit">
                  Continue to ID Verification →
                </button>
              </form>
            ) : (
              /* ── Step 1: Cash ── */
              <div>
                <div style={s.cashBox}>
                  <div style={s.cashIcon}>💵</div>
                  <div style={s.cashTitle}>Pay at Pickup</div>
                  <div style={s.cashAmount}>${total_price?.toFixed(2)}</div>
                  <p style={s.cashDesc}>Bring the exact amount in cash when you pick up your vehicle. Your booking will be confirmed by an admin.</p>
                </div>
                <div style={s.cashInfoRow}>
                  <div style={s.cashInfoItem}><span style={s.cashInfoIcon}>📍</span><span>Pay at location</span></div>
                  <div style={s.cashInfoItem}><span style={s.cashInfoIcon}>✅</span><span>Admin confirms</span></div>
                  <div style={s.cashInfoItem}><span style={s.cashInfoIcon}>🚗</span><span>Get your keys</span></div>
                </div>
                <button className="pay-btn" onClick={handlePaymentNext} disabled={loading}
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 28px rgba(34,197,94,0.38)' }}>
                  {loading ? 'Processing…' : 'Continue to ID Verification →'}
                </button>
              </div>
            )}
          </div>
        </FadeIn>

      </div>
      <Footer />

      {/* Confirm Dialog */}
      {confirmDialog.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '32px 28px', width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 24px', textAlign: 'center' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeConfirm}
                style={{ flex: 1, height: 46, border: '1.5px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', color: '#555', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >Cancel</button>
              <button
                onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}
                style={{ flex: 1, height: 46, border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #e94560, #c73652)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', fontFamily: "'DM Sans', sans-serif" },

  hero: {
    background: 'linear-gradient(135deg, #0f3460 0%, #1a4b8c 60%, #e94560 100%)',
    color: '#fff', padding: '100px 48px 70px', textAlign: 'center',
  },
  heroBadge: { fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', textTransform: 'uppercase' },
  heroTitle: { fontSize: '48px', fontWeight: 800, margin: '0 0 12px', fontFamily: "'Playfair Display', serif" },
  heroSub: { fontSize: '17px', opacity: 0.8, margin: 0 },

  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', padding: '48px', maxWidth: '1100px', margin: '0 auto', alignItems: 'start' },

  summaryCard: {
    background: '#fff', borderRadius: '24px', padding: '32px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.08)', position: 'sticky', top: '100px',
  },
  sectionTag: { fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', color: '#aaa', marginBottom: '16px', textTransform: 'uppercase' },
  amountBlock: { background: 'linear-gradient(135deg, #0f3460, #1a4b8c)', borderRadius: '16px', padding: '24px', marginBottom: '24px', color: '#fff' },
  amountLabel: { display: 'block', fontSize: '12px', opacity: 0.7, marginBottom: '8px', fontWeight: 600 },
  amountValue: { fontSize: '42px', fontWeight: 900, letterSpacing: '-1px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f4f8', fontSize: '14px' },
  summaryKey: { color: '#888', fontWeight: 500 },
  summaryVal: { color: '#1a1a2e', fontWeight: 700 },
  statusPill: { background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 },
  divider: { height: '1px', background: '#f0f4f8', margin: '24px 0' },
  steps: { display: 'flex', flexDirection: 'column', marginBottom: '28px' },
  securityNote: { fontSize: '12px', color: '#aaa', textAlign: 'center', lineHeight: 1.6, borderTop: '1px solid #f0f4f8', paddingTop: '20px' },

  formCard: { background: '#fff', borderRadius: '24px', padding: '36px', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' },
  methodTabs: { display: 'flex', gap: '12px', background: '#f4f6f9', padding: '8px', borderRadius: '18px', marginBottom: '32px' },

  cardVisual: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 60%, #e94560 100%)',
    borderRadius: '20px', padding: '28px', marginBottom: '28px',
    color: '#fff', position: 'relative', overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(15,52,96,0.35)',
  },
  cardChip: { fontSize: '22px', letterSpacing: '2px', marginBottom: '28px', opacity: 0.9 },
  cardNumber: {
    fontFamily: "'Space Mono', monospace", fontSize: '22px', letterSpacing: '4px',
    marginBottom: '28px', fontWeight: 700,
  },
  cardMeta: { display: 'flex', justifyContent: 'space-between' },
  cardMetaLabel: { fontSize: '9px', letterSpacing: '1.5px', opacity: 0.6, marginBottom: '4px', textTransform: 'uppercase' },
  cardMetaVal: { fontSize: '14px', fontWeight: 700, letterSpacing: '1px' },

  fieldGroup: { marginBottom: '18px', flex: 1 },
  label: { display: 'block', fontSize: '12px', fontWeight: 700, color: '#555', letterSpacing: '0.4px', marginBottom: '8px', textTransform: 'uppercase' },
  row: { display: 'flex', gap: '16px' },

  cashBox: { background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: '20px', padding: '36px 24px', textAlign: 'center', marginBottom: '24px', border: '1.5px solid #bbf7d0' },
  cashIcon: { fontSize: '56px', marginBottom: '12px' },
  cashTitle: { fontSize: '20px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' },
  cashAmount: { fontSize: '44px', fontWeight: 900, color: '#15803d', letterSpacing: '-1px', marginBottom: '16px' },
  cashDesc: { fontSize: '14px', color: '#666', lineHeight: 1.6, maxWidth: '320px', margin: '0 auto' },
  cashInfoRow: { display: 'flex', justifyContent: 'space-around', marginBottom: '28px', padding: '16px', background: '#f8fafc', borderRadius: '14px' },
  cashInfoItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#555', fontWeight: 600 },
  cashInfoIcon: { fontSize: '24px' },
};
