import "dotenv/config";
import app from "./app.js";
const port = Number(process.env.PORT) || 8000;
if (!process.env.GEMINI_API_KEY && process.env.DEMO_MODE !== "true")
  console.warn(
    "GEMINI_API_KEY belum diatur. Server akan gagal menjalankan agen AI kecuali DEMO_MODE=true.",
  );
app.listen(port, () =>
  console.log(
    `Urban Incident Coordinator backend berjalan di http://localhost:${port}`,
  ),
);
