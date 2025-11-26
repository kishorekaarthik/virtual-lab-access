import { Router } from "express";
import { getContainer } from "../services/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

/**
 * POST /api/faculty/labs
 * body: { name, category, capacity, tasks: [{ taskId, taskName, description, dueDate, marks }] }
 * Creates a lab with faculty = current user's email
 */
router.post("/labs", requireAuth, requireRole("Faculty", "Admin"), async (req, res) => {
  const { name, category, capacity, tasks } = req.body || {};
  if (!name || !category || !capacity) return res.status(400).send("Missing fields");

  const labs = await getContainer("labs", "/category");

  // Validate tasks array
  let validTasks = [];
  if (tasks && Array.isArray(tasks)) {
    validTasks = tasks.map((t) => ({
      taskId: t.taskId || Date.now().toString(36),
      taskName: t.taskName || "",
      description: t.description || "",
      dueDate: t.dueDate || "",
      marks: Number(t.marks) || 0,
    }));
  }

  const doc = {
    id: Date.now().toString(36),
    name,
    category,
    capacity: Number(capacity),
    faculty: req.user.email,
    createdUtc: new Date().toISOString(),
    tasks: validTasks,
  };

  try {
    await labs.items.create(doc, { partitionKey: category });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to create lab");
  }
});

/**
 * GET /api/faculty/my-labs
 * Returns labs created by this faculty (with tasks)
 */
router.get("/my-labs", requireAuth, requireRole("Faculty", "Admin"), async (req, res) => {
  const labsContainer = await getContainer("labs", "/faculty");
  const query = {
    query: "SELECT * FROM c WHERE c.faculty=@f ORDER BY c.createdUtc DESC",
    parameters: [{ name: "@f", value: req.user.email }],
  };

  try {
    const { resources } = await labsContainer.items.query(query).fetchAll();
    res.json(resources);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch labs");
  }
});

/**
 * GET /api/faculty/students
 * Returns students who booked labs owned by this faculty
 */
router.get("/students", requireAuth, requireRole("Faculty", "Admin"), async (req, res) => {
  const bookings = await getContainer("bookings", "/userId");

  const query = {
    query:
      "SELECT c.userEmail, c.labName, c.startUtc, c.endUtc " +
      "FROM c WHERE c.facultyEmail = @f ORDER BY c.startUtc DESC",
    parameters: [{ name: "@f", value: req.user.email }],
  };

  try {
    const { resources } = await bookings.items.query(query).fetchAll();

    const rows = resources.map((r) => ({
      studentEmail: r.userEmail,
      labName: r.labName,
      startTime: r.startUtc,
      endTime: r.endUtc,
    }));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch students");
  }
});

export default router;
