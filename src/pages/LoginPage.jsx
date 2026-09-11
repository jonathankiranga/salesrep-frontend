import React, { useState } from 'react';
import { requestOtp, verifyOtp } from '../utils/api.js';

export default function LoginPage({ onLogin }) {
  const [step, setStep]       = useState('request');
  const [id, setId]           = useState('');
  const [sid, setSid]         = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function send(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const isEmail = id.includes('@');
      const d = await requestOtp(isEmail ? null : id, isEmail ? id : null);
      setSid(d.session_id); setStep('verify');
    } catch (err) { setError(err.response?.data?.error || 'Failed to send OTP'); }
    setLoading(false);
  }

  async function verify(e) {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const d = await verifyOtp(sid, code);
      sessionStorage.setItem('rep_token', d.session_id);
      sessionStorage.setItem('rep_name',  d.full_name || '');
      onLogin(d);
    } catch (err) { setError(err.response?.data?.error || 'Invalid code'); }
    setLoading(false);
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4' style={{ backgroundColor: '#F7F4F9' }}>
      <div className='card p-8 w-full max-w-sm'>
        <div className='flex items-center gap-3 mb-6'>
          <div className='w-10 h-10 rounded-xl flex items-center justify-center' style={{ backgroundColor: '#7B4F9B' }}>
            <span className='text-white font-bold text-lg'>S</span>
          </div>
          <div>
            <div className='font-bold text-lg'>Sales Rep Portal</div>
            <div className='text-xs' style={{ color: '#888' }}>Commission management</div>
          </div>
        </div>

        {error && (
          <div className='mb-4 p-3 rounded-lg text-sm' style={{ backgroundColor: '#FFEBEE', color: '#C62828' }}>{error}</div>
        )}

        {step === 'request' ? (
          <form onSubmit={send} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-1' style={{ color: '#555' }}>Phone or Email</label>
              <input required value={id} onChange={e => setId(e.target.value)}
                className='input-field' placeholder='2547... or name@email.com' />
            </div>
            <button type='submit' disabled={loading} className='btn-primary w-full'>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className='space-y-4'>
            <p className='text-sm mb-2' style={{ color: '#555' }}>Code sent to <strong>{id}</strong></p>
            <input required value={code} onChange={e => setCode(e.target.value)}
              className='input-field text-center text-2xl tracking-widest' maxLength={4} placeholder='----' />
            <button type='submit' disabled={loading} className='btn-primary w-full'>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button type='button' onClick={() => { setStep('request'); setCode(''); setError(''); }}
              className='btn-secondary w-full'>Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
