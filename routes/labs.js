// server/routes/labs.js
import { Router } from "express";
import { getContainer } from "../services/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/** GET /api/labs
 * Returns labs in TitleCase to match your frontend (Name/Category/Faculty/Capacity/LabId)
 */
router.get("/", requireAuth, async (_req, res) => {
  const labs = await getContainer("labs", "/category");
  const { resources } = await labs.items.readAll().fetchAll();

  const data = resources.map((x) => ({
    LabId: x.id,
    Name: x.name,
    Category: x.category,
    Faculty: x.faculty,
    Capacity: x.capacity,
  }));

  res.json(data);
});

/** POST /api/labs
 * Faculty/Admin can create a lab.
 * Accepts either { name, category, capacity } or { Name, Category, Capacity }
 */
router.post("/", requireAuth, requireRole("Faculty", "Admin"), async (req, res) => {
  const name = req.body?.name ?? req.body?.Name;
  const category = req.body?.category ?? req.body?.Category;
  const capacity = req.body?.capacity ?? req.body?.Capacity;

  if (!name || !category || !capacity) {
    return res.status(400).send("Missing fields (name/category/capacity)");
  }

  const labs = await getContainer("labs", "/category");

  const doc = {
    id: Date.now().toString(36),
    name: String(name).trim(),
    category: String(category).trim(),
    capacity: Number(capacity),
    faculty: req.user.email, // owner = current faculty/admin
    createdUtc: new Date().toISOString(),
  };

  // partition key is /category
  await labs.items.create(doc, { partitionKey: doc.category });

  // respond in TitleCase like GET /api/labs
  res.json({
    LabId: doc.id,
    Name: doc.name,
    Category: doc.category,
    Faculty: doc.faculty,
    Capacity: doc.capacity,
  });
});

export default router;
