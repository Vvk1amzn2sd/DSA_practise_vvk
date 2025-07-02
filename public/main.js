import { firebaseApp, database, auth } from './firebase.js';

const emailInput = document.getElementById('email');
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
const langSelector = document.getElementById("languageSelect");
const selectedLangDisplay = document.getElementById("selectedLangDisplay");

let timerInterval;
let seconds = 0;
let currentUser = null;
let currentProblem = null;

currentYear.textContent = new Date().getFullYear();

window.selectedLang = langSelector.value;
const langMap = {
  java: 62, cpp: 54, c: 50, python: 71, javascript: 63, typescript: 74,
  ruby: 72, csharp: 51, go: 60, php: 68, swift: 83, rust: 73,
  sql: 82, assembly: 86
};

langSelector.addEventListener("change", () => {
  window.selectedLang = langSelector.value;
  selectedLangDisplay.textContent = `🟪 ${langSelector.options[langSelector.selectedIndex].text}`;
  monaco.editor.setModelLanguage(window.editor.getModel(), window.selectedLang);
});

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth-section').style.display = 'none';
    updateAttemptCount();
  }
});

window.signupUser = function () {
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert('Signup successful! Enjoy the DSA challenges.');
      location.reload();
    })
    .catch(err => alert(err.message));
};

window.loginUser = function () {
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert('Welcome to DSA GRIND!');
      updateAttemptCount();
    })
    .catch(err => alert(err.message));
};

window.loadQuestionByDate = async function () {
  const selectedDate = new Date(datePicker.value);
  const day = selectedDate.getDate();
  const month = selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase();
  const category = categorySelect.value;

  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;
  const res = await fetch(url);
  const files = await res.json();

  const sorted = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'))
    .sort((a, b) => new Date(a.name.split('_')[0]) - new Date(b.name.split('_')[0]));

  problemSelect.innerHTML = '';
  sorted.forEach(file => {
    const option = document.createElement('option');
    option.value = file.download_url;
    option.textContent = file.name.replace(/\.(txt|md)$/, '');
    problemSelect.appendChild(option);
  });

  liveBanner.textContent = `${month} ${day} Challenge is Live!`;

  const winnersRef = database.ref(`winners/${month}_${day}`);
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
  questionPane.innerHTML = `<h2>${problemSelect.selectedOptions[0].text}</h2><pre style="white-space: pre-wrap;">${content}</pre>`;
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
  const source_code = window.editor.getValue();
  const stdin = document.getElementById('stdinInput').value;
  const runOutput = document.getElementById('runOutput');
  const language_id = langMap[window.selectedLang];

  runOutput.textContent = "Running...";

  try {
    const response = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "x-rapidapi-key": "1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81"
      },
      body: JSON.stringify({
        language_id,
        source_code,
        stdin
      })
    });

    const data = await response.json();
    runOutput.textContent = data.stdout || data.stderr || data.compile_output || 'No output';
  } catch (err) {
    runOutput.textContent = 'Error: ' + err.message;
  }
};

window.submitSolution = async function () {
  clearInterval(timerInterval);
  const timeTaken = seconds;
  seconds = 0;
  timerDisplay.textContent = '0 sec';

  const source_code = window.editor.getValue();
  const stdin = document.getElementById('stdinInput').value;
  const language_id = langMap[window.selectedLang];

  try {
    const response = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "x-rapidapi-key": "1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81"
      },
      body: JSON.stringify({
        language_id,
        source_code,
        stdin
      })
    });

    const data = await response.json();
    const result = data.stdout && data.stderr === null && data.status?.id === 3 ? 'PASS' : 'FAIL';

    const message = `Solution submitted!\nTime: ${timeTaken} sec\nResult: ${result}`;
    alert(message);

    if (currentUser && currentProblem) {
      const ref = database.ref(`submissions/${currentUser.uid}`).push();
      const submission = {
        time: timeTaken,
        problem: currentProblem,
        username: currentUser.email.split('@')[0],
        timestamp: Date.now(),
        result
      };
      ref.set(submission);
      updateAttemptCount();

      const selectedDate = new Date(datePicker.value);
      const month = selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase();
      const day = selectedDate.getDate();
      const winnerRef = database.ref(`winners/${month}_${day}/${categorySelect.value}`);

      winnerRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (!data || timeTaken < data.time) {
          winnerRef.set({ username: submission.username, time: timeTaken });
          winnerBanner.textContent = `${submission.username} is the fastest in ${categorySelect.value}!`;
        }
      });

      const solutionRef = database.ref(`solutions/${month}/${day}/${categorySelect.value}/${submission.username}`);
      solutionRef.set({
        time: timeTaken,
        code: source_code,
        language: selectedLang,
        result: result,
        timestamp: submission.timestamp
      });
    }
  } catch (err) {
    alert('Submission failed: ' + err.message);
  }
};

function updateAttemptCount() {
  if (!currentUser) return;
  const todayKey = new Date().toISOString().split('T')[0];
  const countRef = database.ref(`attempts/${currentUser.uid}/${todayKey}`);

  countRef.transaction(current => (current || 0) + 1).then(snapshot => {
    attemptCountDisplay.textContent = `${snapshot.snapshot.val()} attempt(s) today`;
  });
}
