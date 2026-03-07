import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// TODO: REPLACE THIS WITH YOUR CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyCY7XTA2BvF8hrpvk65bBkm_qz3MzBUR7M",
    authDomain: "habbit-builder-f56b3.firebaseapp.com",
    projectId: "habbit-builder-f56b3",
    storageBucket: "habbit-builder-f56b3.firebasestorage.app",
    messagingSenderId: "213220040348",
    appId: "1:213220040348:web:442715e1cf39a93518d759",
    measurementId: "G-EHQSYCX0PF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Application State
let tasks = [
    { id: 1, name: "Attend Calendar Event", icon: "📅", category: "Calendar", completed: false },
    { id: 2, name: "10,000 Steps", icon: "👟", category: "Fitness", completed: false },
    { id: 4, name: "Git Push", icon: "🔀", category: "Git", completed: false }
];
let chartInstance = null;

// ====================== AUTHENTICATION ======================

document.getElementById('login-btn').onclick = () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

document.getElementById('signup-btn').onclick = () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

document.getElementById('google-btn').onclick = () => signInWithPopup(auth, googleProvider);
document.getElementById('logout-btn').onclick = () => signOut(auth);

// Handle UI based on Login State
onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    
    if (user) {
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        document.getElementById('user-display').textContent = user.email;
        
        // Database Sync: Fetch GitHub Username
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            localStorage.setItem('githubUsername', snap.data().githubUsername);
        } else {
            const gitName = prompt("Enter your GitHub username to link your city:");
            if (gitName) {
                await setDoc(userRef, { githubUsername: gitName, email: user.email });
                localStorage.setItem('githubUsername', gitName);
            }
        }
        initDashboard();
    } else {
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// ====================== CITY LOGIC ======================

function initDashboard() {
    renderTasks();
    renderBuildings();
    updateProgress();
    checkGithubPush();
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    list.innerHTML = tasks.map(t => `
        <div onclick="window.toggleTask(${t.id})" class="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-zinc-100 transition">
            <div class="w-10 h-10 flex items-center justify-center text-xl border-2 rounded-xl ${t.completed ? 'bg-emerald-400 border-emerald-400 text-white' : 'bg-white'}">
                ${t.completed ? '✓' : t.icon}
            </div>
            <div>
                <div class="font-bold text-sm">${t.name}</div>
                <div class="text-[10px] uppercase text-zinc-400 font-bold">${t.category}</div>
            </div>
        </div>
    `).join('');
}

window.toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if(task) task.completed = !task.completed;
    renderTasks();
    updateProgress();
};

function updateProgress() {
    const done = tasks.filter(t => t.completed).length;
    const perc = Math.round((done / tasks.length) * 100);
    document.getElementById('progress-bar').style.width = perc + '%';
    document.getElementById('progress-perc').textContent = perc + '%';
    document.getElementById('avg-completion').textContent = perc + '%';
    
    // Growth animation for buildings
    document.querySelectorAll('.building').forEach(b => {
        const maxH = b.dataset.max;
        b.style.height = Math.floor((perc / 100) * maxH) + 'px';
    });
}

function renderBuildings() {
    const container = document.getElementById('buildings-container');
    const heights = [300, 220, 400, 280, 480, 350]; 
    container.innerHTML = heights.map((h, i) => `
        <div data-max="${h}" class="building w-12 bg-indigo-600 rounded-t transition-all duration-1000" style="height:0px; opacity: ${0.5 + (i * 0.1)}"></div>
    `).join('');
}

async function checkGithubPush() {
    const user = localStorage.getItem('githubUsername');
    if(!user) return;
    
    try {
        const res = await fetch(`https://api.github.com/users/${user}/events`);
        const events = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const pushed = events.some(e => e.type === 'PushEvent' && e.created_at.startsWith(today));
        
        if(pushed) {
            const gitTask = tasks.find(t => t.category === 'Git');
            if(gitTask && !gitTask.completed) {
                gitTask.completed = true;
                renderTasks();
                updateProgress();
            }
        }
    } catch(e) { console.error("GitHub sync failed"); }
}

// Stats Toggle
document.getElementById('view-btn').onclick = () => {
    const stats = document.getElementById('stats-view');
    stats.classList.toggle('hidden');
    document.getElementById('view-btn').textContent = stats.classList.contains('hidden') ? 'View Stats' : 'View City';
    if(!stats.classList.contains('hidden')) renderChart();
};

function renderChart() {
    const ctx = document.getElementById('progress-chart');
    if(chartInstance) chartInstance.destroy();
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Habit %',
                data: [40, 60, 100, 80, 90, 30, 100],
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
    });
}