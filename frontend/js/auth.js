const API = localStorage.getItem("API_BASE") || "http://localhost:7071/api";

(async function () {
  const path = location.pathname.split("/").pop() || "index.html";
  const PUBLIC = new Set(["", "index.html"]);

  // Page access rules
  const GUARDS = {
    "labs.html": ["Student"],
    "bookings.html": ["Student"],
    "faculty.html": ["Faculty"],
    "admin.html": ["Admin"],
  };

  if (PUBLIC.has(path)) return;
 
  document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("logoutBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      localStorage.clear();           // Remove token, role, email
      alert("Logged out successfully"); 
      location.href = "index.html";   // Redirect to login page
    });
  }
});


  const token = localStorage.getItem("token");
  if (!token) { location.href = "index.html"; return; }

  try {
    const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());
    const { user } = await r.json();
    localStorage.setItem("role", user.role);
    localStorage.setItem("email", user.email);

    const allowed = GUARDS[path];
    if (allowed && !allowed.includes(user.role)) {
      alert("Access Denied: You cannot access this page.");
      location.href = "index.html";
    }
  } catch {
    localStorage.clear();
    location.href = "index.html";
  }
})();
