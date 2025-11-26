import { apiGet, apiPost } from './api.js';
const tbody = document.querySelector('#btbl tbody');

async function load(){
  const rows = await apiGet('/bookings/my');
  tbody.innerHTML = '';
  rows.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${b.LabName}</td>
      <td>${new Date(b.StartUtc).toLocaleString()}</td>
      <td>${new Date(b.EndUtc).toLocaleString()}</td>
      <td>${b.Status}</td>
      <td><button class="start">Start</button> <button class="stop">Stop</button></td>`;
    tr.querySelector('.start').onclick = ()=> apiPost('/sessions/start',{ labId: b.LabId??0 }).then(()=>alert('Start requested'));
    tr.querySelector('.stop').onclick  = ()=> apiPost('/sessions/stop', { labId: b.LabId??0 }).then(()=>alert('Stop requested'));
    tbody.appendChild(tr);
  });
}
load();
