import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { logoBase64 } from '../assets/logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { toast('Isi email dan password dulu ya!', 'error'); return }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) { toast('Selamat datang kembali! 👋', 'success'); navigate('/dashboard') }
    else toast(result.error || 'Login gagal', 'error')
  }

  const closeForgot = () => { setShowForgot(false) }

  return (
    <div className="app-shell auth-page">
      <div className="auth-content" style={{ padding: 'clamp(24px,6vw,40px) var(--page-padding)', animation: 'fadeIn 0.4s ease' }}>

        {/* Logo header */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'clamp(20px,5vw,28px)' }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '12px 20px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.18)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <img src={logoBase64} alt="FinSmart" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} />
            <span style={{
              fontSize: 22,
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
              letterSpacing: '-0.5px',
            }}>
              Fin<span style={{ color: '#7C3AED' }}>Smart</span>
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(24px,6vw,36px)',
          marginBottom: 16,
          border: '1px solid rgba(124,58,237,0.08)',
          boxShadow: '0 8px 40px rgba(124,58,237,0.1)',
        }}>
          <div style={{ marginBottom: 22 }}>
            <h2 style={{
              fontSize: 'clamp(22px,6vw,28px)',
              fontWeight: 900,
              marginBottom: 4,
              fontFamily: 'var(--font-display)',
              color: 'var(--text)',
            }}>
              Pantau Cuanmu Di Sini 💰
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Masuk dan cek keuanganmu</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input-field"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Masukan password anda"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: 48 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 }}
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              style={{ padding: 'clamp(14px,3.5vw,17px)', fontSize: 16, marginTop: 4 }}
              disabled={loading}
            >
              {loading ? <div className="spinner" /> : 'Masuk ✨'}
            </button>

            <div style={{ textAlign: 'right', marginTop: 10 }}>
              <span
                style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                onClick={() => navigate('/forgot-password')}
              >
                Lupa Password?
              </span>
            </div>
          </form>

        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>
          Belum punya akun?{' '}
          <span style={{ color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }} onClick={() => navigate('/register')}>
            Daftar sekarang
          </span>
        </p>

      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .auth-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}