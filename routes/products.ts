import { Router } from "express";

const router = Router();

// GET all products
router.get("/", (req, res) => {
  res.json({ 
    products: [
      { id: 1, name: "Laptop", price: 999.99, category: "electronics" },
      { id: 2, name: "Coffee Mug", price: 12.50, category: "home" },
      { id: 3, name: "Smartphone", price: 699.99, category: "electronics" }
    ]
  });
});

// GET products by category
router.get("/category/:category", (req, res) => {
  const { category } = req.params;
  res.json({ 
    category,
    products: [
      { id: Math.floor(Math.random() * 100), name: `${category} item`, price: Math.random() * 100 }
    ]
  });
});

// POST create product
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "Product created", 
    product: { id: Math.floor(Math.random() * 1000), ...req.body }
  });
});

// PATCH update product price
router.patch("/:id/price", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "Price updated", 
    product: { id: parseInt(id), newPrice: req.body.price }
  });
});

// DELETE product
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Product ${id} deleted` });
});

export default router;
