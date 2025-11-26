import { apiGet, apiPost } from './api.js';
const tbody = document.querySelector('#tbl tbody');
const q = document.getElementById('q');
document.getElementById('refresh').onclick = load;

let labs = [];
function render(){
  tbody.innerHTML = '';
  const s = (q.value||'').toLowerCase();
  labs.filter(l => !s || [l.Name,l.Category,l.Faculty].some(x=>String(x||'').toLowerCase().includes(s)))
      .forEach(l=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${l.Name}</td><td>${l.Category||'-'}</td><td>${l.Faculty||'-'}</td><td>${l.Capacity??'-'}</td><td><button>Book</button></td>`;
        tr.querySelector('button').onclick = async ()=>{
          const startUtc = new Date(Date.now()+10*60000).toISOString();
          const endUtc = new Date(Date.now()+70*60000).toISOString();
          await apiPost('/bookings',{ labId: l.LabId, startUtc, endUtc });
          alert('Booking created'); location.href='bookings.html';
        };
        tbody.appendChild(tr);
      });
}
async function load(){ labs = await apiGet('/labs'); render(); }
q.oninput = render; load();
