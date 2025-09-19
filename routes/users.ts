import { Router } from "express";

const router = Router();

// GET all users
router.get("/", (req, res) => {
  res.json({ 
    users: [
      { id: 1, name: "Alice", email: "alice@example.com" },
      { id: 2, name: "Bob", email: "bob@example.com" }
    ]
  });
});

// GET user by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    user: { id: parseInt(id), name: "User " + id, email: `user${id}@example.com` }
  });
});

// POST create user
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "User created", 
    user: { id: Math.floor(Math.random() * 1000), ...req.body }
  });
});

// PUT update user
router.put("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "User updated", 
    user: { id: parseInt(id), ...req.body }
  });
});

// DELETE user
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `User ${id} deleted` });
});

export default router;
