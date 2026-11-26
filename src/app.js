import express from "express";
import cors from "cors";
import incidentRoutes from "./routes/incidentRoutes.js";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || true,
    }),
);

app.use((req, res, next) => {
    console.log(
        `[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`
    );
    next();
});


app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/api", incidentRoutes);

app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});

export default app;