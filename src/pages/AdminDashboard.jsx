import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoBase64 } from '../assets/logo'
import { adminAuthApi, adminArticlesApi, adminRatingsApi, removeAdminToken } from '../api'

function timeAgo(iso) {
  const diff = Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000)
  if (m<1) return 'Baru saja'; if (m<60) return `${m} menit lalu`
  const h=Math.floor(m/60); if (h<24) return `${h} jam lalu`
  return `${Math.floor(h/24)} hari lalu`
}
function fmtDate(s) { return s ? new Date(s).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '-' }
function initials(n='') { return n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase() }
const AV = ['#7C3AED','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#8B5CF6','#0D9488']

const ARTICLE_CATEGORIES = ['INVESTASI','BUDGETING','TABUNGAN','PAY LATER','LAINNYA']
const ARTICLE_ICONS = ['📈','💡','🏦','📊','⚠️','🛒','📄','💰','🎯','🔑']
const ARTICLE_COLORS = ['#EDE9FE','#D1FAE5','#FEF3C7','#ECFEFF','#FEE2E2','#EFF6FF']

function useBreakpoint() {
  const [bp, setBp] = useState(() => { const w=window.innerWidth; return w>=1024?'desktop':w>=640?'tablet':'mobile' })
  useEffect(() => {
    const fn = () => { const w=window.innerWidth; setBp(w>=1024?'desktop':w>=640?'tablet':'mobile') }
    window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn)
  }, [])
  return bp
}

const EMPTY_FORM = { title:'', content:'', category:'INVESTASI', read_time:5, image:'📈', bg_color:'#EDE9FE' }

export default function AdminDashboard() {
  const navigate  = useNavigate()
  const bp        = useBreakpoint()
  const isDesktop = bp === 'desktop'
  const isTablet  = bp === 'tablet'
  const isMobile  = bp === 'mobile'

  const [admin,        setAdmin]        = useState(null)
  const [users,        setUsers]        = useState([])
  const [admins,       setAdmins]       = useState([])
  const [articles,     setArticles]     = useState([])
  const [ratings,      setRatings]      = useState([])
  const [ratingAvg,    setRatingAvg]    = useState(0)
  const [ratingAspect, setRatingAspect] = useState({})
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [sortBy,       setSortBy]       = useState('joinDate')
  const [activeTab,    setActiveTab]    = useState('users')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showLogout,   setShowLogout]   = useState(false)
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [toast,        setToast]        = useState(null)
  const [loading,      setLoading]      = useState(false)

  // Artikel form state
  const [showArticleForm, setShowArticleForm] = useState(false)
  const [editingArticle,  setEditingArticle]  = useState(null)
  const [articleForm,     setArticleForm]     = useState(EMPTY_FORM)
  const [artLoading,      setArtLoading]      = useState(false)
  const [confirmDelete,   setConfirmDelete]   = useState(null)

  const showToast = useCallback((msg, type='success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [uData, aData, artData, ratData] = await Promise.all([
        adminAuthApi.getUsers(),
        adminAuthApi.getAdmins(),
        adminArticlesApi.getAll(),
        adminRatingsApi.getAll(),
      ])
      if (uData.users) setUsers(uData.users.map(u => ({
        ...u, joinDate: u.created_at?.split('T')[0]||'-',
        lastActive: u.created_at||new Date().toISOString(),
        transactions: Number(u.transactions)||0, budgetOk:0, articles:0, status:'active',
      })))
      setAdmins(aData.admins || [])
      setArticles(artData.articles || [])
      setRatings(ratData.ratings || [])
      setRatingAvg(ratData.average || 0)
      setRatingAspect(ratData.aspect_averages || {})
    } catch(e) { /* ignore */ }
  }, [])

  useEffect(() => {
    adminAuthApi.getProfile()
      .then(data => {
        if (data.user?.role !== 'admin') { removeAdminToken(); navigate('/admin-login'); return }
        setAdmin(data.user); fetchAll()
      })
      .catch(() => { removeAdminToken(); navigate('/admin-login') })
  }, [navigate, fetchAll])

  // ── Artikel handlers ──
  const openAddArticle = () => { setEditingArticle(null); setArticleForm(EMPTY_FORM); setShowArticleForm(true) }
  const openEditArticle = (a) => { setEditingArticle(a); setArticleForm({ title:a.title, content:a.content, category:a.category, read_time:a.read_time, image:a.image, bg_color:a.bg_color }); setShowArticleForm(true) }

  const handleSaveArticle = async () => {
    if (!articleForm.title.trim()) return showToast('Judul artikel wajib diisi.','error')
    setArtLoading(true)
    try {
      if (editingArticle) {
        await adminArticlesApi.update(editingArticle.id, articleForm)
        showToast('Artikel berhasil diperbarui!')
      } else {
        await adminArticlesApi.create(articleForm)
        showToast('Artikel berhasil ditambahkan!')
      }
      setShowArticleForm(false); fetchAll()
    } catch(e) { showToast(e.message,'error') }
    setArtLoading(false)
  }

  const handleDeleteArticle = async (id) => {
    setLoading(true)
    try {
      await adminArticlesApi.delete(id)
      showToast('Artikel berhasil dihapus.')
      setConfirmDelete(null); fetchAll()
    } catch(e) { showToast(e.message,'error') }
    setLoading(false)
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (filter==='all' || u.status===filter)
  }).sort((a,b) => {
    if (sortBy==='name') return a.name.localeCompare(b.name)
    if (sortBy==='transactions') return b.transactions-a.transactions
    if (sortBy==='active') return new Date(b.lastActive)-new Date(a.lastActive)
    return new Date(b.joinDate)-new Date(a.joinDate)
  })

  const totalActive = users.filter(u=>u.status==='active').length
  const totalTx = users.reduce((s,u)=>s+u.transactions,0)
  const avgBudget = users.length ? Math.round(users.reduce((s,u)=>s+u.budgetOk,0)/users.length) : 0

  if (!admin) return null

  const NAV = [
    { key:'users',    icon:'👥', label:'Pengguna'  },
    { key:'stats',    icon:'📊', label:'Statistik' },
    { key:'articles', icon:'📰', label:'Artikel'   },
    { key:'ratings',  icon:'⭐', label:'Rating'    },
    { key:'admins',   icon:'🛡️', label:'Admin'      },
  ]

  /* ── Sidebar ── */
  const Sidebar = () => (
    <>
      {!isDesktop && drawerOpen && (
        <div onClick={()=>setDrawerOpen(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:398 }}/>
      )}
      <aside style={{ position:'fixed',top:0,left:0,bottom:0,width:250,background:'white',borderRight:'1px solid #E5E7EB',boxShadow:isDesktop?'4px 0 24px rgba(124,58,237,0.07)':'12px 0 40px rgba(0,0,0,0.2)',zIndex:399,display:'flex',flexDirection:'column',transform:isDesktop?'none':drawerOpen?'translateX(0)':'translateX(-100%)',transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ padding:'22px 20px 18px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <img src={logoBase64} alt="" style={{ width:22,objectFit:'contain',borderRadius:4 }}/>
            </div>
            <div>
              <div style={{ fontWeight:900,fontSize:16,color:'#111827' }}>Fin<span style={{ color:'#7C3AED' }}>Smart</span></div>
              <div style={{ fontSize:9,color:'#9CA3AF',fontWeight:800,letterSpacing:1 }}>ADMIN PANEL</div>
            </div>
          </div>
          {!isDesktop && <button onClick={()=>setDrawerOpen(false)} style={{ background:'#F3F4F6',border:'none',borderRadius:'50%',width:30,height:30,cursor:'pointer' }}>✕</button>}
        </div>
        <div style={{ padding:'14px 20px',borderBottom:'1px solid #F3F4F6' }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:'linear-gradient(135deg,#7C3AED,#EC4899)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:14 }}>{initials(admin.name)}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{admin.name}</div>
              <div style={{ fontSize:11,color:'#9CA3AF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{admin.email}</div>
            </div>
          </div>
          <div style={{ marginTop:10,background:'#EDE9FE',color:'#7C3AED',borderRadius:8,padding:'4px 10px',fontSize:11,fontWeight:800,display:'inline-block' }}>🛡️ Administrator</div>
        </div>
        <nav style={{ padding:'12px',flex:1,overflowY:'auto' }}>
          {NAV.map(item => (
            <button key={item.key} onClick={()=>{ setActiveTab(item.key); setDrawerOpen(false) }} style={{ width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:12,border:'none',marginBottom:3,background:activeTab===item.key?'#EDE9FE':'transparent',color:activeTab===item.key?'#7C3AED':'#6B7280',fontWeight:activeTab===item.key?800:600,fontSize:14,cursor:'pointer',transition:'all 0.15s',borderLeft:activeTab===item.key?'3px solid #7C3AED':'3px solid transparent' }}
              onMouseEnter={e=>{ if(activeTab!==item.key){ e.currentTarget.style.background='#F3F4F6'; e.currentTarget.style.color='#111827' }}}
              onMouseLeave={e=>{ if(activeTab!==item.key){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#6B7280' }}}>
              <span style={{ fontSize:18 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px',borderTop:'1px solid #F3F4F6' }}>
          <button onClick={()=>setShowLogout(true)} style={{ width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,border:'none',background:'transparent',color:'#EF4444',fontWeight:700,fontSize:14,cursor:'pointer',transition:'all 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='#FEE2E2'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <span style={{ fontSize:18 }}>🚪</span> Keluar
          </button>
        </div>
      </aside>
    </>
  )

  const MobileTopBar = () => (
    <header style={{ position:'sticky',top:0,zIndex:200,background:'linear-gradient(135deg,#7C3AED,#9333EA)',padding:'0 16px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'0 4px 20px rgba(124,58,237,0.3)' }}>
      <button onClick={()=>setDrawerOpen(true)} style={{ background:'rgba(255,255,255,0.15)',border:'none',borderRadius:10,width:38,height:38,cursor:'pointer',color:'white',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center' }}>☰</button>
      <span style={{ fontWeight:900,fontSize:17,color:'white' }}>Fin<span style={{ opacity:0.8 }}>Smart</span> <span style={{ background:'rgba(255,255,255,0.2)',borderRadius:5,padding:'2px 6px',fontSize:9,fontWeight:800 }}>ADMIN</span></span>
      <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:13 }}>{initials(admin.name)}</div>
    </header>
  )

  const MobileTabBar = () => (
    <div style={{ display:'flex',background:'white',borderBottom:'2px solid #F3F4F6',position:'sticky',top:60,zIndex:190,boxShadow:'0 2px 8px rgba(0,0,0,0.04)',overflowX:'auto' }}>
      {NAV.map(item=>(
        <button key={item.key} onClick={()=>setActiveTab(item.key)} style={{ flex:'0 0 auto',display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'8px 12px 6px',border:'none',background:'transparent',color:activeTab===item.key?'#7C3AED':'#9CA3AF',fontWeight:activeTab===item.key?800:600,fontSize:10,cursor:'pointer',borderBottom:activeTab===item.key?'2px solid #7C3AED':'2px solid transparent',marginBottom:-2,transition:'all 0.15s',whiteSpace:'nowrap' }}>
          <span style={{ fontSize:17 }}>{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  )

  const DesktopTopBar = () => (
    <div style={{ background:'white',borderBottom:'1px solid #F3F4F6',padding:'16px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:150,boxShadow:'0 2px 10px rgba(124,58,237,0.05)' }}>
      <div>
        <h1 style={{ fontWeight:900,fontSize:22,color:'#111827',marginBottom:2 }}>
          {NAV.find(n=>n.key===activeTab)?.icon}{' '}
          { activeTab==='users'?'Manajemen Pengguna': activeTab==='stats'?'Statistik Platform': activeTab==='articles'?'Kelola Artikel': activeTab==='ratings'?'Rating & Feedback':'Daftar Administrator' }
        </h1>
        <p style={{ color:'#9CA3AF',fontSize:13 }}>
          { activeTab==='users'?`${users.length} pengguna terdaftar · ${totalActive} aktif`: activeTab==='stats'?'Pantau performa platform': activeTab==='articles'?`${articles.length} artikel tersedia`: activeTab==='ratings'?`${ratings.length} ulasan · rata-rata ${ratingAvg}⭐`:`${admins.length} admin terdaftar` }
        </p>
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:12 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontWeight:800,fontSize:14 }}>{admin.name}</div>
          <div style={{ fontSize:12,color:'#9CA3AF' }}>{admin.email}</div>
        </div>
        <div style={{ width:42,height:42,borderRadius:13,background:'linear-gradient(135deg,#7C3AED,#EC4899)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:15 }}>{initials(admin.name)}</div>
      </div>
    </div>
  )

  /* ── Stat Cards ── */
  const StatCards = () => (
    <div style={{ display:'grid',gridTemplateColumns:`repeat(${isMobile?2:4},1fr)`,gap:isMobile?10:14,marginBottom:20 }}>
      {[
        { label:'Total User',    value:users.length,                      icon:'👥', color:'#7C3AED', bg:'#EDE9FE' },
        { label:'User Aktif',    value:totalActive,                       icon:'✅', color:'#10B981', bg:'#D1FAE5' },
        { label:'Transaksi',     value:totalTx.toLocaleString('id-ID'),   icon:'💸', color:'#F59E0B', bg:'#FEF3C7' },
        { label:'Total Artikel', value:articles.length,                   icon:'📰', color:'#06B6D4', bg:'#ECFEFF' },
      ].map(s=>(
        <div key={s.label} style={{ background:'white',borderRadius:14,padding:isMobile?'14px 12px':'18px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:`1px solid ${s.bg}`,transition:'transform 0.15s' }}
          onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e=>e.currentTarget.style.transform=''}>
          <div style={{ fontSize:isMobile?22:26,marginBottom:6 }}>{s.icon}</div>
          <div style={{ fontSize:isMobile?22:26,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:12,color:'#9CA3AF',fontWeight:600,marginTop:4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )

  /* ── Users Tab ── */
  const UsersTab = () => (
    <>
      <StatCards/>
      <div style={{ display:'flex',flexWrap:'wrap',gap:10,marginBottom:14,alignItems:'center' }}>
        <div style={{ position:'relative',flex:'1 1 180px',minWidth:160 }}>
          <span style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:14 }}>🔍</span>
          <input placeholder="Cari nama atau email..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:'100%',paddingLeft:36,paddingRight:12,height:40,fontSize:13,border:'1.5px solid #E5E7EB',borderRadius:20,outline:'none',boxSizing:'border-box',fontFamily:'inherit' }}/>
        </div>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
          {['all','active','inactive'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?'#7C3AED':'white',color:filter===f?'white':'#6B7280',border:`1.5px solid ${filter===f?'#7C3AED':'#E5E7EB'}`,borderRadius:20,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer' }}>
              {f==='all'?'Semua':f==='active'?'✅ Aktif':'⭕ Nonaktif'}
            </button>
          ))}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ background:'white',border:'1.5px solid #E5E7EB',borderRadius:20,padding:'6px 12px',fontSize:12,color:'#111827',cursor:'pointer',fontFamily:'inherit' }}>
            <option value="joinDate">Terbaru</option>
            <option value="name">Nama A–Z</option>
            <option value="transactions">Transaksi</option>
          </select>
        </div>
      </div>
      {isDesktop ? (
        <div style={{ background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #F3F4F6' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:14 }}>
            <thead>
              <tr style={{ background:'#F9F7FF',borderBottom:'2px solid #F3F4F6' }}>
                {['Pengguna','Email','Status','Transaksi','Bergabung','Terakhir Aktif'].map(h=>(
                  <th key={h} style={{ padding:'12px 16px',textAlign:'left',fontWeight:800,fontSize:12,color:'#9CA3AF',letterSpacing:0.3 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length===0 && <tr><td colSpan={6} style={{ padding:48,textAlign:'center',color:'#9CA3AF' }}><div style={{ fontSize:36,marginBottom:8 }}>🔍</div>Tidak ada pengguna</td></tr>}
              {filteredUsers.map((u,i)=>(
                <tr key={u.id} onClick={()=>setSelectedUser(u)} style={{ borderBottom:'1px solid #F3F4F6',cursor:'pointer',transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFAFE'}
                  onMouseLeave={e=>e.currentTarget.style.background='white'}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                      <div style={{ width:36,height:36,borderRadius:10,flexShrink:0,background:AV[i%AV.length],display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:12 }}>{initials(u.name)}</div>
                      <span style={{ fontWeight:700 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px',color:'#6B7280',fontSize:13 }}>{u.email}</td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ background:'#D1FAE5',color:'#065F46',borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:800 }}>AKTIF</span>
                  </td>
                  <td style={{ padding:'12px 16px',fontWeight:700 }}>{u.transactions}</td>
                  <td style={{ padding:'12px 16px',color:'#6B7280',fontSize:13 }}>{fmtDate(u.joinDate)}</td>
                  <td style={{ padding:'12px 16px',color:'#6B7280',fontSize:13 }}>{timeAgo(u.lastActive)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display:'grid',gridTemplateColumns:isTablet?'1fr 1fr':'1fr',gap:10 }}>
          {filteredUsers.map((u,i)=>(
            <div key={u.id} onClick={()=>setSelectedUser(u)} style={{ background:'white',borderRadius:14,padding:14,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #F3F4F6',display:'flex',alignItems:'center',gap:12,transition:'transform 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform=''}>
              <div style={{ width:44,height:44,borderRadius:13,flexShrink:0,background:AV[i%AV.length],display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:15 }}>{initials(u.name)}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:800,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.name}</div>
                <div style={{ fontSize:12,color:'#6B7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.email}</div>
                <div style={{ fontSize:11,color:'#9CA3AF',marginTop:2 }}>💸 {u.transactions} tx · {timeAgo(u.lastActive)}</div>
              </div>
              <span style={{ color:'#9CA3AF',fontSize:18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  /* ── Stats Tab ── */
  const StatsTab = () => (
    <>
      <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':isTablet?'repeat(4,1fr)':'repeat(4,1fr)',gap:10,marginBottom:18 }}>
        {[
          { label:'Total Pengguna', value:users.length,                       icon:'👥', color:'#7C3AED', bg:'#EDE9FE' },
          { label:'Total Transaksi', value:totalTx.toLocaleString('id-ID'),   icon:'💸', color:'#10B981', bg:'#D1FAE5' },
          { label:'Total Artikel',  value:articles.length,                    icon:'📰', color:'#F59E0B', bg:'#FEF3C7' },
          { label:'Rata-rata Rating',value:`${ratingAvg}⭐`,                  icon:'⭐', color:'#F59E0B', bg:'#FEF3C7' },
        ].map(s=>(
          <div key={s.label} style={{ background:'white',borderRadius:14,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:`1.5px solid ${s.bg}` }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
              <span style={{ fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:0.5 }}>{s.label}</span>
              <span style={{ fontSize:18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:26,fontWeight:900,color:s.color,lineHeight:1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:isDesktop?'1fr 1fr':'1fr',gap:16 }}>
        {/* Aspek Rating */}
        <div style={{ background:'white',borderRadius:18,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:0.6,marginBottom:4 }}>RATA-RATA RATING PER ASPEK</div>
          <div style={{ fontSize:28,fontWeight:900,color:'#F59E0B',marginBottom:16 }}>{ratingAvg} / 5.0 ⭐</div>
          {[
            { key:'avg_design',      label:'Desain UI' },
            { key:'avg_ease',        label:'Kemudahan' },
            { key:'avg_feature',     label:'Fitur' },
            { key:'avg_performance', label:'Performa' },
          ].map(asp=>{
            const val = parseFloat(ratingAspect[asp.key]||0), pct = (val/5)*100
            return (
              <div key={asp.key} style={{ marginBottom:14 }}>
                <div style={{ display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700,marginBottom:5 }}>
                  <span>{asp.label}</span><span style={{ color:'#F59E0B' }}>{val || '-'}</span>
                </div>
                <div style={{ background:'#F3F4F6',borderRadius:8,height:10,overflow:'hidden' }}>
                  <div style={{ height:'100%',borderRadius:8,background:'linear-gradient(90deg,#F59E0B,#FBBF24)',width:`${pct}%`,transition:'width 0.8s ease' }}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Top User berdasarkan transaksi */}
        <div style={{ background:'white',borderRadius:18,padding:'20px 22px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',letterSpacing:0.6,marginBottom:4 }}>PENGGUNA TERPENTING</div>
          <div style={{ fontSize:15,fontWeight:900,color:'#111827',marginBottom:16 }}>🏆 Transaksi Terbanyak</div>
          {[...users].sort((a,b)=>b.transactions-a.transactions).slice(0,7).map((u,i)=>(
            <div key={u.id} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<6?'1px solid #F3F4F6':'none' }}>
              <div style={{ width:24,height:24,borderRadius:'50%',background:i<3?['#F59E0B','#9CA3AF','#CD7C2F'][i]:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,color:i<3?'white':'#7C3AED',flexShrink:0 }}>
                {i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}
              </div>
              <div style={{ width:32,height:32,borderRadius:9,flexShrink:0,background:AV[i%AV.length],display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:11 }}>{initials(u.name)}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{u.name}</div>
                <div style={{ fontSize:11,color:'#9CA3AF' }}>{u.email}</div>
              </div>
              <span style={{ fontSize:13,fontWeight:800,color:'#7C3AED',flexShrink:0 }}>{u.transactions} tx</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  /* ── Articles Tab ── */
  const ArticlesTab = () => (
    <>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <div>
          <h3 style={{ fontWeight:900,fontSize:18,color:'#111827',margin:0 }}>📰 Kelola Artikel Edukasi</h3>
          <p style={{ color:'#9CA3AF',fontSize:13,margin:'4px 0 0' }}>{articles.length} artikel tersedia untuk pengguna</p>
        </div>
        <button onClick={openAddArticle} style={{ background:'linear-gradient(135deg,#7C3AED,#9333EA)',color:'white',border:'none',borderRadius:12,padding:'10px 18px',fontSize:13,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 14px rgba(124,58,237,0.35)' }}>
          ➕ Tambah Artikel
        </button>
      </div>

      {articles.length===0 && (
        <div style={{ textAlign:'center',padding:60,background:'white',borderRadius:18,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48,marginBottom:10 }}>📰</div>
          <div style={{ fontWeight:700,fontSize:15 }}>Belum ada artikel</div>
          <div style={{ fontSize:13,color:'#9CA3AF',marginTop:4 }}>Klik tombol "Tambah Artikel" untuk mulai</div>
        </div>
      )}

      <div style={{ display:'grid',gridTemplateColumns:isDesktop?'repeat(3,1fr)':isTablet?'1fr 1fr':'1fr',gap:14 }}>
        {articles.map((a,i)=>(
          <div key={a.id} style={{ background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #F3F4F6',transition:'transform 0.15s,box-shadow 0.15s' }}
            onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)' }}
            onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ background:a.bg_color||'#EDE9FE',padding:'20px',textAlign:'center' }}>
              <span style={{ fontSize:36 }}>{a.image||'📄'}</span>
            </div>
            <div style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
                <span style={{ background:'#EDE9FE',color:'#7C3AED',borderRadius:6,padding:'3px 8px',fontSize:10,fontWeight:800 }}>{a.category}</span>
                <span style={{ fontSize:11,color:'#9CA3AF' }}>⏱ {a.read_time} mnt</span>
              </div>
              <div style={{ fontWeight:800,fontSize:14,color:'#111827',marginBottom:6,lineHeight:1.4 }}>{a.title}</div>
              <div style={{ fontSize:12,color:'#6B7280',marginBottom:12,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>{a.content||'Tidak ada konten'}</div>
              <div style={{ fontSize:11,color:'#9CA3AF',marginBottom:12 }}>📅 {fmtDate(a.created_at)}</div>
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>openEditArticle(a)} style={{ flex:1,background:'#EDE9FE',color:'#7C3AED',border:'none',borderRadius:10,padding:'8px',fontSize:12,fontWeight:700,cursor:'pointer' }}>✏️ Edit</button>
                <button onClick={()=>setConfirmDelete(a)} style={{ flex:1,background:'#FEE2E2',color:'#DC2626',border:'none',borderRadius:10,padding:'8px',fontSize:12,fontWeight:700,cursor:'pointer' }}>🗑 Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── Ratings Tab ── */
  const RatingsTab = () => (
    <>
      <div style={{ marginBottom:16 }}>
        <h3 style={{ fontWeight:900,fontSize:18,color:'#111827',margin:0 }}>⭐ Rating & Feedback Pengguna</h3>
        <p style={{ color:'#9CA3AF',fontSize:13,margin:'4px 0 0' }}>{ratings.length} ulasan · rata-rata {ratingAvg} dari 5.0</p>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:12,marginBottom:18 }}>
        <div style={{ background:'linear-gradient(135deg,#F59E0B,#FBBF24)',borderRadius:16,padding:'20px',color:'#1E1B4B' }}>
          <div style={{ fontSize:36,fontWeight:900,marginBottom:4 }}>{ratingAvg}</div>
          <div style={{ fontSize:13,fontWeight:700,opacity:0.8 }}>Rata-rata Rating</div>
          <div style={{ fontSize:22,marginTop:4 }}>{'⭐'.repeat(Math.round(ratingAvg))}</div>
        </div>
        <div style={{ background:'white',borderRadius:16,padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:36,fontWeight:900,color:'#7C3AED',marginBottom:4 }}>{ratings.length}</div>
          <div style={{ fontSize:13,color:'#9CA3AF',fontWeight:700 }}>Total Ulasan</div>
        </div>
        <div style={{ background:'white',borderRadius:16,padding:'20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:36,fontWeight:900,color:'#10B981',marginBottom:4 }}>
            {ratings.filter(r=>r.score>=4).length}
          </div>
          <div style={{ fontSize:13,color:'#9CA3AF',fontWeight:700 }}>Rating Positif (≥4)</div>
        </div>
      </div>

      {/* Rating list */}
      {ratings.length===0 && (
        <div style={{ textAlign:'center',padding:60,background:'white',borderRadius:18,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48,marginBottom:10 }}>⭐</div>
          <div style={{ fontWeight:700,fontSize:15 }}>Belum ada rating</div>
          <div style={{ fontSize:13,color:'#9CA3AF',marginTop:4 }}>Rating dari pengguna akan muncul di sini</div>
        </div>
      )}
      <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
        {ratings.map((r,i)=>(
          <div key={r.id} style={{ background:'white',borderRadius:16,padding:'16px 20px',boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:'1px solid #F3F4F6' }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:12,flexWrap:'wrap' }}>
              <div style={{ width:42,height:42,borderRadius:12,flexShrink:0,background:AV[i%AV.length],display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:15 }}>{initials(r.name||'U')}</div>
              <div style={{ flex:1,minWidth:180 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:4 }}>
                  <span style={{ fontWeight:800,fontSize:14 }}>{r.name||'Pengguna'}</span>
                  <span style={{ fontSize:13,color:'#6B7280' }}>{r.email}</span>
                </div>
                <div style={{ display:'flex',gap:2,marginBottom:6 }}>
                  {[1,2,3,4,5].map(s=>(
                    <span key={s} style={{ fontSize:16 }}>{s<=r.score?'⭐':'☆'}</span>
                  ))}
                  <span style={{ marginLeft:6,fontSize:12,fontWeight:800,color:'#F59E0B' }}>{r.score}.0</span>
                </div>
                {r.comment && <div style={{ fontSize:13,color:'#374151',background:'#F9FAFB',borderRadius:10,padding:'8px 12px',borderLeft:'3px solid #7C3AED',marginBottom:8 }}>"{r.comment}"</div>}
                <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                  {r.aspect_design && <span style={{ fontSize:11,background:'#EDE9FE',color:'#7C3AED',borderRadius:6,padding:'2px 8px',fontWeight:700 }}>Desain: {r.aspect_design}</span>}
                  {r.aspect_ease && <span style={{ fontSize:11,background:'#D1FAE5',color:'#065F46',borderRadius:6,padding:'2px 8px',fontWeight:700 }}>Kemudahan: {r.aspect_ease}</span>}
                  {r.aspect_feature && <span style={{ fontSize:11,background:'#FEF3C7',color:'#92400E',borderRadius:6,padding:'2px 8px',fontWeight:700 }}>Fitur: {r.aspect_feature}</span>}
                  {r.aspect_performance && <span style={{ fontSize:11,background:'#ECFEFF',color:'#0E7490',borderRadius:6,padding:'2px 8px',fontWeight:700 }}>Performa: {r.aspect_performance}</span>}
                </div>
              </div>
              <div style={{ fontSize:12,color:'#9CA3AF',flexShrink:0 }}>{timeAgo(r.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── Admins Tab ── */
  const AdminsTab = () => (
    <>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10 }}>
        <div>
          <h3 style={{ fontWeight:900,fontSize:18,color:'#111827',margin:0 }}>🛡️ Daftar Administrator</h3>
          <p style={{ color:'#9CA3AF',fontSize:13,margin:'4px 0 0' }}>{admins.length} admin terdaftar · hanya Super Admin yang bisa menghapus</p>
        </div>
        <button onClick={()=>navigate('/admin-register-request')} style={{ background:'linear-gradient(135deg,#7C3AED,#9333EA)',color:'white',border:'none',borderRadius:12,padding:'10px 18px',fontSize:13,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:'0 4px 14px rgba(124,58,237,0.35)' }}>
          ➕ Daftar Admin Baru
        </button>
      </div>
      {admins.length===0 && (
        <div style={{ textAlign:'center',padding:60,background:'white',borderRadius:18,boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:48,marginBottom:10 }}>🛡️</div>
          <div style={{ fontWeight:700 }}>Belum ada admin</div>
        </div>
      )}
      <div style={{ display:'grid',gridTemplateColumns:isDesktop?'repeat(3,1fr)':isTablet?'1fr 1fr':'1fr',gap:14 }}>
        {admins.map((a,i)=>(
          <div key={a.id} style={{ background:'white',borderRadius:16,padding:18,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:a.id===admin.id?'2px solid #7C3AED':a.role==='superadmin'?'2px solid #F59E0B':'1px solid #F3F4F6',position:'relative',transition:'transform 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform=''}>
            {a.id===admin.id && <div style={{ position:'absolute',top:-1,right:12,background:'#7C3AED',color:'white',fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:'0 0 8px 8px' }}>KAMU</div>}
            {a.role==='superadmin' && a.id!==admin.id && <div style={{ position:'absolute',top:-1,right:12,background:'#F59E0B',color:'white',fontSize:9,fontWeight:800,padding:'3px 8px',borderRadius:'0 0 8px 8px' }}>SUPER ADMIN</div>}
            <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
              <div style={{ width:46,height:46,borderRadius:14,flexShrink:0,background:a.role==='superadmin'?'linear-gradient(135deg,#F59E0B,#FBBF24)':'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center',color:a.role==='superadmin'?'#1E1B4B':'white',fontWeight:900,fontSize:16 }}>{initials(a.name)}</div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:800,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.name}</div>
                <div style={{ fontSize:12,color:'#6B7280',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{a.email}</div>
              </div>
            </div>
            <div style={{ background:a.role==='superadmin'?'#FEF3C7':'#EDE9FE',borderRadius:8,padding:'6px 10px',display:'flex',alignItems:'center',gap:6 }}>
              <span style={{ fontSize:12 }}>{a.role==='superadmin'?'⭐':'🛡️'}</span>
              <span style={{ fontSize:11,color:a.role==='superadmin'?'#92400E':'#5B21B6',fontWeight:700 }}>
                {a.role==='superadmin'?'Super Admin':'Administrator'} · Bergabung {fmtDate(a.created_at)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )

  /* ── Modals ── */
  const ArticleFormModal = () => !showArticleForm ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setShowArticleForm(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:isDesktop?'center':'flex-end',justifyContent:'center',zIndex:600,padding:isDesktop?20:0 }}>
      <div style={{ background:'white',borderRadius:isDesktop?24:'24px 24px 0 0',padding:24,width:'100%',maxWidth:isDesktop?560:'100%',maxHeight:'90vh',overflowY:'auto',animation:isDesktop?'fadeIn 0.2s':'slideUp 0.3s' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
          <h3 style={{ fontWeight:900,fontSize:18,color:'#111827',margin:0 }}>{editingArticle?'✏️ Edit Artikel':'➕ Tambah Artikel Baru'}</h3>
          <button onClick={()=>setShowArticleForm(false)} style={{ background:'#F3F4F6',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:14 }}>✕</button>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
          <div>
            <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5 }}>Judul Artikel *</label>
            <input value={articleForm.title} onChange={e=>setArticleForm(f=>({...f,title:e.target.value}))} placeholder="Masukkan judul artikel..."
              style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit' }}/>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5 }}>Konten / Isi Artikel</label>
            <textarea value={articleForm.content} onChange={e=>setArticleForm(f=>({...f,content:e.target.value}))} rows={4} placeholder="Tulis konten artikel di sini..."
              style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:14,outline:'none',resize:'vertical',boxSizing:'border-box',fontFamily:'inherit' }}/>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5 }}>Kategori</label>
              <select value={articleForm.category} onChange={e=>setArticleForm(f=>({...f,category:e.target.value}))}
                style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:14,outline:'none',cursor:'pointer',fontFamily:'inherit',background:'white' }}>
                {ARTICLE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:5 }}>Waktu Baca (menit)</label>
              <input type="number" min={1} max={60} value={articleForm.read_time} onChange={e=>setArticleForm(f=>({...f,read_time:Number(e.target.value)}))}
                style={{ width:'100%',padding:'10px 14px',border:'1.5px solid #E5E7EB',borderRadius:12,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit' }}/>
            </div>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8 }}>Icon Artikel</label>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {ARTICLE_ICONS.map(ic=>(
                <button key={ic} onClick={()=>setArticleForm(f=>({...f,image:ic}))}
                  style={{ width:42,height:42,border:articleForm.image===ic?'2px solid #7C3AED':'2px solid #E5E7EB',borderRadius:10,background:articleForm.image===ic?'#EDE9FE':'white',fontSize:22,cursor:'pointer',transition:'all 0.15s' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:700,color:'#374151',display:'block',marginBottom:8 }}>Warna Background</label>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {ARTICLE_COLORS.map(c=>(
                <button key={c} onClick={()=>setArticleForm(f=>({...f,bg_color:c}))}
                  style={{ width:36,height:36,borderRadius:9,background:c,border:articleForm.bg_color===c?'3px solid #7C3AED':'2px solid #E5E7EB',cursor:'pointer',transition:'all 0.15s' }}/>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div style={{ background:'#F9FAFB',borderRadius:14,padding:'14px',display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:56,height:56,borderRadius:14,background:articleForm.bg_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0 }}>{articleForm.image}</div>
            <div>
              <div style={{ fontSize:11,color:'#9CA3AF',fontWeight:700,textTransform:'uppercase',marginBottom:2 }}>{articleForm.category} · {articleForm.read_time} mnt</div>
              <div style={{ fontWeight:800,fontSize:14,color:'#111827' }}>{articleForm.title||'Judul artikel...'}</div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex',gap:10,marginTop:20 }}>
          <button onClick={()=>setShowArticleForm(false)} style={{ flex:1,background:'#F3F4F6',border:'none',borderRadius:14,padding:14,fontWeight:700,cursor:'pointer' }}>Batal</button>
          <button onClick={handleSaveArticle} disabled={artLoading} style={{ flex:2,background:'linear-gradient(135deg,#7C3AED,#9333EA)',color:'white',border:'none',borderRadius:14,padding:14,fontWeight:800,cursor:artLoading?'not-allowed':'pointer',opacity:artLoading?0.7:1 }}>
            {artLoading?'⏳ Menyimpan...':(editingArticle?'💾 Simpan Perubahan':'➕ Tambah Artikel')}
          </button>
        </div>
      </div>
    </div>
  )

  const ConfirmDeleteModal = () => !confirmDelete ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setConfirmDelete(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:700,padding:20 }}>
      <div style={{ background:'white',borderRadius:24,padding:28,width:'100%',maxWidth:360,textAlign:'center',animation:'fadeIn 0.2s' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>🗑️</div>
        <h3 style={{ fontWeight:900,fontSize:17,marginBottom:8,color:'#111827' }}>Hapus Artikel?</h3>
        <p style={{ color:'#6B7280',fontSize:13,marginBottom:22 }}>Artikel <strong>"{confirmDelete.title}"</strong> akan dihapus permanen.</p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,background:'#F3F4F6',border:'none',borderRadius:14,padding:13,fontWeight:700,cursor:'pointer' }}>Batal</button>
          <button onClick={()=>handleDeleteArticle(confirmDelete.id)} disabled={loading} style={{ flex:1,background:'#EF4444',color:'white',border:'none',borderRadius:14,padding:13,fontWeight:800,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1 }}>
            {loading?'⏳':'🗑 Hapus'}
          </button>
        </div>
      </div>
    </div>
  )

  const UserModal = () => !selectedUser ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setSelectedUser(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:isDesktop?'center':'flex-end',justifyContent:'center',zIndex:500 }}>
      <div style={{ background:'white',borderRadius:isDesktop?24:'24px 24px 0 0',padding:24,width:'100%',maxWidth:isDesktop?520:'100%',maxHeight:'90vh',overflowY:'auto',animation:isDesktop?'fadeIn 0.2s':'slideUp 0.3s' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
            <div style={{ width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:900,fontSize:18 }}>{initials(selectedUser.name)}</div>
            <div>
              <div style={{ fontWeight:900,fontSize:17 }}>{selectedUser.name}</div>
              <div style={{ fontSize:13,color:'#6B7280' }}>{selectedUser.email}</div>
            </div>
          </div>
          <button onClick={()=>setSelectedUser(null)} style={{ background:'#F3F4F6',border:'none',borderRadius:'50%',width:34,height:34,cursor:'pointer',fontSize:14 }}>✕</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16 }}>
          {[
            { icon:'📅',label:'Bergabung',  value:fmtDate(selectedUser.joinDate) },
            { icon:'⏱', label:'Terakhir Aktif', value:timeAgo(selectedUser.lastActive) },
            { icon:'💸',label:'Transaksi', value:selectedUser.transactions },
            { icon:'✅',label:'Status',    value:'Aktif' },
          ].map(item=>(
            <div key={item.label} style={{ background:'#F3F4F6',borderRadius:12,padding:'10px 12px' }}>
              <div style={{ fontSize:18,marginBottom:2 }}>{item.icon}</div>
              <div style={{ fontSize:17,fontWeight:900 }}>{item.value}</div>
              <div style={{ fontSize:11,color:'#9CA3AF',fontWeight:600 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <button onClick={()=>setSelectedUser(null)} style={{ width:'100%',background:'#7C3AED',color:'white',border:'none',borderRadius:14,padding:14,fontSize:14,fontWeight:800,cursor:'pointer' }}>Tutup</button>
      </div>
    </div>
  )

  const LogoutModal = () => !showLogout ? null : (
    <div onClick={e=>e.target===e.currentTarget&&setShowLogout(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:600,padding:20 }}>
      <div style={{ background:'white',borderRadius:24,padding:28,width:'100%',maxWidth:340,textAlign:'center' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>👋</div>
        <h3 style={{ fontWeight:900,fontSize:18,marginBottom:6 }}>Keluar dari Admin?</h3>
        <p style={{ color:'#6B7280',fontSize:13,marginBottom:22 }}>Kamu akan kembali ke halaman login</p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={()=>setShowLogout(false)} style={{ flex:1,background:'#F3F4F6',border:'none',borderRadius:14,padding:13,fontWeight:700,cursor:'pointer' }}>Batal</button>
          <button onClick={()=>{ removeAdminToken(); navigate('/admin-login') }} style={{ flex:1,background:'#EF4444',color:'white',border:'none',borderRadius:14,padding:13,fontWeight:800,cursor:'pointer' }}>Keluar</button>
        </div>
      </div>
    </div>
  )

  const Toast = () => !toast ? null : (
    <div style={{ position:'fixed',bottom:24,right:24,zIndex:800,background:toast.type==='error'?'#EF4444':toast.type==='info'?'#3B82F6':'#10B981',color:'white',borderRadius:14,padding:'14px 20px',fontSize:13,fontWeight:700,boxShadow:'0 8px 24px rgba(0,0,0,0.2)',animation:'fadeIn 0.2s',maxWidth:320 }}>
      {toast.type==='error'?'❌ ':toast.type==='info'?'ℹ️ ':'✅ '}{toast.msg}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh',background:'#F9FAFB',fontFamily:'var(--font-body,system-ui,sans-serif)' }}>
      <Sidebar/>
      <div style={{ marginLeft:isDesktop?250:0,minHeight:'100vh',display:'flex',flexDirection:'column',transition:'margin-left 0.28s' }}>
        {!isDesktop && <MobileTopBar/>}
        {!isDesktop && <MobileTabBar/>}
        {isDesktop  && <DesktopTopBar/>}
        <main style={{ flex:1,padding:isDesktop?28:16,paddingBottom:48 }}>
          {activeTab==='users'    && <UsersTab/>}
          {activeTab==='stats'    && <StatsTab/>}
          {activeTab==='articles' && <ArticlesTab/>}
          {activeTab==='ratings'  && <RatingsTab/>}
          {activeTab==='admins'   && <AdminsTab/>}
        </main>
      </div>
      <UserModal/><LogoutModal/><ArticleFormModal/><ConfirmDeleteModal/><Toast/>
      <style>{`
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  )
}