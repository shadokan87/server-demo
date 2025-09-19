import { Router } from "express";

const router = Router();

// GET all categories
router.get("/", (req, res) => {
  res.json({ 
    categories: [
      { id: 1, name: "Electronics", description: "Electronic devices and gadgets" },
      { id: 2, name: "Clothing", description: "Fashion and apparel" },
      { id: 3, name: "Books", description: "Books and literature" },
      { id: 4, name: "Home & Garden", description: "Home improvement and garden supplies" }
    ]
  });
});

// GET category by ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    category: { 
      id: parseInt(id), 
      name: `Category ${id}`,
      description: `Description for category ${id}`,
      productCount: Math.floor(Math.random() * 100)
    }
  });
});

// POST create category
router.post("/", (req, res) => {
  res.status(201).json({ 
    message: "Category created", 
    category: { 
      id: Math.floor(Math.random() * 1000), 
      ...req.body,
      createdAt: new Date()
    }
  });
});

// PUT update category
router.put("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ 
    message: "Category updated", 
    category: { id: parseInt(id), ...req.body, updatedAt: new Date() }
  });
});

// DELETE category
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  res.json({ message: `Category ${id} deleted` });
});

// GET subcategories
router.get("/:id/subcategories", (req, res) => {
  const { id } = req.params;
  res.json({ 
    subcategories: Array.from({length: 5}, (_, i) => ({
      id: i + 1,
      name: `Subcategory ${i + 1}`,
      parentId: parseInt(id)
    }))
  });
});

export default router;
