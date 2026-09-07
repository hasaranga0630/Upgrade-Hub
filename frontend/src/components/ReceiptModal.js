import React, { useEffect } from 'react';
import Icon from './Icons';

export function ReceiptModal({
  isOpen,
  saleData,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !saleData) return null;

  const {
    id = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
    date = new Date().toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }),
    customerName = 'Walk-in Customer',
    cashierName = 'Admin Cashier #01',
    items = [],
    discount = 0,
    subtotal = 0,
    total = 0,
    paymentMethod = 'Cash',
    cashTendered = 0,
    changeDue = 0
  } = saleData;

  const rawId = String(id || '').replace(/^#/, '');
  const displayId = `#${rawId}`;

  const money = (val) => `LKR ${Number(val || 0).toLocaleString('en-LK')}`;

  const handlePrint = () => {
    window.print();
  };

  // Determine warranty period based on product category / keywords
  const getItemWarranty = (item) => {
    if (item.warranty) return item.warranty;
    const name = (item.name || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    if (
      name.includes('stereo') ||
      name.includes('player') ||
      name.includes('amplifier') ||
      name.includes('subwoofer') ||
      name.includes('bass tube') ||
      cat.includes('audio')
    ) {
      return '1 Year Mfr Warranty';
    }
    if (
      name.includes('speaker') ||
      name.includes('headlight') ||
      name.includes('alloy wheel') ||
      name.includes('air horn') ||
      name.includes('disc horn') ||
      name.includes('speedometer')
    ) {
      return '6 Months Replacement';
    }
    if (
      name.includes('power bank') ||
      name.includes('powercore') ||
      name.includes('charger') ||
      name.includes('airpods') ||
      name.includes('earbuds')
    ) {
      return '1 Year Local Warranty';
    }
    if (
      name.includes('amoled') ||
      name.includes('oled') ||
      name.includes('display') ||
      name.includes('battery')
    ) {
      return '6 Months Hardware';
    }
    if (
      name.includes('neon') ||
      name.includes('fog') ||
      name.includes('exhaust') ||
      name.includes('curtain') ||
      name.includes('mud flap') ||
      name.includes('mount') ||
      name.includes('fm transmitter')
    ) {
      return '3 Months Service';
    }
    if (
      name.includes('cable') ||
      name.includes('glass') ||
      name.includes('case')
    ) {
      return '7 Days Checking';
    }
    return '3 Months Standard';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog receipt-dialog premium-receipt" onClick={(e) => e.stopPropagation()}>
        {/* Top Floating Action Bar */}
        <div className="receipt-toolbar no-print">
          <div className="receipt-toolbar-left">
            <span className="receipt-toolbar-badge">
              <Icon name="receipt" size={14} />
              <span>Official Tax Invoice</span>
            </span>
          </div>
          <div className="receipt-toolbar-right">
            <button className="btn-print" onClick={handlePrint} title="Print receipt or save as PDF">
              <Icon name="printer" size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button className="btn-toolbar-close" onClick={onClose} aria-label="Close receipt" title="Close">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="receipt-paper" id="printable-receipt">
          {/* Header & Brand Identity */}
          <div className="receipt-header">
            <div className="receipt-brand-row">
              <div className="receipt-logo-pill">
                <img
                  src="/shop-mark.png"
                  alt="Upgrade Hub Official"
                  className="receipt-logo-img"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentNode.querySelector('.receipt-logo-fallback');
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span className="receipt-logo-fallback" style={{ display: 'none', color: '#ffffff', fontWeight: '900', fontSize: '18px' }}>UH</span>
              </div>
              <div className="receipt-company-info">
                <h2>UPGRADE HUB (PVT) LTD</h2>
                <p className="receipt-tagline">Mobile Spares, Accessories & 3-Wheeler Modification Center</p>
                <p className="receipt-tax-meta">
                  <span>BR No: <strong>PV-00284912</strong></span>
                  <span className="receipt-meta-bullet">•</span>
                  <span>VAT/SVAT Reg: <strong>LK-10294821</strong></span>
                </p>
                <p className="receipt-address">No. 142/B, Galle Road, Colombo 04, Western Province, Sri Lanka</p>
                <p className="receipt-contact">
                  <span>Hotline: <strong>+94 77 452 9811</strong> / <strong>+94 11 258 9900</strong></span>
                  <span className="receipt-meta-bullet">•</span>
                  <span>Email: <strong>sales@upgradehub.lk</strong></span>
                </p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="receipt-doc-banner">
              <div className="receipt-doc-title">
                <span>TAX INVOICE & WARRANTY CERTIFICATE</span>
              </div>
              <div className="receipt-status-pill">
                <Icon name="check" size={12} />
                <span>PAID IN FULL</span>
              </div>
            </div>
          </div>

          {/* Invoice Metadata Grid */}
          <div className="receipt-meta-grid">
            <div className="receipt-meta-col">
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Invoice Number</span>
                <strong className="receipt-meta-val receipt-inv-num">{displayId}</strong>
              </div>
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Date & Time</span>
                <strong className="receipt-meta-val">{date}</strong>
              </div>
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Counter Terminal</span>
                <strong className="receipt-meta-val">Counter #01 - POS Hub</strong>
              </div>
            </div>

            <div className="receipt-meta-col">
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Customer Name</span>
                <strong className="receipt-meta-val">{customerName}</strong>
              </div>
              {saleData.customerPhone && (
                <div className="receipt-meta-item">
                  <span className="receipt-meta-label">Customer Phone</span>
                  <strong className="receipt-meta-val">{saleData.customerPhone}</strong>
                </div>
              )}
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Billed By</span>
                <strong className="receipt-meta-val">{cashierName}</strong>
              </div>
              <div className="receipt-meta-item">
                <span className="receipt-meta-label">Payment Mode</span>
                <strong className="payment-badge-styled">
                  <Icon name={paymentMethod === 'Cash' ? 'dollar' : paymentMethod === 'Card' ? 'creditCard' : 'check'} size={12} />
                  <span>{paymentMethod}</span>
                </strong>
              </div>
            </div>
          </div>

          {/* Itemized Table with Warranty Schedule */}
          <div className="receipt-table-wrapper">
            <table className="receipt-table">
              <thead>
                <tr>
                  <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                  <th style={{ textAlign: 'left' }}>Item Description</th>
                  <th style={{ textAlign: 'left' }}>Warranty Period</th>
                  <th style={{ textAlign: 'center', width: '45px' }}>Qty</th>
                  <th style={{ textAlign: 'right', width: '95px' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', width: '105px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemWarranty = getItemWarranty(item);
                  const unitPrice = Number(item.sellingPrice ?? item.price ?? 0);
                  const qty = Number(item.quantity ?? 1);
                  const amount = unitPrice * qty;
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td className="item-cell">
                        <strong className="item-cell-name">{item.name}</strong>
                        {item.category && <span className="item-cell-cat">{item.category}</span>}
                      </td>
                      <td className="warranty-cell">
                        <span className="warranty-badge">
                          <Icon name="sparkles" size={11} />
                          <span>{itemWarranty}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{qty}</td>
                      <td style={{ textAlign: 'right' }}>{money(unitPrice)}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800' }}>{money(amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Breakdown */}
          <div className="receipt-calculation-section">
            <div className="receipt-calc-left">
              <div className="payment-summary-box">
                <div className="payment-summary-title">Payment Settlement</div>
                <div className="payment-summary-row">
                  <span>Method:</span>
                  <strong>{paymentMethod}</strong>
                </div>
                {paymentMethod === 'Cash' && cashTendered > 0 && (
                  <>
                    <div className="payment-summary-row">
                      <span>Cash Received:</span>
                      <strong>{money(cashTendered)}</strong>
                    </div>
                    <div className="payment-summary-row balance-row">
                      <span>Change / Balance:</span>
                      <strong style={{ color: '#10b981' }}>{money(changeDue)}</strong>
                    </div>
                  </>
                )}
                <div className="payment-summary-row status-verified">
                  <span>Settlement Status:</span>
                  <strong style={{ color: '#10b981' }}>Verified & Cleared</strong>
                </div>
              </div>
            </div>

            <div className="receipt-calc-right">
              <div className="receipt-total-row">
                <span>Gross Subtotal:</span>
                <strong>{money(subtotal)}</strong>
              </div>

              {discount > 0 && (
                <div className="receipt-total-row discount-row">
                  <span>Promotional Discount:</span>
                  <strong>-{money(discount)}</strong>
                </div>
              )}

              <div className="receipt-total-row vat-row">
                <span>VAT / Sales Tax (0%):</span>
                <strong>LKR 0.00</strong>
              </div>

              <div className="receipt-net-total-box">
                <div className="net-total-label">
                  <span>NET PAYABLE AMOUNT:</span>
                  <small>Inclusive of all taxes</small>
                </div>
                <div className="net-total-figure">{money(total)}</div>
              </div>
            </div>
          </div>

          {/* Official Warranty Terms & Conditions */}
          <div className="receipt-terms-box">
            <div className="terms-header">
              <Icon name="sparkles" size={13} />
              <span>OFFICIAL WARRANTY CONDITIONS & STORE POLICIES (SRI LANKA)</span>
            </div>
            <div className="terms-columns">
              <div className="terms-col">
                <div className="term-item">
                  <strong>1. Warranty Coverage:</strong>
                  <span>Valid as specified per line item from invoice date. Covers factory manufacturing defects in circuitry and components.</span>
                </div>
                <div className="term-item">
                  <strong>2. Void Conditions:</strong>
                  <span>Physical impact/drops, broken display glass, water/liquid intrusion, burnt ICs, voltage spikes, or altered serial stickers strictly void warranty.</span>
                </div>
                <div className="term-item">
                  <strong>3. Claim Requirements:</strong>
                  <span>Original invoice and warranty stickers must be produced for all inspections and replacements.</span>
                </div>
              </div>
              <div className="terms-col">
                <div className="term-item">
                  <strong>4. Exchange Policy:</strong>
                  <span>Unused items in undamaged original packaging can be exchanged within 7 days. Strictly no cash refunds.</span>
                </div>
                <div className="term-item">
                  <strong>5. 3W Modifications & Audio:</strong>
                  <span>Tuk Tuk audio setups, wiring harnesses, and lighting installations carry a 6-month labor workmanship warranty.</span>
                </div>
                <div className="term-item">
                  <strong>6. Service Hotline:</strong>
                  <span>For technical support or warranty assistance, contact our Colombo workshop at +94 77 452 9811.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Barcode & Signatures */}
          <div className="receipt-auth-footer">
            <div className="receipt-signature-col">
              <div className="signature-space" />
              <div className="signature-line" />
              <span className="signature-caption">{customerName}</span>
              <small className="signature-sub">
                {saleData.customerPhone ? `Tel: ${saleData.customerPhone} • Goods in Good Order` : 'Customer Acceptance Signature'}
              </small>
            </div>

            <div className="receipt-barcode-col">
              <div className="barcode-mock">
                <span className="barcode-bars">||||| | |||| |||||| |||| | ||||| ||||||| ||</span>
                <span className="barcode-number">*{rawId}*</span>
                <span className="security-token">AUTH TOKEN: UH-LK-{rawId.slice(-5).toUpperCase()}-SEC</span>
              </div>
            </div>

            <div className="receipt-signature-col">
              <div className="official-stamp-circle">
                <span className="stamp-text-top">UPGRADE HUB (PVT) LTD</span>
                <span className="stamp-check">★ VERIFIED ★</span>
                <span className="stamp-text-bottom">OFFICIAL SEAL</span>
              </div>
              <div className="signature-line" />
              <span className="signature-caption">Authorized Officer & Official Seal</span>
              <small className="signature-sub">For Upgrade Hub (Pvt) Ltd</small>
            </div>
          </div>

          {/* Bottom Thank You Banner */}
          <div className="receipt-bottom-note">
            <p className="thank-you-msg">Thank You for Upgrading with Us!</p>
            <p className="thank-you-sub">Sri Lanka's Premier Center for Mobile Spares & 3-Wheeler Modifications</p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="receipt-actions no-print">
          <button className="btn-cancel" onClick={onClose}>
            Close
          </button>
          <button className="btn-confirm btn-primary" onClick={handlePrint}>
            <Icon name="printer" size={16} />
            <span>Print Official Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;


