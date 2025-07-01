// main.js

import firebaseConfig from './firebase-config.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, get, child } from 'firebase/database';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const categorySelect = document.getElementById('category');
const problemSelect = document.getElementById('problemSelect');
const dailyQuestion = document.getElementById('daily-question');
const leaderboardDisplay = document.getElementById('leaderboardDisplay');
const timerDisplay = document.getElementById('timerDisplay');

let currentUser = null;
let currentProblem = null;
let seconds = 0;
let timerInterval;

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    document.querySelector('.auth-section').style.display = 'none';
  } else {
    currentUser = null;
    document.querySelector('.auth-section').style.display = 'flex';
  }
});

window.signupUser = async () => {
  const email = `${usernameInput.value}@dsachallenge.com`;
  const password = passwordInput.value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await set(ref(database, 'users/' + userCredential.user.uid), {
      username: usernameInput.value,
      created: Date.now()
    });
    alert('Signup successful!');
  } catch (err) {
    alert(err.message);
  }
};

window.loginUser = async () => {
  const email = `${usernameInput.value}@dsachallenge.com`;
  const password = passwordInput.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(err.message);
  }
};

window.loadQuestionByDate = async () => {
  const date = new Date(datePicker.value);
  const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
  const category = categorySelect.value;

  const githubUrl = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}/${category}`;
  try {
    const res = await fetch(githubUrl);
    const files = await res.json();
    const txtFiles = files.filter(f => f.name.endsWith('.txt') || f.name.endsWith('.md'));

    txtFiles.sort((a, b) => new Date(a.git_url) - new Date(b.git_url)); // Approx by upload order

    problemSelect.innerHTML = '<option value="">Select Problem</option>';
    txtFiles.forEach((file, idx) => {
      const option = document.createElement('option');
      option.value = file.download_url;
      option.textContent = file.name.replace(/\.(txt|md)/, '');
      problemSelect.appendChild(option);
    });
  } catch (err) {
    console.error(err);
  }
};

window.loadSelectedProblem = async () => {
  const url = problemSelect.value;
  if (!url) return;

  try {
    const res = await fetch(url);
    const text = await res.text();
    currentProblem = {
      title: problemSelect.options[problemSelect.selectedIndex].text,
      content: text
    };
    dailyQuestion.innerHTML = `<h3>${currentProblem.title}</h3><pre>${text}</pre>`;
  } catch (err) {
    console.error(err);
    dailyQuestion.textContent = 'Error loading problem';
  }
};

window.startTimer = () => {
  clearInterval(timerInterval);
  seconds = 0;
  timerDisplay.textContent = '0 sec';
  timerInterval = setInterval(() => {
    seconds++;
    timerDisplay.textContent = `${seconds} sec`;
  }, 1000);
};

window.submitSolution = async () => {
  clearInterval(timerInterval);
  const timeTaken = seconds;

  if (!currentUser || !currentProblem) {
    alert('Please login and select a problem');
    return;
  }

  const userId = currentUser.uid;
  const problemKey = `${datePicker.value}_${currentProblem.title}`;
  const submissionRef = ref(database, `submissions/${problemKey}/${userId}`);

  const snapshot = await get(submissionRef);
  if (snapshot.exists()) {
    alert('Already submitted for this problem. Only one submission allowed.');
    return;
  }

  const code = document.getElementById('codeEditor').contentWindow?.document.getElementById('code')?.value || '';
  await set(submissionRef, {
    username: currentUser.email.split('@')[0],
    timeTaken,
    code,
    submittedAt: Date.now()
  });

  alert('Submitted successfully!');
};

window.toggleLeaderboard = async () => {
  const type = document.getElementById('leaderboardType').value;
  const date = new Date(datePicker.value);
  const category = categorySelect.value;

  const month = date.toLocaleString('default', { month: 'long' }).toUpperCase();
  const keyPrefix = `${month}_${category}`;
  const submissionsRef = ref(database, 'submissions');

  const snapshot = await get(submissionsRef);
  const all = snapshot.val();
  const filtered = [];

  for (const problemKey in all) {
    if (!problemKey.startsWith(keyPrefix)) continue;
    const submissions = all[problemKey];
    for (const uid in submissions) {
      const sub = submissions[uid];
      filtered.push({ user: sub.username, time: sub.timeTaken });
    }
  }

  filtered.sort((a, b) => a.time - b.time);

  leaderboardDisplay.innerHTML = '<h4>Leaderboard</h4>' +
    filtered.map((e, i) => `<div>${i + 1}. ${e.user} (${e.time}s)</div>`).join('');
};
