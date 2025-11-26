// Stub for Azure Lab Services integration (replace with REST/SDK later)
export async function startSession({ userId, labId }) {
  return { ok: true, vmId: null, labId, userId };
}
export async function stopSession({ userId, labId }) {
  return { ok: true, labId, userId };
}
