# AIMeetingMoM Production Deployment Guide 🚀
**Target Architecture:** Google Cloud Platform (GCP) Compute Engine `e2-standard-4` (4 vCPUs, 16 GB RAM) running Ubuntu 24.04 LTS / 22.04 LTS with Cloudflare DNS & reverse proxy SSL.

---

## 1. Pre-requisites & VM Provisioning
1. Provision a new GCP Compute Engine VM instance:
   - **Machine Type:** `e2-standard-4` (4 vCPUs, 16 GB memory)
   - **Boot Disk:** 50 GB+ SSD Persistent Disk (Ubuntu 24.04 LTS / 22.04 LTS)
   - **Firewall:** Enable HTTP (port 80) and HTTPS (port 443) traffic in GCP firewall settings.
2. Configure Cloudflare DNS:
   - Point your DNS A Record (e.g., `mom.yourdomain.com`) to the GCP VM Static External IP address.
   - Set Cloudflare encryption mode to **Full** or **Flexible** SSL.

---

## 2. Server Installation & Repository Setup
SSH into your GCP VM instance and execute the following system preparation commands:

```bash
# 1. Update package manager and install core system requirements
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx python3-pip python3-venv ffmpeg nodejs npm build-essential

# 2. Upgrade Node.js to LTS (v20+) via NodeSource if default repo is older
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Confirm v20.x or newer

# 3. Create deployment directory and set permissions
sudo mkdir -p /opt/aimeetingmom
sudo chown -R $USER:www-data /opt/aimeetingmom
sudo chmod -R 775 /opt/aimeetingmom

# 4. Clone repository (replace with your private git repository URL)
git clone https://github.com/your-org/aimeetingmom.git /opt/aimeetingmom
cd /opt/aimeetingmom
```

---

## 3. Backend Setup (FastAPI & faster-whisper INT8)
Configure the Python environment for high-speed STT inference and Nemotron-3 synthesis:

```bash
cd /opt/aimeetingmom/backend

# Create virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install fastapi uvicorn[standard] faster-whisper sqlmodel openai python-multipart pytest

# Ensure storage directories exist for SQLite and chunked audio staging
mkdir -p storage/chunks
chmod -R 775 storage/
```

---

## 4. Frontend Production Build (React Vite)
Build the ultra-fast static frontend web application bundle:

```bash
cd /opt/aimeetingmom/frontend
npm install
npm run build
# Verified output in /opt/aimeetingmom/frontend/dist/
```

---

## 5. Systemd Service Activation
Link and activate the systemd unit service to ensure automatic start and crash recovery for the backend:

```bash
# Link systemd service unit from repository deploy folder
sudo ln -s /opt/aimeetingmom/deploy/aimeetingmom-backend.service /etc/systemd/system/aimeetingmom-backend.service

# Reload daemon, enable on system boot, and start the service
sudo systemctl daemon-reload
sudo systemctl enable aimeetingmom-backend
sudo systemctl start aimeetingmom-backend

# Check live backend operational status and logs
sudo systemctl status aimeetingmom-backend
sudo journalctl -u aimeetingmom-backend -f
```

---

## 6. Nginx Reverse Proxy Setup
Activate Nginx to handle frontend serving and `/api` reverse proxying with chunked upload sizing:

```bash
# Remove default nginx welcome page
sudo rm -f /etc/nginx/sites-enabled/default

# Link production Nginx configuration from deploy folder
sudo cp /opt/aimeetingmom/deploy/nginx.conf /etc/nginx/sites-available/aimeetingmom
sudo ln -s /etc/nginx/sites-available/aimeetingmom /etc/nginx/sites-enabled/aimeetingmom

# Verify Nginx syntax and reload web server
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Launch Verification Protocol (Definition of Done)
Once live, execute this checklist directly in your web browser:
1. **Access Web Interface:** Navigate to `http://<YOUR_DOMAIN_OR_IP>/` and confirm the dark mode glassmorphic UI loads smoothly.
2. **Configure BYOK Key:** Click **NVIDIA NIM Settings** in the top header, input a valid `nvapi-` token, and verify connection success. (The token is stored securely in `/opt/aimeetingmom/backend/storage/database.db` with zero exposure to client browser inspections).
3. **Chunked Audio Upload Verification:** Upload a meeting audio file larger than 100 MB. Observe the real-time slice uploading in 25MB increments (bypassing Cloudflare limits without Nginx 504 errors).
4. **Local CPU INT8 Transcription & Synthesis Review:** Monitor the automated progress percentage from 10% to 100%. Upon completion, open the **Executive AI MoM** tab to review Action Items, PICs, Due Dates, and listen to the inline **Local STT Audio Playback Review** stream.
5. **PDF Executive Export:** Click **Export PDF** to test formal print formatting with table borders and hidden UI controls.

Your self-hosted AIMeetingMoM system is now fully production-operational! 🌟
