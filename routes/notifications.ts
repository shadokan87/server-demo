import { Router } from "express";

const router = Router();

// GET all notifications
router.get("/", (req, res) => {
  res.json({ 
    notifications: Array.from({length: 15}, (_, i) => ({
      id: i + 1,
      title: `Notification ${i + 1}`,
      message: `This is notification message ${i + 1}`,
      type: ["info", "warning", "success", "error"][Math.floor(Math.random() * 4)],
      read: Math.random() > 0.5,
      createdAt: new Date(Date.now() - i * 3600000)
    }))
  });
});

// GET unread notifications count
router.get("/unread/count", (req, res) => {
  res.json({ 
    unreadCount: Math.floor(Math.random() * 10)
  });
});

// POST create notification
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "Notification created", 
    notification: { 
      id: Math.floor(Math.random() * 1000), 
      ...req.body,
      read: false,
      createdAt: new Date()
    }
  });
});

// PUT mark as read
router.put("/:id/read", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "Notification marked as read", 
    notification: { id: parseInt(id), read: true }
  });
});

// PUT mark all as read
router.put("/read-all", (req, res) => {
  res.json({ message: "All notifications marked as read" });
});

// DELETE notification
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Notification ${id} deleted` });
});

// DELETE clear all notifications
router.delete("/clear-all", (req, res) => {
  res.json({ message: "All notifications cleared" });
});

export default router;
