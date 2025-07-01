// Firebase Configuration (ensure firebase.js is imported separately)
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, set, push, update, get, child } from "firebase/database";
import { initializeApp } from "firebase/app";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/marked.min.js";

import { firebaseConfig } from './firebase.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const problemSelect = document.getElementById('problemSelect');
const categorySelect = document.getElementById('category');
const dailyQuestion = document.getElementById('daily-question');
const timerDisplay = document.getElementById('timerDisplay');
const leaderboardDisplay = document.getElementById('leaderboardDisplay');
const leaderboardType = document.getElementById('leaderboardType');
const currentYear = document.getElementById('currentYear');

let timer = null;
let seconds = 0;
let currentUser = null;
let currentProblemURL = null;

currentYear.textContent = new Date().getFullYear();

// Auth
window.signupUser = async () => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsa.com`;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Signup successful');
  } catch (err) {
    alert(err.message);
  }
};

window.loginUser = async () => {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsa.com`;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
};

onAuthStateChanged(auth, user => {
  currentUser = user;
});

// Load problems from GitHub based on month & category
async function loadProblems() {
  const month = new Date(datePicker.value).toLocaleString('en-us', { month: 'long' }).toUpperCase();
  const category = categorySelect.value;

  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;
  try {
    const res = await fetch(url);
    const files = await res.json();

    problemSelect.innerHTML = '<option value="">Select Problem</option>';
    files.forEach(file => {
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const opt = document.createElement('option');
        opt.value = file.download_url;
        opt.textContent = file.name.replace('.md', '').replace('.txt', '');
        problemSelect.appendChild(opt);
      }
    });
  } catch (err) {
    console.error(err);
    alert('Error loading problems');
  }
}

problemSelect.addEventListener('change', async () => {
  const url = problemSelect.value;
  if (!url) return;
  try {
    const res = await fetch(url);
    const text = await res.text();
    dailyQuestion.innerHTML = marked.parse(text);
    currentProblemURL = url;
  } catch (err) {
    console.error(err);
    alert('Error loading problem content');
  }
});

categorySelect.addEventListener('change', loadProblems);
datePicker.addEventListener('change', loadProblems);

// Timer
window.startTimer = () => {
  if (timer) clearInterval(timer);
  seconds = 0;
  timerDisplay.textContent = '0 sec';
  timer = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds} sec`;
  }, 1000);
};

// Submit
window.submitSolution = async () => {
  if (!currentUser) return alert('Please login first');
  if (!currentProblemURL) return alert('No problem selected');

  const iframe = document.getElementById('codeEditor');
  const code = iframe?.contentWindow?.document.getElementById('code')?.value || '';

  if (!code.trim()) return alert('Code is empty');

  clearInterval(timer);
  const userId = currentUser.uid;
  const username = currentUser.email.split('@')[0];

  const todayKey = new Date().toISOString().split('T')[0];
  const category = categorySelect.value;
  const hash = btoa(currentProblemURL);

  const submissionPath = `submissions/${category}/${todayKey}/${hash}/${userId}`;

  const snapshot = await get(child(ref(db), submissionPath));
  if (snapshot.exists()) {
    alert('You have already submitted this problem today');
    return;
  }

  await set(ref(db, submissionPath), {
    username,
    code,
    timeTaken: seconds,
    submittedAt: Date.now()
  });

  alert(`Submitted in ${seconds} sec`);
  timerDisplay.textContent = '0 sec';
};

// Leaderboard Toggle
window.toggleLeaderboard = async () => {
  const type = leaderboardType.value;
  leaderboardDisplay.innerHTML = 'Loading...';

  const all = ref(db, 'submissions');
  const snapshot = await get(all);
  if (!snapshot.exists()) {
    leaderboardDisplay.textContent = 'No data';
    return;
  }

  const now = Date.now();
  const data = snapshot.val();
  const flat = [];

  Object.values(data).forEach(category => {
    Object.entries(category).forEach(([date, problems]) => {
      const ts = new Date(date).getTime();
      const isValid = type === 'daily' ? ts >= now - 86400000 : ts >= now - 7 * 86400000;
      if (!isValid) return;
      Object.values(problems).forEach(problem => {
        Object.values(problem).forEach(sub => {
          flat.push(sub);
        });
      });
    });
  });

  flat.sort((a, b) => a.timeTaken - b.timeTaken);
  const top = flat.slice(0, 10);
  leaderboardDisplay.innerHTML = top.map((x, i) => `${i + 1}. ${x.username} (${x.timeTaken}s)`).join('<br>');
};
