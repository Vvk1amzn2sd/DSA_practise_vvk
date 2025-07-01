// main.js

// Firebase config is imported from firebase.js
import { firebaseApp, database, auth } from './firebase.js';

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const problemSelect = document.getElementById('problemSelect');
const categorySelect = document.getElementById('category');
const questionPane = document.getElementById('daily-question');
const timerDisplay = document.getElementById('timerDisplay');
const currentYear = document.getElementById('currentYear');

let timerInterval;
let seconds = 0;
let currentUser = null;
let currentProblem = null;

currentYear.textContent = new Date().getFullYear();

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth-section').style.display = 'none';
  }
});

window.signupUser = function () {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsachallenge.com`;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert('Signup successful!'))
    .catch(err => alert(err.message));
}

window.loginUser = function () {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsachallenge.com`;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert('Login successful!'))
    .catch(err => alert(err.message));
}

window.loadQuestionByDate = async function () {
  const selectedDate = new Date(datePicker.value);
  const day = selectedDate.getDate();
  const month = selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const category = categorySelect.value;

  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;

  const res = await fetch(url);
  const files = await res.json();

  const sorted = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md')).sort((a, b) => new Date(a.git_url) - new Date(b.git_url));

  problemSelect.innerHTML = '';
  sorted.forEach((file, idx) => {
    const option = document.createElement('option');
    option.value = file.download_url;
    option.textContent = file.name.replace('.txt', '').replace('.md', '');
    problemSelect.appendChild(option);
  });
}

window.loadSelectedProblem = async function () {
  const url = problemSelect.value;
  const res = await fetch(url);
  const content = await res.text();
  currentProblem = url;
  questionPane.innerHTML = `<h2>${problemSelect.selectedOptions[0].text}</h2><pre>${content}</pre>`;
}

window.startTimer = function () {
  if (timerInterval) clearInterval(timerInterval);
  seconds = 0;
  timerDisplay.textContent = '0 sec';
  timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds} sec`;
  }, 1000);
}

window.submitSolution = function () {
  clearInterval(timerInterval);
  const timeTaken = seconds;
  seconds = 0;
  timerDisplay.textContent = '0 sec';

  alert(`Solution submitted! Time: ${timeTaken} sec`);
  // Store in Firebase
  if (currentUser && currentProblem) {
    const ref = database.ref(`submissions/${currentUser.uid}`).push();
    ref.set({
      time: timeTaken,
      problem: currentProblem,
      username: currentUser.email.split('@')[0],
      timestamp: Date.now()
    });
  }
}

// Resizable logic
const idePane = document.querySelector('.ide-pane');
const questionPane = document.querySelector('.question-pane');

let isResizing = false;

questionPane.addEventListener('mousedown', (e) => {
  if (e.offsetX > questionPane.clientWidth - 10) {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
  }
});

document.addEventListener('mousemove', (e) => {
  if (isResizing) {
    const newWidth = e.clientX;
    questionPane.style.width = `${newWidth}px`;
    idePane.style.width = `calc(100% - ${newWidth}px)`;
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = 'default';
});

// Theme toggle
const themeToggle = document.getElementById('themeSwitch');
themeToggle?.addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
});
