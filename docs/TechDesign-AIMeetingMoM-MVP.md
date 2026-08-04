# Technical Design Document: AIMeetingMoM MVP

## Recommended Approach

**Primary Approach: High-Leverage Modern Development with AI Assistance (React + Vite + FastAPI)** — Memadukan keahlian Anda saat ini di ranah frontend modern (Vite/React/Tailwind) dengan kekuatan pemrosesan asinkron Python (FastAPI) di backend untuk menangani komputasi AI intensif secara efisien.
- **Time to MVP:** 1–2 minggu (Fokus fungsionalitas inti untuk kebutuhan rapat nyata mingguan).
- **Learning Curve:** Moderat (Eksplorasi berorientasi praktik pada FastAPI Background Tasks dan integrasi NVIDIA NIM API dengan bimbingan AI).
- **Cost Tier:** Terbimbing oleh infrastruktur yang sudah tersedia (GCP VM `e2-standard-4` dan kuota API BYOK NVIDIA NIM).

### Tech Stack Decisions & Alternatives Analysis

Untuk memastikan arsitektur MVP kita kokoh dan terawat, berikut adalah analisis perbandingan (*trade-off analysis*) untuk setiap lapisan teknologi:

#### 1. Frontend Architecture
- **Pilihan Utama (Rekomendasi): React + Vite + Tailwind CSS (Single Page Application)**
  - **Alasan Pembaruan:** Waktu build super cepat, struktur proyek jernih, sangat disukai dan dikuasai oleh AI coding assistants (Cursor/Claude Code), serta sesuai dengan zona nyaman Anda tanpa kerumitan rendering server (SSR).
- **Alternatif:**
  - *Next.js (App Router):* Sangat kuat untuk SEO dan Full-stack TypeScript, namun berlebihan (*overkill*) untuk aplikasi internal single-user dan dapat memperumit routing upload file raksasa jika digabung ke backend Python.
  - *SvelteKit:* Ringan dan cepat, tetapi komunitas serta template UI mandiri lebih sedikit berbanding React/Tailwind.

#### 2. Backend Engine & API Server
- **Pilihan Utama (Rekomendasi): Python FastAPI (Async Engine)**
  - **Alasan Pembaruan:** Dukungan native untuk `async/await`, validasi skema otomatis berbasis Pydantic, dokumentasi Swagger UI interaktif gratis (sangat mudah untuk diuji), dan memiliki mekanisme `BackgroundTasks` bawaan yang ideal untuk memisahkan antrean transkripsi dari request HTTP utama.
- **Alternatif:**
  - *Node.js / Express or NestJS:* Familiar jika 100% JavaScript, tetapi ekosistem library Python untuk ML (seperti `faster-whisper`, `torch`, `huggingface`) jauh lebih matang dan berkinerja tinggi dibanding wrapper JavaScript.
  - *Django / Django REST Framework:* Sangat lengkap (*batteries-included*), tetapi terlalu berat dan monolitis untuk arsitektur mikro MVP kita.

#### 3. Speech-to-Text (STT) Processing
- **Pilihan Utama (Rekomendasi): `faster-whisper` (INT8 Quantized Model di CPU / Local VM)**
  - **Alasan Pembaruan:** Menggunakan engine C++ `CTranslate2` yang 4x lebih cepat dan 50% lebih hemat RAM dibanding OpenAI Whisper standar. Beroperasi mumpuni secara lokal di atas 4 vCPU & 16GB RAM GCP VM tanpa perlu membeli langganan API eksternal (Privasi terjamin 100%).
- **Alternatif:**
  - *OpenAI Audio API (Whisper API):* Sangat mudah diimplementasikan, tetapi melanggar prinsip kendali data mandiri dan berbiaya per menit rekaman.
  - *Standard `openai-whisper` Python library:* Ter terbukti, namun boros memori (berisiko memicu OOM crash pada file audio >2 jam di VM bersumber daya terhingga).

#### 4. LLM & Summarization Engine
- **Pilihan Utama (Rekomendasi): NVIDIA NIM API (`nvidia/nemotron-3-ultra-550b-a55b`) - BYOK**
  - **Alasan Pembaruan:** Model parameter raksasa yang sangat mahir menangkap intonasi keputusan bisnis dan analisis logika mumpuni. Akses via OpenAI Python SDK (dengan modifikasi `base_url="https://integrate.api.nvidia.com/v1"`) menjanjikan reliabilitas standar industri.
- **Alternatif:**
  - *Ollama (Local LLM Llama-3 8B):* Gratis dan 100% offline, namun VM `e2-standard-4` (tanpa GPU dedicated) akan mengalami latensi generasi sangat lambat (bisa memakan >5 menit hanya untuk menghasilkan teks MoM).

#### 5. Database & Persistent Storage
- **Pilihan Utama (Rekomendasi): SQLite (via SQLModel / SQLAlchemy ORM)**
  - **Alasan Pembaruan:** File-database yang ringan dan langsung aktif, nol overhead manajemen server, sangat cocok untuk skala satu pengguna (single-user), serta mudah dibackup (cukup menyusul arsip satu file `.db`).
- **Alternatif:**
  - *PostgreSQL / Supabase:* Standar industri untuk aplikasi berkonkurensi tinggi, tetapi untuk MVP PM tunggal, menambahkan instance database terpisah justru memperbesar beban pemeliharaan infrastruktur (*maintenance tax*).

---

## Project Structure

Aplikasi kita menggunakan desain monorepo ringkas terpadu yang memisahkan ranah Frontend dan Backend dengan batas-batas yang sangat mudah dipahami oleh asisten pemrograman AI:

```
AIMeetingMoM/
├── backend/
│   ├── app/
│   │   ├── api/            # Route endpoints (/upload, /transcribe, /settings, /mom)
│   │   ├── core/           # Config, environment load, keamanan, dan log logger
│   │   ├── models/         # Skema database SQLite (SQLModel) & Pydantic DTO
│   │   ├── services/       # Logic intensif: STT (faster-whisper), NVIDIA NIM client, Chunking Merger
│   │   └── main.py         # Inisialisasi aplikasi FastAPI & konfigurasi CORS
│   ├── storage/            # Tempat simpan file audio lokal & database app.db (masuk ke .gitignore)
│   ├── requirements.txt    # Daftar dependensi Python
│   └── Dockerfile          # Opsi kontainerisasi backend
├── frontend/
│   ├── src/
│   │   ├── components/     # UI Lego blocks (AudioUploader, ProgressTracker, MoMCard, BYOKSettings)
│   │   ├── pages/          # Dashboard Utama, Detail MoM, Halaman Pengaturan
│   │   ├── services/       # Klien HTTP Axios / Fetch API untuk berkomunikasi ke backend
│   │   └── styles/         # Tailwind CSS utilitas & custom glassmorphic variables
│   ├── public/             # Aset statik logo & favicon
│   ├── index.html          # Entry point SPA Vite
│   └── package.json        # Dependensi JS/TS (React, Lucide icons, Tailwind)
├── deploy/
│   ├── nginx.conf          # Konfigurasi reverse proxy GCP VM (Client Max Body & Timeout)
│   └── start_all.sh        # Skrip otomatis jalankan Gunicorn/Uvicorn dan static server
└── README.md               # Dokumentasi instalasi dan navigasi sistem
```

---

## Building Each Feature (How to Build with AI)

### Feature 1: BYOK (Bring Your Own Key) & Security Management
- **Kompleksitas:** Mudah (*Easy*)
- **Skema Implementasi:** Backend menyimpan kunci NVIDIA API dalam SQLite (tabel `app_settings`) atau langsung dibaca dari environment file `.env`. Saat memproses MoM, servis mengambil kunci ini, menginisialisasi klien HTTP khusus ke server NVIDIA NIM, dan tidak pernah membiarkan kunci ini terekspos di sisi browser.
- **Build Prompt untuk AI (Cursor/Claude):**
  > "Create a settings endpoint in FastAPI using SQLModel to securely store and retrieve a BYOK NVIDIA NIM API key in SQLite. On the frontend, build a sleek Tailwind CSS settings modal with a masked input field and a 'Test Connection' button that hits `https://integrate.api.nvidia.com/v1/models` using the OpenAI Python SDK."

### Feature 2: Resilient Large Audio Upload (Cloudflare Workaround)
- **Kompleksitas:** Sedang (*Medium*)
- **Skema Implementasi:** Mengatasi batas 100MB Cloudflare Free/Pro dengan menerapkan *Chunked Resumable Upload*. Frontend memecah file audio besar (misal 500MB) menjadi beberapa potongan berukuran 25MB di memory browser, lalu mengunggahnya secara sekuensial atau paralel ke endpoint `/api/upload/chunk`. Backend menyatukan kembali potongan-potongan tersebut di direktori `/backend/storage` setelah seluruh fragmen diterima lengkap.
- **Build Prompt untuk AI:**
  > "Implement a robust chunked file upload pipeline. On the React frontend, split large audio files (.mp3, .wav, .m4a) into 25MB chunks using File.slice() and send them sequential POST requests with metadata (file_id, chunk_index, total_chunks). On the FastAPI backend, create an endpoint that reconstructs these chunks sequentially into `/storage` and returns a completed audio file path."

### Feature 3: Asynchronous Speech-to-Text (STT) Processing
- **Kompleksitas:** Tinggi (*Hard*)
- **Skema Implementasi:** Transkripsi file audio berjam-jam memantau kestabilan CPU/RAM VM. Ketika file audio tersimpan, endpoint memicu FastAPI `BackgroundTasks` untuk menjalankan `faster-whisper` model `small` atau `medium` dengan komputasi INT8 (`compute_type="int8"`). Status progres (misalnya: *Queued, Transcribing 45%, Compiling, Done*) discrape ke SQLite dan bisa dipantau frontend via *Short Polling* (tiap 5 detik) atau WebSocket ringkas.
- **Build Prompt untuk AI:**
  > "Build an async transcription worker in FastAPI using `faster-whisper`. When a file upload completes, add a background task that loads the Whisper model with `compute_type='int8'` to conserve RAM on our 16GB VM. As transcription iterates through segments, update a task progress percentage in SQLite so the React frontend can poll and display a real-time glowing progress bar."

### Feature 4: PM-Specific AI MoM Generation (Nemotron-3 Prompt Engineering)
- **Kompleksitas:** Sedang (*Medium*)
- **Skema Implementasi:** Teks transkrip mentah dikemas dengan *System Prompt* bertaraf eksekutif yang secara spesifik mengarahkan model `nvidia/nemotron-3-ultra-550b-a55b` untuk mengeluarkan struktur JSON bervalidasi berisi: Rangkuman Eksekutif, Poin Keputusan Utama, Daftar Action Items (dilengkapi kolom PIC dan Deadline Waktu), serta Risiko/Eskalasi.
- **Build Prompt untuk AI:**
  > "Create an LLM synthesis service using the OpenAI client pointed to NVIDIA NIM's endpoint. Construct a powerful Product Manager system prompt that forces Nemotron-3 to return structured JSON containing: 'executive_summary', 'key_decisions', and an array of 'action_items' (each with 'task', 'owner_pic', 'due_date'). Add automatic fallback to raw markdown if JSON parsing fails."

### Feature 5: Interactive Dashboard & Multi-Format Export
- **Kompleksitas:** Mudah (*Easy*)
- **Skema Implementasi:** Menampilkan hasil MoM dalam papan kontrol (*dashboard*) berpenampilan modern (*dark UI, glassmorphic card*). Menyediakan 3 tombol aksi eksport langsung dari browser: (1) *Copy to Clipboard as Markdown*, (2) *Download as .md file*, dan (3) *Print/Save as PDF* menggunakan styling print CSS vanilla yang rapi.
- **Build Prompt untuk AI:**
  > "Design an executive MoM view card in Vite React + Tailwind CSS. Render action items in a responsive data table and key decisions in highlighted quote badges. Include action buttons to export the view clean as a downloadable .md markdown file, a styled native PDF print window, and a one-click 'Copy for Notion' clipboard format."

---

## Development Setup

1. **Persiapan Editor & Extensions (Hari 1):**
   - Gunakan **VS Code** atau **Cursor IDE**. Install extension resmi: *Python*, *Prettier*, *ESLint*, dan *Tailwind CSS IntelliSense*.
2. **Setup Lingkungan Backend Local / VM (Hari 1):**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install fastapi uvicorn[standard] faster-whisper sqlmodel openai python-multipart
   ```
3. **Setup Lingkungan Frontend Local (Hari 1):**
   ```bash
   cd frontend
   npm create vite@latest . -- --template react
   npm install -D tailwindcss postcss autoprefixer lucide-react axios
   npx tailwindcss init -p
   npm run dev
   ```

---

## Simplified Architecture (Alur Kerja Sistem)

1. **User Action:** Anda mengunggah file rekaman rapat 2 jam (misal ukuran 150MB) dari browser ke domain web Anda.
2. **Network Bypass:** Frontend otomatis memisah file 150MB menjadi enam potongan (@25MB) dan mengirimkannya satu-satu melalui Nginx & Cloudflare (bebas dari penolakan error 413).
3. **Async Worker Activation:** FastAPI menyerap file lengkap, mencatat rekor di SQLite dengan status `TRANSLITERATION_PENDING`, lalu mengalokasikan proses STT di background threading agar server tetap responsif merespons klik dari UI.
4. **Whisper STT Engine:** Library `faster-whisper` menyalin ucapan audio menjadi teks utuh secara lokal di GCP VM dengan pemakaian RAM stabil <4GB.
5. **AI Reasoning Synthesis:** Setelah teks didapat, backend menon-aktifkan proses audio lalu mengirimkan ringkasan teks tersebut beserta kunci BYOK Anda ke cloud **NVIDIA NIM (Nemotron-3 Ultra)** melalui request API tersandi berkecepatan tinggi.
6. **Delivery:** Hasil rangkuman terstruktur diterima kembali oleh backend, disimpan ke SQLite, dan frontend mengupdate layar Anda seketika dengan MoM yang siap dideploy ke tim!

---

## AI Features (Optional & Extended specifications)

Aplikasi ini berfokus 100% pada produktivitas AI, oleh karenanya parameter kontrol kualitas dipetakan sebagai berikut:
- **Use Cases:** Otomasi transkripsi verbatim audio Indonesia/Inggris dan transformasi sintetik menjadi Minutes of Meeting bermuatan eksekutif khusus PM.
- **Data Sensitivity:** **TINGGI (Confidential Internal Meetings).** Rekaman audio TIDAK PERNAH dikirim ke luar server GCP independen milik pengguna; transkripsi 100% dipakainya lokal di VM internal (`faster-whisper`). Hanya teks transkrip (tanpa metadata suara) yang dikirim ke endpoint NVIDIA NIM API via koneksi HTTPS terenskipsi mandiri berbasis akun pribadi (BYOK).
- **Provider Options:**
  - *Primary:* NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b`).
  - *Fallback / Alternatif:* Open-source lokal LLM atau kompatibel API eksternal lain (misal Groq / Deepseek via parameter `base_url` yang dapat dinegosiasikan).
- **Latency & Cost Targets:** Latensi pemrosesan lengkap (Audio 2 jam $\rightarrow$ Teks $\rightarrow$ MoM) ditargetkan **< 10 menit total**. Biaya API NVIDIA didasarkan pada model prabayar token BYOK (estimasi biaya pecahan sen dolar per dokumen).
- **Fallback Behavior on AI Failure:**
  - *Jika NVIDIA NIM Rto (Request Time Out) atau down:* Sistem memicu آلية *exponential backoff retry* (mencoba ulang 3x dengan interval membesar).
  - *Jika kegagalan API permanen (kunci habis kuota):* Transkripsi mentah hasil Whisper TTAS TETAP DIAMANKAN di database SQLite. Dashboard memperlihatkan teks transkripsi asli dengan tombol manual **"Regenerate AI Summary"** agar pengguna tidak kehilangan hasil transkrip lokalnya.

---

## Step-by-Step Implementation Timeline

| Waktu | Target Eksekusi | Fokus Implementasi |
| :--- | :--- | :--- |
| **Hari 1–2** | **Foundation & Setup** | Inisialisasi monorepo, konfigurasi koneksi FastAPI & Vite React, pembuatan tabel SQLite standar, tes enkapsulasi Nginx di GCP VM. |
| **Hari 3–4** | **Pipeline Audio & STT** | Pembuatan modul Chunked Upload di React, pengujian reassembly file di FastAPI, eksekusi tes worker `faster-whisper` INT8 dengan file sampel 30 menit. |
| **Hari 5–6** | **AI Integration & UI Polish** | Integrasi BYOK klien NVIDIA NIM, penyempurnaan sistem prompt Nemotron-3, dan perapihan antarmuka MoM Card dengan warna modern gelap transparan. |
| **Hari 7+** | **Verification & Launch** | Uji tahan banting audio >2 jam, verifikasi penggunaan RAM VM via `htop` agar terkonfirmasi aman di bawah batas 16GB, perilisan penuh di custom domain Anda. |

---

## Common Challenges & Solutions

1. **Tantangan: HTTP 504 (Gateway Timeout) saat Pemrosesan Audio Panjang**
   - **Solusi:** **JANGAN PERNAH** memproses Whisper di thread HTTP request sinkron utama! FastAPI wajib mengembalikan response langsung (`HTTP 202 Accepted` bersama `task_id`) dan mengeksekusi transkripsi menggunakan `BackgroundTasks` atau worker `asyncio`.
2. **Tantangan: Lonjakan RAM (Spike Memory / OOM Killed) saat Audio Berjalan**
   - **Solusi:** Di `faster-whisper`, tetapkan secara paksa parameter `compute_type="int8"` dan gunakan model parameter sedang (seperti `medium` atau `small`). Jangan memuat beberapa model di memory yang sama sekaligus (aktifkan skema antrean antargelombong jika memuat dua audio serentak).
3. **Tantangan: Cloudflare HTTP 413 (Entity Too Large)**
   - **Solusi:** Pengimplementasian kode *Chunked Resumable Upload* di Feature 2 (maks 25MB per pengiriman request POST), serta menambahkan baris `client_max_body_size 500M;` pada konfigurasi server `nginx.conf` di VM Anda.

---

## Deployment Guide (Self-Hosted on GCP VM)

1. **Konfigurasi GCP VM (`e2-standard-4`, Ubuntu/Debian):**
   - Pastikan port HTTP (80) dan HTTPS (443) terbuka di firewall GCP VPC Networks.
   - Install dependensi sistem: `sudo apt update && sudo apt install git ffmpeg nginx certbot python3-venv nodejs npm -y` (Catatan: `ffmpeg` sangat wajib untuk pemrosesan audio `faster-whisper`).
2. **Reverse Proxy Nginx Configuration (`/etc/nginx/sites-available/aimooweb`):**
   ```nginx
   server {
       listen 80;
       server_name mom.yourcustomdomain.com;
       
       client_max_body_size 500M;
       proxy_read_timeout 600s;
       proxy_send_timeout 600s;
       
       # Serve Static Vite React Build
       location / {
           root /var/www/AIMeetingMoM/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # Pass API Requests to FastAPI Gunicorn/Uvicorn
       location /api/ {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```
3. **Daemonizing Backend (Systemd Service `/etc/systemd/system/fastapi-mom.service`):**
   - Siapkan daemon systemd yang menjalankan: `uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1`. (Cukup 1 worker untuk memastikan `faster-whisper` memonopoli komputasi CPU core berkinerja maksimal tanpa berebut RAM antar worker).

---

## Cost Breakdown (Est. Estimates)

| Service / Layer | Model Biaya | Estimasi Per Bulan | Catatan & Vendor Pricing Check |
| :--- | :--- | :--- | :--- |
| **GCP VM (`e2-standard-4`)** | Infrastructure | **Sudah Tersedia** | Dikelola dalam anggaran eksisting GCP Anda (~$130/bln nilai pasar stAndar, terkover). |
| **Cloudflare DNS / SSL** | Free Tier | **$0 / bulan** | Cukup menggunakan Free Plan untuk reverse proxy & proteksi DNS stAndar. |
| **NVIDIA NIM API Token** | Pay-as-you-go | **$2 – $5 / bulan** | Sangat murah (<$0.01 per rapat), terkover oleh kuota kredit/BYOK langsung ke platform NVIDIA. |
| **Database & Storage** | Local SQLite & SSD | **$0 (Included in VM)** | Memakai penyimpanan disk boot standar VM GCP Anda. |

---

## Learning Resources

- **FastAPI Background Tasks:** [Official Docs](https://fastapi.tiangolo.com/tutorial/background-tasks/) (Untuk memahami konsep asinkron worker tanpa Celery).
- **Faster-Whisper Library:** [GitHub Repository & Benchmarks](https://github.com/SYSTRAN/faster-whisper) (Panduan optimasi parameter memori dan `int8`).
- **NVIDIA NIM Integration:** [NVIDIA AI Foundation API Docs](https://build.nvidia.com/explore/discover) (Panduan koneksi OpenAI-Compatible Endpoints).
- **Vite React Chunked Uploads:** Dokumentasi dasar `File.slice()` di JavaScript MDN Reference.

---

## Maintenance & Scaling Strategy

- **Stable Dependencies:** Kunci seluruh versi dependensi di `requirements.txt` dan `package-lock.json` untuk mencegah breaking changes tiba-tiba.
- **Monthly Tool & Key Review:** Periksa pemakaian kuota token di dashboard NVIDIA NIM setiap bulan dan perbarui SSL cert secara otomatis menggunakan `certbot --nginx`.
- **Scaling Up Migration Path:** Ketika sistem kelak diisi oleh banyak anggota tim lain di masa depan, update dokumen AGENTS.md (di Part 4) dan lakukan migrasi mulus dari SQLite ke Cloud SQL (PostgreSQL) serta memindahkan pemrosesan transkripsi ke Cloud Run GPU instance bila perlu.

---

## Open Questions

| Topik TBD | Pertanyaan untuk Pengambilan Keputusan Depan | Rekomendasi / Default Sementara |
| :--- | :--- | :--- |
| **Audio File Retention** | Apakah file rekaman audio MP3 mentah di VM perlu otomatis dihapus setelah 30 hari untuk menghemat ruang disk, atau ingin dibiarkan permanen? | **Default:** Biarkan pembersihan otomatis file audio >100MB diatur ke sistem *purge after 30 days*, sementara teks MoM di SQLite disimpan selamanya. |
| **Domain SSL Setup** | Apakah kita akan mengaktifkan Cloudflare Flexible SSL (DNS proxy on) atau Strict SSL menggunakan Let's Encrypt Certbot lokal di Nginx? | **Default:** Gunakan Let's Encrypt Certbot lokal dipadukan Cloudflare (Full SSL) demi perlindungan enkripsi penuh dari peramban hingga server VM GCP Anda. |

---
*Created for: AIMeetingMoM | Path: Balanced learning & High-performance async stack | Est. time: 1–2 weeks*

---
## Handoff Context
<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: techdesign
- App name: AIMeetingMoM
- User level: C  (C = in-between / Paham teknis & bersedia eksplorasi)
- Target platform: Web Application (Self-hosted on custom domain via GCP VM)
- Budget: Flexible / Covered by GCP (`e2-standard-4` VM & BYOK NVIDIA NIM API)
- Timeline: 1–2 weeks (~Minggu depan)
- Chosen stack: React + Vite + Tailwind CSS (Frontend) + Python FastAPI + faster-whisper (Backend) + SQLite / SQLModel + Nginx & Cloudflare
- AI coding tool: Cursor / Claude Code / VS Code AI Assistant
- Source files: research-AIMeetingMoM.md → PRD-AIMeetingMoM-MVP.md → TechDesign-AIMeetingMoM-MVP.md
---
