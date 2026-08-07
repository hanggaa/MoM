# 📋 Executive Summary
Rapat harian membahas progres sprint mingguan (target 7 story tersisa diselesaikan minggu ini), ketergantungan *breakdown* WBS oleh tim eksternal (Jumat depan), serta *blocker* kritis performa Android. Keputusan arsitektur utama disepakati pada *scheduler* inquiry status (jadwal tetap jam 09:00 + interval 30 menit) dan proposal *dedicated server* untuk *payment flag* guna mengoptimalkan biaya. Perubahan alur bisnis *Reconstruction* (2x snapshot harian) dan migrasi fitur *Saldo* ke *Voucher* (hindari PPN) dikonfirmasi memerlukan penyelarasan SOP dengan Finance.

# 💬 Discussion Highlights & Key Decisions
- **Progres Sprint & WBS**: Sisa 7 *story* wajib diselesaikan minggu ini. *Design* baru finalisasi *post-WBS*. Tim menunggu *breakdown* WBS 1.1 dari *vendor/mitra* paling lambat **Jumat depan** untuk melanjutkan *breakdown* internal.
- **Bloker Android (Critical)**: Performa aplikasi di Android (Mawi) menjadi *blocker* rilis; iOS stabil. Kode *backend* valid, masalah spesifik di *native Android*. Investigasi ditugaskan ke **Mas Peggy**.
- **Arsitektur Scheduler & Inquiry Status (Keputusan Final)**:
  - Model *event-driven* (30 menit *post-inquiry*) **ditolak** oleh IT.
  - **Disepakati**: *Fixed Schedule* — Deploy jam 09:00, kemudian *cron job* setiap 30 menit.
  - **Implikasi Biaya**: *Hit* API *inquiry status* untuk transaksi *unpaid* menimbulkan biaya. **Solusi**: Mempersiapkan *dedicated server* terpisah untuk *Payment Flag* (isolasi dari layanan lain) guna menghindari *status check* berulang dan mengontrol *cost*.
- **Alur Reconstruction & UED**:
  - Proses **2x Rekonstruksi**: (1) Upload dokumen VA/Internal (jam 00:00) → Eligible Disperse; (2) Upload *Bank Statement* (BCA) → Matching.
  - **UED Blocker**: *Inquiry Request ID* belum tersimpan untuk alur baru (mencegah UED *end-to-end*). **Workaround**: Gunakan *Payment Request ID* (sudah tersimpan) untuk pengujian *Payment Flag* terlebih dahulu.
- **Perubahan SOP Finance & Fitur Saldo**:
  - **Rekonsiliasi**: Bergeser dari 1x aksi harian ke **2x Snapshot Harian** (Midnight: Transaksi Internal/SJ; Pagi: *Bank Statement* BCA).
  - **Fitur Saldo → Voucher**: Inisiatif **Pak Willi/Bu Desi** untuk mengubah *grant saldo* jadi *voucher* guna menghindari beban PPN ganda (pada *payment* & *saldo*). Memerlukan *refactor* *business flow* signifikan.

# ⚡ Action Items & Ownership
| Action Item & Deliverable | PIC (Person In Charge) | Due Date / Timeline | Priority |
|---|---|---|---|
| Menyelesaikan sisa 7 Story Sprint | Tim Development (Lead: "Lu"/Counterpart) | **Akhir Minggu Ini** | **High** |
| Menyediakan *Breakdown* WBS 1.1 | Tim Mitra / Vendor Eksternal | **Jumat Depan (Deadline Hard)** | **High** |
| Investigasi & Resolusi *Blocker* Performa Android (Mawi) | **Mas Peggy** / Mas Mawi | Sebelum Rilis Minggu Ini | **Critical** |
| Finalisasi Implementasi *Scheduler* Inquiry Status (Fixed: 09:00 + 30min interval) | Backend Team / IT | Minggu Ini | **High** |
| *Provisioning* *Dedicated Server* untuk *Payment Flag* (Isolasi Biaya & Performa) | DevOps / Infra / IT | Sebelum *Deploy* Production | **High** |
| Implementasi Penyimpanan `Inquiry Request ID` (Unblock UED Alur Baru) | Backend Team | Prioritas Paralel | **Medium** |
| Persiapan Data & Skenario UED menggunakan `Payment Request ID` (Workaround) | QA / PM ("Gue") | Minggu Ini | **Medium** |
| Penyusunan SOP Rekonsiliasi Baru (2x Snapshot: Midnight & Morning BCA) | **Pak Anjar** / Finance / PM | Sebelum *Go-Live* Fitur | **High** |
| Analisis Dampak & Rencana Migrasi Fitur `Saldo` → `Voucher` (PPN) | **Pak Willi** / Bu Desi / PM / Backend | **Rapat Besok (dengan Bu Desi)** | **Medium** |

# ⚠️ Risks, Constraints & Open Questions
- **Ketergantungan Eksternal (Critical Path)**: Keterlambatan *breakdown* WBS dari mitra (Jumat depan) akan mendorong *cascading delay* pada *breakdown* internal dan pelaksanaan sprint berikutnya.
- **Bloker Rilis Android**: Ketidakpastian *root cause* di *native Android* (Mawi) berisiko menggeser jadwal rilis mingguan. Butuh *fallback plan* (mis. *hotfix* konfigurasi / *tweak* spesifik Android) jika investigasi Peggy melebihi batas waktu.
- **Biaya Operasional (Cost Overrun)**: Model *scheduler* fixed interval 30 menit akan *hit* API *inquiry status* massal untuk *unpaid transactions*. *Dedicated server* untuk *Payment Flag* adalah mitigasi wajib; biaya infrastruktur tambahan butuh *approval* manajemen.
- **Kesiapan UED**: Alur *Reconstruction* baru tidak bisa diuji *end-to-end* (UED) sebelum `Inquiry Request ID` tersimpan di *create inquiry*. Risiko *bug* logika bisnis terdeteksi larut di *staging/production*.
- **Perubahan SOP Finance (Scope Creep)**: Migrasi `Saldo` ke `Vou