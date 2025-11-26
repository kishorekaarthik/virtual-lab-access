import { Router } from "express";
import bcrypt from "bcryptjs";
import { getContainer } from "../services/db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();
const randId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2,10)).toLowerCase();
const normEmail = e => String(e||"").trim().toLowerCase();

// Register user (default Student)
router.post("/register", async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || !password) return res.status(400).send("email/password required");

  try {
    const users = await getContainer("users", "/email");
    const { resources: existing } = await users.items
      .query({ query: "SELECT * FROM c WHERE c.email = @e", parameters: [{ name: "@e", value: email }] })
      .fetchAll();
    if (existing.length) return res.status(409).send("Email already exists");

    const hash = await bcrypt.hash(password, 10);
    const user = { id: randId(), email, passwordHash: hash, role: "Student", createdUtc: new Date().toISOString() };
    await users.items.create(user, { partitionKey: email });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).send("Registration failed");
  }
});

// Login user
router.post("/login", async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || !password) return res.status(400).send("email/password required");

  try {
    const users = await getContainer("users", "/email");
    const { resources } = await users.items
      .query({ query: "SELECT TOP 1 * FROM c WHERE c.email = @e", parameters: [{ name: "@e", value: email }] })
      .fetchAll();

    const user = resources[0];
    if (!user) return res.status(401).send("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).send("Invalid credentials");

    const token = signToken(user);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).send("Login failed");
  }
});

// Get current user info with latest role
router.get("/me", requireAuth, async (req, res) => {
  try {
    const users = await getContainer("users", "/email");
    const { resources } = await users.items
      .query({ query: "SELECT TOP 1 * FROM c WHERE c.email=@e", parameters: [{ name: "@e", value: req.user.email }] })
      .fetchAll();

    const dbUser = resources[0];
    if (!dbUser) return res.status(404).send("User not found");

    res.json({ user: { uid: dbUser.id, email: dbUser.email, role: dbUser.role } });
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).send("Error fetching user data");
  }
});

export default router;
