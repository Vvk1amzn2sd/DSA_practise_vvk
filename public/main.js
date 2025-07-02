// main.js

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBxmE8mAJJ5pFkOWC00ct_pWK1Autr2PAo",
  authDomain: "dsa-challenge.firebaseapp.com",
  databaseURL: "https://dsa-challenge-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dsa-challenge",
  storageBucket: "dsa-challenge.appspot.com",
  messagingSenderId: "866070092409",
  appId: "1:866070092409:web:49faada850b1b91bbf52a8",
  measurementId: "G-P3Y7XMJN2L"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const langSelector = document.getElementById('languageSelect');
const runOutput = document.getElementById('runOutput');
const stdinInput = document.getElementById('stdinInput');
const attemptCountDisplay = document.getElementById('attemptCountDisplay');
const winnerBanner = document.getElementById('winnerBanner');
const timerDisplay = document.getElementById('timerDisplay');
const questionContent = document.getElementById('questionContent');
const difficultySelect = document.getElementById('difficultySelect');
const testResults = document.getElementById('testResults');
const testSummary = document.getElementById('testSummary');
const testCases = document.getElementById('testCases');

let timerInterval;
let seconds = 0;
let currentUser = null;
let testCasesData = [];

const langMap = {
  java: 62, cpp: 54, c: 50, python: 71, javascript: 63
};

window.selectedLang = langSelector.value;

// Signup and Login
window.signupUser = function() {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) return alert('Enter email and password');

  auth.createUserWithEmailAndPassword(email, password)
    .then(user => {
      alert('Signup successful!');
      database.ref(`users/${user.user.uid}`).set({
        email,
        joined: Date.now()
      });
    })
    .catch(err => alert(err.message));
};

window.loginUser = function() {
  const email = emailInput.value;
  const password = passwordInput.value;
  if (!email || !password) return alert('Enter email and password');

  auth.signInWithEmailAndPassword(email, password)
    .then(() => alert('Login successful!'))
    .catch(err => alert(err.message));
};

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth-section').style.display = 'none';
    attemptCountDisplay.style.display = 'block';
    updateAttemptCount();
    loadQuestion();
  }
});

// Monaco
require.config({ paths: { 'vs': 'https://unpkg.com/monaco-editor@0.34.1/min/vs' } });
require(['vs/editor/editor.main'], function() {
  window.editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Write your code here',
    language: window.selectedLang,
    theme: 'vs-dark',
    fontSize: 14,
    automaticLayout: true
  });
});

langSelector.addEventListener("change", () => {
  window.selectedLang = langSelector.value;
  monaco.editor.setModelLanguage(window.editor.getModel(), window.selectedLang);
});

window.startTimer = function() {
  clearInterval(timerInterval);
  seconds = 0;
  timerDisplay.textContent = '0 sec';
  timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds} sec`;
  }, 1000);
};

window.runCode = async function() {
  const code = window.editor.getValue();
  const stdin = stdinInput.value;
  const language_id = langMap[window.selectedLang];

  if (!code.trim()) return runOutput.textContent = 'Please write some code';

  runOutput.textContent = 'Running...';

  const res = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
      "x-rapidapi-key": "1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81"
    },
    body: JSON.stringify({ language_id, source_code: code, stdin })
  });

  const data = await res.json();
  runOutput.textContent = data.stdout || data.stderr || data.compile_output || 'No output';
};

window.submitSolution = async function() {
  clearInterval(timerInterval);
  const timeTaken = seconds;
  const code = window.editor.getValue();
  const language_id = langMap[window.selectedLang];
  if (!code.trim()) return alert('Write code before submitting');

  testResults.style.display = 'none';
  testCases.innerHTML = '';
  let passed = 0, failed = 0;

  for (const [i, testCase] of testCasesData.entries()) {
    const res = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "x-rapidapi-key": "1ac6d75981msh80a21e7c5ff6a9dp18f155jsn216aa37e0e81"
      },
      body: JSON.stringify({ language_id, source_code: code, stdin: testCase.input })
    });
    const data = await res.json();
    const output = (data.stdout || '').trim();
    const expected = testCase.expected.trim();

    const div = document.createElement('div');
    div.className = `test-case ${output === expected ? 'test-pass' : 'test-fail'}`;
    div.innerHTML = `<strong>Test ${i + 1}</strong><br>Input: ${testCase.input}<br>Expected: ${expected}<br>Actual: ${output}`;
    testCases.appendChild(div);

    if (output === expected) passed++; else failed++;
  }

  testSummary.innerHTML = `Passed: ${passed} / ${testCasesData.length}`;
  testResults.style.display = 'block';

  if (currentUser) {
    const date = new Date(datePicker.value);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
    const lang = window.selectedLang;
    const username = currentUser.email.split('@')[0];

    const record = {
      time: timeTaken,
      username,
      timestamp: Date.now(),
      result: failed === 0 ? 'PASS' : 'FAIL',
      passed,
      total: testCasesData.length,
      language: lang,
      code
    };

    database.ref(`solutions/${month}/${day}/${lang}/${username}`).set(record);
    database.ref(`submissions/${currentUser.uid}`).push(record);

    const winRef = database.ref(`winners/${month}_${day}/${lang}`);
    winRef.once('value').then(snapshot => {
      const best = snapshot.val();
      if (!best || timeTaken < best.time) {
        winRef.set({ username, time: timeTaken });
        winnerBanner.textContent = `${username} is currently the fastest in ${lang}!`;
      }
    });
  }
};

function updateAttemptCount() {
  const today = new Date().toISOString().split('T')[0];
  const ref = database.ref(`attempts/${currentUser.uid}/${today}`);
  ref.transaction(n => (n || 0) + 1).then(snap => {
    attemptCountDisplay.textContent = `${snap.snapshot.val()} attempt(s) today`;
  });
}

async function loadQuestion() {
  const date = new Date(datePicker.value);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
  const difficulty = difficultySelect.value;

  questionContent.innerHTML = '<i>Loading...</i>';

  try {
    const mdURL = `https://raw.githubusercontent.com/Vvk1amzn2sd/DSA_practise_vvk/main/Questions/${month}/${day}/${difficulty}.md`;
    const tcURL = `https://raw.githubusercontent.com/Vvk1amzn2sd/DSA_practise_vvk/main/Questions/${month}/${day}/${difficulty}_test_cases.json`;

    const mdRes = await fetch(mdURL);
    const markdown = await mdRes.text();
    questionContent.innerHTML = marked.parse(markdown);

    const tcRes = await fetch(tcURL);
    testCasesData = await tcRes.json();
    if (testCasesData.length > 0) stdinInput.value = testCasesData[0].input;
  } catch (err) {
    questionContent.innerHTML = `<p>Error loading question: ${err.message}</p>`;
  }
}

datePicker.addEventListener('change', loadQuestion);
difficultySelect.addEventListener('change', loadQuestion);
if (auth.currentUser) loadQuestion();
