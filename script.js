import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// TODO: Paste your actual Firebase config below
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

// ====================== STATE & DATA ======================
let tasks = [
    { id: 1, name: "Attend Calendar Event", icon: "📅", category: "Calendar", completed: false },
    { id: 2, name: "10,000 Steps", icon: "👟", category: "Fitness", completed: false },
    { id: 3, name: "30min Exercise", icon: "🏋️", category: "Fitness", completed: false },
    { id: 4, name: "Git Push", icon: "🔀", category: "Git", completed: false },
    { id: 5, name: "Screen Time < 3hrs", icon: "📱", category: "Screen", completed: false }
];
let chartInstance = null;

function saveToLocal() { localStorage.setItem('habitCityTasks', JSON.stringify(tasks)); }

function loadFromLocal() {
    const saved = localStorage.getItem('habitCityTasks');
    if (saved) tasks = JSON.parse(saved);
}

function checkDayReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastDay = localStorage.getItem('lastHabitDay');
    if (lastDay !== today) {
        tasks.forEach(t => t.completed = false); // Reset all tasks
        localStorage.setItem('lastHabitDay', today);
        saveToLocal();
    }
}

// ====================== AUTHENTICATION ======================
document.getElementById('login-btn').onclick = (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Login Error: " + err.message));
};

document.getElementById('signup-btn').onclick = (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(err => alert("Signup Error: " + err.message));
};

document.getElementById('google-btn').onclick = async (e) => {
    e.preventDefault();
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Google Auth Error:", error);
        alert("Google Login failed. Make sure your local address is added to Authorized Domains in Firebase Console.");
    }
};

document.getElementById('logout-btn').onclick = () => signOut(auth);

// Handle UI based on Login State
// Handle UI based on Login State
onAuthStateChanged(auth, async (user) => {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    
    if (user) {
        authScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
        document.getElementById('user-display').textContent = user.email;
        
        try {
            // Fetch GitHub Username safely
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            
            if (snap.exists()) {
                localStorage.setItem('githubUsername', snap.data().githubUsername);
            } else {
                const gitName = prompt("Enter your GitHub username to track pushes:");
                if (gitName) {
                    await setDoc(userRef, { githubUsername: gitName, email: user.email });
                    localStorage.setItem('githubUsername', gitName);
                }
            }
        } catch (error) {
            console.error("Database permission error, but loading city anyway!", error);
            // It will log the error but WON'T crash the app!
        }
        
        // This will now successfully run no matter what!
        initDashboard();
    } else {
        authScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// ====================== CITY & TASKS LOGIC ======================
function initDashboard() {
    loadFromLocal();
    checkDayReset();
    renderTasks();
    renderBuildings();
    updateProgress();
    checkGithubPush(false); // Silent check on load
}

function renderTasks() {
    const list = document.getElementById('tasks-list');
    list.innerHTML = tasks.map(t => `
        <div onclick="window.toggleTask(${t.id})" class="p-4 bg-white border ${t.completed ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-zinc-200'} rounded-2xl flex items-center gap-4 cursor-pointer hover:-translate-y-0.5 transition-transform shadow-sm">
            <div class="w-10 h-10 flex items-center justify-center text-xl border-2 rounded-xl ${t.completed ? 'bg-emerald-400 border-emerald-400 text-white' : 'border-zinc-200'}">
                ${t.completed ? '✓' : t.icon}
            </div>
            <div class="flex-1">
                <div class="font-bold text-sm ${t.completed ? 'text-zinc-400 line-through' : 'text-zinc-900'}">${t.name}</div>
                <div class="text-[10px] uppercase text-zinc-400 font-bold">${t.category}</div>
            </div>
        </div>
    `).join('');
}

window.toggleTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if(task) task.completed = !task.completed;
    saveToLocal();
    renderTasks();
    updateProgress();
};

function renderBuildings() {
    const container = document.getElementById('buildings-container');
    
    // We added "transform-origin: bottom center" and a transition so the zoom is perfectly smooth!
    container.style.cssText = "position: absolute; bottom: 96px; left: 0; right: 0; height: 60%; display: flex; align-items: flex-end; justify-content: space-around; z-index: 20; transform-origin: bottom center; transition: transform 1.5s ease-in-out;";
    
    container.innerHTML = `
        <div class="building" data-max="380" style="width: 60px; height: 0px; background-color: #4f46e5; border-radius: 8px 8px 0 0; transition: height 1s ease-out; overflow: hidden; position: relative; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: 16px; left: 8px; right: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div>
                <div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div>
            </div>
        </div>
        
        <div class="building" data-max="260" style="width: 80px; height: 0px; background-color: #7c3aed; border-radius: 8px 8px 0 0; transition: height 1s ease-out; overflow: hidden; position: relative; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: 20px; left: 10px; right: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                <div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div>
                <div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 16px; background-color: #451a03; border-radius: 2px;"></div>
            </div>
        </div>

        <div class="building" data-max="450" style="width: 50px; height: 0px; background-color: #db2777; border-radius: 8px 8px 0 0; transition: height 1s ease-out; overflow: hidden; position: relative; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: 16px; left: 6px; right: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div>
                <div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div>
                <div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 12px; background-color: #451a03; border-radius: 2px;"></div>
            </div>
        </div>

        <div class="building" data-max="310" style="width: 90px; height: 0px; background-color: #ea580c; border-radius: 8px 8px 0 0; transition: height 1s ease-out; overflow: hidden; position: relative; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: 24px; left: 12px; right: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                <div class="window" style="height: 18px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 18px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 18px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 18px; background-color: #451a03; border-radius: 2px;"></div>
            </div>
        </div>

        <div class="building" data-max="560" style="width: 70px; height: 0px; background-color: #047857; border-radius: 8px 8px 0 0; transition: height 1s ease-out; overflow: hidden; position: relative; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);">
            <div style="position: absolute; top: 20px; left: 10px; right: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div class="window" style="height: 20px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 20px; background-color: #451a03; border-radius: 2px;"></div>
                <div class="window" style="height: 20px; background-color: #451a03; border-radius: 2px;"></div><div class="window" style="height: 20px; background-color: #451a03; border-radius: 2px;"></div>
            </div>
        </div>
    `;

    setTimeout(() => { updateProgress(); }, 50);
}

function updateProgress() {
    const done = tasks.filter(t => t.completed).length;
    const perc = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
    
    document.getElementById('completed-count').textContent = done;
    document.getElementById('progress-bar').style.width = perc + '%';
    document.getElementById('progress-perc').textContent = perc + '%';
    
    const container = document.getElementById('buildings-container');
    const containerHeight = container.clientHeight; 
    let maxBuildingHeight = 0; // Keep track of the tallest active building
    
    // Animate buildings AND light up windows!
    document.querySelectorAll('.building').forEach(b => {
        const maxH = parseFloat(b.dataset.max);
        const targetHeight = Math.floor((perc / 100) * maxH);
        
        // Find the tallest building currently rendered
        if (targetHeight > maxBuildingHeight) maxBuildingHeight = targetHeight;
        
        b.style.height = targetHeight + 'px';
        
        const windows = b.querySelectorAll('.window');
        windows.forEach((w, idx) => {
            if (targetHeight > 50 + (idx * 20)) {
                w.style.backgroundColor = '#fefce8';
                w.style.boxShadow = '0 0 10px #fef08a';
            } else {
                w.style.backgroundColor = '#451a03'; // Dark windows
                w.style.boxShadow = 'none';
            }
        });
    });

    // --- ZOOM LOGIC ---
    // Subtract 40px so the tallest roof doesn't perfectly touch the sun/clouds
    const availableSpace = containerHeight - 40; 
    
    // If the tallest building breaks through the top of our space, scale it down!
    if (maxBuildingHeight > availableSpace && maxBuildingHeight > 0) {
        const scaleFactor = availableSpace / maxBuildingHeight;
        container.style.transform = `scale(${scaleFactor})`;
    } else {
        container.style.transform = `scale(1)`;
    }
}
// ====================== GITHUB API ======================
document.getElementById('sync-github-btn').onclick = () => checkGithubPush(true);

async function checkGithubPush(showAlert = false) {
    const user = localStorage.getItem('githubUsername');
    if(!user) return;
    
    try {
        const res = await fetch(`https://api.github.com/users/${user}/events?per_page=30`);
        if (!res.ok) throw new Error("API request failed");
        
        const events = await res.json();
        const today = new Date().toISOString().split('T')[0];
        
        const pushed = events.some(e => e.type === 'PushEvent' && e.created_at.startsWith(today));
        
        if(pushed) {
            const gitTask = tasks.find(t => t.name === 'Git Push');
            if(gitTask && !gitTask.completed) {
                gitTask.completed = true;
                saveToLocal();
                renderTasks();
                updateProgress();
                if(showAlert) alert('✅ GitHub push detected today! City updated.');
            } else if (showAlert) {
                alert('GitHub is synced! Task already completed.');
            }
        } else if (showAlert) {
            alert('No GitHub push detected today. Keep coding!');
        }
    } catch(e) { console.error("GitHub sync failed", e); }
}

// ====================== MODAL & STATS ======================
document.getElementById('show-modal-btn').onclick = () => {
    document.getElementById('modal-backdrop').classList.remove('hidden');
    document.getElementById('modal-backdrop').classList.add('flex');
};
document.getElementById('close-modal-btn').onclick = () => {
    document.getElementById('modal-backdrop').classList.add('hidden');
    document.getElementById('modal-backdrop').classList.remove('flex');
};
document.getElementById('add-task-btn').onclick = () => {
    const name = document.getElementById('custom-task-name').value;
    const cat = document.getElementById('custom-task-category').value;
    if(!name) return;
    
    tasks.push({ id: Date.now(), name, icon: "⭐", category: cat, completed: false });
    saveToLocal();
    renderTasks();
    updateProgress();
    
    document.getElementById('custom-task-name').value = '';
    document.getElementById('close-modal-btn').click();
};

document.getElementById('view-btn').onclick = () => {
    const stats = document.getElementById('stats-view');
    stats.classList.toggle('hidden');
    document.getElementById('view-btn').textContent = stats.classList.contains('hidden') ? 'View Stats' : 'View City';
    
    if(!stats.classList.contains('hidden')) {
        if(chartInstance) chartInstance.destroy();
        const ctx = document.getElementById('progress-chart');
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Habit %',
                    data: [40, 65, 100, 85, 95, 30, Math.round((tasks.filter(t=>t.completed).length/tasks.length)*100)],
                    borderColor: '#facc15',
                    backgroundColor: 'rgba(250, 204, 21, 0.1)',
                    borderWidth: 4, tension: 0.4, fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
};