// js/faculty.js
import { apiGet, apiPost } from './api.js';

const btnAdd = document.getElementById('btnAddLab');
const nameEl = document.getElementById('labName');
const catEl = document.getElementById('labCat');
const capEl = document.getElementById('labCap');
const taskIdEl = document.getElementById('taskId');
const taskNameEl = document.getElementById('taskName');
const taskDescEl = document.getElementById('taskDesc');
const taskDueEl = document.getElementById('taskDueDate');
const taskMarksEl = document.getElementById('taskMarks');
const labsGrid = document.getElementById('labsGrid');
const studentsGrid = document.getElementById('studentsGrid');

// 🧪 Create Lab with optional task
btnAdd.onclick = async () => {
  const name = nameEl.value.trim();
  const category = catEl.value.trim();
  const capacity = parseInt(capEl.value);

  if (!name || !category || !capacity) return alert("Fill all lab fields");

  const task = taskIdEl.value && taskNameEl.value
    ? [{
        taskId: taskIdEl.value.trim(),
        taskName: taskNameEl.value.trim(),
        description: taskDescEl.value.trim(),
        dueDate: taskDueEl.value,
        marks: parseInt(taskMarksEl.value) || 0
      }]
    : [];

  const btn = btnAdd;
  btn.disabled = true;
  btn.textContent = '⏳ Adding Lab...';

  try {
    await apiPost('/faculty/labs', { name, category, capacity, tasks: task });
    alert('✅ Lab added successfully!');

    // Clear inputs
    nameEl.value = catEl.value = capEl.value = '';
    taskIdEl.value = taskNameEl.value = taskDescEl.value = taskDueEl.value = taskMarksEl.value = '';

    loadLabs();
  } catch (err) {
    alert('❌ Failed to create lab: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '➕ Add Lab';
  }
};

// 👩‍🏫 Load Labs created by faculty
async function loadLabs() {
  labsGrid.innerHTML = '<p>Loading labs...</p>';
  try {
    const labs = await apiGet('/faculty/my-labs'); // ✅ correct endpoint
    labsGrid.innerHTML = '';

    if (!labs.length) {
      labsGrid.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No labs created yet.</div>
      </div>`;
      return;
    }

    labs.forEach(lab => {
      const card = document.createElement('div');
      card.className = 'student-card';

      const tasksHTML = lab.tasks?.length
        ? lab.tasks.map(t => `
            <div class="detail-row">
              <span class="detail-label">${t.taskName}:</span>
              ${t.description} - Marks: ${t.marks}, Due: ${new Date(t.dueDate).toLocaleDateString()}
            </div>
          `).join('')
        : '';

      card.innerHTML = `
        <div class="student-header">
          <div class="student-avatar">🧪</div>
          <div class="student-info">
            <h4>${lab.name}</h4>
            <span class="lab-badge">${lab.category}</span>
          </div>
        </div>
        <div class="student-details">
          <div class="detail-row"><span class="detail-label">Capacity:</span> ${lab.capacity}</div>
          <div class="detail-row"><span class="detail-label">Created:</span> ${new Date(lab.createdUtc).toLocaleDateString()}</div>
          ${tasksHTML}
        </div>
      `;
      labsGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    labsGrid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">Failed to load labs. Try again later.</div>
    </div>`;
  }
}

// 👥 Load Students enrolled in your labs
async function loadStudents() {
  studentsGrid.innerHTML = '<p>Loading students...</p>';
  try {
    const students = await apiGet('/faculty/students');
    studentsGrid.innerHTML = '';

    if (!students.length) {
      studentsGrid.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">No student enrollments yet.</div>
      </div>`;
      return;
    }

    students.forEach(s => {
      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <div class="student-header">
          <div class="student-avatar">${s.studentEmail[0].toUpperCase()}</div>
          <div class="student-info">
            <h4>${s.studentEmail}</h4>
            <span class="lab-badge">${s.labName}</span>
          </div>
        </div>
        <div class="student-details">
          <div class="detail-row">
            <span class="detail-icon">🕒</span>
            <span class="detail-label">Start:</span>
            <span class="detail-value">${new Date(s.startTime).toLocaleString()}</span>
          </div>
          <div class="detail-row">
            <span class="detail-icon">⏰</span>
            <span class="detail-label">End:</span>
            <span class="detail-value">${new Date(s.endTime).toLocaleString()}</span>
          </div>
        </div>`;
      studentsGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    studentsGrid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <div class="empty-text">Failed to load students. Try again later.</div>
    </div>`;
  }
}

// Initial load
loadLabs();
loadStudents();
