# 📰 Meeting News & Recap

Dalam daily standup **Test2-Daily10Agustus** yang berlangsung pada hari Senin, 10 Agustus, tim produk dan teknologi menyinkronkan progres *sprint* serta menyelesaikan sejumlah *blocker* lintas fungsi yang melibatkan Finance, IT, dan *stakeholder* eksternal (BNN & CPD). Pembicaraan dibuka dengan isu kritis aliran kas: **ketidaksepakatan terkait pencairan dana tanpa Surat Jalan (SJ)**. Wakil Finance, Bu Francisca, dan Pak Bili menegaskan bahwa pencairan *cashback* ke distributor tidak boleh dieksekusi sebelum SJ tersedia, mengingat SJ menjadi bukti fisik barang telah diterima toko—sejalan dengan praktik *marketplace* umum dan kebutuhan *compliance* sistem CPD di masa depan [`[00:31`](timestamp://00:31), `[03:14`](timestamp://03:14)]. Keputusan ini menutup perdebatan formula *cashback* yang dinilai merugikan distributor jika dihitung sejak tanggal bayar toko tanpa jaminan pengiriman [`[02:12`](timestamp://02:12)].

Pada segmen teknis, tim IT menghadapi *feedback* keras dari Budai terkait *deployment scheduler* yang *timeout* 30 menit, mendorong kebutuhan *refactoring* arsitektur [`[04:08`](timestamp://04:08), `[04:25`](timestamp://04:25)]. Lebih lanjut, ketergantungan integrasi stok dengan **BNN dan CPD** menjadi sorotan utama: tim harus menunggu spesifikasi API dari kedua mitra untuk memastikan *source of truth* status pesan berasal dari sistem mereka, bukan *manage* manual di sisi internal [`[06:17`](timestamp://06:17), `[06:38`](timestamp://06:38)]. Pak Wani meminta *assessment* integrasi stok, namun *timeline*-nya realistis hanya bisa dieksekusi tahun depan mengingat keterbatasan *bandwidth* dan *dependency* eksternal [`[07:54`](timestamp://07:54), `[08:08`](timestamp://08:08)].

Di sisi *delivery*, kabar baik datang dari tim **Integra**: perbaikan *performance* loading laporan (dari 30 detik error menjadi ~4 detik) sudah *merged* dan siap *publish* untuk versi *basic* [`[11:50`](timestamp://11:50), `[12:26`](timestamp://12:26)]. PRG (Pull Request) mingguan telah selesai direview, sementara target **WBS (Work Breakdown Structure)** ditargetkan rampung hari Jumat untuk diteruskan *handover* ke Produk [`[13:02`](timestamp://13:02), `[13:26`](timestamp://13:26)]. Rapat ditutup dengan penegasan *prioritas*: *hold* fase 2 *Sales Invoice*, fokuskan integrasi *sales* ke BNN/CPD terlebih dahulu, dan *push* prototipe PRB 2 ke *staging* untuk validasi *stakeholder* [`[08:30`](timestamp://08:30), `[09:38`](timestamp://09:38)].

---

# 🗣️ Key Quotes

> **"Intinya kalau menurut saya mau seperti apapun, pencairan harus menunggu SJ... karena SJ itu salah satu indikator barangnya benar-benar sudah dikirim dan diterima toko. Ini juga buat sekuritas kita, nanti BNN juga pakai sistem CPD kan SJ yang kayak gitu."**  
> — **Pak Bili (Product/Tech Lead)** [`[02:51`](timestamp://02:51)]

> **"Harusnya itu semuanya ngerespek dari API-nya partner gitu kan... jadi udah bukan tempatnya untuk *manage* status atau segala macem. Jadi itu yang mau dibikin *case* nanti pas *meeting* sama BNN dan CPD."**  
> — **Pak Bili (Product/Tech Lead)** [`[06:26`](timestamp://06:26)]

> **"Loading lama tadi sampai 10 menit... kemarin di-fixing sama Isan, yang tadinya setelah 30 detik jadi *error*, sekarang itu sekitar 4 detik."**  
> — **Tim Integra (Dev)** [`[11:50`](timestamp://11:50)]

---

# 🎯 Key Takeaways

- **Kebijakan Pencairan Ditegakkan:** Pencairan *cashback* ke distributor **wajib menunggu Surat Jalan (SJ)** sebagai bukti pengiriman fisik; *no SJ, no disbursement* untuk mitigasi risiko keuangan & *compliance* CPD.
- **Dependency Eksternal Jadi *Critical Path*:** Integrasi stok real-time dengan **BNN & CPD** bergantung sepenuhnya pada kesiapan API mitra; *assessment* teknis dijadwalkan, tapi *go-live* realistis **tahun depan**.
- **Sprint Integra Stabil:** *Hotfix* performa loading laporan (30s → 4s) siap rilis; WBS target Jumat, PRB 2 ke *staging*, fase 2 *Sales Invoice* di-*hold* hingga integrasi *sales* BNN/CPD selesai.