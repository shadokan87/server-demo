import { Router } from "express";

const router = Router();

// GET all payments
router.get("/", (req, res) => {
  res.json({ 
    payments: [
      { id: 1, orderId: 1, amount: 129.99, method: "credit_card", status: "completed" },
      { id: 2, orderId: 2, amount: 89.50, method: "paypal", status: "pending" }
    ]
  });
});

// GET payment by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    payment: { 
      id: parseInt(id), 
      orderId: Math.floor(Math.random() * 100),
      amount: Math.random() * 1000,
      method: ["credit_card", "paypal", "bank_transfer"][Math.floor(Math.random() * 3)],
      status: ["pending", "completed", "failed"][Math.floor(Math.random() * 3)]
    }
  });
});

// POST process payment
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "Payment processed", 
    payment: { 
      id: Math.floor(Math.random() * 1000), 
      ...req.body,
      status: "pending",
      processedAt: new Date()
    }
  });
});

// POST refund payment
router.post("/:id/refund", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "Refund processed", 
    refund: { paymentId: parseInt(id), amount: req.body.amount, status: "completed" }
  });
});

export default router;
