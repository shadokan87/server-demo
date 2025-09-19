import express from "express";
import pino from "pino";
import dotenv from "dotenv";

// Import route modules
import usersRouter from "./routes/users.js";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import notificationsRouter from "./routes/notifications.js";
import ordersRouter from "./routes/api/orders.js";
import paymentsRouter from "./routes/api/payments.js";
import adminRouter from "./routes/admin/dashboard.js";

// Load environment variables
dotenv.config();

// Logger qui écrit dans la console
const log = pino();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON parsing
app.use(express.json());

// Route racine
app.get("/", (req, res) => {
  res.json({ message: "hello world" });
});

// Mount route modules
app.use("/users", usersRouter);
app.use("/products", productsRouter);
app.use("/categories", categoriesRouter);
app.use("/notifications", notificationsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/admin", adminRouter);

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