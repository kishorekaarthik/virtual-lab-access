import { Router } from "express";
import { getContainer } from "../services/db.js";
import { requireAuth } from "../middleware/auth.js";
import { startSession, stopSession } from "../services/labsClient.js";

const router = Router();
const rid = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,10)).toLowerCase();

/** POST /api/sessions/start {labId} */
router.post("/start", requireAuth, async (req, res) => {
  const { labId } = req.body || {};
  if (!labId) return res.status(400).send("labId required");

  await startSession({ userId: req.user.uid, labId });
  const sessions = await getContainer("sessions", "/userId");
  await sessions.items.create({
    id: rid(),
    userId: req.user.uid,
    userEmail: req.user.email,
    labId,
    vmId: null,
    state: "Starting",
    createdUtc: new Date().toISOString(),
    endedUtc: null
  }, { partitionKey: req.user.uid });

  res.json({ ok: true });
});

/** POST /api/sessions/stop {labId} */
router.post("/stop", requireAuth, async (req, res) => {
  const { labId } = req.body || {};
  if (!labId) return res.status(400).send("labId required");

  await stopSession({ userId: req.user.uid, labId });

  const sessions = await getContainer("sessions", "/userId");
  const { resources } = await sessions.items
    .query({
      query: "SELECT TOP 1 * FROM c WHERE c.userId=@uid AND c.labId=@lab ORDER BY c.createdUtc DESC",
      parameters: [{ name: "@uid", value: req.user.uid }, { name: "@lab", value: labId }]
    }, { partitionKey: req.user.uid }).fetchAll();

  const last = resources[0];
  if (last) {
    last.state = "Stopped";
    last.endedUtc = new Date().toISOString();
    await sessions.item(last.id, last.userId).replace(last);
  }
  res.json({ ok: true });
});

export default router;
