# 📋 Executive Summary
Rapat ini membahas dua agenda strategis utama: (1) **Roadmap Perizinan & Kelayakan Operasional Fintech/LJK** (termasuk struktur modal, KPLI, SOP, IT Blueprint, dan kepatuhan ISO 27001/OJK), serta (2) **Restrukturisasi Model Harga & Skema Pembayaran (TOP)** untuk mengatasi risiko hukum, margin distributor, dan integrasi sistem MSS-CPD. Keputusan kunci meliputi penetapan standar biaya layanan 0,5% per 15 hari, inisiasi review legal untuk mitigasi risiko "disguised interest", serta penetapan jadwal sinkronisasi mingguan (Jumat 14:00) untuk finalisasi SOP dan spesifikasi integrasi IT.

# 💬 Discussion Highlights & Key Decisions

### 1. Roadmap Perizinan Lembaga Jasa Keuangan (LJK) & Kepatuhan OJK
- **Struktur Modal & KPLI**: Dikonfirmasi kebutuhan modal minimum **Rp 50 Miliar** untuk penyelenggara. KPLI modal pensiun/penyelenggara harus terpenuhi sebelum tahap *Presentasi Info* ke OJK.
- **Dokumentasi Kritis**: *Business Plan*, *IT Blueprint*, SOP Operasional, dan Kebijakan Keamanan Siber (ISO 27001) harus siap **sebelum** wawancara Direksi & Pengendalian (Fit and Proper Test) serta Uji Kelayakan Tertutup OJK.
- **Standar Keamanan**: Wajib adopsi **ISO 27001** (dan referensi ISO 27005) untuk *Information Security, Cyber Security, and Privacy Protection* sebagai prasyarat kelulusan OJK.
- **Integrasi Eksternal**: Sistem wajib terintegrasi dengan **SLIK (OJK)** untuk pelaporan kredit real-time (tagihan, pembayaran, restrukturisasi).
- **Status Saat Ini**: Dokumen persiapan (SOP, Akta, Perizinan) **sudah 90% siap**, menunggu eksekusi *signing* dan *notaris* (target Agustus). Blokir utama: ketergantungan *timeline* notaris/legal eksternal.

### 2. Restrukturisasi Model Harga & Skema TOP (Terms of Payment)
- **Masalah Fundamental**: Praktik saat ini (harga barang sudah termasuk tempo 45-60 hari tanpa transparansi biaya bunga) berpotensi **risiko hukum** (disguised interest/usury) dan menyulitkan *reconciliation* keuangan.
- **Keputusan Model Baru (Cash Price Basis)**:
    - **Harga Dasar (Cash Price)**: Harga tunai murni (tanpa biaya tempo) ditampilkan sebagai *default* di UI.
    - **Biaya Layanan (Service Fee)**: Dikenakan **0,5% per 15 hari** keterlambatan/perpanjangan tempo (contoh: Tempo 30→45 hari = +0,5%; 30→60 hari = +1,0%).
    - **Plafon Maksimal**: Tempo maksimal **90 hari** (biaya +1,5% dari harga tunai).
    - **Otomatisasi**: Sistem *harus* *auto-generate* invoice & penalty biaya layanan saat melewati *due date* (eliminasi proses manual).
- **Master Data Harga**: Persentase biaya layanan **ditetapkan pusat oleh MSS (Master Standard)**, bukan oleh Distributor per produk, untuk memastikan konsistensi & kepatuhan.
- **Transparansi UI**: Tampilan *frontend* wajib menampilkan: `Harga Tunai` + `Opsi Tempo (30/45/60/90 hari)` + `Total Biaya Layanan` sebelum *checkout*.

### 3. Integrasi Sistem & Kesiapan Operasional (MSS vs CPD)
- **Kendala Arsitektur**: CPD (Central Distribution) saat ini **belum terintegrasi** dengan MSS (data *timeline* PO/Invoice tidak *sync*). CPD dikelola *vendor* terpisah → *dependency* eksternal tinggi.
- **Strategi Mitigasi**:
    - MSS menyiapkan **API Standard & Dokumentasi Integrasi** terlebih dahulu (*single standard* untuk semua *stakeholder*).
    - Jika CPD tidak siap *go-live* bersamaan, MSS **jalankan *standalone* dengan integrasi *batch/manual* sementara**, namun CPD wajib mengikuti standar API MSS.
    - *No forced migration*: Komunikasi ke *management* bahwa "Sistem MSS Siap, Menunggu Kesiapan CPD".
- **Aging Piutang & Kolektibilitas**: Data menunjukkan **Rp 6,4 Miliar** piutang tertunggak (bulan Jan-Mei) akibat tidak adanya sistem *penalty* otomatis & ketergantungan kolektibilitas Distributor. Model baru wajib mengunci *credit limit* otomatis saat *overdue*.

### 4. Tata Kelola & Ritme Kerja
- **Weekly Sync**: Disepakati **Setiap Jumat Jam 14:00** untuk *review* progres SOP, Integrasi IT, Legal Review, dan *Business Plan* Fintech.
- **Target Timeline SOP**: Finalisasi SOP Operasional & IT **Agustus**, *Sign-off* & Eksekusi **Awal Oktober**.

# ⚡ Action Items & Ownership

| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority |
| :--- | :--- | :--- | :--- |
| **Finalisasi & *Sign-off* Dokumen Pendirian LJK** (Akta, SK Direksi, Modal 50M) | Legal / Corporate Secretary / Dir. Utama | **Agustus 2024** | **High** |
| **Penyusunan Business Plan & IT Blueprint** (Termasuk Arsitektur ISO 27001) | CTO / CISO / Head of Product | **Agustus 2024** | **High** |
| **Review Legal Model Harga Baru** (Validasi "Biaya Layanan" vs "Bunga", Risiko UU Perbankan/P2PL) | Legal Counsel / Compliance | **Minggu Depan (Sebelum Jumat)** | **High** |
| **Desain UI/UX *Pricing Engine*** (Tampilan Harga Tunai + Opsi TOP + Kalkulasi Otomatis 0.5%/15hr) | Product Manager / Lead FE / UX | **2 Minggu (Target Sprint Berikut)** | **High** |
| **Pembuatan Spesifikasi API Integrasi Standar MSS** (Endpoint SLIK, CPD, Distributor) | Lead Backend / System Architect | **1 Minggu** | **High** |
| **Sosialisasi Standar API ke Tim CPD (Vendor Eksternal)** & Negosiasi *Timeline* | Project Manager / CTO | **2 Minggu** | **High** |
| **Implementasi Modul *Auto-Penalty & Credit Limit Lock*** (Backend Logic untuk Biaya Layanan & Blokir Overdue) | Backend Team / QA | **3 Ming