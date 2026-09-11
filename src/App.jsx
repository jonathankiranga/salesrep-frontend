import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

export default function App() {
  const [rep, setRep] = useState(() => {
    const token = sessionStorage.getItem('rep_token');
    const name  = sessionStorage.getItem('rep_name');
    return token ? { token, full_name: name } : null;
  });

  function handleLogin(data) {
    sessionStorage.setItem('rep_token', data.session_id);
    sessionStorage.setItem('rep_name',  data.full_name || '');
    setRep(data);
  }

  function logout() {
    sessionStorage.clear();
    setRep(null);
  }

  if (!rep) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className='min-h-screen' style={{ backgroundColor: '#F7F4F9' }}>
      <header className='bg-white sticky top-0 z-50' style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
        <div className='max-w-4xl mx-auto px-4 h-14 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-8 h-8 rounded-lg flex items-center justify-center' style={{ backgroundColor: '#7B4F9B' }}>
              <span className='font-bold text-white text-sm'>S</span>
            </div>
            <span className='font-bold'>Sales Rep Portal</span>
          </div>
          <div className='flex items-center gap-3'>
            <span className='text-sm' style={{ color: '#555' }}>{rep.full_name || 'Rep'}</span>
            <button onClick={logout} className='btn-secondary' style={{ padding: '6px 14px', fontSize: '12px' }}>Logout</button>
          </div>
        </div>
      </header>
      <main>
        <Routes>
          <Route path='/' element={<DashboardPage />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </main>
    </div>
  );
}
