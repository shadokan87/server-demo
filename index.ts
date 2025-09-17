import express from "express";
import pino from "pino";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Logger qui écrit dans la console
const log = pino();

const app = express();
const PORT = process.env.PORT || 3000;

// Route racine
app.get("/", (req, res) => {
  res.json({ message: "hello world" });
});

// Route /health
app.get("/health", (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: new Date(),
    memoryUsage: process.memoryUsage(),
  };

  log.info({ status }, "Health check"); // log dans le fichier
  res.json({ status: "ok", serverStatus: status });
});

// Lancer le serveur
app.listen(PORT, () => {
  log.info(`Server started on http://localhost:${PORT}`);
  console.log(`Server running on http://localhost:${PORT}`);
});

const intervalMs = 5000; // n ms
setInterval(() => {
  const status = {
    uptime: process.uptime(),
    timestamp: new Date(),
    memoryUsage: process.memoryUsage(),
  };
  log.info({ status }, "Periodic server status");
}, intervalMs);