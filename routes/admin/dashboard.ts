import { Router } from "express";

const router = Router();

// GET analytics dashboard
router.get("/dashboard", (req, res) => {
  res.json({ 
    stats: {
      totalUsers: Math.floor(Math.random() * 10000),
      totalOrders: Math.floor(Math.random() * 5000),
      totalRevenue: Math.floor(Math.random() * 1000000),
      activeUsers: Math.floor(Math.random() * 1000)
    }
  });
});

// GET all users (admin view)
router.get("/users", (req, res) => {
  res.json({ 
    users: Array.from({length: 10}, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ["user", "admin"][Math.floor(Math.random() * 2)],
      status: ["active", "inactive"][Math.floor(Math.random() * 2)]
    }))
  });
});

// PUT update user role
router.put("/users/:id/role", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "User role updated", 
    user: { id: parseInt(id), role: req.body.role }
  });
});

// DELETE ban user
router.delete("/users/:id/ban", (req, res) => {
  const { id } = req.params;
  res.json({ message: `User ${id} has been banned` });
});

// GET system logs
router.get("/logs", (req, res) => {
  res.json({ 
    logs: Array.from({length: 20}, (_, i) => ({
      id: i + 1,
      timestamp: new Date(Date.now() - i * 60000),
      level: ["info", "warn", "error"][Math.floor(Math.random() * 3)],
      message: `System log entry ${i + 1}`
    }))
  });
});

// POST clear logs
router.post("/logs/clear", (req, res) => {
  res.json({ message: "Logs cleared successfully" });
});

export default router;
