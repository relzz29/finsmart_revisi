import express  from 'express'
import { randomUUID } from 'crypto'
import { pool } from '../config/db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// ─── Helper: sync budget_categories.used dari transaksi bulan ini ────────────
async function syncBudgetUsed(userId) {
  const month = new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
  const [budgets] = await pool.query(
    'SELECT * FROM budgets WHERE user_id = ? AND month = ?',
    [userId, month]
  )
  if (!budgets.length) return

  const budgetId = budgets[0].id
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [sums] = await pool.query(
    `SELECT category, SUM(amount) AS total
     FROM transactions
     WHERE user_id = ? AND type = 'keluar' AND date >= ?
     GROUP BY category`,
    [userId, startOfMonth]
  )

  // Mapping kategori transaksi → kategori budget
  const categoryMap = {
    'Makanan': 'Kebutuhan', 'Transportasi': 'Kebutuhan',
    'Tagihan': 'Kebutuhan', 'Kesehatan': 'Kebutuhan',
    'Hiburan': 'Keinginan', 'Belanja': 'Keinginan',
    'Hobi': 'Keinginan',   'Lainnya': 'Keinginan',
    'Tabungan': 'Tabungan', 'Investasi': 'Tabungan',
  }

  const budgetUsed = { Kebutuhan: 0, Keinginan: 0, Tabungan: 0 }
  for (const row of sums) {
    const budgetCat = categoryMap[row.category] || 'Keinginan'
    budgetUsed[budgetCat] += parseFloat(row.total)
  }

  const [cats] = await pool.query('SELECT * FROM budget_categories WHERE budget_id = ?', [budgetId])
  for (const cat of cats) {
    await pool.query('UPDATE budget_categories SET used = ? WHERE id = ?', [budgetUsed[cat.name] || 0, cat.id])
  }
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [req.user.id])
    res.json({ transactions: rows })
  } catch (err) { res.status(500).json({ message: 'Gagal mengambil data transaksi.' }) }
})

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT SUM(CASE WHEN type='masuk' THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN type='keluar' THEN amount ELSE 0 END) AS expense
       FROM transactions WHERE user_id = ?`, [req.user.id]
    )
    const income = parseFloat(rows[0].income || 0), expense = parseFloat(rows[0].expense || 0)
    res.json({ income, expense, balance: income - expense })
  } catch (err) { res.status(500).json({ message: 'Gagal mengambil ringkasan.' }) }
})

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!rows.length) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' })
    res.json(rows[0])
  } catch (err) { res.status(500).json({ message: 'Terjadi kesalahan server.' }) }
})

router.post('/', authMiddleware, async (req, res) => {
  const { title, category, amount, type, icon, date } = req.body
  if (!title || !category || amount === undefined || !type)
    return res.status(400).json({ message: 'title, category, amount, dan type wajib diisi.' })
  if (!['masuk','keluar'].includes(type))
    return res.status(400).json({ message: 'type harus "masuk" atau "keluar".' })
  try {
    const id = randomUUID()
    await pool.query(
      'INSERT INTO transactions (id, user_id, title, category, amount, type, icon, date) VALUES (?,?,?,?,?,?,?,?)',
      [id, req.user.id, title, category, Math.abs(amount), type, icon || '💰', date ? new Date(date) : new Date()]
    )
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [id])
    if (type === 'keluar') await syncBudgetUsed(req.user.id).catch(e => console.error('syncBudget:', e))
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Gagal menyimpan transaksi.' }) }
})

router.put('/:id', authMiddleware, async (req, res) => {
  const { title, category, amount, type, icon, date } = req.body
  try {
    const [exist] = await pool.query('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!exist.length) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' })
    const updates = [], values = []
    if (title)    { updates.push('title = ?');    values.push(title) }
    if (category) { updates.push('category = ?'); values.push(category) }
    if (amount !== undefined) { updates.push('amount = ?'); values.push(Math.abs(amount)) }
    if (type)     { updates.push('type = ?');     values.push(type) }
    if (icon)     { updates.push('icon = ?');     values.push(icon) }
    if (date)     { updates.push('date = ?');     values.push(new Date(date)) }
    if (!updates.length) return res.status(400).json({ message: 'Tidak ada data yang diubah.' })
    values.push(req.params.id)
    await pool.query(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values)
    const [rows] = await pool.query('SELECT * FROM transactions WHERE id = ?', [req.params.id])
    await syncBudgetUsed(req.user.id).catch(e => console.error('syncBudget:', e))
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ message: 'Gagal mengupdate transaksi.' }) }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [exist] = await pool.query('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.user.id])
    if (!exist.length) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' })
    await pool.query('DELETE FROM transactions WHERE id = ?', [req.params.id])
    await syncBudgetUsed(req.user.id).catch(e => console.error('syncBudget:', e))
    res.json({ success: true, message: 'Transaksi berhasil dihapus.' })
  } catch (err) { res.status(500).json({ message: 'Gagal menghapus transaksi.' }) }
})

export default router