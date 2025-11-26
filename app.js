import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureContainersAndSeed } from "./services/db.js";

import authRoutes from "./routes/auth.js";
import labsRoutes from "./routes/labs.js";
import bookingRoutes from "./routes/bookings.js";
import sessionRoutes from "./routes/sessions.js";
import adminRoutes from './routes/admin.js';
import facultyRoutes from "./routes/faculty.js";



const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => res.send("Virtual Labs API (Cosmos) running"));

app.use("/api/auth", authRoutes);
app.use("/api/labs", labsRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/sessions", sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/faculty", facultyRoutes);

const port = process.env.PORT || 7071;

ensureContainersAndSeed()
  .then(() => app.listen(port, () => console.log(`API on http://localhost:${port}`)))
  .catch((e) => { console.error("Startup error:", e); process.exit(1); });
