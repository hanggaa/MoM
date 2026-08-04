# Deep Research Report: AI Meeting-to-MoM Generator

*Dokumen Hasil Riset Mendalam untuk Aplikasi Web Self-Hosted Konversi Audio ke Minutes of Meeting (MoM)*  
*Tanggal Riset: 4 Agustus 2026*  
*Platform: Gemini 3.1 Pro (High) - Research Agent*

---

## 1. Project Name
**AI Meeting-to-MoM Generator** — Aplikasi web *self-hosted* kustom yang mentranskrip audio rekaman rapat secara otomatis dan mengubahnya menjadi *Minutes of Meeting* (MoM) terstruktur berstandar eksekutif menggunakan model AI NVIDIA Nemotron.

---

## 2. Core Concept
* **Apa itu aplikasi ini:** Sebuah platform web internal milik pribadi (*self-hosted* di bawah domain sendiri) di mana pengguna dapat mengunggah file rekaman rapat (MP3, WAV, M4A, MP4) berdurasi panjang. Aplikasi akan memproses audio menjadi teks transkrip akurat di server lokal, kemudian mengekstrak poin-poin krusial menjadi dokumen MoM berstruktur (*Action Items*, *Key Decisions*, *Owners*, *Deadlines*).
* **Masalah yang Diselesaikan:** 
  1. **Beban Kerja Kognitif & Waktu:** Product Manager menghabiskan 2–4 jam setiap minggunya hanya untuk mendengarkan ulang rekaman atau merapikan catatan rapat rutin secara manual.
  2. **Isu Privasi & Ketergantungan SaaS:** Layanan SaaS transkripsi komersial (seperti Otter.ai atau Fathom) mewajibkan penyimpanan data rapat di cloud pihak ketiga dan membebankan biaya berlangganan berkala yang tinggi serta *vendor lock-in*.
* **Mengapa Sekarang (Why Now):** 
  Kemunculan model Speech-to-Text open-source super hemat resource seperti **`faster-whisper` (CTranslate2)** dan ketersediaan API LLM super canggih seperti **NVIDIA NIM (`nvidia/nemotron-3-ultra-550b-a55b` / Nemotron-4)** melalui skema *Bring Your Own Key (BYOK)* membuat pembuatan sistem setara SaaS enterprise sanggup dieksekusi di server virtual mesin mandiri dengan anggaran minimalis dan privasi maksimal.

---

## 3. Target Users
* **Pengguna Utama:** Product Manager, Project Manager, Tech Lead, dan Eksekutif Operasional.
* **Kebutuhan & Pain Points:**
  * **Akurat & Spesifik Tugas:** Butuh rangkuman yang membedakan antara "wacana/diskusi acak" dan "keputusan/tindakan resmi (*action item*)".
  * **Ekspor Cepat:** MoM harus mudah disalin ke format kerja harian (Notion, Markdown, atau PDF untuk dilaporkan ke *stakeholder*).
  * **Kenyamanan BYOK (Bring Your Own Key):** Memastikan kontrol biaya sepenuhnya di tangan pengguna via kunci API mandiri dari katalog NVIDIA Dev/NIM.

---

## 4. Technical Decisions & Architecture Blueprint

### A. Evaluasi Stack Teknologi
| Komponen | Teknologi Pilihan | Alasan Pemulihan & Keterangan Teknis |
| :--- | :--- | :--- |
| **Backend & API** | **FastAPI (Python 3.10+)** | Paling optimal untuk pemrosesan asinkron (`asyncio`). Sangat tangkas menangani upload streaming dan background queue (menggunakan `BackgroundTasks` atau Celery/LiteeQ) agar browser tidak *freeze* saat proses berlangsung. |
| **STT Engine (Audio to Text)** | **`faster-whisper`** (Model: `medium` atau `large-v3-turbo` dengan kuantisasi **INT8**) | Implementasi berbasis CTranslate2 ini 4x lebih cepat dan mengonsumsi RAM 50% lebih hemat dibanding Whisper standar OpenAI. Sangat cocok dijalankan di **CPU-only VM GCP (16 GB RAM)** tanpa memerlukan GPU dedicated. |
| **MoM AI Engine** | **NVIDIA NIM API** (`integrate.api.nvidia.com/v1`) | Memanfaatkan model rahasia berskala besar `nvidia/nemotron-3-ultra-550b-a55b` via kompatibilitas protokol OpenAI Python SDK. |
| **Frontend** | **Vite + React + Tailwind CSS** | Waktu *build* sekejap, struktur file ringan (SPA), dan tampilan antarmuka modern yang memanjakan mata (*glassmorphism*, status progress interaktif). |
| **Web Server & SSL** | **Nginx + Cloudflare SSL / Let's Encrypt** | Reverse proxy siap pakai untuk menangkal serangan ekosistem web sekaligus mengamankan transmisi audio dan API Key via HTTPS. |

### B. Arsitektur Pemrosesan Asinkron & Penanganan File Besar (Cloudflare Limitations)
> [!WARNING]
> **Temuan Riset Penting (Cloudflare Limitation):** Pada paket Cloudflare Free & Pro, limit maksimal ukuran body request HTTP adalah **100 MB** ([Cloudflare Support Specs](https://developers.cloudflare.com/cache/how-to/set-max-file-size/)). File audio rekaman berjam-jam bisa melampaui 100 MB (misal 150–500 MB).

Untuk mencegah error `HTTP 413 Payload Too Large` dari Cloudflare atau timeout `HTTP 504 Gateway Timeout`, kita menerapkan 2 opsi solusi arsitektur:
1. **Opsi 1 (Direkomendasikan - Tanpa Ubah DNS): *Chunked Upload* di Frontend.** React Vite akan memotong file audio besar menjadi potongan kecil (misal per 20 MB) menggunakan `Slice/Blob` API, diunggah berurutan ke FastAPI, lalu digabungkan kembali secara mulus di server GCP.
2. **Opsi 2 (Alternatif Mudah): Dedicated DNS-Only Subdomain.** Membuat subdomain khusus upload (misal: `api.domainanda.com`) dan mematikan proxy Cloudflare (*Grey Cloud / DNS Only*) sehingga transfer file menembus langsung ke Nginx GCP VM tanpa batasan limit 100 MB Cloudflare.

---

## 5. Competitor Insights

### Analisis Perbandingan Solusi Pasar
| Nama Solusi | Kelebihan | Kekurangan & User Pain Points | Peluang Eksekusi (*Self-Hosted Advantage*) |
| :--- | :--- | :--- | :--- |
| **Otter.ai** | Rekam otomatis & pembagian pembaca yang akurat. | Langganan mahal ($20/bhn); Data disimpan di cloud publik Otter (risiko privasi); Tidak bebas ubah prompt MoM. | **Privasi Mutlak & Rp 0 Langganan Bulanan:** File rekaman diproduksi dan dihancurkan sendiri di VM GCP Anda; bebas kontrol total. |
| **Granola.so** | UI/UX luar biasa indah untuk notes meeting; cepat. | Hanya tersedia untuk macOS (terbatas); Sangat tersentralisasi pada ekosistem mereka sendiri. | **Multi-platform Web & Akses Dimana Saja:** Aksesibilitas penuh via web browser OS apapun. |
| **Fathom** | Gratis untuk penggunaan dasar; terhubung ke Zoom/Meet. | Sering "mengintimidasi" peserta rapat karena bot ikut join ke room rapat secara visual. | **Post-Meeting Audio Upload:** Tanpa bot pengganggu yang masuk ke *room* rapat; Anda tinggal upload hasil rekaman secara tenang. |
| **AI Meeting-to-MoM (App Kita)** | BYOK NVIDIA API (kontrol penuh); Tanpa biaya langganan SaaS; Kustomisasi prompt eksklusif PM; Privasi terjamin. | Memerlukan setup maintenance VM GCP (yang sudah siap ditangani dalam riset ini). | **Sovereign AI Tool:** Anda berhak merancang output yang 100% cocok dengan alur kerja internal Product Manager Anda. |

---

## 6. AI Tool & Prompt Guide (NVIDIA NIM Integration)

### A. Implementasi Kode Python (BYOK Pattern via OpenAI SDK)
NVIDIA NIM (NVIDIA Inference Microservices) memapar API yang sepenuhnya kompatibel dengan standar klien `openai` Python. Pengguna cukup mendaftarkan API Key dari `build.nvidia.com` dan menyiapkannya pada *request parameter*:

```python
# snippet_nvidia_nim.py
from openai import OpenAI

def generate_mom_with_nemotron(transcript_text: str, user_api_key: str) -> str:
    """
    Mengubah teks transkripsi menjadi Minutes of Meeting (MoM) 
    menggunakan model NVIDIA Nemotron via NIM API (BYOK).
    """
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=user_api_key # Diambil secara dinamis dari session / input frontend (BYOK)
    )

    system_prompt = (
        "You are an elite AI Executive Assistant specializing in Product Management. "
        "Your task is to review the following audio meeting transcript and extract a crystal-clear, "
        "actionable Minutes of Meeting (MoM) document.\n\n"
        "You MUST organize your response under these exact Markdown sections:\n"
        "### 1. Executive Summary (2-3 sentences summarizing the meeting consensus)\n"
        "### 2. Key Decisions Made (Bullet points of final agreements)\n"
        "### 3. Action Items (Table with columns: [Task Description | PIC/Owner | Deadline | Priority])\n"
        "### 4. Open Questions / Follow-ups (Unresolved topics for next meeting)\n\n"
        "Rules: Rely entirely on factual context from the transcript. If a deadline or owner is ambiguous, mark as 'Unassigned / TBD'."
    )

    try:
        completion = client.chat.completions.create(
            model="nvidia/nemotron-3-ultra-550b-a55b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Here is the meeting transcript:\n\n{transcript_text}"}
            ],
            temperature=0.2, # Rendah agar halusinasi minim dan faktual
            top_p=0.7,
            max_tokens=2048,
            stream=False
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error connecting to NVIDIA NIM API: {str(e)}"
```

---

## 7. Infrastructure & DevOps Guide

### A. Analisis Konsumsi Resource pada GCP VM (`e2-standard-4`)
* **Spesification Available:** 4 vCPUs, 16 GB RAM.
* **Projeksi Beban Sistem:**
  * **FastAPI & Sistem OS Linux (Ubuntu/Debian):** ~800 MB RAM.
  * **`faster-whisper` (Model `medium`, kuantisasi INT8):** ~2.5 GB RAM saat pemrosesan transkrip aktif (Peak CPU Load ~2–3 Core).
  * **NVIDIA NIM Nemotron API:** 0 GB RAM (pemrosesan LLM berat dieksekusi jarak jauh di server cloud NVIDIA NIM, server Anda hanya mengirim teks transkrip dan menerima respons MoM).
* **Kesimpulan Keterpaduan:** Spesifikasi `e2-standard-4` dengan 16 GB RAM **sangat melimpah dan aman** untuk menjalankan aplikasi ini tanpa kendala *Out-of-Memory (OOM)*. Bahkan masih ada margin memori sebesar ±12 GB yang luwes jika kelak Anda ingin memperbesar ukuran model transkrip ke `large-v3-turbo` INT8 (~4.5 GB RAM).

### B. Konfigurasi Nginx Siap Produksi
Untuk mendukung audio file panjang dan durasi proses STT yang tak terputus, gunakan *block code* Nginx di `/etc/nginx/sites-available/mom-app` berikut:

```nginx
server {
    listen 80;
    server_name mom.domainanda.com; # Ganti dengan sub-domain Anda

    # Wajib: Meningkatkan batas upload file ke Nginx (misal hingga 500MB)
    client_max_body_size 500M;

    # Wajib: Memperingan timeout untuk proses asynchronous background atau file besar
    proxy_connect_timeout 300s;
    proxy_send_timeout    300s;
    proxy_read_timeout    300s;
    send_timeout          300s;

    # Redirect ke Frontend Vite React (Static Build di /var/www/mom-frontend)
    location / {
        root /var/www/mom-frontend;
        index index.html index.htm;
        try_files $uri $uri/ /index.html; # Support React Router
    }

    # Proxy ke Backend FastAPI (Berjalan di Localhost port 8000)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*Catatan:* Aktifkan SSL HTTPS dengan mengeksekusi `sudo certbot --nginx -d mom.domainanda.com` di terminal GCP VM Anda.

---

## 8. MVP Feature Matrix & 7-Day Roadmap

### A. Matriks Prioritas Fitur MVP
| Fitur | Kriteria | Kompleksitas | Dampak Pengguna |
| :--- | :--- | :--- | :--- |
| **Audio File Drag-and-Drop & Upload Engine** | **Must-Have** | Rendah-Sedang | Tinggi (Gerbang utama aplikasi) |
| **Local STT Engine (`faster-whisper` background job)** | **Must-Have** | Sedang | Tinggi (Inti transkrispi tepat biaya Rp 0) |
| **NVIDIA Nemotron MoM Integration (BYOK API Key Input)** | **Must-Have** | Rendah | Sangat Tinggi (Nilai jual & kecerdasan buatan) |
| **MoM Preview & One-Click Copy (Notion/Markdown format)** | **Must-Have** | Rendah | Tinggi (Efisiensi Product Manager) |
| **Export to PDF / DOCX** | *Nice-to-Have* | Sedang | Sedang (Bisa menyisul untuk iterasi tahap 2) |
| **Multi-User Account & Authentication** | *Nice-to-Have* | Sedang | Rendah (Khusus internal mandiri saat awal) |

### B. Linimasa Implementasi (Sprint 7 Hari / 1 Minggu)
* **Hari 1 (Day 1 - Scaffold & Environment):**
  * Inisialisasi struktur proyek Git (Folder `/backend` FastAPI & `/frontend` Vite React).
  * Setup environment Python di GCP VM `e2-standard-4` dan penguncian dependensi (requirements.txt / uv).
* **Hari 2 (Day 2 - Audio Upload & STT Pipeline):**
  * Membangun endpoint REST API `/upload` di FastAPI dengan integrasi `faster-whisper` model `medium` INT8.
  * Uji transkripsi file uji coba durasi 30 menit.
* **Hari 3 (Day 3 - NVIDIA Nemotron AI Engine):**
  * Implementasi modul BYOK raksasa AI model `nvidia/nemotron-3-ultra-550b-a55b` via OpenAI SDK.
  * Penyempurnaan sistem prompt berstruktur Product Manager (Action Items Table & Executive Summary).
* **Hari 4 (Day 4 - Frontend UI/UX Building):**
  * Desain antarmuka React Vite Tailwind: Hero section, Drop zone upload, form input rahasia NVIDIA API Key, dan Progress Tracker interaktif (Uploading ➔ Transcribing ➔ Summarizing MoM ➔ Done).
* **Hari 5 (Day 5 - Polish & Export Utilities):**
  * Tampilan *rendered* MoM menggunakan `react-markdown` disertai tombol "Copy to Clipboard" & "Download .md".
* **Hari 6 (Day 6 - Deployment & SSL Mastery):**
  * Pengaturan sub-domain Cloudflare, kompilasi production build React (`npm run build`), setup konfigurasi Nginx dan instalasi HTTPS Let's Encrypt Certbot di GCP VM.
* **Hari 7 (Day 7 - End-to-End Testing & Launch):**
  * Pengujian penuh rekam audio 1 jam langsung dari browser ke live sub-domain. Validasi kestabilan RAM dan validasi hasil MoM. Selamat, aplikasi rilis!

---

## Handoff Context
<!-- Machine-readable summary for the next workflow step. Do not delete; the next prompt in the workflow reads this block. -->
- Stage: research
- App name: AI Meeting-to-MoM Generator
- User level: C
- Target platform: web
- Budget: Flexible (GCP e2-standard-4 VM with 4 vCPUs & 16 GB RAM + BYOK NVIDIA API)
- Timeline: 1 week
- Source files: research-AIMeetingMoM.md
---
