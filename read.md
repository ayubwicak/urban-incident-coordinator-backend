# Urban Incident Coordinator — Backend

Backend demo **Multi-Agent Public Policy & Urban Incident Coordinator** untuk menerima laporan insiden, menganalisisnya dengan beberapa agent, mengambil konteks kebijakan lokal, menyusun rekomendasi penanganan, dan mengaudit rekomendasi sebelum menghasilkan draft keputusan.

> **Penting untuk demo:** Backend ini masih prototipe. Dataset kebijakan, fasilitas, dan tim dapat berupa data simulasi. Draft keputusan, SPT, serta pesan warga bukan keputusan resmi dan harus diperiksa serta disetujui petugas manusia.

## 1. Teknologi

- Node.js (ES Modules)
- Express.js
- LangGraph.js
- LangChain OpenAI (`@langchain/openai`)
- 9router (gateway OpenAI-compatible), model `nous/tencent/hy4-flash:free`
- Open-Meteo (konteks cuaca, jika service dapat diakses)
- Server-Sent Events (SSE) untuk stream hasil/progres
- Penyimpanan incident sementara di memory (`Map`), **belum menggunakan database**

## 2. Arsitektur dan alur

```mermaid
flowchart TD
    A[Postman / Next.js] --> B[Express API]****
    B --> C[POST /api/incidents\nBuat incident dan simpan sementara]
    C --> D[GET /api/stream\nSSE]
    D --> E[LangGraph]
    E --> F[Triage Agent]
    F --> G[Policy Retrieval Agent]
    G --> H[Incident Optimizer Agent]
    H --> I[Critic Audit Agent]
    I --> J{Audit lolos?}
    J -->|Ya| K[Finalisasi keputusan]
    J -->|Tidak dan masih dapat retry| H
    J -->|Retry habis| K
    K --> L[decision_ready]
```

### Agent

1. **Triage Agent** — mengklasifikasi laporan, mendeteksi objek/konteks, dan menghasilkan skor severity (S) serta impact risk (R).
2. **Policy Retrieval Agent** — mencari dokumen kebijakan/SOP lokal dari dataset backend dan menghasilkan rekomendasi instansi serta dasar kebijakan.
3. **Incident Optimizer Agent** — mempertimbangkan cuaca, fasilitas vital, dan tim; menghitung skor urgensi serta menyiapkan rekomendasi penugasan, draft SPT, dan pesan untuk warga.
4. **Critic Audit Agent** — mengecek validitas dasar kebijakan, anggaran, dan beban/ketersediaan tim. Audit gagal dapat mengarahkan graph kembali ke Optimizer.
5. **Finalization** — menyiapkan payload keputusan (`decision_ready`) untuk diperiksa manusia.

### Skor urgensi

Pada implementasi demo, skor urgensi menggunakan formula:

`U = round(0.35 × S + 0.25 × V + 0.25 × W + 0.15 × R)`

- `S`: severity
- `V`: konteks fasilitas vital
- `W`: konteks cuaca
- `R`: impact risk

Level prioritas demo: P1 jika U >= 80; P2 jika U >= 60 dan < 80; P3 jika U < 60. Nilai dan aturan ini adalah konfigurasi prototipe, bukan standar operasional pemerintah.

## 3. Struktur folder

```text
src/
├── agents/
│   ├── triage.js       # Agent klasifikasi
│   ├── policy.js       # Agent retrieval kebijakan
│   ├── optimizer.js    # Agent optimasi penanganan
│   └── critic.js       # Agent audit
├── controllers/
│   └── incidentController.js
├── data/
│   ├── policies.js     # Dataset kebijakan demo
│   ├── facilities.js   # Data fasilitas demo
│   └── teams.js        # Data tim demo
├── graph/
│   ├── state.js        # Schema state LangGraph
│   ├── nodes.js        # Fungsi node
│   └── graph.js        # Susunan graph dan routing
├── routes/
│   └── incidentRoutes.js
├── services/
│   ├── weather.js
│   ├── facilities.js
│   ├── teams.js
│   └── policyStore.js
├── utils/
│   ├── logger.js
│   ├── scoring.js
│   └── demo.js
├── app.js
└── server.js
```

## 4. Prasyarat

- Node.js versi 20 atau yang lebih baru (disarankan versi LTS yang kompatibel dengan dependency proyek).
- npm.
- 9router berjalan di `http://localhost:20128/v1` (atau base URL lain) dan API key 9router yang memiliki akses ke model yang dipilih. Cek dengan `curl -H "Authorization: Bearer $ROUTER_API_KEY" http://localhost:20128/v1/models`.
- Postman (opsional, untuk menguji API).

## 5. Instalasi dan konfigurasi

### Langkah 1 — Ambil project

Jika project diberikan sebagai ZIP, ekstrak terlebih dahulu. Buka folder backend yang berisi `package.json` di VS Code.

### Langkah 2 — Instal dependency

Jalankan di terminal pada folder backend:

```bash
npm install
```

### Langkah 3 — Buat file environment

Salin `.env.example` menjadi `.env` (Windows PowerShell):

```powershell
Copy-Item .env.example .env
```

Atau Windows Command Prompt:

```cmd
copy .env.example .env
```

Edit `.env`:

```dotenv
PORT=8000
ROUTER_API_KEY=ISI_API_KEY_9ROUTER_ANDA
ROUTER_BASE_URL=http://localhost:20128/v1
ROUTER_MODEL=nous/tencent/hy4-flash:free
DEMO_MODE=false
CORS_ORIGIN=http://localhost:3000
```

- `PORT`: port server.
- `ROUTER_API_KEY`: API key 9router (diawali `sk-`). Jangan commit atau membagikan file `.env`.
- `ROUTER_BASE_URL`: endpoint OpenAI-compatible 9router. Default `http://localhost:20128/v1`.
- `ROUTER_MODEL`: id model dari daftar `/v1/models`, misalnya `nous/tencent/hy4-flash:free`.
- `DEMO_MODE`: `false` menggunakan pemanggilan agent AI; `true` mengizinkan fallback demo jika pipeline gagal, sesuai implementasi controller.
- `CORS_ORIGIN`: origin frontend. Beberapa origin dapat dipisahkan dengan koma, sesuai konfigurasi backend.

### Langkah 4 — Jalankan backend

Mode development:

```bash
npm run dev
```

Mode biasa:

```bash
npm start
```

Server default berjalan di `http://localhost:8000`.

### Langkah 5 — Cek health

```http
GET http://localhost:8000/health
```

Respons yang diharapkan:

```json
{
  "status": "ok"
}
```

## 6. Pengujian API dengan Postman

### A. Buat laporan incident

Request:

```http
POST http://localhost:8000/api/incidents
Content-Type: application/json
```

Body → raw → JSON:

```json
{
  "description": "Terjadi banjir di jalan utama, air mulai memasuki area permukiman.",
  "location": "Jalan utama dekat pasar",
  "latitude": -7.533,
  "longitude": 110.595
}
```

Field:

- `description` (wajib): deskripsi laporan dalam string tidak kosong.
- `location` (opsional): deskripsi lokasi.
- `latitude` (opsional): latitude numerik.
- `longitude` (opsional): longitude numerik.
- `imageUrl` (opsional): URL gambar jika didukung oleh agent yang digunakan.

Respons sukses umumnya berstatus `201 Created` dan berisi objek `incident`, termasuk `id`. **Simpan nilai `incident.id`**, karena diperlukan untuk request stream.

### B. Baca stream pemrosesan incident

Request:

```http
GET http://localhost:8000/api/stream?incident_id=ID_INCIDENT_DARI_POST
```

Ganti `ID_INCIDENT_DARI_POST` dengan ID dari respons POST.

Endpoint ini menggunakan SSE (`text/event-stream`). Postman akan mempertahankan koneksi selama server mengirim event dan proses berlangsung.

Event yang mungkin diterima:

- `log`: pesan/log agent atau sistem.
- `state_update`: status agent.
- `agent_progress`: update node (jika versi controller yang mendukungnya digunakan).
- `decision_ready`: hasil keputusan akhir.
- `error`: proses pipeline gagal.

Contoh event SSE:

```text
event: message
data: {"type":"log","log":{"content":"..."}}

```

Payload SSE adalah stream, bukan satu JSON respons biasa. `200 OK` hanya berarti koneksi berhasil dibuka; bukan bukti graph selesai. Tunggu payload `decision_ready` atau `error`.

> Controller menjalankan graph ketika endpoint stream dipanggil. Memanggil stream endpoint lagi dengan incident ID yang sama dapat memulai pemrosesan graph lagi; belum ada mekanisme idempotensi/pencegahan proses ganda.

## 7. Troubleshooting

### `description wajib berupa string tidak kosong`

POST body harus dikirim melalui **Body → raw → JSON**, bukan Query Params. Pastikan field `description` ada dan bukan string kosong.

### Konflik nama state dan node LangGraph

Nama node tidak boleh sama dengan channel/atribut state. Jika state memiliki channel `triage` atau `decision`, jangan mendaftarkan node dengan nama yang identik. Gunakan nama node yang berbeda, misalnya `finalize` untuk node finalisasi, dan sesuaikan edge/routing.

### 9router `404 Not Found` / model tidak tersedia

Model yang dipanggil mungkin tidak tersedia untuk key tersebut. Lihat daftar model yang benar-benar bisa dipanggil:

```bash
curl -H "Authorization: Bearer $ROUTER_API_KEY" http://localhost:20128/v1/models
```

Salin salah satu `id` dari hasil tersebut ke `ROUTER_MODEL` di `.env`, lalu restart server. Jangan menebak nama model.

### 9router `401 Unauthorized`

Periksa `ROUTER_API_KEY` di `.env` dan pastikan 9router menyimpan key tersebut (dashboard → Endpoint). Pastikan juga `ROUTER_BASE_URL` mengarah ke instance yang benar.

### Model sibuk / `429` / `503`

Layanan model dapat sedang sibuk atau kuota habis. Coba kembali setelah jeda atau ganti `ROUTER_MODEL` ke model lain yang tersedia. LangChain melakukan retry sehingga request mungkin memerlukan waktu. Jika berulang:

- periksa terminal backend untuk stack trace;
- jangan terus mengirim POST baru (gunakan incident ID yang sama untuk uji stream, dengan catatan pemanggilan stream menjalankan graph lagi);
- pertimbangkan menambahkan timeout, retry yang dibatasi, dan penanganan status gagal;
- DEMO_MODE dapat membantu pengujian fallback, tetapi output demo bukan output AI aktual.

### SSE `200 OK` tetapi tidak ada `decision_ready`

- Periksa terminal backend.
- Cari pesan `[GRAPH]` atau `[PIPELINE ERROR]` jika logging tersebut telah ditambahkan.
- `200 OK` tidak menunjukkan graph sukses.
- Jika tidak ada progres, controller/streaming mungkin belum mengirim update selama node menunggu model.

### `incident_id tidak ditemukan`

Incident disimpan di RAM (Map). ID akan hilang ketika proses server dimulai ulang. Pastikan POST berhasil, gunakan ID yang benar, dan server belum restart.

## 8. Batasan prototipe saat ini

- **Belum ada MongoDB atau database permanen.** Incident tersimpan dalam Map di memory proses Node.js; data hilang ketika server restart.
- Model default `nous/tencent/hy4-flash:free` tidak mendukung input gambar; field `imageUrl` hanya berguna jika `ROUTER_MODEL` diganti dengan model yang memiliki kemampuan vision.
- Retrieval kebijakan masih sederhana, belum merupakan sistem knowledge base produksi.
- SSE dan proses graph belum menggunakan queue/background worker yang durable.
- Tidak ada autentikasi/otorisasi API dalam prototipe ini.
- Output AI, draft SPT, dan respons warga perlu validasi manusia.
- Ketersediaan model, kuota, dan rate limit bergantung pada API key 9router serta penyedia model di baliknya.
- Jangan memasukkan data pribadi/sensitif warga ke demo tanpa kebijakan perlindungan data yang sesuai.

## 9. Checklist menjalankan backend

- [ ] Folder backend terbuka dan `package.json` terlihat.
- [ ] `npm install` berhasil.
- [ ] `.env` dibuat dan API key sudah diisi.
- [ ] `npm run dev` berjalan tanpa startup error.
- [ ] GET `/health` menghasilkan `status: ok`.
- [ ] POST `/api/incidents` mengembalikan `201` dan incident ID.
- [ ] GET `/api/stream?incident_id=...` menerima event SSE.
- [ ] Stream berakhir dengan `decision_ready` atau menunjukkan `error` yang dapat ditelusuri.

## 10. Catatan integrasi frontend

Frontend dapat:

1. Mengirim POST `/api/incidents`.
2. Mengambil `incident.id` dari respons.
3. Membuka SSE `/api/stream?incident_id=...`.
4. Membaca payload event dan memetakan `log`, `state_update`, `agent_progress`, `decision_ready`, atau `error`.
5. Menampilkan hasil keputusan sebagai **draft untuk persetujuan manusia**, bukan keputusan otomatis yang langsung dijalankan.

Untuk implementasi browser, `EventSource` native dapat digunakan untuk endpoint SSE GET. Pastikan parsing payload mengikuti field `type` pada JSON yang dikirim backend.
