import express from "express";
import fs from "fs";
import pino from "pino";

// Logger qui écrit dans server.log
const log = pino(pino.destination("server.log"));

const app = express();
const PORT = 3000;

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