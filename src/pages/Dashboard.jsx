import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { dashboardApi, transactionApi } from '../api'
import BottomNav from '../components/BottomNav'
import NotifPanel from '../components/NotifPanel'
import { useNotifications } from '../hooks/useNotifications'
import { logoBase64 } from '../assets/logo'

const fmt = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showNotif, setShowNotif] = useState(false)
  const { unreadCount } = useNotifications()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // Ketiga request jalan paralel — gagal satu tidak blokir yang lain
      const [summaryRes, txRes, chartRes] = await Promise.allSettled([
        dashboardApi.getSummary(),
        transactionApi.getAll(),
        dashboardApi.getChartData(),
      ])

      // Kalau summary gagal, set error — ini data utama yang tidak boleh kosong
      if (summaryRes.status === 'rejected') {
        setError(summaryRes.reason?.message || 'Gagal memuat data dashboard')
        return
      }

      const summary = summaryRes.value
      const income  = parseFloat(summary.income)  || 0
      const expense = parseFloat(summary.expense) || 0
      const balance = parseFloat(summary.balance) || 0

      // Transaksi — kosong array kalau gagal (tidak critical)
      const allTxs = txRes.status === 'fulfilled'
        ? (txRes.value.transactions || [])
        : []

      // Chart — null kalau gagal, UI akan tampil empty state bukan data palsu
      let chart = null
      if (chartRes.status === 'fulfilled') {
        const parsed = (chartRes.value.chartData || []).map(d => ({ ...d, amount: Number(d.amount) }))
        if (parsed.length) chart = parsed
      }

      setData({
        balance, income, expense,
        chart,
        recentTransactions: allTxs.slice(0, 4),
        chartError: chartRes.status === 'rejected',
      })
    } catch (err) {
      setError(err.message || 'Gagal memuat data dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const recentTx = data?.recentTransactions || []

  if (!loading && error) return (
    <div className="app-shell">
      <div className="page" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', padding:'0 var(--page-padding)', textAlign:'center' }}>
        <div style={{ fontSize:56, marginBottom:16 }}>⚠️</div>
        <div style={{ fontWeight:900, fontSize:18, fontFamily:'var(--font-display)', marginBottom:8 }}>Gagal Memuat Dashboard</div>
        <div style={{ color:'var(--text-muted)', fontSize:14, marginBottom:24, lineHeight:1.6 }}>{error}</div>
        <button className="btn btn-primary" style={{ padding:'12px 32px' }} onClick={load}>Coba Lagi</button>
      </div>
      <BottomNav/>
    </div>
  )

  return (
    <div className="app-shell">
      <div className="page">

        {/* ── HERO HEADER ── */}
        <div style={{
          background: 'linear-gradient(140deg, #7C3AED 0%, #A855F7 55%, #EC4899 100%)',
          padding: 'clamp(40px, 8vw, 56px) var(--page-padding) 28px',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <span style={{ position:'absolute', top:-40, right:-40, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }}/>
          <span style={{ position:'absolute', bottom:-30, left:10, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>

          {/* Top bar */}
          <div className="flex justify-between items-center" style={{ marginBottom: 24, position: 'relative' }}>
            <div className="flex items-center gap-12">
              <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,0.95)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.15)' }}>
                  <img src={logoBase64} alt="FinSmart" style={{ width:40, height:40, objectFit:'contain' }}/>
                </div>
              <div>
                <div style={{ color:'white', fontWeight:800, fontSize:'clamp(15px,4vw,18px)', fontFamily:'var(--font-display)' }}>
                  Halo, {user?.name || 'Pengguna'}! 👋
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowNotif(true)}
              style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.2)', border:'none', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, position:'relative' }}
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position:'absolute', top:6, right:6,
                  width:8, height:8, borderRadius:'50%',
                  background:'#F43F5E',
                  border:'2px solid #7C3AED',
                  display:'block',
                }}/>
              )}
            </button>
          </div>

          {/* Balance */}
          <div className="text-center" style={{ position:'relative' }}>
            <div style={{ color:'rgba(255,255,255,0.75)', fontSize:13, marginBottom:6, fontWeight:500 }}>Total Saldo</div>
            {loading
              ? <div className="skeleton" style={{ height:48, width:'60%', margin:'0 auto 10px', background:'rgba(255,255,255,0.2)', borderRadius:12 }}/>
              : <div style={{ color:'white', fontSize:'clamp(28px, 8vw, 40px)', fontWeight:900, letterSpacing:'-0.02em', marginBottom:10, fontFamily:'var(--font-display)' }}>
                  Rp {(data?.balance || 0).toLocaleString('id-ID')}
                </div>
            }
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.15)', borderRadius:50, padding:'5px 14px' }}>
              <span style={{ color:'#86EFAC', fontSize:13, fontWeight:700 }}>▲ 12,4% bulan ini</span>
            </span>
          </div>

          {/* Income / Expense */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:22 }}>
            {[
              { label:'Pemasukan', val: data?.income ?? 0, color:'#86EFAC', arrow:'↑' },
              { label:'Pengeluaran', val: data?.expense ?? 0, color:'#FCA5A5', arrow:'↓' },
            ].map(item => (
              <div key={item.label} style={{ background:'rgba(255,255,255,0.15)', borderRadius:var_or(14), padding:'14px clamp(12px,3vw,18px)', backdropFilter:'blur(8px)' }}>
                <div style={{ color:'rgba(255,255,255,0.7)', fontSize:'clamp(11px,2.5vw,12px)', marginBottom:4 }}>{item.label}</div>
                <div style={{ color:item.color, fontWeight:800, fontSize:'clamp(14px,4vw,18px)' }}>
                  {item.arrow} {fmt(item.val)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHART + QUICK ACTIONS: desktop 2-col ── */}
        <div style={{ padding:'20px var(--page-padding) 0', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
          <div className="card animate-fadeup-1">
            <div className="flex justify-between items-center" style={{ marginBottom:14 }}>
              <div>
                <div className="section-title">Pengeluaran 7 Hari</div>
                <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:2 }}>Minggu ini</div>
              </div>
              <button onClick={() => navigate('/transactions')} style={{ background:'none', border:'none', color:'var(--primary)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Lihat semua →
              </button>
            </div>
            {loading
              ? <div className="skeleton" style={{ height:90 }}/>
              : data?.chartError
                ? <div style={{ height:90, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13, gap:6 }}>
                    <span>⚠️</span> Gagal memuat grafik
                  </div>
                : !data?.chart
                  ? <div style={{ height:90, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>
                      Belum ada transaksi minggu ini
                    </div>
                  : <ResponsiveContainer width="100%" height={90}>
                      <BarChart data={data.chart} barSize={12} margin={{top:4, bottom:0}}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A855F7"/>
                            <stop offset="100%" stopColor="#7C3AED"/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false}/>
                        <Tooltip
                          cursor={{ fill:'rgba(124,58,237,0.05)', rx:6 }}
                          contentStyle={{ borderRadius:10, border:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', fontSize:12 }}
                          formatter={v => [`Rp ${v.toLocaleString('id-ID')}`, 'Pengeluaran']}
                        />
                        <Bar dataKey="amount" fill="url(#barGrad)" radius={[6,6,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
            }
          </div>
        </div>

        {/* ── BOTTOM SECTION: desktop 2-col grid ── */}
        <div className="dashboard-bottom-grid" style={{ padding:'16px var(--page-padding) 20px' }}>

          {/* Quick Actions */}
          <div>
            <div className="section-title" style={{ marginBottom:12 }}>Aksi Cepat</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
              {[
                { label:'Catat', emoji:'✏️', path:'/transactions' },
                { label:'Budget', emoji:'🎯', path:'/budget' },
                { label:'Simulasi', emoji:'📊', path:'/simulation' },
                { label:'Edukasi', emoji:'📚', path:'/education' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  style={{
                    background:'white', border:'1px solid var(--border-light)', borderRadius:'var(--radius)',
                    padding:'14px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                    cursor:'pointer', boxShadow:'var(--shadow-sm)', transition:'all 0.15s', fontSize:'clamp(18px,5vw,24px)'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform='scale(0.94)'}
                  onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                  onTouchStart={e => e.currentTarget.style.transform='scale(0.94)'}
                  onTouchEnd={e => e.currentTarget.style.transform='scale(1)'}
                >
                  {a.emoji}
                  <span style={{ fontSize:'clamp(9px,2.5vw,11px)', fontWeight:700, color:'var(--text-muted)' }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom:12 }}>
              <span className="section-title">Transaksi Terkini</span>
              <button onClick={() => navigate('/transactions')} style={{ background:'none', border:'none', color:'var(--primary)', fontSize:13, fontWeight:700, cursor:'pointer' }}>
                Lihat semua →
              </button>
            </div>
            {loading
              ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height:60, marginBottom:8, borderRadius:12 }}/>)
              : recentTx.map(tx => <TxRow key={tx.id} tx={tx}/>)
            }
          </div>

        </div>

      </div>
      {showNotif && <NotifPanel onClose={() => setShowNotif(false)} />}
      <BottomNav/>
    </div>
  )
}

/* helper — CSS var fallback for JSX inline styles */
function var_or(v) { return v }

function TxRow({ tx }) {
  const isOut = tx.type === 'keluar'
  return (
    <div className="flex items-center gap-12" style={{ padding:'11px 0', borderBottom:'1px solid var(--border-light)' }}>
      <div style={{ width:42, height:42, borderRadius:12, background: isOut ? '#FEF2F2' : '#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
        {tx.icon || (isOut ? '📤' : '📥')}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.title}</div>
        <div style={{ color:'var(--text-muted)', fontSize:12, marginTop:1 }}>{tx.category}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:14, color: isOut ? 'var(--danger)' : 'var(--success)' }}>
          {isOut ? '-' : '+'}Rp {Math.abs(Number(tx.amount)).toLocaleString('id-ID')}
        </div>
        <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:1 }}>
          {new Date(tx.date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
        </div>
      </div>
    </div>
  )
}