# 📰 Meeting News & Recap

Dalam daily standup mingguan yang berlangsung pada hari Senin, tim multidisipilin—mencakup *Product*, *Engineering*, *Finance*, dan *Operations*—berkumpul untuk menyelaraskan prioritas *sprint* dan mengatasi *blocker* lintas fungsi. Pembicaraan dibuka dengan pembahasan *pain point* operasional terkait alur *cashback* dan pencairan dana distributor. Seperti diungkapkan oleh salah satu *speaker* utama, kebijakan *finance* yang mengizinkan pencairan tanpa menunggu Surat Jalan (SJ) dinilai berisiko tinggi karena uang sudah dibayar toko sementara barang belum tentu sampai ke tangan *retailer* `[00:54](timestamp://00:54)`. Keputusan akhir menegaskan bahwa pencairan **harus** menunggu SJ sebagai *checkpoint* keamanan dan kepatuhan, terutama mengingat integrasi sistem ke depan dengan BNN dan CPD yang mengandalkan data SJ tersebut `[03:14](timestamp://03:14)`.

Fokus kemudian bergeser ke *technical debt* dan *deployment pipeline*. Tim IT melaporkan *scheduler* mengalami *delay* 30 menit pasca-*deploy*, memicu *review* arsitektur mendalam oleh *Tech Lead* `[04:08](timestamp://04:08)`. Paralelnya, inisiatif integrasi stok *real-time* dengan BNN dan CPD memasuki tahap *spec alignment*; tim *engineering* menunggu konfirmasi *endpoint* dan kemampuan *mapping* data *SPP* dari pihak *partner* agar *source of truth* tetap berada di sistem *partner* `[06:04](timestamp://06:04)`. Tanpa kejelasan *spec* ini, estimasi *effort* dan *timeline* integrasi *Phase 2* tidak dapat dikunci, berisiko mendorong peluncuran ke tahun depan `[08:04](timestamp://08:04)`.

Di sisi *product delivery*, tim *Integra* melaporkan kemajuan signifikan pada modul *Fixing Basic*. *Hotfix* performa *query* ASC—yang awalnya *timeout* 30 detik—berhasil ditekan hingga 4 detik oleh *Engineer* Isan `[12:23](timestamp://12:23)`. *Pull Request* (PR) terkait *WBS* dan *Sales Phase 2* sedang dalam tahap *review* intensif oleh *Product Designer* Sandy, dengan target *merge* sebelum Jumat `[13:07](timestamp://13:07)`. Ketergantungan *design* yang baru selesai Jumat lalu menjadi *critical path* bagi *development* minggu ini. Rapat ditutup dengan komitmen *brief* ulang *timeline* dan *dependency* ke seluruh *stakeholder* agar *visibility* proyek terjaga end-to-end.

---

# 🗣️ Key Quotes

> "Intinya kalau menurut saya mau seperti apapun, pencairan harus menunggu SJ. Nggak bisa kalau kita nggak menunggu SJ karena SJ itu salah satu indikator barangnya benar-benar udah dikirim dan diterima toko." — **Speaker Utama** `[03:01](timestamp://03:01)`

> "Harusnya source of rules nya tuh datang dari sistem mereka sendiri... jangan sampai tiba-tiba mereka nge-drop Excel kosong gitu terus dikembangin ke MSS." — **Tech Lead** `[09:17](timestamp://09:17)`

> "Kalau misalkan definisinya udah dari secara draft, gue udah berdasarkan dari hari ini... sebenarnya cuma tinggal pindahin aja ke Figma." — **Product Manager** `[11:12](timestamp://11:12)`

---

# 🎯 Key Takeaways

- **Kebijakan Pencairan Ditekankan:** Pencairan dana distributor **wajib** menunggu Surat Jalan (SJ) sebagai bukti fisik pengiriman, menolak permintaan *finance* untuk *cashback* tanpa SJ demi mitigasi risiko dan kepatuhan sistem BNN/CPD.
- **Integrasi Eksternal Butuh *Spec* Jelas:** Pengembangan integrasi stok *Phase 2* dengan BNN & CPD *blocked* menunggu konfirmasi *API spec*, *mapping SPP*, dan *timeline development* dari pihak *partner*; tanpa ini *release* berpotensi geser ke tahun depan.
- **Rilis *Integra Fixing Basic* Dekat *Done*:** Optimasi performa *query* ASC (30dtk → 4dtk) selesai; PR *WBS* & *Sales Phase 2* menunggu *final review* desain (target Jumat); *brief* ulang *timeline* akan disebarkan ke seluruh tim hari ini.