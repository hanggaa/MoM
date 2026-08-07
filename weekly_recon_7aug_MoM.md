# 📋 Executive Summary
Rapat mingguan **Weekly-Recon-7Aug** berfokus pada sinkronisasi proses rekonsiliasi pembayaran distributor (MSS), mekanisme *cashback* pembayaran awal, serta alur penanganan *cancel order*, *partial cancel*, dan *retur* yang memengaruhi pencairan dana. Tim sepakat memperketat sinkronisasi data antara sistem CPD dan MSS pada *window* jam 23:00–05:00, mendefinisikan ulang *trigger* pembayaran berbasis SJ/Order Number, serta mengidentifikasi kebutuhan R&D untuk harmonisasi *cut-off time* antar *payment channel* (BCA vs ISPE). Target penyelesaian implementasi sistem ditetapkan pada Desember–Januari.

# 💬 Discussion Highlights & Key Decisions
- **Mekanisme Trigger Pembayaran Distributor (MSS):**
    - Diklarifikasi bahwa **Surat Jalan (SJ) / Order Number** menjadi *trigger* utama pencairan dana ke distributor, menandakan barang fisik telah tiba di toko.
    - Jika konsep *transfer first* (sebelum SJ diterima) diterapkan, diperlukan validasi ketat agar distributor tidak klaim *cashback* atas dana yang belum dicairkan ke toko.
- **Kebijakan Cashback & *Timing Difference*:**
    - Rumus *cashback*: `(Hari Jatuh Tempo - Hari Bayar) - 2 hari) x 0.2%` dibayarkan ke distributor.
    - **Keputusan:** Perhitungan *cashback* berbasis **tanggal toko bayar**, bukan tanggal cair ke distributor. Risiko *timing gap* (distributor klaim 30 hari tapi dana baru tersisa 20 hari) diakui namun dinilai *impact*-nya kecil.
- **Proses Cancel Order, Partial Cancel & Retur:**
    - **Cancel Order (Full):** Finance wajib *verify* ke distributor apakah ada pengembalian dana; potongan dilakukan pada pencairan hari ini.
    - **Partial Cancel / Retur:** Mekanisme *debit note* di sisi MSS diperlukan agar sistem mengikuti. Saat ini proses retur masih **manual** (belum terintegrasi modul retur otomatis).
    - **Keputusan:** Setiap retur yang masuk harus *tagging* ulang/dikurangi dari pencairan berikutnya (*netting off*).
- **Sinkronisasi Data CPD → MSS (*Nightly Batch*):**
    - **Window Operasional:** Jam **23:00 – 05:00**. Data saldo & invoice (cicilan 1) harus *fully collected* **sebelum jam 12:00 malam** (idealnya 23:59) agar MSS bisa proses pagi hari.
    - **Buffer Koleksi:** Diterapkan **toleransi 30 menit** *post cut-off* untuk memastikan data *latest* terkumpul (contoh: cut-off 13:00 → ambil data 13:30).
- **Harmonisasi *Cut-off Time* Multi-Channel (R&D Required):**
    - Teridentifikasi perbedaan SLA: **BCA (+30 menit)** vs **ISPE (+3 Jam / 5 menit batch)**.
    - **Kebutuhan R&D:** Perlu pengembangan untuk menyamakan logika *cut-off* agar implementasi tidak *spaghetti code* dan memenuhi *deadline* Desember/Januari.
- **Dokumentasi & Knowledge Transfer:**
    - Ditegaskan pentingnya **dokumentasi 100% proses (AIK/Onboarding Docs)** untuk menghindari *knowledge stuck* saat regenerasi tim.

# ⚡ Action Items & Ownership
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority (High / Med / Low) |
|---|---|---|---|
| Finalisasi & validasi logika *trigger* pembayaran berbasis SJ/Order Number di sistem MSS | Tim MSS / Pak Willy | Minggu Depan (Sebelum Sprint Berikutnya) | **High** |
| Sosialisasi & *enforcement* kebijakan: Perhitungan *cashback* berbasis `Tanggal Bayar Toko` (bukan tanggal cair Distributor) | Tim Finance / Ops | Segera (Effective Immediately) | **High** |
| Pembuatan SOP & *System Requirement* untuk modul **Debit Note Retur/Partial Cancel** di MSS (menggantikan proses manual) | Tim Product / IT (R&D) | Target Implementasi: **Desember 2024** | **High** |
| Pengembangan R&D harmonisasi *Cut-off Time* antar Channel (BCA: +30 menit vs ISPE: +3 Jam/5 menit) untuk menghindari *spaghetti code* | Tim R&D / Pak Willy / Mas Arita | **Desember 2024 – Januari 2025** | **High** |
| Penyempurnaan *Nightly Batch Job* CPD→MSS: *Lock* schedule koleksi data **maksimal 23:59** dengan buffer validasi **30 menit** | Tim IT / Infra | Minggu Depan | **High** |
| Penyusunan Dokumentasi Proses End-to-End (AIK) untuk Onboarding Tim Baru (Recon, MSS, Retur, Cashback) | Bu Desi / Tim Knowledge Management | 2 Minggu Kedepan | **Medium** |
| Validasi *edge case* "Distributor klaim *cashback* tapi dana belum transfer" (Monitoring *timing gap*) | Tim Finance / Audit Internal | Bulanan | **Medium** |

# ⚠️ Risks, Constraints & Open Questions
- **Risiko Keterlambatan R&D (Critical Path):** *Deadline* Desember/Januari sangat ketat ("kampret") untuk mengharmonisasi logika *cut-off* multi-channel (BCA/ISPE). Keterlambatan berisiko melahirkan *technical debt* (*spaghetti code*) dan gagal *go-live*.
- **Ketergantungan Proses Manual Retur:** Saat ini retur & *partial cancel* belum terotomatisasi (butuh *debit note* manual). Risiko *human error* & *reconciliation mismatch* tinggi hingga modul sistem *live*.
- **Sinkronisasi *Cut-off* CPD→MSS:** Jika data saldo/invoice tidak *fully collected* sebelum jam 00:00, proses pencairan pagi hari (MSS) akan *delay* atau menggunakan data *stale*.
- **Tidak Ada PIC Explisit untuk Dokumentasi (AIK):** Meskipun disepakati pentingnya, belum ada *owner* tunggal & *deadline* pasti untuk deliverable dokumentasi 100%.
- **Open Question - Validasi Distributor saat Cancel:** Proses *verify* ke distributor ("apakah ada pengembalian dana?") saat *full cancel* masih berbasis komunikasi manual, belum ada *system-enforced workflow* (misal: *block* pencairan otomatis hingga *clearance*).
- **Open Question - *Timing Gap* Cashback:** Meskipun dinilai kecil, belum ada simulasi kuantitatif *worst-case scenario* *timing gap* (Distributor klaim 30 hari, dana tersisa 20 hari) terhadap *cash flow* distributor