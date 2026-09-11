import React, { useEffect, useState, useCallback } from 'react';
import { getProfile, getCommissionSummary, getMyPayments, requestPayment } from '../utils/api.js';

const SC = {
  pending:  { bg: '#FFF8E1', color: '#F57F17' },
  approved: { bg: '#E8F5E9', color: '#2E7D32' },
  rejected: { bg: '#FFEBEE', color: '#C62828' },
  paid:     { bg: '#E3F2FD', color: '#1565C0' },
  failed:   { bg: '#FCE4EC', color: '#880E4F' },
};

export default function DashboardPage() {
  const [tab, setTab]           = useState('commission');
  const [profile, setProfile]   = useState(null);
  const [payments, setPayments] = useState([]);
  const [preview, setPreview]   = useState(null);
  const [term, setTerm]         = useState('Term 1');
  const [year, setYear]         = useState(new Date().getFullYear());
  const [loading, setLoading]   = useState(true);
  const [calculating, setCalc]  = useState(false);
  const [requesting, setReq]    = useState(false);
  const [notes, setNotes]       = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prof, pmts] = await Promise.all([getProfile(), getMyPayments()]);
      setProfile(prof);
      setPayments(pmts.payments || []);
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
      setSuccess('Payment request submitted successfully.');
      setPreview(null); setNotes('');
      await load(); setTab('payments');
    } catch (err) { setError(err.response?.data?.error || 'Request failed'); }
    setReq(false);
  }

  const alreadyRequested = payments.some(
    p => p.term === term && String(p.year) === String(year) &&
    (p.payment_status === 'pending' || p.payment_status === 'approved')
  );

  if (loading) return <div style={{ textAlign:'center', padding:'64px 0', color:'#888' }}>Loading...</div>;

  return (
    <div className='max-w-4xl mx-auto px-4 py-6'>
      {error   && <div className='mb-4 p-3 rounded-lg text-sm' style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>}
      {success && <div className='mb-4 p-3 rounded-lg text-sm' style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>{success}</div>}

      <div className='flex gap-4 mb-6 border-b' style={{ borderColor: '#E0E0E0' }}>
        {[
          { key: 'commission', label: 'My Commission' },
          { key: 'payments',   label: 'My Payments' },
          { key: 'profile',    label: 'My Profile' },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); setSuccess(''); }}
            className='pb-2 px-1 text-sm font-medium border-b-2'
            style={{ borderColor: tab === t.key ? '#7B4F9B' : 'transparent', color: tab === t.key ? '#7B4F9B' : '#666', background: 'none', cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'commission' && (
        <div className='grid lg:grid-cols-2 gap-6'>
          <div className='card p-5'>
            <h3 className='font-semibold mb-4'>Calculate commission</h3>
            <form onSubmit={calculate} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-1' style={{ color: '#555' }}>Term</label>
                <select value={term} onChange={e => setTerm(e.target.value)} className='input-field'>
                  {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-1' style={{ color: '#555' }}>Year</label>
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
                <div className='p-3 rounded-lg' style={{ backgroundColor: '#F4F0F6' }}>
                  <div className='text-xs mb-1' style={{ color: '#888' }}>Revenue collected</div>
                  <div className='font-bold'>KSh {Number(preview.revenue_base).toLocaleString()}</div>
                </div>
                <div className='p-3 rounded-lg' style={{ backgroundColor: '#E8F5E9' }}>
                  <div className='text-xs mb-1' style={{ color: '#888' }}>Your commission</div>
                  <div className='font-bold' style={{ color: '#2E7D32' }}>KSh {Number(preview.commission_amount).toLocaleString()}</div>
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
                          <td className='text-sm font-medium' style={{ color: '#2E7D32' }}>KSh {Number(b.commission).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {preview.commission_amount > 0 && !alreadyRequested && (
                <>
                  <div className='mb-3'>
                    <label className='block text-sm font-medium mb-1' style={{ color: '#555' }}>Notes (optional)</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      className='input-field' rows={2} placeholder='Any notes...' style={{ resize: 'vertical' }} />
                  </div>
                  <button onClick={submitRequest} disabled={requesting} className='btn-primary w-full'>
                    {requesting ? 'Submitting...' : 'Request payment — KSh ' + Number(preview.commission_amount).toLocaleString()}
                  </button>
                </>
              )}
              {alreadyRequested && (
                <div className='p-3 rounded-lg text-sm text-center' style={{ backgroundColor: '#E8F5E9', color: '#2E7D32' }}>
                  Request already submitted for {term} {year}
                </div>
              )}
              {preview.commission_amount <= 0 && (
                <div className='p-3 rounded-lg text-sm text-center' style={{ backgroundColor: '#F4F0F6', color: '#888' }}>
                  No commission earned for {term} {year}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                      <td className='font-medium' style={{ color: '#2E7D32' }}>KSh {Number(p.commission_amount).toLocaleString()}</td>
                      <td><span className='badge' style={{ backgroundColor: sc.bg, color: sc.color }}>{p.payment_status}</span></td>
                      <td className='text-xs' style={{ color: '#888' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                      <td className='text-xs' style={{ color: '#888' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '-'}</td>
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

      {tab === 'profile' && profile && (
        <div className='card p-6' style={{ maxWidth: '400px' }}>
          <div className='flex items-center gap-4 mb-6'>
            <div className='w-14 h-14 rounded-full flex items-center justify-center text-white font-bold'
              style={{ backgroundColor: '#7B4F9B', fontSize: '24px' }}>
              {(profile.full_name || 'R').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className='font-bold text-lg'>{profile.full_name}</div>
              <div className='text-xs' style={{ color: '#888' }}>{profile.rep_id}</div>
            </div>
          </div>
          <div className='space-y-3'>
            {[
              { label: 'Phone',      value: profile.phone || '-' },
              { label: 'Email',      value: profile.email || '-' },
              { label: 'Commission', value: profile.commission_type === 'flat' ? 'KSh ' + Number(profile.commission_value).toLocaleString() + ' per subscription' : profile.commission_value + '% of revenue' },
              { label: 'Schools',    value: (profile.school_count || 0) + ' assigned' },
            ].map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F0F0F0' }}>
                <span className='text-sm font-medium' style={{ color: '#888' }}>{item.label}</span>
                <span className='text-sm font-medium'>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
