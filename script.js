// ====================== DATA & STATE ======================
let tasks = [
  { id: 1, name: "Attend Calendar Event", icon: "📅", category: "Calendar", completed: false },
  { id: 2, name: "10,000 Steps", icon: "👟", category: "Fitness", completed: false },
  { id: 3, name: "30min Exercise", icon: "🏋️", category: "Fitness", completed: false },
  { id: 4, name: "Git Push", icon: "🔀", category: "Git", completed: false },
  { id: 5, name: "Screen Time < 3hrs", icon: "📱", category: "Screen", completed: false }
];

let currentView = 'city';
let chartInstance = null;

// Mock history for charts
const dailyData = [40, 65, 100, 85, 95, 30, 100];
const weeklyData = [45, 72, 88, 100];
const monthlyData = [
  {x: 'Week 1', y: 55}, {x: 'Week 2', y: 70},
  {x: 'Week 3', y: 92}, {x: 'Week 4', y: 100}
];

// ====================== CORE LOGIC ======================
function saveToLocal() { localStorage.setItem('habitCityTasks', JSON.stringify(tasks)); }

function loadFromLocal() {
  const saved = localStorage.getItem('habitCityTasks');
  if (saved) tasks = JSON.parse(saved);
}

function updateProgressUI() {
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const perc = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.getElementById('completed-count').textContent = completed;
  document.getElementById('total-tasks').textContent = total;
  document.getElementById('progress-bar').style.width = perc + '%';
  document.getElementById('progress-perc').textContent = perc + '%';
  document.getElementById('city-growth').textContent = perc + '%';
  document.getElementById('tasks-completed-top').textContent = `${completed}/${total} tasks completed`;
  
  updateCityVisual(perc);
  updateMilestones(perc);
}

// ====================== GITHUB API ======================
async function checkGitPush() {
  let githubUsername = localStorage.getItem('githubUsername');
  if (!githubUsername) {
    githubUsername = prompt('Enter your GitHub username to connect:');
    if (!githubUsername) return false;
    localStorage.setItem('githubUsername', githubUsername);
  }

  try {
    const response = await fetch(`https://api.github.com/users/${githubUsername}/events?per_page=30`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

    const events = await response.json();
    const today = new Date().toISOString().split('T')[0];

    return events.some(event => {
      if (event.type === 'PushEvent') {
        return event.created_at.split('T')[0] === today;
      }
      return false;
    });
  } catch (error) {
    console.error('Error checking GitHub:', error);
    return false;
  }
}

async function connectGitHub() {
  const hasPushed = await checkGitPush();
  if (hasPushed) {
    const gitTask = tasks.find(t => t.name === 'Git Push');
    if (gitTask && !gitTask.completed) {
      gitTask.completed = true;
      saveToLocal();
      renderTasks();
      updateProgressUI();
      alert('✅ GitHub push detected! Task completed.');
    } else {
      alert('GitHub connected! Task already completed.');
    }
  } else {
    alert('No GitHub push detected for today.');
  }
}

// ====================== ANALYTICS & GRAPHS ======================
function renderAnalytics() {
  const { perc } = calculateProgress();
  document.getElementById('avg-completion').textContent = perc;
  // Initialize with daily view
  switchChartTab(0);
}

function calculateProgress() {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    return { perc: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

function switchChartTab(tabIndex) {
  // UI Update for buttons
  document.querySelectorAll('.tab-button').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === tabIndex);
  });

  const ctx = document.getElementById('progress-chart');
  if (chartInstance) chartInstance.destroy();

  let labels, data, type;
  if (tabIndex === 0) { // Daily
    labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    data = dailyData;
    type = 'line';
  } else if (tabIndex === 1) { // Weekly
    labels = ['Week 1','Week 2','Week 3','Week 4'];
    data = weeklyData;
    type = 'bar';
  } else { // Monthly
    labels = monthlyData.map(m => m.x);
    data = monthlyData.map(m => m.y);
    type = 'line';
  }

  chartInstance = new Chart(ctx, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: 'Completion %',
        data: data,
        borderColor: '#facc15',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        tension: 0.4,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, grid: { color: '#27272a' } },
        x: { grid: { color: '#27272a' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ====================== INITIALIZATION ======================
function init() {
  loadFromLocal();
  renderCityBuildings();
  renderCars();
  renderTasks();
  updateProgressUI();
  
  const dateEl = document.querySelector('#current-date span');
  dateEl.textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  });
}

// Helpers for UI rendering
function renderCityBuildings() {
  const container = document.getElementById('buildings-container');
  const colors = ['#4f46e5', '#7c3aed', '#c026d3', '#ea580c', '#166534'];
  container.innerHTML = colors.map((color, i) => `
    <div data-max="${200 + i*50}" class="building relative w-14 rounded-t" style="background-color: ${color}; height:0px">
      <div class="windows absolute inset-x-2 top-4 grid grid-cols-2 gap-1">
        <div class="window h-3 rounded"></div><div class="window h-3 rounded"></div>
      </div>
    </div>
  `).join('');
}

function updateCityVisual(perc) {
  document.querySelectorAll('.building').forEach(b => {
    const maxH = b.dataset.max;
    b.style.height = Math.floor((perc/100) * maxH) + 'px';
  });
}

function updateMilestones(perc) {
  document.querySelectorAll('.milestone').forEach(el => {
    const level = parseInt(el.dataset.level);
    el.classList.toggle('active', perc >= level);
    el.style.opacity = perc >= level ? "1" : "0.4";
  });
}

function renderCars() {
  const container = document.getElementById('cars-container');
  container.innerHTML = `<div class="car absolute bottom-2 text-5xl" style="left:10%; animation-duration: 6s; color:#ef4444;">🚗</div>`;
}

function renderTasks() {
  const container = document.getElementById('tasks-list');
  container.innerHTML = tasks.map(t => `
    <div onclick="toggleTask(${t.id})" class="task-card flex items-center gap-x-4 px-5 py-4 bg-white border border-zinc-100 rounded-3xl cursor-pointer">
      <div class="w-8 h-8 flex items-center justify-center text-xl border-2 rounded-2xl ${t.completed ? 'bg-emerald-400 border-emerald-400' : ''}">
        ${t.completed ? '✅' : t.icon}
      </div>
      <div class="flex-1">
        <div class="font-semibold text-zinc-900">${t.name}</div>
        <div class="text-xs text-zinc-400">${t.category}</div>
      </div>
    </div>
  `).join('');
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveToLocal();
    renderTasks();
    updateProgressUI();
  }
}

function toggleView() {
  currentView = currentView === 'city' ? 'stats' : 'city';
  document.getElementById('city-view').classList.toggle('hidden');
  document.getElementById('stats-view').classList.toggle('hidden');
  document.getElementById('view-text').textContent = currentView === 'city' ? 'View Stats' : 'View City';
  if (currentView === 'stats') renderAnalytics();
}

function showAddTaskModal() { document.getElementById('modal-backdrop').classList.remove('hidden'); }
function hideAddTaskModal() { document.getElementById('modal-backdrop').classList.add('hidden'); }

function addCustomTask() {
    const name = document.getElementById('custom-task-name').value;
    if(!name) return;
    tasks.push({ id: Date.now(), name, icon: "⭐", category: "Custom", completed: false });
    saveToLocal(); renderTasks(); updateProgressUI(); hideAddTaskModal();
}

window.onload = init;