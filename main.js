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

let timerInterval;
let seconds = 0;
let currentUser = null;
let currentProblem = null;

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

  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;
  const res = await fetch(url);
  const files = await res.json();

  const sorted = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md')).sort((a, b) => new Date(a.git_url) - new Date(b.git_url));

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

window.submitSolution = function () {
  clearInterval(timerInterval);
  const timeTaken = seconds;
  seconds = 0;
  timerDisplay.textContent = '0 sec';

  const result = Math.random() > 0.3 ? 'PASS' : 'FAIL';
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
