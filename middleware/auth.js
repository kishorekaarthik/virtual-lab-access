import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getContainer } from "../services/db.js";
dotenv.config();

// Sign JWT
export function signToken(user) {
  const payload = {
    uid: user.id,
    email: user.email,
    role: user.role || "Student",
  };
  const secret = process.env.JWT_SECRET || "supersecret";
  return jwt.sign(payload, secret, { expiresIn: "8h" });
}

// Decode JWT
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).send("Missing token");

  try {
    const secret = process.env.JWT_SECRET || "supersecret";
    req.user = jwt.verify(token, secret); // { uid, email, role }
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).send("Invalid or expired token");
  }
}

// Role guard
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).send("Unauthenticated");

    try {
      // Fetch latest role from DB
      const users = await getContainer("users", "/email");
      const { resources } = await users.items
        .query({
          query: "SELECT TOP 1 * FROM c WHERE c.email=@e",
          parameters: [{ name: "@e", value: req.user.email }],
        })
        .fetchAll();

      const dbUser = resources[0];
      const currentRole = dbUser?.role || req.user.role || "Student";
      req.user.role = currentRole;

      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).send("Forbidden: insufficient permissions");
      }

      next();
    } catch (err) {
      console.error("Role check failed:", err.message);
      res.status(500).send("Role verification error");
    }
  };
}
