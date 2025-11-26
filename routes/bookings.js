import { Router } from "express";
import { getContainer } from "../services/db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const rid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toLowerCase();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { labId, startUtc, endUtc } = req.body || {};
    if (!labId || !startUtc || !endUtc) return res.status(400).send("Missing fields");

    const labs = await getContainer("labs", "/category");
    const bookings = await getContainer("bookings", "/userId");

    const { resources: labLookup } = await labs.items
      .query({
        query: "SELECT * FROM c WHERE c.id = @id",
        parameters: [{ name: "@id", value: labId }],
      })
      .fetchAll();

    const lab = labLookup[0];
    if (!lab) return res.status(404).send("Lab not found");

    const doc = {
      id: rid(),
      userId: req.user.uid,
      userEmail: req.user.email,
      labId: lab.id,
      labName: lab.name,
      facultyEmail: lab.faculty || null,
      startUtc,
      endUtc,
      status: "Scheduled",
      tasks: (lab.tasks || []).map(t => ({
        taskId: t.taskId || rid(),
        taskName: t.taskName || "",
        description: t.description || "",
        dueDate: t.dueDate || "",
        marks: t.marks || 0
      })),
      createdUtc: new Date().toISOString(),
    };

    const { resource } = await bookings.items.create(doc, { partitionKey: req.user.uid });
    res.json({ BookingId: resource.id, Status: resource.status });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).send("Internal server error");
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const bookings = await getContainer("bookings", "/userId");
    const { resources } = await bookings.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.userId = @uid ORDER BY c.createdUtc DESC",
          parameters: [{ name: "@uid", value: req.user.uid }],
        },
        { partitionKey: req.user.uid }
      )
      .fetchAll();

    const data = resources.map(b => ({
      id: b.id,
      labId: b.labId,
      labName: b.labName,
      start: b.startUtc,
      end: b.endUtc,
      status: b.status === "Scheduled" ? "Confirmed" : b.status,
      tasks: (b.tasks || []).map(t => ({
        taskId: t.taskId,
        taskName: t.taskName,
        description: t.description,
        dueDate: t.dueDate,
        marks: t.marks
      })),
    }));

    res.json(data);
  } catch (err) {
    console.error("List bookings error:", err);
    res.status(500).send("Internal server error");
  }
});

router.get("/my", requireAuth, async (req, res) => {
  try {
    const bookings = await getContainer("bookings", "/userId");
    const { resources } = await bookings.items
      .query(
        {
          query: "SELECT * FROM c WHERE c.userId = @uid ORDER BY c.createdUtc DESC",
          parameters: [{ name: "@uid", value: req.user.uid }],
        },
        { partitionKey: req.user.uid }
      )
      .fetchAll();

    const data = resources.map(b => ({
      BookingId: b.id,
      LabId: b.labId,
      LabName: b.labName,
      StartUtc: b.startUtc,
      EndUtc: b.endUtc,
      Status: b.status,
      Tasks: (b.tasks || []).map(t => ({
        taskId: t.taskId,
        taskName: t.taskName,
        description: t.description,
        dueDate: t.dueDate,
        marks: t.marks
      })),
    }));

    res.json(data);
  } catch (err) {
    console.error("Fetch my bookings error:", err);
    res.status(500).send("Internal server error");
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const bookings = await getContainer("bookings", "/userId");

    const item = bookings.item(id, req.user.uid);
    const { resource } = await item.read();

    if (!resource) return res.status(404).send("Booking not found");
    if (resource.userId !== req.user.uid) return res.status(403).send("Forbidden");

    resource.status = "Cancelled";
    await item.replace(resource);
    res.json({ ok: true, id, status: "Cancelled" });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).send("Internal server error");
  }
});

export default router;
