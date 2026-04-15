import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoBase64 } from '../assets/logo'
import { adminAuthApi, removeAdminToken } from '../api'

function timeAgo(iso) {
  const diff = Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000)
  if (m<1) return 'Baru saja'
  if (m<60) return `${m} menit lalu`
  const h=Math.floor(m/60)
  if (h<24) return `${h} jam lalu`
  return `${Math.floor(h/24)} hari lalu`
}
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-' }
function initials(n) { return n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase() }
const AV = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#0D9488']

function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    const w = window.innerWidth
    return w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile'
  })
  useEffect(() => {
    const fn = () => {
      const w = window.innerWidth
      setBp(w >= 1024 ? 'desktop' : w >= 640 ? 'tablet' : 'mobile')
    }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return bp
}

/* ════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const navigate     = useNavigate()
  const bp           = useBreakpoint()
  const isDesktop    = bp === 'desktop'
  const isTablet     = bp === 'tablet'
  const isMobile     = bp === 'mobile'

  const [admin,        setAdmin]        = useState(null)
  const [users,        setUsers]        = useState([])
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [sortBy,       setSortBy]       = useState('joinDate')
  const [activeTab,    setActiveTab]    = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showLogout,   setShowLogout]   = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)

  useEffect(() => {
    // Ambil profil admin dari token JWT
    adminAuthApi.getProfile()
      .then(data => {
        if (data.user?.role !== 'admin') { removeAdminToken(); navigate('/admin-login'); return }
        setAdmin(data.user)
      })
      .catch(() => { removeAdminToken(); navigate('/admin-login') })

    // Ambil daftar user dari API
    adminAuthApi.getUsers()
      .then(data => {
        if (data.users) setUsers(data.users.map(u => ({
          ...u,
          joinDate: u.created_at?.split('T')[0] || '-',
          lastActive: u.created_at || new Date().toISOString(),
          transactions: Number(u.transactions) || 0,
          budgetOk: 0, articles: 0, status: 'active',
        })))
      })
      .catch(() => setUsers([]))
  }, [])

  const admins = []
  const handleDeleteAdmin = () => {}

  const filteredUsers = users
    .filter(u => {
      const q = search.toLowerCase()
      return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
          && (filter==='all' || u.status===filter)
    })
    .sort((a,b) => {
      if (sortBy==='name')         return a.name.localeCompare(b.name)
      if (sortBy==='transactions') return b.transactions-a.transactions
      if (sortBy==='active')       return new Date(b.lastActive)-new Date(a.lastActive)
      return new Date(b.joinDate)-new Date(a.joinDate)
    })

  const totalActive = users.filter(u=>u.status==='active').length
  const totalTx     = users.reduce((s,u)=>s+u.transactions,0)
  const avgBudget   = users.length ? Math.round(users.reduce((s,u)=>s+u.budgetOk,0)/users.length) : 0

  if (!admin) return null

  const NAV = [
    { key:'users',  icon:'👥', label:'Pengguna'   },
    { key:'stats',  icon:'📊', label:'Statistik'  },
    { key:'admins', icon:'🛡️', label:'Admin'       },
  ]

  /* ── Sidebar ── */
  const sidebarW = isDesktop ? 250 : 0

  const Sidebar = () => (
    <>
      {/* Overlay for mobile drawer */}
      {!isDesktop && drawerOpen && (
        <div onClick={()=>setDrawerOpen(false)} style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:398,
        }}/>
      )}

      <aside style={{
        position:'fixed', top:0, left:0, bottom:0, width:250,
        background:'white',
        borderRight:'1px solid var(--border)',
        boxShadow: isDesktop ? '4px 0 24px rgba(124,58,237,0.07)' : '12px 0 40px rgba(0,0,0,0.2)',
        zIndex:399,
        display:'flex', flexDirection:'column',
        transform: isDesktop ? 'none' : drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Logo row */}
        <div style={{
          padding:'22px 20px 18px',
          borderBottom:'1px solid var(--border-light)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:38, height:38, borderRadius:10,
              background:'linear-gradient(135deg,#7C3AED,#9333EA)',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <img src={logoBase64} alt="" style={{ width:22, objectFit:'contain', borderRadius:4 }}/>
            </div>
            <div>
              <div style={{ fontWeight:900, fontSize:16, fontFamily:'var(--font-display)', color:'var(--text)' }}>
                Fin<span style={{ color:'#7C3AED' }}>Smart</span>
              </div>
              <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:800, letterSpacing:1 }}>ADMIN PANEL</div>
            </div>
          </div>
          {!isDesktop && (
            <button onClick={()=>setDrawerOpen(false)} style={{
              background:'var(--border-light)', border:'none', borderRadius:'50%',
              width:30, height:30, cursor:'pointer', fontSize:13,
            }}>✕</button>
          )}
        </div>

        {/* Admin chip */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border-light)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              background:'linear-gradient(135deg,#7C3AED,#EC4899)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontWeight:900, fontSize:14, fontFamily:'var(--font-display)',
            }}>{initials(admin.name)}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{admin.name}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{admin.email}</div>
            </div>
          </div>
          <div style={{
            marginTop:10, background:'var(--primary-xlight)', color:'var(--primary)',
            borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:800, display:'inline-block',
          }}>🛡️ Administrator</div>
        </div>

        {/* Nav items */}
        <nav style={{ padding:'12px', flex:1 }}>
          {NAV.map(item => (
            <button key={item.key}
              onClick={()=>{ setActiveTab(item.key); setDrawerOpen(false) }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                padding:'12px 14px', borderRadius:12, border:'none', marginBottom:3,
                background: activeTab===item.key ? 'var(--primary-xlight)' : 'transparent',
                color: activeTab===item.key ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab===item.key ? 800 : 600,
                fontSize:14, cursor:'pointer', fontFamily:'var(--font-body)',
                transition:'all 0.15s',
                borderLeft: activeTab===item.key ? '3px solid var(--primary)' : '3px solid transparent',
              }}
              onMouseEnter={e=>{ if(activeTab!==item.key){ e.currentTarget.style.background='var(--border-light)'; e.currentTarget.style.color='var(--text)' }}}
              onMouseLeave={e=>{ if(activeTab!==item.key){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-muted)' }}}
            >
              <span style={{ fontSize:19 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding:'12px', borderTop:'1px solid var(--border-light)' }}>
          <button onClick={()=>setShowLogout(true)} style={{
            width:'100%', display:'flex', alignItems:'center', gap:10,
            padding:'11px 14px', borderRadius:12, border:'none',
            background:'transparent', color:'#EF4444', fontWeight:700,
            fontSize:14, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <span style={{ fontSize:19 }}>🚪</span> Keluar
          </button>
        </div>
      </aside>
    </>
  )

  /* ── Top bar (mobile / tablet) ── */
  const MobileTopBar = () => (
    <header style={{
      position:'sticky', top:0, zIndex:200,
      background:'linear-gradient(135deg,#7C3AED,#9333EA)',
      padding:'0 16px',
      height:60,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      boxShadow:'0 4px 20px rgba(124,58,237,0.3)',
    }}>
      <button onClick={()=>setDrawerOpen(true)} style={{
        background:'rgba(255,255,255,0.15)', border:'none', borderRadius:10,
        width:38, height:38, cursor:'pointer', color:'white', fontSize:20,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>☰</button>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <img src={logoBase64} alt="" style={{ width:24, objectFit:'contain', borderRadius:4 }}/>
        <span style={{ fontWeight:900, fontSize:17, color:'white', fontFamily:'var(--font-display)' }}>
          Fin<span style={{ opacity:0.8 }}>Smart</span>
        </span>
        <span style={{
          background:'rgba(255,255,255,0.2)', color:'white',
          borderRadius:5, padding:'2px 7px', fontSize:9, fontWeight:800,
        }}>ADMIN</span>
      </div>

      <div style={{
        width:36, height:36, borderRadius:10,
        background:'rgba(255,255,255,0.2)',
        display:'flex', alignItems:'center', justifyContent:'center',
        color:'white', fontWeight:900, fontSize:13, fontFamily:'var(--font-display)',
      }}>{initials(admin.name)}</div>
    </header>
  )

  /* ── Mobile tab bar ── */
  const MobileTabBar = () => (
    <div style={{
      display:'flex', background:'white',
      borderBottom:'2px solid var(--border-light)',
      position:'sticky', top:60, zIndex:190,
      boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
    }}>
      {NAV.map(item=>(
        <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{
          flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          padding:'9px 4px 7px', border:'none', background:'transparent',
          color: activeTab===item.key ? 'var(--primary)' : 'var(--text-muted)',
          fontWeight: activeTab===item.key ? 800 : 600,
          fontSize:11, cursor:'pointer', fontFamily:'var(--font-body)',
          borderBottom: activeTab===item.key ? '2px solid var(--primary)' : '2px solid transparent',
          marginBottom:-2, transition:'all 0.15s',
        }}>
          <span style={{ fontSize:18 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )

  /* ── Desktop top bar ── */
  const DesktopTopBar = () => (
    <div style={{
      background:'white', borderBottom:'1px solid var(--border-light)',
      padding:'16px 28px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      position:'sticky', top:0, zIndex:150,
      boxShadow:'0 2px 10px rgba(124,58,237,0.05)',
    }}>
      <div>
        <h1 style={{ fontWeight:900, fontSize:22, fontFamily:'var(--font-display)', color:'var(--text)', marginBottom:2 }}>
          {NAV.find(n=>n.key===activeTab)?.icon} {' '}
          {activeTab==='users' ? 'Manajemen Pengguna' : activeTab==='stats' ? 'Statistik Platform' : 'Administrator'}
        </h1>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>
          {activeTab==='users' ? `${users.length} pengguna terdaftar · ${totalActive} aktif` :
           activeTab==='stats' ? 'Pantau performa platform secara real-time' :
           `${admins.length} admin terdaftar`}
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:800, fontSize:14 }}>{admin.name}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{admin.email}</div>
        </div>
        <div style={{
          width:42, height:42, borderRadius:13,
          background:'linear-gradient(135deg,#7C3AED,#EC4899)',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'white', fontWeight:900, fontSize:15, fontFamily:'var(--font-display)',
        }}>{initials(admin.name)}</div>
      </div>
    </div>
  )

  /* ── Stat cards ── */
  const StatCards = () => {
    const cols = isDesktop ? 4 : isTablet ? 4 : 2
    return (
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap: isMobile ? 10 : 14, marginBottom:20 }}>
        {[
          { label:'Total User',    value:users.length,                  icon:'👥', color:'#7C3AED', bg:'#EDE9FE' },
          { label:'User Aktif',    value:totalActive,                   icon:'✅', color:'#10B981', bg:'#D1FAE5' },
          { label:'Transaksi',     value:totalTx.toLocaleString('id-ID'),icon:'💸', color:'#F59E0B', bg:'#FEF3C7' },
          { label:'Avg Budget OK', value:`${avgBudget}%`,               icon:'🎯', color:'#06B6D4', bg:'#ECFEFF' },
        ].map(s=>(
          <div key={s.label} style={{
            background:'white', borderRadius:14, padding: isMobile ? '14px 12px' : '18px',
            boxShadow:'var(--shadow-sm)', border:`1px solid ${s.bg}`,
            transition:'transform 0.15s, box-shadow 0.15s', cursor:'default',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow)' }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
          >
            <div style={{ fontSize: isMobile ? 22 : 26, marginBottom:6 }}>{s.icon}</div>
            <div style={{ fontSize: isMobile ? 22 : 26, fontWeight:900, color:s.color, fontFamily:'var(--font-display)', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize: isMobile ? 11 : 12, color:'var(--text-muted)', fontWeight:600, marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>
    )
  }

  /* ── Users Tab ── */
  const UsersTab = () => (
    <>
      <StatCards/>

      {/* Toolbar */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14, alignItems:'center' }}>
        <div style={{ position:'relative', flex:'1 1 180px', minWidth:160 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14 }}>🔍</span>
          <input className="input-field" placeholder="Cari nama atau email..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{ paddingLeft:36, marginBottom:0, height:40, fontSize:13 }}/>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {['all','active','inactive'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{
              background: filter===f ? 'var(--primary)' : 'white',
              color: filter===f ? 'white' : 'var(--text-muted)',
              border:`1.5px solid ${filter===f ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius:20, padding:'6px 12px', fontSize:12, fontWeight:700,
              cursor:'pointer', fontFamily:'var(--font-body)', whiteSpace:'nowrap',
            }}>
              {f==='all' ? 'Semua' : f==='active' ? '✅ Aktif' : '⭕ Nonaktif'}
            </button>
          ))}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
            background:'white', border:'1.5px solid var(--border)',
            borderRadius:20, padding:'6px 12px', fontSize:12,
            color:'var(--text)', fontFamily:'var(--font-body)', cursor:'pointer',
          }}>
            <option value="joinDate">Terbaru</option>
            <option value="name">Nama A–Z</option>
            <option value="transactions">Transaksi</option>
            <option value="active">Terakhir aktif</option>
          </select>
        </div>
      </div>

      {/* Desktop → table | mobile/tablet → card grid */}
      {isDesktop ? (
        <div style={{
          background:'white', borderRadius:16, overflow:'hidden',
          boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-light)',
        }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
            <thead>
              <tr style={{ background:'#F9F7FF', borderBottom:'2px solid var(--border-light)' }}>
                {['Pengguna','Email','Status','Transaksi','Budget OK','Bergabung','Terakhir Aktif',''].map(h=>(
                  <th key={h} style={{
                    padding:'12px 16px', textAlign:'left',
                    fontWeight:800, fontSize:12, color:'var(--text-muted)', letterSpacing:0.3,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length===0 && (
                <tr><td colSpan={8} style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>Tidak ada pengguna ditemukan
                </td></tr>
              )}
              {filteredUsers.map((u,i)=>(
                <tr key={u.id} onClick={()=>setSelectedUser(u)}
                  style={{ borderBottom:'1px solid var(--border-light)', cursor:'pointer', transition:'background 0.1s', animation:`rowIn 0.3s ease ${i*0.025}s both` }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFAFE'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}
                >
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{
                        width:36, height:36, borderRadius:10, flexShrink:0,
                        background:AV[i%AV.length], display:'flex', alignItems:'center',
                        justifyContent:'center', color:'white', fontWeight:900, fontSize:12,
                      }}>{initials(u.name)}</div>
                      <span style={{ fontWeight:700 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:13 }}>{u.email}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{
                      background: u.status==='active'?'#D1FAE5':'#FEE2E2',
                      color: u.status==='active'?'#065F46':'#991B1B',
                      borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:800,
                    }}>{u.status==='active'?'AKTIF':'NONAKTIF'}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontWeight:700 }}>{u.transactions}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, background:'var(--border-light)', borderRadius:4, height:6, minWidth:60 }}>
                        <div style={{
                          height:'100%', borderRadius:4,
                          background: u.budgetOk>=80?'#10B981':u.budgetOk>=60?'#F59E0B':'#EF4444',
                          width:`${u.budgetOk}%`,
                        }}/>
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', minWidth:32 }}>{u.budgetOk}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:13 }}>{fmtDate(u.joinDate)}</td>
                  <td style={{ padding:'12px 16px', color:'var(--text-muted)', fontSize:13 }}>{timeAgo(u.lastActive)}</td>
                  <td style={{ padding:'12px 16px', color:'var(--text-muted)' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          display:'grid',
          gridTemplateColumns: isTablet ? '1fr 1fr' : '1fr',
          gap:10,
        }}>
          {filteredUsers.length===0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', gridColumn:'1/-1' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🔍</div><p>Tidak ada pengguna ditemukan</p>
            </div>
          )}
          {filteredUsers.map((u,i)=>(
            <div key={u.id} onClick={()=>setSelectedUser(u)} style={{
              background:'white', borderRadius:14, padding:'14px',
              cursor:'pointer', boxShadow:'var(--shadow-sm)',
              border:'1px solid var(--border-light)',
              display:'flex', alignItems:'center', gap:12,
              transition:'transform 0.15s, box-shadow 0.15s',
              animation:`rowIn 0.3s ease ${i*0.04}s both`,
            }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow)' }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
            >
              <div style={{
                width:44, height:44, borderRadius:13, flexShrink:0,
                background:AV[i%AV.length], display:'flex', alignItems:'center',
                justifyContent:'center', color:'white', fontWeight:900, fontSize:15,
              }}>{initials(u.name)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                  <span style={{ fontWeight:800, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.name}</span>
                  <span style={{
                    background: u.status==='active'?'#D1FAE5':'#FEE2E2',
                    color: u.status==='active'?'#065F46':'#991B1B',
                    borderRadius:5, padding:'1px 6px', fontSize:9, fontWeight:800, flexShrink:0,
                  }}>{u.status==='active'?'AKTIF':'NONAKTIF'}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>💸 {u.transactions}</span>
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>⏱ {timeAgo(u.lastActive)}</span>
                </div>
              </div>
              <span style={{ color:'var(--text-muted)', fontSize:18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  /* ── Stats Tab ── */
  // ── Generate sparkline path from data points ──
  const makeSparkline = (data, w, h, pad=8) => {
    const vals = data.map(d=>d.v)
    const mn = Math.min(...vals), mx = Math.max(...vals)
    const range = mx - mn || 1
    const pts = vals.map((v,i)=>{
      const x = pad + (i/(vals.length-1))*(w-pad*2)
      const y = h - pad - ((v-mn)/range)*(h-pad*2)
      return `${x},${y}`
    })
    return 'M'+pts.join(' L')
  }

  // Area path (filled)
  const makeArea = (data, w, h, pad=8) => {
    const vals = data.map(d=>d.v)
    const mn = Math.min(...vals), mx = Math.max(...vals)
    const range = mx - mn || 1
    const pts = vals.map((v,i)=>{
      const x = pad + (i/(vals.length-1))*(w-pad*2)
      const y = h - pad - ((v-mn)/range)*(h-pad*2)
      return [x, y]
    })
    const firstX = pts[0][0], lastX = pts[pts.length-1][0]
    const baseline = h - pad
    return `M${firstX},${baseline} ` +
      pts.map(([x,y])=>`L${x},${y}`).join(' ') +
      ` L${lastX},${baseline} Z`
  }

  const StatsTab = () => {
    // Chart data: per-user transaction counts across 7 weeks
    const weeks = ['M1','M2','M3','M4','M5','M6','M7']
    const chartUsers = users.slice(0,6)
    const CHART_COLORS = ['#10B981','#7C3AED','#F59E0B','#EF4444','#06B6D4','#EC4899']

    // Simulate weekly data per user
    const userWeeklyData = chartUsers.map((u,ui) => ({
      ...u,
      color: CHART_COLORS[ui % CHART_COLORS.length],
      weekly: weeks.map((_,wi) => ({
        w: weeks[wi],
        v: Math.max(2, Math.round(u.transactions / 7 * (0.6 + Math.sin(ui*2.1+wi*0.8)*0.4 + Math.random()*0.3)))
      }))
    }))

    // Main aggregate chart (sum all users per week)
    const aggregateData = weeks.map((w,wi)=>({
      w,
      v: userWeeklyData.reduce((s,u)=>s+u.weekly[wi].v, 0)
    }))

    // Top savers: sorted by budgetOk (menabung paling banyak)
    const topSavers = [...users].sort((a,b)=>b.budgetOk-a.budgetOk).slice(0,7)

    const medalColors = ['#F59E0B','#9CA3AF','#CD7C2F']
    const medalEmoji = ['🥇','🥈','🥉']

    const W = 420, H = 160

    return (
      <>
        {/* ── Stat summary row ── */}
        <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr 1fr':isTablet?'repeat(4,1fr)':'repeat(4,1fr)', gap:10, marginBottom:18 }}>
          {[
            { label:'Pengguna Aktif', value:totalActive, total:users.length, icon:'👥', color:'#7C3AED', bg:'#EDE9FE' },
            { label:'Total Transaksi', value:totalTx.toLocaleString('id-ID'), icon:'💸', color:'#10B981', bg:'#D1FAE5' },
            { label:'Rata-rata Tabungan', value:`${avgBudget}%`, icon:'🏦', color:'#F59E0B', bg:'#FEF3C7' },
            { label:'Artikel Dibaca', value:users.reduce((s,u)=>s+u.articles,0), icon:'📚', color:'#06B6D4', bg:'#ECFEFF' },
          ].map(s=>(
            <div key={s.label} style={{
              background:'white', borderRadius:14, padding:'14px 16px',
              boxShadow:'var(--shadow-sm)', border:`1.5px solid ${s.bg}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</span>
                <span style={{ fontSize:18 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize:24, fontWeight:900, color:s.color, fontFamily:'var(--font-display)', lineHeight:1 }}>{s.value}</div>
              {s.total && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>dari {s.total} pengguna</div>}
            </div>
          ))}
        </div>

        {/* ── Main 2-col panel (chart + leaderboard) ── */}
        <div style={{ display:'grid', gridTemplateColumns: isDesktop?'1.4fr 1fr':isTablet?'1fr 1fr':'1fr', gap:16 }}>

          {/* LEFT: Area chart - Aktivitas semua pengguna */}
          <div style={{ background:'white', borderRadius:18, padding:'20px 22px', boxShadow:'var(--shadow-sm)', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:4 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:4 }}>AKTIVITAS PENGGUNA</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                  <span style={{ fontSize:28, fontWeight:900, color:'var(--text)', fontFamily:'var(--font-display)' }}>{users.length}</span>
                  <span style={{ fontSize:13, color:'#10B981', fontWeight:700 }}>▲ {totalActive} aktif</span>
                </div>
              </div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', maxWidth:140, justifyContent:'flex-end' }}>
                {chartUsers.map((u,i)=>(
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:3 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:CHART_COLORS[i%CHART_COLORS.length], flexShrink:0 }}/>
                    <span style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>{u.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SVG Area Chart */}
            <div style={{ position:'relative', marginTop:8 }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }}>
                <defs>
                  {/* Gradient fills per user */}
                  {chartUsers.map((u,i)=>(
                    <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[i]} stopOpacity="0.25"/>
                      <stop offset="100%" stopColor={CHART_COLORS[i]} stopOpacity="0.02"/>
                    </linearGradient>
                  ))}
                  {/* Main aggregate gradient */}
                  <linearGradient id="gradMain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0.25,0.5,0.75,1].map(y=>(
                  <line key={y} x1={8} y1={H*y-4} x2={W-8} y2={H*y-4}
                    stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4"/>
                ))}

                {/* X-axis labels */}
                {aggregateData.map((d,i)=>(
                  <text key={i}
                    x={8 + (i/(aggregateData.length-1))*(W-16)}
                    y={H+2}
                    textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="var(--font-body)">
                    {d.w}
                  </text>
                ))}

                {/* Per-user lines (thin, behind) */}
                {userWeeklyData.map((u,i)=>(
                  <g key={i}>
                    <path d={makeArea(u.weekly, W, H-8)} fill={`url(#grad${i})`}/>
                    <path d={makeSparkline(u.weekly, W, H-8)} fill="none"
                      stroke={u.color} strokeWidth="1.5" strokeOpacity="0.6"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                ))}

                {/* Main aggregate line (bold green, on top) */}
                <path d={makeArea(aggregateData, W, H-8)} fill="url(#gradMain)"/>
                <path d={makeSparkline(aggregateData, W, H-8)} fill="none"
                  stroke="#10B981" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"/>

                {/* Peak dot on aggregate */}
                {(() => {
                  const vals = aggregateData.map(d=>d.v)
                  const mx = Math.max(...vals)
                  const mn = Math.min(...vals)
                  const range = mx - mn || 1
                  const peakIdx = vals.indexOf(mx)
                  const x = 8 + (peakIdx/(aggregateData.length-1))*(W-16)
                  const y = (H-8) - 8 - ((mx-mn)/range)*((H-8)-16)
                  return (
                    <g>
                      <circle cx={x} cy={y} r="5" fill="#10B981" stroke="white" strokeWidth="2"/>
                      <rect x={x-22} y={y-22} width={44} height={17} rx="4" fill="#10B981"/>
                      <text x={x} y={y-10} textAnchor="middle" fontSize="9" fill="white" fontWeight="700" fontFamily="var(--font-body)">
                        {mx} tx
                      </text>
                    </g>
                  )
                })()}
              </svg>

              {/* Dot legend */}
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{
                    width:10, height:10, borderRadius:'50%',
                    background: i===0?'#10B981':i===1?'#7C3AED':'#F59E0B',
                    border:'2px solid white',
                    boxShadow:'0 0 0 1.5px '+(i===0?'#10B981':i===1?'#7C3AED':'#F59E0B'),
                  }}/>
                ))}
              </div>
            </div>

            {/* Bottom stat bar */}
            <div style={{ display:'flex', gap:16, marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-light)' }}>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Minggu Ini</div>
                <div style={{ fontSize:16, fontWeight:900, color:'var(--text)' }}>{aggregateData[6].v} tx</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Rata-rata</div>
                <div style={{ fontSize:16, fontWeight:900, color:'var(--text)' }}>
                  {Math.round(aggregateData.reduce((s,d)=>s+d.v,0)/aggregateData.length)} tx
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>Pertumbuhan</div>
                <div style={{ fontSize:16, fontWeight:900, color:'#10B981' }}>
                  +{Math.round((aggregateData[6].v/aggregateData[0].v-1)*100)}%
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Leaderboard penabung terbaik */}
          <div style={{ background:'white', borderRadius:18, padding:'20px 22px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:2 }}>PERINGKAT TABUNGAN</div>
              <div style={{ fontSize:15, fontWeight:900, color:'var(--text)' }}>🏆 Penabung Terbaik</div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {topSavers.map((u,i)=>{
                const savingsAmt = Math.round(u.budgetOk * 85000)
                return (
                  <div key={u.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 12px', borderRadius:12,
                    background: i===0?'linear-gradient(135deg,#FEF3C7,#FDE68A)':i===1?'#F9FAFB':i===2?'#FFF7ED':'transparent',
                    border: i<3?`1px solid ${i===0?'#F59E0B33':i===1?'#9CA3AF33':'#CD7C2F33'}`:'none',
                    transition:'background 0.15s',
                  }}
                    onMouseEnter={e=>{ if(i>=3) e.currentTarget.style.background='#F9FAFB' }}
                    onMouseLeave={e=>{ if(i>=3) e.currentTarget.style.background='transparent' }}
                  >
                    {/* Rank badge */}
                    <div style={{
                      width:26, height:26, borderRadius:'50%', flexShrink:0,
                      background: i<3?medalColors[i]:'var(--border-light)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize: i<3?14:11,
                      fontWeight:900, color: i<3?'white':'var(--text-muted)',
                    }}>
                      {i<3 ? medalEmoji[i] : `#${i+1}`}
                    </div>

                    {/* Avatar */}
                    <div style={{
                      width:32, height:32, borderRadius:9, flexShrink:0,
                      background: AV[i%AV.length],
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'white', fontWeight:900, fontSize:11,
                    }}>{initials(u.name)}</div>

                    {/* Name + email */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>{u.name.split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:1 }}>
                        <div style={{ background:'var(--border-light)', borderRadius:4, height:4, flex:1 }}>
                          <div style={{
                            height:'100%', borderRadius:4,
                            background: i===0?'#F59E0B':i===1?'#9CA3AF':i===2?'#CD7C2F':'#7C3AED',
                            width:`${u.budgetOk}%`, transition:'width 0.8s ease',
                          }}/>
                        </div>
                        <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, flexShrink:0 }}>{u.budgetOk}%</span>
                      </div>
                    </div>

                    {/* Savings amount */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{
                        fontSize:12, fontWeight:800,
                        color: i===0?'#D97706':i===1?'#6B7280':i===2?'#92400E':'var(--primary)',
                      }}>
                        Rp {savingsAmt >= 1000000
                          ? (savingsAmt/1000000).toFixed(1)+'jt'
                          : (savingsAmt/1000).toFixed(0)+'rb'}
                      </div>
                      <div style={{ fontSize:9, color:'var(--text-muted)', fontWeight:600 }}>ditabung</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* View all button */}
            <button
              onClick={()=>setActiveTab('users')}
              style={{
                width:'100%', marginTop:14,
                background:'linear-gradient(135deg,#1E1B4B,#312E81)',
                color:'white', border:'none', borderRadius:12,
                padding:'11px', fontSize:12, fontWeight:800,
                cursor:'pointer', fontFamily:'var(--font-body)',
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              }}
            >
              👥 Lihat Semua Pengguna
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ── Admins Tab ── */
  const AdminsTab = () => (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
        <div>
          <h3 style={{ fontWeight:900, fontSize:18, fontFamily:'var(--font-display)', color:'var(--text)' }}>🛡️ Daftar Administrator</h3>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>{admins.length} admin terdaftar</p>
        </div>
        <button onClick={()=>navigate('/admin-register')} style={{
          background:'linear-gradient(135deg,#7C3AED,#9333EA)', color:'white',
          border:'none', borderRadius:12, padding:'10px 18px',
          fontSize:13, fontWeight:800, cursor:'pointer',
          display:'flex', alignItems:'center', gap:6,
          boxShadow:'0 4px 14px rgba(124,58,237,0.35)',
          fontFamily:'var(--font-body)',
        }}>➕ Tambah Admin</button>
      </div>

      <div style={{
        display:'grid',
        gridTemplateColumns: isDesktop?'repeat(3,1fr)':isTablet?'1fr 1fr':'1fr',
        gap:14,
      }}>
        {admins.length===0 && (
          <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', gridColumn:'1/-1' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>🛡️</div><p>Belum ada admin terdaftar</p>
          </div>
        )}
        {admins.map((a,i)=>(
          <div key={a.id} style={{
            background:'white', borderRadius:16, padding:'18px',
            boxShadow:'var(--shadow-sm)',
            border: a.id===admin.id?'2px solid var(--primary)':'1px solid var(--border-light)',
            position:'relative',
            transition:'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='var(--shadow)' }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='var(--shadow-sm)' }}
          >
            {a.id===admin.id && (
              <div style={{
                position:'absolute', top:-1, right:12,
                background:'var(--primary)', color:'white',
                fontSize:9, fontWeight:800, padding:'3px 8px',
                borderRadius:'0 0 8px 8px',
              }}>KAMU</div>
            )}
            {a.id !== admin.id && (
              <button
                onClick={()=>handleDeleteAdmin(a.id)}
                title="Hapus admin ini"
                style={{
                  position:'absolute', top:10, right:10,
                  background:'#FEE2E2', border:'none', borderRadius:8,
                  width:28, height:28, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, color:'#DC2626', zIndex:1,
                }}
                onMouseEnter={e=>{e.currentTarget.style.background='#EF4444';e.currentTarget.style.color='white'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#FEE2E2';e.currentTarget.style.color='#DC2626'}}
              >🗑</button>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12, paddingRight:a.id!==admin.id?32:0 }}>
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0,
                background:'linear-gradient(135deg,#7C3AED,#9333EA)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontWeight:900, fontSize:16, fontFamily:'var(--font-display)',
              }}>{initials(a.name)}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:800, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.email}</div>
              </div>
            </div>
            <div style={{
              background:'var(--primary-xlight)', borderRadius:8, padding:'6px 10px',
              display:'flex', alignItems:'center', gap:6,
            }}>
              <span style={{ fontSize:12 }}>🛡️</span>
              <span style={{ fontSize:11, color:'var(--primary)', fontWeight:700 }}>
                Administrator · Bergabung {fmtDate(a.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── User Detail Modal ── */
  const UserModal = () => !selectedUser ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setSelectedUser(null)} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      display:'flex',
      alignItems: isDesktop?'center':'flex-end',
      justifyContent:'center',
      zIndex:500,
    }}>
      <div style={{
        background:'white',
        borderRadius: isDesktop?24:'24px 24px 0 0',
        padding:24, width:'100%',
        maxWidth: isDesktop?520:'100%',
        maxHeight:'90vh', overflowY:'auto',
        animation: isDesktop?'fadeIn 0.2s ease':'slideUp 0.3s ease',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:52, height:52, borderRadius:16,
              background:'linear-gradient(135deg,#7C3AED,#9333EA)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontWeight:900, fontSize:18,
            }}>{initials(selectedUser.name)}</div>
            <div>
              <div style={{ fontWeight:900, fontSize:17, fontFamily:'var(--font-display)' }}>{selectedUser.name}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)' }}>{selectedUser.email}</div>
            </div>
          </div>
          <button onClick={()=>setSelectedUser(null)} style={{
            background:'var(--border-light)', border:'none', borderRadius:'50%',
            width:34, height:34, cursor:'pointer', fontSize:14,
          }}>✕</button>
        </div>

        <div style={{
          display:'inline-flex', gap:6, alignItems:'center',
          background: selectedUser.status==='active'?'#D1FAE5':'#FEE2E2',
          color: selectedUser.status==='active'?'#065F46':'#991B1B',
          borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:800, marginBottom:16,
        }}>{selectedUser.status==='active'?'✅ Pengguna Aktif':'⭕ Tidak Aktif'}</div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { icon:'📅', label:'Bergabung',      value:fmtDate(selectedUser.joinDate) },
            { icon:'⏱',  label:'Terakhir Aktif', value:timeAgo(selectedUser.lastActive) },
            { icon:'💸', label:'Transaksi',       value:selectedUser.transactions },
            { icon:'🎯', label:'Budget OK',        value:`${selectedUser.budgetOk}%` },
            { icon:'📚', label:'Artikel Dibaca',   value:selectedUser.articles },
            { icon:'📧', label:'Email',            value:'Terverifikasi' },
          ].map(item=>(
            <div key={item.label} style={{ background:'var(--border-light)', borderRadius:12, padding:'10px 12px' }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{item.icon}</div>
              <div style={{ fontSize:17, fontWeight:900 }}>{item.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background:'#F5F3FF', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
            <span style={{ fontWeight:700 }}>📊 Skor Budget</span>
            <span style={{ fontWeight:800, color:'var(--primary)' }}>{selectedUser.budgetOk}%</span>
          </div>
          <div style={{ background:'var(--border-light)', borderRadius:6, height:10, overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:6,
              background: selectedUser.budgetOk>=80?'linear-gradient(90deg,#10B981,#059669)':selectedUser.budgetOk>=60?'linear-gradient(90deg,#F59E0B,#D97706)':'linear-gradient(90deg,#EF4444,#DC2626)',
              width:`${selectedUser.budgetOk}%`,
            }}/>
          </div>
        </div>

        <button onClick={()=>setSelectedUser(null)} style={{
          width:'100%', background:'var(--primary)', color:'white',
          border:'none', borderRadius:14, padding:'14px',
          fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)',
        }}>Tutup</button>
      </div>
    </div>
  )

  /* ── Logout Modal ── */
  const LogoutModal = () => !showLogout ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setShowLogout(false)} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:500, padding:20,
    }}>
      <div style={{
        background:'white', borderRadius:24, padding:28,
        width:'100%', maxWidth:340, textAlign:'center',
      }}>
        <div style={{ fontSize:48, marginBottom:12 }}>👋</div>
        <h3 style={{ fontWeight:900, fontSize:18, fontFamily:'var(--font-display)', marginBottom:6 }}>Keluar dari Admin?</h3>
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:22 }}>Kamu akan kembali ke halaman login</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>setShowLogout(false)} style={{
            flex:1, background:'var(--border-light)', border:'none',
            borderRadius:14, padding:'13px', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-body)',
          }}>Batal</button>
          <button onClick={()=>{ removeAdminToken(); navigate('/admin-login') }} style={{
            flex:1, background:'#EF4444', color:'white', border:'none',
            borderRadius:14, padding:'13px', fontWeight:800, cursor:'pointer', fontFamily:'var(--font-body)',
          }}>Keluar</button>
        </div>
      </div>
    </div>
  )

  /* ─── Final render ─────────────────────────────────────── */
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font-body)' }}>

      <Sidebar/>

      {/* Main wrapper — shifts right on desktop */}
      <div style={{
        marginLeft: isDesktop ? 250 : 0,
        minHeight:'100vh',
        display:'flex', flexDirection:'column',
        transition:'margin-left 0.28s',
      }}>
        {!isDesktop && <MobileTopBar/>}
        {!isDesktop && <MobileTabBar/>}
        {isDesktop  && <DesktopTopBar/>}

        <main style={{
          flex:1,
          padding: isDesktop?28:16,
          paddingBottom:48,
        }}>
          {activeTab==='users'  && <UsersTab/>}
          {activeTab==='stats'  && <StatsTab/>}
          {activeTab==='admins' && <AdminsTab/>}
        </main>
      </div>

      <UserModal/>
      <LogoutModal/>

      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes rowIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
