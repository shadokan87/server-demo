import { Router } from "express";

const router = Router();

// GET all orders
router.get("/", (req, res) => {
  res.json({ 
    orders: [
      { id: 1, userId: 1, total: 129.99, status: "shipped" },
      { id: 2, userId: 2, total: 89.50, status: "pending" }
    ]
  });
});

// GET order by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    order: { 
      id: parseInt(id), 
      userId: Math.floor(Math.random() * 10),
      total: Math.random() * 500,
      status: ["pending", "shipped", "delivered"][Math.floor(Math.random() * 3)]
    }
  });
});

// POST create order
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "Order created", 
    order: { 
      id: Math.floor(Math.random() * 1000), 
      ...req.body,
      status: "pending",
      createdAt: new Date()
    }
  });
});

// PUT update order status
router.put("/:id/status", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "Order status updated", 
    order: { id: parseInt(id), status: req.body.status }
  });
});

// DELETE cancel order
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Order ${id} cancelled` });
});

export default router;
