import logo from '../assets/logo.png';

const COMPANY = {
  name: 'JUNE Rental Company',
  address: 'Ziya Gökalp Mahallesi, Atatürk Bulvarı No: 45, 34480 Başakşehir, Istanbul, Turkey',
  phone: '+90 212 000 00 00',
  email: 'vrmscars@gmail.com',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcDays(start, end) {
  return Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
}

function parseExtras(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) || []; } catch { return []; }
}

async function logoToDataUrl(src) {
  try {
    const resp = await fetch(src);
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return src;
  }
}

function buildPrintHTML(booking, logoDataUrl) {
  const days = calcDays(booking.start_date, booking.end_date);
  const extras = parseExtras(booking.extras);
  const pricePerDay = booking.price_per_day ? `$${parseFloat(booking.price_per_day).toFixed(2)}` : '—';
  const renterName = [booking.id_first_name, booking.id_last_name].filter(Boolean).join(' ') || '—';
  const pickupFull = [booking.pickup_location_name, booking.pickup_address, booking.pickup_city].filter(Boolean).join(', ') || '—';
  const returnFull = [booking.return_location_name, booking.return_address, booking.return_city].filter(Boolean).join(', ') || '—';
  const extrasHTML = extras.length > 0
    ? `<div style="margin:0 0 18px;">
        <div class="section-title">Extras / Additional Features</div>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead><tr style="background:#f0f4ff;">
            <th style="text-align:left; padding:6px 10px; border:1px solid #dce8ff; color:#0f3460;">Item</th>
            <th style="text-align:center; padding:6px 10px; border:1px solid #dce8ff; color:#0f3460;">Qty</th>
            <th style="text-align:right; padding:6px 10px; border:1px solid #dce8ff; color:#0f3460;">Price</th>
          </tr></thead>
          <tbody>${extras.map(e => `<tr>
            <td style="padding:6px 10px; border:1px solid #e8edf5;">${e.name}</td>
            <td style="padding:6px 10px; border:1px solid #e8edf5; text-align:center;">${e.quantity}</td>
            <td style="padding:6px 10px; border:1px solid #e8edf5; text-align:right;">$${parseFloat(e.price).toFixed(2)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Rental Contract #${booking.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; }
  .page { width: 210mm; padding: 16mm 18mm; margin: 0 auto; background: #fff; }
  .page-break { page-break-before: always; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f3460; padding-bottom: 14px; margin-bottom: 18px; }
  .header-logo { height: 60px; width: 160px; object-fit: contain; }
  .header-title { text-align: right; }
  .header-title h1 { font-size: 22px; font-weight: 800; color: #0f3460; letter-spacing: 1px; }
  .header-title p { font-size: 11px; color: #666; margin-top: 4px; }
  .contract-ref { background: #f0f4ff; border-left: 4px solid #0f3460; padding: 8px 14px; margin-bottom: 18px; font-size: 11px; color: #555; border-radius: 0 4px 4px 0; }
  .contract-ref strong { color: #0f3460; font-size: 13px; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #0f3460; border-bottom: 1.5px solid #e8edf5; padding-bottom: 5px; margin-bottom: 10px; }
  .two-col { display: flex; gap: 20px; margin-bottom: 18px; }
  .two-col > div { flex: 1; }
  .info-block { margin-bottom: 18px; }
  .field-row { display: flex; margin-bottom: 6px; }
  .field-label { width: 130px; flex-shrink: 0; font-size: 11px; color: #888; font-weight: 600; }
  .field-value { flex: 1; font-size: 12px; color: #1a1a2e; font-weight: 500; border-bottom: 1px dotted #ccc; padding-bottom: 2px; min-height: 16px; }
  .highlight-box { background: #f7f9ff; border: 1.5px solid #dce8ff; border-radius: 6px; padding: 12px 16px; margin-bottom: 18px; }
  .sig-row { display: flex; gap: 40px; margin-top: 28px; padding-top: 14px; border-top: 1.5px solid #e8edf5; }
  .sig-block { flex: 1; }
  .sig-block p { font-size: 11px; font-weight: 700; color: #0f3460; margin-bottom: 38px; }
  .sig-line { border-bottom: 1.5px solid #333; }
  .sig-name { font-size: 10px; color: #888; margin-top: 4px; }
  .terms-header { text-align: center; margin-bottom: 20px; }
  .terms-header h2 { font-size: 18px; font-weight: 800; color: #0f3460; }
  .terms-header p { font-size: 11px; color: #888; margin-top: 4px; }
  .term { margin-bottom: 11px; }
  .term-title { font-size: 12px; font-weight: 700; color: #0f3460; margin-bottom: 3px; }
  .term-body { font-size: 11px; color: #444; line-height: 1.65; }
  .footer-note { margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #aaa; text-align: center; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; padding: 12mm 16mm; }
  }
</style>
</head>
<body>

<div class="page">
  <div class="header">
    <img src="${logoDataUrl}" alt="VRMS" class="header-logo" />
    <div class="header-title">
      <h1>CAR RENTAL CONTRACT</h1>
      <p>${COMPANY.email} &nbsp;|&nbsp; Istanbul, Turkey</p>
    </div>
  </div>

  <div class="contract-ref">
    Contract Reference: &nbsp;<strong>#${booking.id}</strong>
    &emsp;|&emsp; Date Issued: <strong>${fmt(new Date().toISOString().split('T')[0])}</strong>
    &emsp;|&emsp; Status: <strong>${(booking.status || '').replace(/_/g, ' ').toUpperCase()}</strong>
  </div>

  <div class="two-col">
    <div class="info-block">
      <div class="section-title">Owner (Lessor)</div>
      <div class="field-row"><span class="field-label">Company</span><span class="field-value">${COMPANY.name}</span></div>
      <div class="field-row"><span class="field-label">Address</span><span class="field-value">${COMPANY.address}</span></div>
      <div class="field-row"><span class="field-label">Phone</span><span class="field-value">${COMPANY.phone}</span></div>
      <div class="field-row"><span class="field-label">Email</span><span class="field-value">${COMPANY.email}</span></div>
    </div>
    <div class="info-block">
      <div class="section-title">Renter (Lessee)</div>
      <div class="field-row"><span class="field-label">Full Name</span><span class="field-value">${renterName}</span></div>
      <div class="field-row"><span class="field-label">ID Type</span><span class="field-value">${(booking.id_type || '').replace(/_/g, ' ')}</span></div>
      <div class="field-row"><span class="field-label">ID Number</span><span class="field-value">${booking.id_number || '—'}</span></div>
      <div class="field-row"><span class="field-label">Address</span><span class="field-value">&nbsp;</span></div>
      <div class="field-row"><span class="field-label">Email</span><span class="field-value">${booking.customer_email || '—'}</span></div>
    </div>
  </div>

  <div class="info-block">
    <div class="section-title">Vehicle Information</div>
    <div class="highlight-box">
      <div class="two-col" style="gap:10px; margin-bottom:0;">
        <div>
          <div class="field-row"><span class="field-label">Make &amp; Model</span><span class="field-value">${booking.brand || ''} ${booking.model || ''}</span></div>
          <div class="field-row"><span class="field-label">Year</span><span class="field-value">${booking.year || '—'}</span></div>
          <div class="field-row"><span class="field-label">Plate Number</span><span class="field-value">${booking.plate_number || '—'}</span></div>
          <div class="field-row"><span class="field-label">Mileage at Pickup</span><span class="field-value">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; km</span></div>
          <div class="field-row"><span class="field-label">Mileage at Return</span><span class="field-value">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; km</span></div>
        </div>
        <div>
          <div class="field-row"><span class="field-label">Price Per Day</span><span class="field-value">${pricePerDay}</span></div>
          <div class="field-row"><span class="field-label">Rental Duration</span><span class="field-value">${days} day${days !== 1 ? 's' : ''}</span></div>
          <div class="field-row"><span class="field-label">Total Price</span><span class="field-value" style="font-weight:700; color:#0f3460;">$${parseFloat(booking.total_price).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  </div>

  ${extrasHTML}

  <div class="info-block">
    <div class="section-title">Rental Period &amp; Locations</div>
    <div class="two-col">
      <div>
        <div class="field-row"><span class="field-label">Start Date</span><span class="field-value">${fmt(booking.start_date)}</span></div>
        <div class="field-row"><span class="field-label">Start Time</span><span class="field-value">${booking.pickup_time || '—'}</span></div>
        <div class="field-row"><span class="field-label">Pickup Address</span><span class="field-value">${pickupFull}</span></div>
      </div>
      <div>
        <div class="field-row"><span class="field-label">End Date</span><span class="field-value">${fmt(booking.end_date)}</span></div>
        <div class="field-row"><span class="field-label">End Time</span><span class="field-value">${booking.return_time || '—'}</span></div>
        <div class="field-row"><span class="field-label">Return Address</span><span class="field-value">${returnFull}</span></div>
      </div>
    </div>
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <p>Owner / Authorized Representative Signature</p>
      <div class="sig-line"></div>
      <div class="sig-name">${COMPANY.name}</div>
    </div>
    <div class="sig-block">
      <p>Renter Signature</p>
      <div class="sig-line"></div>
      <div class="sig-name">${renterName}</div>
    </div>
  </div>

  <div class="footer-note">
    Both parties acknowledge having read, understood, and agreed to the Terms &amp; Conditions set forth on the following page.
  </div>
</div>

<div class="page page-break">
  <div class="header">
    <img src="${logoDataUrl}" alt="VRMS" class="header-logo" />
    <div class="header-title">
      <h1>TERMS &amp; CONDITIONS</h1>
      <p>Car Rental Agreement — Booking #${booking.id}</p>
    </div>
  </div>

  <div class="terms-header">
    <h2>Rental Agreement — Terms and Conditions</h2>
    <p>Please read the following terms carefully before signing this contract.</p>
  </div>

  <div class="term"><div class="term-title">1. Driver Requirements</div><div class="term-body">The renter must be at least 21 years of age and hold a valid driver's license recognized in the Republic of Turkey. Only the authorized renter named in this agreement may operate the vehicle unless additional drivers are explicitly listed and approved in writing by the company.</div></div>
  <div class="term"><div class="term-title">2. Vehicle Condition</div><div class="term-body">The renter acknowledges receiving the vehicle in clean, roadworthy condition as documented at the time of pickup. The vehicle must be returned in the same condition, subject to normal wear and tear. Any damage beyond normal wear will be assessed and charged to the renter.</div></div>
  <div class="term"><div class="term-title">3. Fuel Policy</div><div class="term-body">The vehicle will be provided with a full fuel tank and must be returned with a full tank. Failure to do so will result in a refueling charge at the current market rate plus a service fee.</div></div>
  <div class="term"><div class="term-title">4. Traffic Violations &amp; Fines</div><div class="term-body">The renter is solely responsible for all traffic violations, parking fines, toll charges, and any other penalties incurred during the rental period. Unresolved fines may be charged to the renter along with an administrative processing fee.</div></div>
  <div class="term"><div class="term-title">5. Prohibited Uses</div><div class="term-body">The vehicle shall not be used for: (a) any illegal purpose; (b) transporting passengers for commercial hire; (c) off-road driving unless explicitly authorized; (d) racing, speed testing, or driver training; (e) driving under the influence of alcohol, narcotics, or any impairing substances; (f) towing any vehicle or trailer without written authorization.</div></div>
  <div class="term"><div class="term-title">6. Smoking &amp; Pets</div><div class="term-body">Smoking inside the vehicle is strictly prohibited. Animals may not be transported without prior written approval. Additional cleaning fees of up to $150 will apply for vehicles returned with evidence of smoking or excessive pet hair/soiling.</div></div>
  <div class="term"><div class="term-title">7. Damage, Accidents &amp; Theft</div><div class="term-body">The renter must immediately notify the company and the relevant authorities in the event of any accident, damage, or theft. A police report must be obtained within 24 hours. Failure to do so may result in the renter being held fully liable for all resulting costs.</div></div>
  <div class="term"><div class="term-title">8. Late Return</div><div class="term-body">Vehicles returned after the agreed return time without prior authorization will be charged an additional day's rental fee for every 24 hours or part thereof beyond the scheduled return. Please contact us in advance if an extension is needed.</div></div>
  <div class="term"><div class="term-title">9. Cancellation Policy</div><div class="term-body">Cancellation requests are subject to admin review. Cancellations approved more than 48 hours before the pickup date may be eligible for a full or partial refund at the company's discretion. Cancellations within 48 hours of the scheduled pickup are generally non-refundable.</div></div>
  <div class="term"><div class="term-title">10. Insurance &amp; Liability</div><div class="term-body">Basic third-party liability coverage is included in the rental price as required by Turkish law. The renter remains liable for any deductible or excess amount in the event of an insurance claim. Comprehensive damage waivers may be available for purchase.</div></div>
  <div class="term"><div class="term-title">11. Mechanical Breakdown</div><div class="term-body">In the event of a mechanical failure not caused by the renter, the company will arrange assistance. Do not attempt any repairs without the company's prior written authorization. Unauthorized repairs will not be reimbursed.</div></div>
  <div class="term"><div class="term-title">12. Personal Belongings</div><div class="term-body">The rental company accepts no liability for loss, theft, or damage to personal property left in the vehicle at any time during or after the rental period.</div></div>
  <div class="term"><div class="term-title">13. Governing Law &amp; Jurisdiction</div><div class="term-body">This agreement is governed by the laws of the Republic of Turkey. Any disputes arising from this contract shall be subject to the exclusive jurisdiction of the courts of Istanbul.</div></div>
  <div class="term"><div class="term-title">14. Entire Agreement</div><div class="term-body">This document constitutes the entire agreement between the parties and supersedes all prior understandings or representations. By signing page one of this contract, the renter confirms having read, understood, and unconditionally accepted all terms set forth herein.</div></div>

  <div class="footer-note">
    JUNE Rental Company &nbsp;|&nbsp; ${COMPANY.email} &nbsp;|&nbsp; Başakşehir, Istanbul, Turkey &nbsp;|&nbsp; Contract #${booking.id}
  </div>
</div>

</body>
</html>`;
}

export default function RentalContract({ booking, onClose }) {
  if (!booking) return null;

  const days = calcDays(booking.start_date, booking.end_date);
  const extras = parseExtras(booking.extras);
  const pricePerDay = booking.price_per_day ? `$${parseFloat(booking.price_per_day).toFixed(2)}` : '—';
  const renterName = [booking.id_first_name, booking.id_last_name].filter(Boolean).join(' ') || '—';
  const pickupFull = [booking.pickup_location_name, booking.pickup_address, booking.pickup_city].filter(Boolean).join(', ') || '—';
  const returnFull = [booking.return_location_name, booking.return_address, booking.return_city].filter(Boolean).join(', ') || '—';

  const handlePrint = async () => {
    const w = window.open('', '_blank', 'width=960,height=800');
    if (!w) { alert('Please allow popups for this site to print the contract.'); return; }
    const logoDataUrl = await logoToDataUrl(logo);
    w.document.write(buildPrintHTML(booking, logoDataUrl));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 700);
  };

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>Rental Contract</div>
            <div style={s.modalSub}>Booking #{booking.id} &nbsp;·&nbsp; {booking.brand} {booking.model}</div>
          </div>
          <div style={s.headerBtns}>
            <button style={s.printBtn} onClick={handlePrint}>🖨️ Print / Save as PDF</button>
            <button style={s.closeBtn} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={s.preview}>
          {/* Page 1 */}
          <div style={s.page}>
            <div style={s.contractHeader}>
              <img src={logo} alt="Logo" style={s.logo} />
              <div style={s.contractTitleBlock}>
                <div style={s.contractTitle}>CAR RENTAL CONTRACT</div>
                <div style={s.contractSub}>{COMPANY.email} · Istanbul, Turkey</div>
              </div>
            </div>

            <div style={s.refBar}>
              Contract Reference: <strong>#{booking.id}</strong>
              &emsp;|&emsp; Date Issued: <strong>{fmt(new Date().toISOString().split('T')[0])}</strong>
              &emsp;|&emsp; Status: <strong>{(booking.status || '').replace(/_/g, ' ').toUpperCase()}</strong>
            </div>

            <div style={s.twoCol}>
              <div style={s.infoBlock}>
                <div style={s.sectionTitle}>Owner (Lessor)</div>
                <Field label="Company" value={COMPANY.name} />
                <Field label="Address" value={COMPANY.address} />
                <Field label="Phone" value={COMPANY.phone} />
                <Field label="Email" value={COMPANY.email} />
              </div>
              <div style={s.infoBlock}>
                <div style={s.sectionTitle}>Renter (Lessee)</div>
                <Field label="Full Name" value={renterName} />
                <Field label="ID Type" value={(booking.id_type || '').replace(/_/g, ' ')} />
                <Field label="ID Number" value={booking.id_number || '—'} />
                <Field label="Address" value="" />
                <Field label="Email" value={booking.customer_email || '—'} />
              </div>
            </div>

            <div style={s.infoBlock}>
              <div style={s.sectionTitle}>Vehicle Information</div>
              <div style={s.highlightBox}>
                <div style={s.twoCol}>
                  <div>
                    <Field label="Make & Model" value={`${booking.brand || ''} ${booking.model || ''}`} />
                    <Field label="Year" value={booking.year || '—'} />
                    <Field label="Plate Number" value={booking.plate_number || '—'} />
                    <Field label="Mileage at Pickup" value="                km" />
                    <Field label="Mileage at Return" value="                km" />
                  </div>
                  <div>
                    <Field label="Price Per Day" value={pricePerDay} />
                    <Field label="Rental Duration" value={`${days} day${days !== 1 ? 's' : ''}`} />
                    <Field label="Total Price" value={`$${parseFloat(booking.total_price).toFixed(2)}`} bold />
                  </div>
                </div>
              </div>
            </div>

            {extras.length > 0 && (
              <div style={s.infoBlock}>
                <div style={s.sectionTitle}>Extras / Additional Features</div>
                <table style={s.extrasTable}>
                  <thead>
                    <tr style={{ background: '#f0f4ff' }}>
                      <th style={s.th}>Item</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Qty</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map((e, i) => (
                      <tr key={i}>
                        <td style={s.td}>{e.name}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{e.quantity}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(e.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={s.infoBlock}>
              <div style={s.sectionTitle}>Rental Period & Locations</div>
              <div style={s.twoCol}>
                <div>
                  <Field label="Start Date" value={fmt(booking.start_date)} />
                  <Field label="Start Time" value={booking.pickup_time || '—'} />
                  <Field label="Pickup Address" value={pickupFull} />
                </div>
                <div>
                  <Field label="End Date" value={fmt(booking.end_date)} />
                  <Field label="End Time" value={booking.return_time || '—'} />
                  <Field label="Return Address" value={returnFull} />
                </div>
              </div>
            </div>

            <div style={s.sigRow}>
              <SigBlock label="Owner / Authorized Representative Signature" name={COMPANY.name} />
              <SigBlock label="Renter Signature" name={renterName} />
            </div>

            <div style={s.footerNote}>
              Both parties acknowledge having read, understood, and agreed to the Terms & Conditions on the following page.
            </div>
          </div>

          {/* Page 2 — Terms */}
          <div style={{ ...s.page, marginTop: '32px' }}>
            <div style={s.contractHeader}>
              <img src={logo} alt="Logo" style={s.logo} />
              <div style={s.contractTitleBlock}>
                <div style={s.contractTitle}>TERMS & CONDITIONS</div>
                <div style={s.contractSub}>Car Rental Agreement — Booking #{booking.id}</div>
              </div>
            </div>

            <div style={s.termsHeading}>
              <div style={s.termsTitle}>Rental Agreement — Terms and Conditions</div>
              <div style={s.termsSub}>Please read the following terms carefully before signing this contract.</div>
            </div>

            {TERMS.map((t, i) => (
              <div key={i} style={s.term}>
                <div style={s.termTitle}>{i + 1}. {t.title}</div>
                <div style={s.termBody}>{t.body}</div>
              </div>
            ))}

            <div style={s.footerNote}>
              JUNE Rental Company · {COMPANY.email} · Başakşehir, Istanbul, Turkey · Contract #{booking.id}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, bold }) {
  return (
    <div style={s.fieldRow}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={{ ...s.fieldValue, ...(bold ? { fontWeight: 700, color: '#0f3460' } : {}) }}>{value || ' '}</span>
    </div>
  );
}

function SigBlock({ label, name }) {
  return (
    <div style={s.sigBlock}>
      <div style={s.sigLabel}>{label}</div>
      <div style={s.sigSpace} />
      <div style={s.sigLine} />
      <div style={s.sigName}>{name}</div>
    </div>
  );
}

const TERMS = [
  { title: 'Driver Requirements', body: 'The renter must be at least 21 years of age and hold a valid driver\'s license recognized in the Republic of Turkey. Only the authorized renter named in this agreement may operate the vehicle unless additional drivers are explicitly listed and approved in writing.' },
  { title: 'Vehicle Condition', body: 'The renter acknowledges receiving the vehicle in clean, roadworthy condition as documented at pickup. The vehicle must be returned in the same condition. Any damage beyond normal wear and tear will be assessed and charged to the renter.' },
  { title: 'Fuel Policy', body: 'The vehicle will be provided with a full fuel tank and must be returned with a full tank. Failure to do so will result in a refueling charge at the current market rate plus a service fee.' },
  { title: 'Traffic Violations & Fines', body: 'The renter is solely responsible for all traffic violations, parking fines, toll charges, and any other penalties incurred during the rental period. Unresolved fines may be charged to the renter along with an administrative processing fee.' },
  { title: 'Prohibited Uses', body: 'The vehicle shall not be used for: (a) any illegal purpose; (b) transporting passengers for commercial hire; (c) off-road driving unless explicitly authorized; (d) racing or speed testing; (e) driving under the influence of alcohol, narcotics, or any impairing substances; (f) towing any vehicle or trailer without written authorization.' },
  { title: 'Smoking & Pets', body: 'Smoking inside the vehicle is strictly prohibited. Animals may not be transported without prior written approval. Additional cleaning fees of up to $150 will apply for vehicles returned with evidence of smoking or excessive pet hair/soiling.' },
  { title: 'Damage, Accidents & Theft', body: 'The renter must immediately notify the company and the relevant authorities in the event of any accident, damage, or theft. A police report must be obtained within 24 hours. Failure to do so may result in the renter being held fully liable for all resulting costs.' },
  { title: 'Late Return', body: 'Vehicles returned after the agreed return time without prior authorization will be charged an additional day\'s rental fee for every 24 hours or part thereof. Please contact us in advance if an extension is needed.' },
  { title: 'Cancellation Policy', body: 'Cancellation requests are subject to admin review. Cancellations approved more than 48 hours before pickup may be eligible for a full or partial refund at the company\'s discretion. Cancellations within 48 hours of the scheduled pickup are generally non-refundable.' },
  { title: 'Insurance & Liability', body: 'Basic third-party liability coverage is included in the rental price as required by Turkish law. The renter remains liable for any deductible in the event of an insurance claim. Comprehensive damage waivers may be available for purchase.' },
  { title: 'Mechanical Breakdown', body: 'In the event of a mechanical failure not caused by the renter, the company will arrange assistance. Do not attempt any repairs without the company\'s prior written authorization. Unauthorized repairs will not be reimbursed.' },
  { title: 'Personal Belongings', body: 'The rental company accepts no liability for loss, theft, or damage to personal property left in the vehicle at any time during or after the rental period.' },
  { title: 'Governing Law & Jurisdiction', body: 'This agreement is governed by the laws of the Republic of Turkey. Any disputes arising from this contract shall be subject to the exclusive jurisdiction of the courts of Istanbul.' },
  { title: 'Entire Agreement', body: 'This document constitutes the entire agreement between the parties and supersedes all prior understandings. By signing page one, the renter confirms having read, understood, and unconditionally accepted all terms herein.' },
];

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(10,10,20,0.72)', backdropFilter: 'blur(6px)', zIndex: 10100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' },
  modal: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', margin: 'auto' },
  modalHeader: { background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' },
  modalTitle: { fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Playfair Display', serif" },
  modalSub: { fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' },
  headerBtns: { display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 },
  printBtn: { background: 'linear-gradient(135deg, #e94560, #c41341)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  closeBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: 'pointer', flexShrink: 0 },
  preview: { padding: '28px', background: '#f0f2f5', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' },
  page: { background: '#fff', borderRadius: '12px', padding: '32px 36px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#1a1a2e' },
  contractHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #0f3460', paddingBottom: '16px', marginBottom: '20px' },
  logo: { height: '56px', objectFit: 'contain' },
  contractTitleBlock: { textAlign: 'right' },
  contractTitle: { fontSize: '20px', fontWeight: 800, color: '#0f3460', letterSpacing: '1px' },
  contractSub: { fontSize: '11px', color: '#888', marginTop: '4px' },
  refBar: { background: '#f0f4ff', borderLeft: '4px solid #0f3460', padding: '8px 14px', marginBottom: '20px', fontSize: '12px', color: '#555', borderRadius: '0 4px 4px 0' },
  twoCol: { display: 'flex', gap: '24px' },
  infoBlock: { flex: 1, marginBottom: '20px' },
  sectionTitle: { fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#0f3460', borderBottom: '1.5px solid #e8edf5', paddingBottom: '5px', marginBottom: '10px' },
  highlightBox: { background: '#f7f9ff', border: '1.5px solid #dce8ff', borderRadius: '8px', padding: '14px 18px' },
  fieldRow: { display: 'flex', marginBottom: '7px', alignItems: 'baseline' },
  fieldLabel: { width: '130px', flexShrink: 0, fontSize: '11px', color: '#888', fontWeight: 600 },
  fieldValue: { flex: 1, fontSize: '12px', color: '#1a1a2e', fontWeight: 500, borderBottom: '1px dotted #ccc', paddingBottom: '2px', minHeight: '16px' },
  extrasTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  th: { textAlign: 'left', padding: '7px 12px', border: '1px solid #dce8ff', color: '#0f3460', fontWeight: 700, fontSize: '11px', background: '#f0f4ff' },
  td: { padding: '7px 12px', border: '1px solid #e8edf5', fontSize: '12px' },
  sigRow: { display: 'flex', gap: '48px', marginTop: '28px', paddingTop: '16px', borderTop: '1.5px solid #e8edf5' },
  sigBlock: { flex: 1 },
  sigLabel: { fontSize: '11px', fontWeight: 700, color: '#0f3460' },
  sigSpace: { height: '44px' },
  sigLine: { borderBottom: '1.5px solid #333' },
  sigName: { fontSize: '10px', color: '#888', marginTop: '4px' },
  footerNote: { marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '10px', color: '#aaa', textAlign: 'center' },
  termsHeading: { textAlign: 'center', marginBottom: '18px' },
  termsTitle: { fontSize: '16px', fontWeight: 800, color: '#0f3460' },
  termsSub: { fontSize: '11px', color: '#888', marginTop: '4px' },
  term: { marginBottom: '11px' },
  termTitle: { fontSize: '12px', fontWeight: 700, color: '#0f3460', marginBottom: '3px' },
  termBody: { fontSize: '11px', color: '#444', lineHeight: 1.7 },
};
