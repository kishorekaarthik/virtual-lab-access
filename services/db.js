import { CosmosClient } from "@azure/cosmos";

let client, db;

/** Get (or create) DB */
export async function getDb() {
  if (db) return db;
  if (!process.env.COSMOS_CONN_STRING) throw new Error("COSMOS_CONN_STRING missing");
  client = new CosmosClient(process.env.COSMOS_CONN_STRING);
  const { database } = await client.databases.createIfNotExists({ id: process.env.COSMOS_DB || "VirtualLabsDB" });
  db = database; return db;
}

/** Get (or create) container with partition key */
export async function getContainer(id, partitionKeyPath) {
  const database = await getDb();
  const { container } = await database.containers.createIfNotExists({
    id,
    partitionKey: { paths: [partitionKeyPath] },
    indexingPolicy: { indexingMode: "consistent" }
  });
  return container;
}

/** Ensure containers exist + optional seed */
export async function ensureContainersAndSeed() {
  const users = await getContainer("users", "/email");
  const labs = await getContainer("labs", "/category");
  const bookings = await getContainer("bookings", "/userId");
  const sessions = await getContainer("sessions", "/userId");

  if (process.env.SEED_LABS === "true") {
    const { resources } = await labs.items.query("SELECT TOP 1 * FROM c").fetchAll();
    if (resources.length === 0) {
      await labs.items.create({ id: "l1", name: "Intro to Networking", category: "Networking", faculty: "Dr. Rao", capacity: 25 });
      await labs.items.create({ id: "l2", name: "Python for Data Science", category: "Programming", faculty: "Prof. Mehta", capacity: 30 });
      await labs.items.create({ id: "l3", name: "Cloud Fundamentals", category: "Cloud", faculty: "Dr. Iyer", capacity: 40 });
      console.log("Seeded labs.");
    }
  }
  return { users, labs, bookings, sessions };
}
