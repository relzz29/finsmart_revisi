import React, { useState, useEffect } from 'react'
import { transactionApi } from '../api'
import { categories } from '../api/mockData'
import { useToast } from '../hooks/useToast'
import { useNotifications } from '../hooks/useNotifications'
import BottomNav from '../components/BottomNav'

const fmt = (n) => `Rp ${Math.abs(n).toLocaleString('id-ID')}`

function fmtDate(d) {
  const date = new Date(d), today = new Date(), yest = new Date()
  yest.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'HARI INI'
  if (date.toDateString() === yest.toDateString()) return 'KEMARIN'
  return date.toLocaleDateString('id-ID', { day:'numeric', month:'long' }).toUpperCase()
}

function groupByDate(txs) {
  const g = {}
  txs.forEach(t => { const k = fmtDate(t.date); (g[k] = g[k] || []).push(t) })
  return g
}

export default function Transactions() {
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('semua')
  const [showSheet, setShowSheet] = useState(false)
  const toast = useToast()
  const { addNotif } = useNotifications()

  const load = async () => {
    try {
      const d = await transactionApi.getAll()
      setTxs(d.transactions || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'semua' ? txs : txs.filter(t => t.type === filter)
  const totalIn  = txs.filter(t => t.type === 'masuk').reduce((a, t) => a + Number(t.amount), 0)
  const totalOut = Math.abs(txs.filter(t => t.type === 'keluar').reduce((a, t) => a + Number(t.amount), 0))
  const groups   = groupByDate(filtered)

  return (
    <div className="app-shell">
      <div className="page">

        {/* Header */}
        <div className="flex justify-between items-center" style={{ padding:'clamp(40px,8vw,52px) var(--page-padding) 14px' }}>
          <h1 className="page-title">Transaksi</h1>
          <button
            className="btn btn-primary"
            style={{ width:44, height:44, padding:0, borderRadius:'50%', fontSize:22, flexShrink:0 }}
            onClick={() => setShowSheet(true)}
          >+</button>
        </div>

        {/* Summary */}
        <div style={{ padding:'0 var(--page-padding) 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ background:'var(--success-light)', borderRadius:'var(--radius-sm)', padding:'clamp(12px,3vw,16px)' }}>
            <div style={{ color:'var(--success)', fontSize:12, fontWeight:700 }}>Pemasukan</div>
            <div style={{ color:'var(--success)', fontSize:'clamp(16px,4vw,20px)', fontWeight:900, marginTop:4 }}>+Rp {totalIn.toLocaleString('id-ID')}</div>
          </div>
          <div style={{ background:'var(--danger-light)', borderRadius:'var(--radius-sm)', padding:'clamp(12px,3vw,16px)' }}>
            <div style={{ color:'var(--danger)', fontSize:12, fontWeight:700 }}>Pengeluaran</div>
            <div style={{ color:'var(--danger)', fontSize:'clamp(16px,4vw,20px)', fontWeight:900, marginTop:4 }}>-Rp {totalOut.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="chip-row" style={{ padding:'0 var(--page-padding) 14px' }}>
          {[['semua','Semua'],['keluar','Keluar'],['masuk','Masuk']].map(([v,l]) => (
            <button key={v} className={`chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding:'0 var(--page-padding)' }}>
          {loading
            ? [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:60, marginBottom:8, borderRadius:12 }}/>)
            : filtered.length === 0
              ? <div className="empty-state"><div className="emoji">📭</div><p style={{ fontWeight:700 }}>Belum ada transaksi</p><p style={{ fontSize:13, marginTop:4 }}>Yuk mulai catat!</p></div>
              : Object.entries(groups).map(([date, list]) => (
                  <div key={date}>
                    <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.08em', padding:'12px 0 8px' }}>{date}</div>
                    {list.map(tx => (
                      <TxRow key={tx.id} tx={tx} onDelete={() => {
                        transactionApi.delete(tx.id)
                        setTxs(prev => prev.filter(t => t.id !== tx.id))
                        toast('Transaksi dihapus', 'success')
                      }}/>
                    ))}
                  </div>
                ))
          }
        </div>
        <div style={{ height:20 }}/>
      </div>

      {showSheet && (
        <AddSheet
          onClose={() => setShowSheet(false)}
          onSave={(t) => { setTxs(prev => [t, ...prev]); setShowSheet(false); toast('Transaksi dicatat! ✅', 'success') }}
          onNotify={addNotif}
        />
      )}
      <BottomNav/>
    </div>
  )
}

function TxRow({ tx, onDelete }) {
  const isOut = tx.type === 'keluar'
  const [menu, setMenu] = useState(false)

  return (
    <div className="flex items-center gap-12" style={{ padding:'11px 0', borderBottom:'1px solid var(--border-light)', position:'relative' }}>
      <div style={{ width:42, height:42, borderRadius:12, background: isOut ? '#FEF2F2' : '#ECFDF5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
        {tx.icon || (isOut ? '📤' : '📥')}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'clamp(13px,3.5vw,14px)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.title}</div>
        <div style={{ color:'var(--text-muted)', fontSize:12 }}>{tx.category}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:'clamp(13px,3.5vw,14px)', color: isOut ? 'var(--danger)' : 'var(--success)' }}>
          {isOut ? '-' : '+'}Rp {Math.abs(tx.amount).toLocaleString('id-ID')}
        </div>
      </div>
      <button onClick={() => setMenu(m => !m)} style={{ background:'none', border:'none', color:'var(--text-muted)', fontSize:18, cursor:'pointer', padding:'0 4px', flexShrink:0 }}>⋮</button>
      {menu && (
        <div style={{ position:'absolute', right:0, top:'100%', background:'white', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,0.12)', border:'1px solid var(--border)', zIndex:10, overflow:'hidden', minWidth:120 }}>
          <button onClick={() => { onDelete(); setMenu(false) }} style={{ display:'block', width:'100%', padding:'12px 16px', border:'none', background:'none', color:'var(--danger)', fontWeight:700, fontSize:14, cursor:'pointer', textAlign:'left', fontFamily:'var(--font-body)' }}>
            🗑️ Hapus
          </button>
        </div>
      )}
    </div>
  )
}

function AddSheet({ onClose, onSave, onNotify }) {
  const [type, setType] = useState('keluar')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleSave = async () => {
    if (!amount || !title) { toast('Isi jumlah dan nama transaksi!', 'error'); return }
    setLoading(true)
    const newTx = {
      id: Date.now().toString(),
      title, category: category || 'Lainnya',
      amount: type === 'keluar' ? -Number(amount) : Number(amount),
      type, date: new Date().toISOString(),
      icon: categories.find(c => c.value === category)?.icon || '📦',
    }
    try { await transactionApi.create(newTx) } catch { /* demo mode */ }
    setLoading(false)

    // Kirim notifikasi
    if (onNotify) {
      const isIn = type === 'masuk'
      onNotify({
        type: isIn ? 'income' : 'expense',
        title: isIn ? `Pemasukan Baru 💰` : `Pengeluaran Dicatat 🛒`,
        body: `${title} — Rp ${Number(amount).toLocaleString('id-ID')}`,
      })
    }
    onSave(newTx)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <h3 style={{ fontSize:'clamp(16px,4vw,18px)', fontWeight:800, marginBottom:20, textAlign:'center', fontFamily:'var(--font-display)' }}>📝 Catat Transaksi</h3>

        {/* Type */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20, background:'var(--bg)', borderRadius:12, padding:4 }}>
          {[['keluar','- Pengeluaran'],['masuk','+ Pemasukan']].map(([t,l]) => (
            <button key={t} onClick={() => setType(t)} style={{
              padding:'12px', borderRadius:10, fontWeight:800, fontSize:'clamp(13px,3.5vw,14px)', border:'none', fontFamily:'var(--font-body)',
              background: type===t ? (t==='keluar' ? 'var(--danger)' : 'var(--success)') : 'transparent',
              color: type===t ? 'white' : 'var(--text-muted)', cursor:'pointer', transition:'all 0.2s'
            }}>{l}</button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ color:'var(--text-muted)', fontSize:13, marginBottom:6 }}>IDR</div>
          <input
            type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
            style={{ fontSize:'clamp(28px,8vw,40px)', fontWeight:900, textAlign:'center', border:'none', outline:'none',
              color: type==='keluar' ? 'var(--danger)' : 'var(--success)', background:'none', width:'100%', fontFamily:'var(--font-display)' }}
          />
        </div>

        {/* Categories */}
        <div style={{ marginBottom:14 }}>
          <div className="input-label" style={{ marginBottom:10 }}>Kategori</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
            {categories.map(cat => (
              <button key={cat.value} onClick={() => setCategory(cat.value)} style={{
                padding:'8px 4px', borderRadius:12, border:`2px solid ${category===cat.value ? 'var(--primary)' : 'var(--border)'}`,
                background: category===cat.value ? 'var(--primary-xlight)' : 'white',
                cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                transition:'all 0.15s', overflow:'hidden'
              }}>
                <div style={{ width:44, height:44, borderRadius:10, overflow:'hidden', flexShrink:0, border: category===cat.value ? '2px solid var(--primary)' : '2px solid transparent' }}>
                  <img
                    src={cat.img}
                    alt={cat.label}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                  />
                  <div style={{ display:'none', width:'100%', height:'100%', alignItems:'center', justifyContent:'center', fontSize:22, background:'#f3f4f6' }}>{cat.icon}</div>
                </div>
                <span style={{ fontSize:'clamp(9px,2.5vw,10px)', fontWeight:700, color: category===cat.value ? 'var(--primary)' : 'var(--text-muted)', textAlign:'center', lineHeight:1.2 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Nama Transaksi</label>
          <input className="input-field" placeholder="Contoh: Makan Siang" value={title} onChange={e => setTitle(e.target.value)}/>
        </div>

        <button className="btn btn-success w-full" style={{ padding:'clamp(13px,3vw,16px)', fontSize:'clamp(14px,4vw,16px)', marginTop:4 }} onClick={handleSave} disabled={loading}>
          {loading ? <div className="spinner"/> : 'Simpan ✓'}
        </button>
      </div>
    </div>
  )
}