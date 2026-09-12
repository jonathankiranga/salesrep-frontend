import React, { useEffect, useState, useCallback } from 'react';
import { getProfile, getCommissionSummary, getMyPayments, requestPayment, getWallet, requestWithdrawal } from '../utils/api.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SC = {
  pending:    { bg: '#FFF8E1', color: '#F57F17' },
  approved:   { bg: '#E8F5E9', color: '#2E7D32' },
  rejected:   { bg: '#FFEBEE', color: '#C62828' },
  paid:       { bg: '#E3F2FD', color: '#1565C0' },
  failed:     { bg: '#FCE4EC', color: '#880E4F' },
  processing: { bg: '#E8EAF6', color: '#283593' },
  completed:  { bg: '#E3F2FD', color: '#1565C0' },
};

export default function DashboardPage() {
  const [tab, setTab]             = useState('wallet');
  const [profile, setProfile]     = useState(null);
  const [payments, setPayments]   = useState([]);
  const [wallet, setWallet]       = useState(null);
  const [preview, setPreview]     = useState(null);
  const [term, setTerm]           = useState('Term 1');
  const [year, setYear]           = useState(new Date().getFullYear());
  const [loading, setLoading]     = useState(true);
  const [calculating, setCalc]    = useState(false);
  const [requesting, setReq]      = useState(false);
  const [withdrawing, setWith]    = useState(false);
  const [notes, setNotes]         = useState('');
  const [withdrawAmt, setWAmt]    = useState('');
  const [withdrawPhone, setWPhone]= useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prof, pmts, wal] = await Promise.all([getProfile(), getMyPayments(), getWallet()]);
      setProfile(prof);
      setPayments(pmts.payments || []);
      setWallet(wal);
      setWithdrawPhone(prof.phone || '');
    } catch (err) { setError(err.response?.data?.error || 'Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function calculate(e) {
    e.preventDefault(); setCalc(true); setError(''); setPreview(null);
    try {
      const d = await getCommissionSummary(term, year);
      setPreview(d);
    } catch (err) { setError(err.response?.data?.error || 'Calculation failed'); }
    setCalc(false);
  }

  async function submitRequest() {
    setReq(true); setError(''); setSuccess('');
    try {
      await requestPayment({ term, year: parseInt(year), request_notes: notes });
      setSuccess('Payment request submitted. Once approved and paid, it will credit your wallet.');
      setPreview(null); setNotes('');
      await load(); setTab('payments');
    } catch (err) { setError(err.response?.data?.error || 'Request failed'); }
    setReq(false);
  }

  async function submitWithdrawal(e) {
    e.preventDefault();
    const amt = parseFloat(withdrawAmt);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (amt > (wallet?.balance || 0)) { setError(`Amount exceeds your balance of KSh ${(wallet?.balance || 0).toLocaleString()}`); return; }
    setWith(true); setError(''); setSuccess('');
    try {
      const res = await requestWithdrawal({ amount: amt, mpesa_phone: withdrawPhone });
      setSuccess(res.message || 'Withdrawal initiated. Check your phone for M-Pesa prompt.');
      setWAmt('');
      await load();
    } catch (err) { setError(err.response?.data?.error || 'Withdrawal failed'); }
    setWith(false);
  }

  function downloadStatement() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const purple = [123, 79, 155];
    const grey   = [100, 100, 100];
    const now    = new Date();

    // Header bar
    doc.setFillColor(...purple);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Commission Wallet Statement', 14, 14);

    // Rep info
    doc.setTextColor(...grey);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rep: ${profile?.full_name || ''}  |  Phone: ${profile?.phone || ''}  |  Generated: ${now.toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' })}`, 14, 30);

    // Summary boxes
    const boxes = [
      { label: 'Available Balance', value: `KSh ${Number(wallet.balance).toLocaleString()}`, x: 14 },
      { label: 'Total Earned',      value: `KSh ${Number(wallet.total_credited).toLocaleString()}`, x: 80 },
      { label: 'Total Withdrawn',   value: `KSh ${Number(wallet.total_withdrawn).toLocaleString()}`, x: 146 },
    ];
    boxes.forEach(b => {
      doc.setFillColor(244, 240, 246);
      doc.roundedRect(b.x, 36, 58, 18, 2, 2, 'F');
      doc.setTextColor(...grey);
      doc.setFontSize(7);
      doc.text(b.label, b.x + 4, 42);
      doc.setTextColor(...purple);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(b.value, b.x + 4, 50);
      doc.setFont('helvetica', 'normal');
    });

    // Transaction history table
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Transaction History', 14, 64);

    const txnRows = (wallet.transactions || []).map(t => [
      new Date(t.created_at).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }),
      t.description,
      t.txn_type.charAt(0).toUpperCase() + t.txn_type.slice(1),
      (t.txn_type === 'credit' ? '+' : '-') + 'KSh ' + Number(t.amount).toLocaleString(),
      'KSh ' + Number(t.balance_after).toLocaleString(),
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['Date', 'Description', 'Type', 'Amount', 'Balance']],
      body: txnRows.length > 0 ? txnRows : [['', 'No transactions yet', '', '', '']],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 72 },
        2: { cellWidth: 18 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28 },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw || '');
          data.cell.styles.textColor = val.startsWith('+') ? [46, 125, 50] : [198, 40, 40];
        }
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
    });

    // Withdrawal history table
    const afterTxn = doc.lastAutoTable.finalY + 10;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Withdrawal History', 14, afterTxn);

    const wdRows = (wallet.withdrawals || []).map(w => [
      new Date(w.requested_at).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }),
      'KSh ' + Number(w.amount).toLocaleString(),
      w.mpesa_phone,
      w.mpesa_reference || '-',
      w.status.charAt(0).toUpperCase() + w.status.slice(1),
      w.completed_at ? new Date(w.completed_at).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) : '-',
    ]);

    autoTable(doc, {
      startY: afterTxn + 4,
      head: [['Date', 'Amount', 'M-Pesa Phone', 'Reference', 'Status', 'Completed']],
      body: wdRows.length > 0 ? wdRows : [['', 'No withdrawals yet', '', '', '', '']],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: purple, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 252] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(`Page ${i} of ${pageCount}  •  SmarterNow Apps`, 14, 292);
    }

    const filename = `wallet-statement-${(profile?.full_name || 'rep').replace(/\s+/g, '-').toLowerCase()}-${now.toISOString().slice(0,10)}.pdf`;
    doc.save(filename);
  }

  const alreadyRequested = payments.some(
    p => p.term === term && String(p.year) === String(year) &&
    (p.payment_status === 'pending' || p.payment_status === 'approved')
  );

  if (loading) return <div style={{ textAlign:'center', padding:'64px 0', color:'#888' }}>Loading...</div>;

  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      {error   && <div className='mb-4 p-3 rounded-lg text-sm' style={{ backgroundColor:'#FFEBEE', color:'#C62828' }}>{error}</div>}
      {success && <div className='mb-4 p-3 rounded-lg text-sm' style={{ backgroundColor:'#E8F5E9', color:'#2E7D32' }}>{success}</div>}

      <div className='flex gap-4 mb-6 border-b' style={{ borderColor:'#E0E0E0' }}>
        {[
          { key:'wallet',     label:'My Wallet' },
          { key:'commission', label:'Commission' },
          { key:'payments',   label:'Payout History' },
          { key:'profile',    label:'My Profile' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
            className='pb-2 px-1 text-sm font-medium border-b-2'
            style={{ borderColor: tab===t.key ? '#7B4F9B' : 'transparent', color: tab===t.key ? '#7B4F9B' : '#666', background:'none', cursor:'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WALLET TAB ── */}
      {tab === 'wallet' && wallet && (
        <div>
          {/* Balance cards */}
          <div className='grid grid-cols-3 gap-4 mb-6'>
            <div className='card p-4 text-center'>
              <div className='text-xs mb-1' style={{ color:'#888' }}>Available Balance</div>
              <div className='text-2xl font-bold' style={{ color:'#7B4F9B' }}>KSh {Number(wallet.balance).toLocaleString()}</div>
            </div>
            <div className='card p-4 text-center'>
              <div className='text-xs mb-1' style={{ color:'#888' }}>Total Earned</div>
              <div className='text-xl font-bold' style={{ color:'#2E7D32' }}>KSh {Number(wallet.total_credited).toLocaleString()}</div>
            </div>
            <div className='card p-4 text-center'>
              <div className='text-xs mb-1' style={{ color:'#888' }}>Total Withdrawn</div>
              <div className='text-xl font-bold' style={{ color:'#1565C0' }}>KSh {Number(wallet.total_withdrawn).toLocaleString()}</div>
            </div>
          </div>

          {/* Withdrawal form */}
          <div className='grid lg:grid-cols-2 gap-6 mb-6'>
            <div className='card p-5'>
              <h3 className='font-semibold mb-4'>Withdraw via M-Pesa</h3>
              {Number(wallet.balance) <= 0 ? (
                <div className='p-3 rounded-lg text-sm text-center' style={{ backgroundColor:'#F4F0F6', color:'#888' }}>
                  No balance available to withdraw
                </div>
              ) : (
                <form onSubmit={submitWithdrawal} className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1' style={{ color:'#555' }}>Amount (KSh) *</label>
                    <input
                      type='number' min='1' max={wallet.balance} step='1'
                      value={withdrawAmt} onChange={e => setWAmt(e.target.value)}
                      className='input-field' placeholder={`Max KSh ${Number(wallet.balance).toLocaleString()}`}
                      required
                    />
                    <button type='button' className='text-xs mt-1' style={{ color:'#7B4F9B', background:'none', border:'none', cursor:'pointer' }}
                      onClick={() => setWAmt(String(wallet.balance))}>
                      Withdraw all
                    </button>
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1' style={{ color:'#555' }}>M-Pesa phone *</label>
                    <input
                      type='tel' value={withdrawPhone} onChange={e => setWPhone(e.target.value)}
                      className='input-field' placeholder='e.g. 0712345678' required
                    />
                  </div>
                  <button type='submit' disabled={withdrawing} className='btn-primary w-full'>
                    {withdrawing ? 'Sending M-Pesa prompt...' : `Withdraw KSh ${parseFloat(withdrawAmt || 0).toLocaleString()}`}
                  </button>
                </form>
              )}
            </div>

            {/* Recent withdrawals */}
            <div className='card p-5'>
              <h3 className='font-semibold mb-3'>Recent withdrawals</h3>
              {wallet.withdrawals?.length === 0 ? (
                <div className='text-sm text-center' style={{ color:'#999', padding:'24px 0' }}>No withdrawals yet</div>
              ) : (
                <div className='space-y-2'>
                  {wallet.withdrawals?.slice(0, 5).map(w => {
                    const s = SC[w.status] || SC.pending;
                    return (
                      <div key={w.withdrawal_id} className='flex items-center justify-between p-2 rounded-lg' style={{ backgroundColor:'#FAFAFA' }}>
                        <div>
                          <div className='font-medium text-sm'>KSh {Number(w.amount).toLocaleString()}</div>
                          <div className='text-xs' style={{ color:'#888' }}>{new Date(w.requested_at).toLocaleDateString()}</div>
                        </div>
                        <span className='badge text-xs' style={{ backgroundColor:s.bg, color:s.color }}>{w.status}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Transaction ledger */}
          <div className='card overflow-hidden'>
            <div className='p-4 font-semibold border-b flex items-center justify-between' style={{ borderColor:'#F0F0F0' }}>
              <span>Transaction history</span>
              <button onClick={downloadStatement} className='btn-secondary' style={{ padding:'6px 14px', fontSize:'12px' }}>
                ⬇ Download Statement PDF
              </button>
            </div>
            <div className='table-wrap'>
              <table className='data-table'>
                <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Balance</th></tr></thead>
                <tbody>
                  {wallet.transactions?.map(t => (
                    <tr key={t.txn_id}>
                      <td className='text-xs' style={{ color:'#888' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td className='text-sm'>{t.description}</td>
                      <td>
                        <span className='badge text-xs' style={{ backgroundColor: t.txn_type==='credit' ? '#E8F5E9' : '#FFF8E1', color: t.txn_type==='credit' ? '#2E7D32' : '#F57F17' }}>
                          {t.txn_type}
                        </span>
                      </td>
                      <td className='font-medium' style={{ color: t.txn_type==='credit' ? '#2E7D32' : '#C62828' }}>
                        {t.txn_type==='credit' ? '+' : '-'}KSh {Number(t.amount).toLocaleString()}
                      </td>
                      <td className='text-sm'>KSh {Number(t.balance_after).toLocaleString()}</td>
                    </tr>
                  ))}
                  {wallet.transactions?.length === 0 && (
                    <tr><td colSpan='5' style={{ textAlign:'center', padding:'32px', color:'#999' }}>No transactions yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── COMMISSION TAB ── */}
      {tab === 'commission' && (
        <div className='grid lg:grid-cols-2 gap-6'>
          <div className='card p-5'>
            <h3 className='font-semibold mb-4'>Calculate commission</h3>
            <form onSubmit={calculate} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1' style={{ color:'#555' }}>Term</label>
                <select value={term} onChange={e => setTerm(e.target.value)} className='input-field'>
                  {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-1' style={{ color:'#555' }}>Year</label>
                <select value={year} onChange={e => setYear(e.target.value)} className='input-field'>
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button type='submit' disabled={calculating} className='btn-primary w-full'>
                {calculating ? 'Calculating...' : 'Calculate'}
              </button>
            </form>
          </div>

          {preview && (
            <div className='card p-5'>
              <h3 className='font-semibold mb-3'>{preview.term} {preview.year}</h3>
              <div className='grid grid-cols-2 gap-3 mb-4'>
                <div className='p-3 rounded-lg' style={{ backgroundColor:'#F4F0F6' }}>
                  <div className='text-xs mb-1' style={{ color:'#888' }}>Revenue collected</div>
                  <div className='font-bold'>KSh {Number(preview.revenue_base).toLocaleString()}</div>
                </div>
                <div className='p-3 rounded-lg' style={{ backgroundColor:'#E8F5E9' }}>
                  <div className='text-xs mb-1' style={{ color:'#888' }}>Your commission</div>
                  <div className='font-bold' style={{ color:'#2E7D32' }}>KSh {Number(preview.commission_amount).toLocaleString()}</div>
                </div>
              </div>
              {preview.breakdown?.length > 0 && (
                <div className='mb-4 table-wrap'>
                  <table className='data-table'>
                    <thead><tr><th>School</th><th>Revenue</th><th>Commission</th></tr></thead>
                    <tbody>
                      {preview.breakdown.map(b => (
                        <tr key={b.school_id}>
                          <td className='text-sm'>{b.school_name}</td>
                          <td className='text-sm'>KSh {Number(b.revenue).toLocaleString()}</td>
                          <td className='text-sm font-medium' style={{ color:'#2E7D32' }}>KSh {Number(b.commission).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.commission_amount > 0 && !alreadyRequested && (
                <>
                  <div className='mb-3'>
                    <label className='block text-sm font-medium mb-1' style={{ color:'#555' }}>Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} className='input-field' rows={2} placeholder='Any notes...' style={{ resize:'vertical' }} />
                  </div>
                  <button onClick={submitRequest} disabled={requesting} className='btn-primary w-full'>
                    {requesting ? 'Submitting...' : 'Request payment — KSh ' + Number(preview.commission_amount).toLocaleString()}
                  </button>
                  <p className='text-xs mt-2 text-center' style={{ color:'#888' }}>Once approved and marked paid by admin, the amount will be credited to your wallet.</p>
                </>
              )}
              {alreadyRequested && (
                <div className='p-3 rounded-lg text-sm text-center' style={{ backgroundColor:'#E8F5E9', color:'#2E7D32' }}>
                  Request already submitted for {term} {year}
                </div>
              )}
              {preview.commission_amount <= 0 && (
                <div className='p-3 rounded-lg text-sm text-center' style={{ backgroundColor:'#F4F0F6', color:'#888' }}>
                  No commission earned for {term} {year}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS TAB ── */}
      {tab === 'payments' && (
        <div className='card overflow-hidden'>
          <div className='table-wrap'>
            <table className='data-table'>
              <thead>
                <tr><th>Term</th><th>Revenue base</th><th>Commission</th><th>Status</th><th>Requested</th><th>Paid</th></tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const sc = SC[p.payment_status] || SC.pending;
                  return (
                    <tr key={p.payment_id}>
                      <td className='font-medium'>{p.term} {p.year}</td>
                      <td>KSh {Number(p.revenue_base).toLocaleString()}</td>
                      <td className='font-medium' style={{ color:'#2E7D32' }}>KSh {Number(p.commission_amount).toLocaleString()}</td>
                      <td><span className='badge' style={{ backgroundColor:sc.bg, color:sc.color }}>{p.payment_status}</span></td>
                      <td className='text-xs' style={{ color:'#888' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                      <td className='text-xs' style={{ color:'#888' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
                    </tr>
                  );
                })}
                {payments.length === 0 && (
                  <tr><td colSpan='6' style={{ textAlign:'center', padding:'32px', color:'#999' }}>No payment requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && profile && (
        <div className='card p-6' style={{ maxWidth:'400px' }}>
          <div className='flex items-center gap-4 mb-6'>
            <div className='w-14 h-14 rounded-full flex items-center justify-center text-white font-bold'
              style={{ backgroundColor:'#7B4F9B', fontSize:'24px' }}>
              {(profile.full_name || 'R').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className='font-bold text-lg'>{profile.full_name}</div>
              <div className='text-xs' style={{ color:'#888' }}>{profile.rep_id}</div>
            </div>
          </div>
          <div className='space-y-3'>
            {[
              { label:'Phone',      value: profile.phone || '-' },
              { label:'Email',      value: profile.email || '-' },
              { label:'Commission', value: profile.commission_type === 'flat' ? 'KSh ' + Number(profile.commission_value).toLocaleString() + ' per subscription' : profile.commission_value + '% of revenue' },
              { label:'Schools',    value: (profile.school_count || 0) + ' assigned' },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F0F0F0' }}>
                <span className='text-sm font-medium' style={{ color:'#888' }}>{item.label}</span>
                <span className='text-sm font-medium'>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
