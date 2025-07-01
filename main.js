import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxmE8mAJJ5pFkOWC00ct_pWK1Autr2PAo",
  authDomain: "dsa-challenge.firebaseapp.com",
  databaseURL: "https://dsa-challenge-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "dsa-challenge",
  storageBucket: "dsa-challenge.appspot.com",
  messagingSenderId: "866070092409",
  appId: "1:866070092409:web:49faada850b1b91bbf52a8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

window.signupUser = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("❌ Email and password required.");
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("✅ Signup successful!"))
    .catch(err => alert("❌ " + err.message));
};

window.loginUser = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("❌ Email and password required.");
  signInWithEmailAndPassword(auth, email, password)
    .then(() => alert("✅ Login successful!"))
    .catch(err => alert("❌ " + err.message));
};

window.googleLogin = function () {
  signInWithPopup(auth, provider)
    .then(() => alert("✅ Google login successful!"))
    .catch(err => alert("❌ " + err.message));
};

let timerInterval = null;
let startTime = null;

window.startTimer = function () {
  if (!auth.currentUser) return alert("❌ Please login first");
  startTime = new Date();
  const timerDisplay = document.getElementById("timerDisplay");
  timerInterval = setInterval(() => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    timerDisplay.textContent = `${diff} sec`;
  }, 1000);
};

window.submitSolution = function () {
  if (!auth.currentUser) return alert("❌ Login first");
  if (!startTime) return alert("❌ Start timer first");
  clearInterval(timerInterval);

  const endTime = new Date();
  const timeTaken = ((endTime - startTime) / 60000).toFixed(2);
  const date = new Date().toISOString().split("T")[0];
  const category = document.getElementById("category").value;
  const emailKey = auth.currentUser.email.replace(/[^a-zA-Z0-9]/g, "_");

  const entry = {
    email: auth.currentUser.email,
    time: timeTaken,
    submittedAt: Date.now(),
    passed: true
  };

  set(ref(db, `leaderboard/${date}/${category}/${emailKey}`), entry)
    .then(() => {
      alert("✅ Submitted to leaderboard!");
      loadLeaderboard("daily");
    })
    .catch(err => alert("❌ " + err.message));
};

window.loadQuestionByDate = function () {
  const selectedDate = document.getElementById("datePicker").value;
  const category = document.getElementById("category").value;
  const dayNum = document.getElementById("dayNumber").value || 1;
  if (!selectedDate) return;
  const dateObj = new Date(selectedDate);
  const month = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
  const filename = `${month}${dayNum}.txt`;
  const url = `https://raw.githubusercontent.com/Vvk1amzn2sd/DSA_practise_vvk/main/questions/${category}/${filename}`;

  fetch(url)
    .then(res => res.ok ? res.text() : Promise.reject("❌ Question not found."))
    .then(text => document.getElementById("daily-question").textContent = text)
    .catch(err => document.getElementById("daily-question").textContent = err);
};

window.toggleLeaderboardView = function () {
  const isWeekly = document.getElementById("toggleLeaderboard").checked;
  document.getElementById("leaderboardLabel").textContent = isWeekly ? "Weekly Leaderboard" : "Daily Leaderboard";
  loadLeaderboard(isWeekly ? "weekly" : "daily");
};

function loadLeaderboard(view) {
  const today = new Date();
  const oneDay = 86400000;
  const dates = [];

  if (view === "daily") {
    dates.push(today.toISOString().split("T")[0]);
  } else {
    for (let i = 0; i < 7; i++) {
      const d = new Date(today - i * oneDay).toISOString().split("T")[0];
      dates.push(d);
    }
  }

  const category = document.getElementById("category").value;
  const allEntries = {};

  Promise.all(dates.map(date =>
    get(child(ref(db), `leaderboard/${date}/${category}`)).then(snapshot => {
      if (snapshot.exists()) {
        Object.entries(snapshot.val()).forEach(([key, val]) => {
          const email = val.email;
          const time = parseFloat(val.time);
          if (!allEntries[email]) allEntries[email] = [];
          allEntries[email].push(time);
        });
      }
    })
  )).then(() => {
    const averaged = Object.entries(allEntries).map(([email, times]) => {
      const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
      return { email, avg };
    });

    averaged.sort((a, b) => parseFloat(a.avg) - parseFloat(b.avg));

    const tbody = document.getElementById("leaderboardBody");
    tbody.innerHTML = "";
    averaged.forEach((entry, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${entry.email}</td>
        <td>#${idx + 1} (${entry.avg} min)</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

window.onload = () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datePicker").value = today;
  loadQuestionByDate();
  loadLeaderboard("daily");
};
