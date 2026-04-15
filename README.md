# 💜 FinSmart — Aplikasi Manajemen Keuangan Cerdas untuk Gen Z

> **Uangmu, hidupmu.** — Solusi web app modern, intuitif, dan edukatif untuk Gen Z Indonesia.

---

## 📋 Tentang Proyek

**FinSmart** adalah aplikasi manajemen keuangan berbasis web yang dirancang khusus untuk Gen Z Indonesia, terutama pelajar SMK dan mahasiswa. Aplikasi ini hadir sebagai solusi atas rendahnya literasi keuangan Gen Z (38,03% — OJK, 2024).

**Tema:** Revolusi Teknologi Keuangan (Fintech) untuk Generasi Muda
**Program:** Coding Camp 2026 × DBS Foundation
**Kode Tim:** CC26-PS026

---

## 🎨 Mockup Desain

Desain UI/UX aplikasi dapat dilihat pada tautan berikut:.

🔗 **[Lihat Mockup di Figma](https://www.figma.com/design/mtSFB2HF7INq9St6WsSCXl/Untitled?node-id=0-1&t=aY083wa2mEfsJJBQ-1)**

---

## 👥 Tim Pengembang

| Nama | ID | Peran |
|---|---|---|
| M. Yusuf Al Akil | CFS022D6Y233 | Project Manager / Fullstack |
| Shyfha Ambar Sari | CFS022D6X230 | UI/UX Designer |
| M. Fadil Suparman | CFS022D6Y237 | Frontend Developer |
| Rangga Danadyaksa | CFS022D6Y231 | Backend Developer |
| Farell Giekady | CFS022D6Y234 | Database Engineer |

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|---|---|
| 📊 **Dashboard Keuangan** | Ringkasan saldo, pemasukan & pengeluaran dengan grafik interaktif |
| 💸 **Manajemen Transaksi** | CRUD transaksi dengan 7 kategori, filter & riwayat lengkap |
| 🎯 **Budget 50/30/20** | Alokasi otomatis: 50% Kebutuhan, 30% Keinginan, 20% Tabungan + alert |
| 📈 **Simulasi Investasi** | Kalkulator deposito & reksa dana dengan proyeksi grafik |
| 📚 **Edukasi Keuangan** | Artikel dikurasi: Investasi, Tabungan, Budgeting, Pay Later |
| 🔔 **Notifikasi In-App** | Peringatan budget hampir habis & pengingat keuangan personal |
| 👤 **Manajemen Profil** | Edit profil, avatar, dan pengaturan akun pengguna |
| 🛡️ **Panel Admin** | Dashboard admin untuk manajemen pengguna dan konten |

---

## 🛠️ Teknologi yang Digunakan

### Frontend
- **React 18 + Vite** — UI Library & Module Bundler
- **Custom CSS Design System** — Styling dengan CSS Variables & design tokens
- **Axios** — HTTP Client dengan interceptor & token management
- **Recharts** — Visualisasi grafik interaktif

### Backend
- **Express.js + Node.js** — RESTful API
- **JWT (JSON Web Token)** — Autentikasi & keamanan sesi
- **Helmet.js** — Security middleware
- **express-rate-limit** — Rate limiting untuk keamanan API

### Database
- **MySQL** — Database relasional
- **mysql2** — MySQL driver untuk Node.js

### Deployment
- **Vercel** — Frontend hosting
- **Railway** — Backend & database hosting

---

## 🚀 Cara Menjalankan Proyek Secara Lokal

### Prasyarat
Pastikan sudah terinstal:
- [Node.js](https://nodejs.org/) v18+
- [npm](https://www.npmjs.com/)
- MySQL (via [XAMPP](https://www.apachefriends.org/) atau instalasi langsung)
- [Git](https://git-scm.com/)

---

### 1. Clone Repository

```bash
git clone https://github.com/myusufalakil-prog/finsmart.git
cd finsmart
```

---

### 2. Install Dependencies

```bash
npm install
```

---

### 3. Setup Database

1. Buka **XAMPP** → Start **Apache** & **MySQL**
2. Buka **phpMyAdmin** → `http://localhost/phpmyadmin`
3. Buat database baru: `finsmart_db`
4. Import file `finsmart_db.sql` yang ada di root proyek

---

### 4. Setup Environment Variables

Buat file `.env` di root proyek:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=finsmart_db
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
```

---

### 5. Jalankan Proyek

Jalankan backend dan frontend secara bersamaan:

```bash
npm run dev
```

Atau jalankan terpisah:

```bash
# Backend saja
npm run server

# Frontend saja
npm run client
```

- **Frontend** berjalan di: `http://localhost:5173`
- **Backend API** berjalan di: `http://localhost:5000`

---

## 📁 Struktur Proyek

```
finsmart/
├── config/
│   └── db.js                  # Konfigurasi koneksi MySQL
├── middleware/
│   ├── auth.js                # JWT authentication middleware
│   └── rateLimiter.js         # Rate limiting middleware
├── routes/
│   ├── auth.js                # Endpoint autentikasi
│   ├── transactions.js        # Endpoint transaksi
│   ├── budgets.js             # Endpoint budget
│   ├── articles.js            # Endpoint artikel edukasi
│   ├── dashboard.js           # Endpoint dashboard
│   ├── notifications.js       # Endpoint notifikasi
│   ├── ratings.js             # Endpoint rating
│   └── simulations.js         # Endpoint simulasi investasi
├── src/
│   ├── api/
│   │   └── index.js           # Axios instance & API calls
│   ├── components/
│   │   ├── BottomNav.jsx      # Navigasi bawah (mobile)
│   │   ├── SideNav.jsx        # Navigasi samping (desktop)
│   │   └── NotifPanel.jsx     # Panel notifikasi
│   ├── hooks/
│   │   ├── useAuth.jsx        # Custom hook autentikasi
│   │   ├── useNotifications.jsx
│   │   └── useToast.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   ├── Budget.jsx
│   │   ├── Simulation.jsx
│   │   ├── Education.jsx
│   │   ├── Notifikasi.jsx
│   │   ├── Profile.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Onboarding.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── SuperAdminDashboard.jsx
│   │   └── BantuanFAQ.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css              # Global design system & CSS variables
├── server.js                  # Entry point Express server
├── finsmart_db.sql            # Schema & seed database
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|---|---|---|
| `POST` | `/v1/auth/register` | Registrasi pengguna baru |
| `POST` | `/v1/auth/login` | Login & mendapatkan JWT token |

### Transaksi
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/v1/transactions` | Ambil semua transaksi user |
| `GET` | `/v1/transactions/:id` | Ambil detail transaksi |
| `POST` | `/v1/transactions` | Tambah transaksi baru |
| `PUT` | `/v1/transactions/:id` | Update transaksi |
| `DELETE` | `/v1/transactions/:id` | Hapus transaksi |

### Budget
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/v1/budgets` | Ambil data budget 50/30/20 |
| `POST` | `/v1/budgets` | Set budget |
| `PUT` | `/v1/budgets/:id` | Update budget |

### Lainnya
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/v1/articles` | Ambil artikel edukasi |
| `GET` | `/v1/dashboard` | Data ringkasan dashboard |
| `GET` | `/v1/notifications` | Ambil notifikasi user |
| `GET` | `/v1/simulations` | Data simulasi investasi |
| `POST` | `/v1/ratings` | Kirim rating aplikasi |

---

## 🌐 Deployment

| Platform | URL | Keterangan |
|---|---|---|
| **Vercel** | [finsmart-eight.vercel.app](https://finsmart-eight.vercel.app) | Frontend (React + Vite) |
| **Railway** | *(backend URL)* | Backend API + MySQL |

---

## 📊 Analisis SWOT

| | |
|---|---|
| 💪 **Strengths** | Tim multidisiplin, tema relevan, Figma design system selesai, semua anggota aktif |
| ⚠️ **Weaknesses** | Waktu pengerjaan terbatas (4–5 minggu), pengalaman deployment produksi masih terbatas |
| 🚀 **Opportunities** | Kebutuhan literasi keuangan Gen Z tinggi, ekosistem open source Node.js kaya |
| 🛡️ **Threats** | Kompetitor mature (Spendee, Mint), risiko bug teknis menjelang deadline |

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan **Coding Camp 2026 × DBS Foundation**.
© 2026 Tim CC26-PS026 — SMKN 1 Ciomas
