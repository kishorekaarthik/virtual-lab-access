import { Router } from "express";
import { getContainer } from "../services/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get('/users', requireAuth, requireRole('Admin'), async (_req, res) => {
  const users = await getContainer('users', '/email');
  const { resources } = await users.items.readAll().fetchAll();
  res.json(resources.map(u => ({ id: u.id, email: u.email, role: u.role })));
});

router.put('/users/:id/role', requireAuth, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  if (!['Student','Faculty','Admin'].includes(role)) return res.status(400).send('Invalid role');

  const users = await getContainer('users','/email');
  const { resources } = await users.items
    .query({ query: "SELECT * FROM c WHERE c.id=@id", parameters: [{ name: '@id', value: id }] })
    .fetchAll();
  const user = resources[0];
  if (!user) return res.status(404).send('User not found');

  user.role = role;
  await users.item(user.id, user.email).replace(user);
  res.json({ id: user.id, email: user.email, role: user.role });
});

router.get('/labs', requireAuth, requireRole('Admin'), async (_req, res) => {
  const labs = await getContainer('labs', '/id');
  const { resources } = await labs.items.readAll().fetchAll();
  res.json(resources);
});

router.get('/bookings', requireAuth, requireRole('Admin'), async (_req, res) => {
  const bookings = await getContainer('bookings', '/id');
  const { resources } = await bookings.items.readAll().fetchAll();
  res.json(resources);
});

router.get('/active-sessions', requireAuth, requireRole('Admin'), async (_req, res) => {
  const sessions = await getContainer('sessions', '/id');
  const { resources } = await sessions.items.readAll().fetchAll();
  res.json(resources);
});

router.get('/stats', requireAuth, requireRole('Admin'), async (_req, res) => {
  const users = await getContainer('users','/email');
  const labs = await getContainer('labs','/id');
  const bookings = await getContainer('bookings','/id');
  const sessions = await getContainer('sessions','/id');

  const usersCount = (await users.items.readAll().fetchAll()).resources.length;
  const labsCount = (await labs.items.readAll().fetchAll()).resources.length;
  const bookingsCount = (await bookings.items.readAll().fetchAll()).resources.length;
  const sessionsCount = (await sessions.items.readAll().fetchAll()).resources.length;

  res.json({
    totalUsers: usersCount,
    totalLabs: labsCount,
    totalBookings: bookingsCount,
    totalActiveSessions: sessionsCount
  });
});

export default router;
