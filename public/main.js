import { firebaseApp, database, auth } from './firebase.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const langSelector = document.getElementById('languageSelect');
const selectedLangDisplay = document.getElementById('selectedLangDisplay');
const runOutput = document.getElementById('runOutput');
const stdinInput = document.getElementById('stdinInput');
const attemptCountDisplay = document.getElementById('attemptCountDisplay');
const winnerBanner = document.getElementById('winnerBanner');
const timerDisplay = document.getElementById('timerDisplay');

let timerInterval;
let seconds = 0;
let currentUser = null;

const langMap = {
  java: 62, cpp: 54, c: 50, python: 71, javascript: 63, typescript: 74,
  ruby: 72, csharp: 51, go: 60, php: 68, swift: 83, rust: 73,
  sql: 82, assembly: 86
};

window.selectedLang = langSelector.value;

langSelector.addEventListener("change", () => {
  window.selectedLang = langSelector.value;
  selectedLangDisplay.textContent = `🟪 ${langSelector.options[langSelector.selectedIndex].text}`;
  if (window.editor) {
    monaco.editor.setModelLanguage(window.editor.getModel(), window.selectedLang);
  }
});

require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.34.1/min/vs' } });

require(['vs/editor/editor.main'], function () {
  window.editor = monaco.editor.create(document.getElementById('editor'), {
    value: "// Write your code here...",
    language: window.selectedLang || 'javascript',
    theme: 'vs-dark',
    fontSize: 14,
    automaticLayout: true
  });
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
      alert('Signup successful!');
      location.reload();
    })
    .catch(err => alert(err.message));
};

window.loginUser = function () {
  const email = emailInput.value;
  const password = passwordInput.value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      alert('Login successful!');
      location.reload();
    })
    .catch(err => alert(err.message));
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
  const stdin = stdinInput.value;
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
      body: JSON.stringify({ language_id, source_code, stdin })
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
  const stdin = stdinInput.value;
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

    if (currentUser) {
      const selectedDate = new Date(datePicker.value || new Date());
      const day = selectedDate.getDate();
      const month = selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase();
      const problemId = `${month}_${day}_${window.selectedLang}`;

      const username = currentUser.email.split('@')[0];

      const submissionRef = database.ref(`submissions/${currentUser.uid}`).push();
      const submission = {
        time: timeTaken,
        username,
        timestamp: Date.now(),
        result,
        language: window.selectedLang,
        code: source_code
      };
      submissionRef.set(submission);
      updateAttemptCount();

      const winnerRef = database.ref(`winners/${month}_${day}/${window.selectedLang}`);
      winnerRef.once('value').then(snapshot => {
        const existing = snapshot.val();
        if (!existing || timeTaken < existing.time) {
          winnerRef.set({ username, time: timeTaken });
          winnerBanner.textContent = `${username} is currently the fastest in ${window.selectedLang}!`;
        }
      });

      const solutionRef = database.ref(`solutions/${month}/${day}/${window.selectedLang}/${username}`);
      solutionRef.set(submission);
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
