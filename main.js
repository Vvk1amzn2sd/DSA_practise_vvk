// main.js
import { firebaseApp, database, auth } from './firebase.js';

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const problemSelect = document.getElementById('problemSelect');
const categorySelect = document.getElementById('category');
const questionPane = document.getElementById('daily-question');
const timerDisplay = document.getElementById('timerDisplay');
const currentYear = document.getElementById('currentYear');
const liveBanner = document.getElementById('liveChallengeBanner');
const winnerLine = document.getElementById('winnerLine');
const attemptCountDisplay = document.getElementById('attemptCountDisplay');
const winnerBanner = document.getElementById('winnerBanner');
const runOutput = document.getElementById('runOutput');
const stdinInput = document.getElementById('stdinInput');
const languageSelect = document.getElementById('languageSelect');

let timerInterval;
let seconds = 0;
let currentUser = null;
let currentProblem = null;
let currentDateKey = '';

currentYear.textContent = new Date().getFullYear();

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth-section').style.display = 'none';
    updateAttemptCount();
  }
});

window.signupUser = function () {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsachallenge.com`;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => alert('Signup successful!'))
    .catch(err => alert(err.message));
};

window.loginUser = function () {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const email = `${username}@dsachallenge.com`;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert('Login successful!');
      updateAttemptCount();
    })
    .catch(err => alert(err.message));
};

window.loadQuestionByDate = async function () {
  const selectedDate = new Date(datePicker.value);
  const day = selectedDate.getDate();
  const month = selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const category = categorySelect.value;

  currentDateKey = `${month}_${day}`;

  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;
  const res = await fetch(url);
  const files = await res.json();

  const sorted = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md')).sort();
  problemSelect.innerHTML = '';

  sorted.forEach(file => {
    const option = document.createElement('option');
    option.value = file.download_url;
    option.textContent = file.name.replace(/\.(txt|md)$/, '');
    problemSelect.appendChild(option);
  });

  liveBanner.textContent = `${month} ${day} Challenge is Live!`;

  const winnersRef = database.ref(`winners/${currentDateKey}`);
  winnersRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (data) {
      const line = ['easy', 'medium', 'hard']
        .filter(level => data[level])
        .map(level => `${level}: ${data[level].username} 🏆`)
        .join(' | ');
      winnerLine.textContent = line ? `Yesterday's winners — ${line}` : '';
    } else {
      winnerLine.textContent = '';
    }
  });
};

window.loadSelectedProblem = async function () {
  const url = problemSelect.value;
  const res = await fetch(url);
  const content = await res.text();
  currentProblem = url;
  questionPane.innerHTML = `<h2>${problemSelect.selectedOptions[0].text}</h2><pre>${content}</pre>`;
};

window.startTimer = function () {
  if (timerInterval) clearInterval(timerInterval);
  seconds = 0;
  timerDisplay.textContent = '0 sec';
  timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds} sec`;
  }, 1000);
};

window.runCode = async function () {
  const code = window.editor.getValue();
  const language = languageSelect.value;
  const stdin = stdinInput.value;

  runOutput.textContent = 'Running...';

  const langMap = {
    c: 50, cpp: 54, java: 62, python: 71, javascript: 63, typescript: 74,
    ruby: 72, csharp: 51, go: 60, php: 68, swift: 83, rust: 73, sql: 82, assembly: 86
  };

  const language_id = langMap[language] || 62;

  const res = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
      'x-rapidapi-key': '1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81'
    },
    body: JSON.stringify({ source_code: code, language_id, stdin })
  });

  const result = await res.json();
  runOutput.textContent = result.stdout || result.stderr || result.compile_output || 'No output';
};

window.submitSolution = async function () {
  clearInterval(timerInterval);
  const timeTaken = seconds;
  seconds = 0;
  timerDisplay.textContent = '0 sec';

  if (!currentUser || !currentProblem) return alert("Login and select a problem first");

  const code = window.editor.getValue();
  const language = languageSelect.value;
  const stdin = stdinInput.value;
  const uid = currentUser.uid;

  const submissionRef = database.ref(`submissions/${uid}`);
  const snapshot = await submissionRef.orderByChild("problem").equalTo(currentProblem).once("value");

  if (snapshot.exists()) return alert("You already submitted this problem.");

  const langMap = {
    c: 50, cpp: 54, java: 62, python: 71, javascript: 63, typescript: 74,
    ruby: 72, csharp: 51, go: 60, php: 68, swift: 83, rust: 73, sql: 82, assembly: 86
  };

  const language_id = langMap[language] || 62;

  const res = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
      'x-rapidapi-key': '1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81'
    },
    body: JSON.stringify({ source_code: code, language_id, stdin })
  });

  const result = await res.json();
  const passed = result.stdout && result.stdout.trim().length > 0 && !result.stderr;

  const submission = {
    time: timeTaken,
    problem: currentProblem,
    username: currentUser.email.split('@')[0],
    timestamp: Date.now(),
    result: passed ? 'PASS' : 'FAIL',
    language,
    output: result.stdout || result.stderr || result.compile_output
  };

  await database.ref(`submissions/${uid}`).push(submission);
  updateAttemptCount();

  const winnerRef = database.ref(`winners/${currentDateKey}/${categorySelect.value}`);
  winnerRef.once('value').then(snapshot => {
    const data = snapshot.val();
    if (!data || timeTaken < data.time) {
      winnerRef.set({ username: submission.username, time: timeTaken });
      winnerBanner.textContent = `${submission.username} is the fastest in ${categorySelect.value}!`;
    }
  });

  alert(`Submitted! Result: ${submission.result}`);
};

function updateAttemptCount() {
  if (!currentUser) return;
  const todayKey = new Date().toISOString().split('T')[0];
  const countRef = database.ref(`attempts/${currentUser.uid}/${todayKey}`);

  countRef.transaction(current => (current || 0) + 1).then(snapshot => {
    attemptCountDisplay.textContent = `${snapshot.snapshot.val()} attempt(s) today`;
  });
}
