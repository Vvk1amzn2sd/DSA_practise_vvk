// Main.js logic for DSA Grind app

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, set, push, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "yourapp.firebaseapp.com",
  projectId: "yourapp",
  storageBucket: "yourapp.appspot.com",
  messagingSenderId: "",
  appId: "",
  databaseURL: "https://yourapp.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const datePicker = document.getElementById("datePicker");
const problemSelect = document.getElementById("problemSelect");
const categorySelect = document.getElementById("category");
const dailyQuestion = document.getElementById("daily-question");
const leaderboardDisplay = document.getElementById("leaderboardDisplay");

let currentQuestion = null;

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function getCurrentMonth() {
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  return months[new Date().getMonth()];
}

async function loadQuestionsFromGitHub(month, category) {
  const url = `https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}`;
  const res = await fetch(url);
  const data = await res.json();

  const problems = data.filter(q => q.name.toLowerCase().includes(category));
  problemSelect.innerHTML = "<option value=''>Select Problem</option>";
  problems.forEach((q, i) => {
    const opt = document.createElement("option");
    opt.value = q.download_url;
    opt.textContent = `${i + 1} - ${q.name}`;
    problemSelect.appendChild(opt);
  });
}

async function loadQuestionFromGitHub(url) {
  const res = await fetch(url);
  const text = await res.text();
  dailyQuestion.innerText = text;
  currentQuestion = url;
}

problemSelect.addEventListener("change", () => {
  const url = problemSelect.value;
  if (url) loadQuestionFromGitHub(url);
});

categorySelect.addEventListener("change", () => {
  const month = getCurrentMonth();
  const category = categorySelect.value;
  loadQuestionsFromGitHub(month, category);
});

datePicker.addEventListener("change", () => {
  const month = getCurrentMonth();
  const category = categorySelect.value;
  loadQuestionsFromGitHub(month, category);
});

// Timer
let timer = 0;
let interval = null;
const timerDisplay = document.getElementById("timerDisplay");

window.startTimer = function () {
  if (interval) clearInterval(interval);
  timer = 0;
  timerDisplay.innerText = "0 sec";
  interval = setInterval(() => {
    timer++;
    timerDisplay.innerText = `${timer} sec`;
  }, 1000);
};

window.submitSolution = function () {
  clearInterval(interval);
  const username = document.getElementById("username").value;
  if (!username || !currentQuestion) return alert("Missing info");

  const submissionRef = ref(db, `submissions/${getCurrentMonth()}/${categorySelect.value}`);
  const newEntry = push(submissionRef);

  set(newEntry, {
    username,
    timeTaken: timer,
    question: currentQuestion,
    timestamp: Date.now()
  });

  alert("Submitted!");
  loadLeaderboard();
};

function loadLeaderboard() {
  const category = categorySelect.value;
  const month = getCurrentMonth();

  const lbRef = ref(db, `submissions/${month}/${category}`);
  get(lbRef).then(snapshot => {
    if (snapshot.exists()) {
      const data = Object.values(snapshot.val());
      data.sort((a, b) => a.timeTaken - b.timeTaken);
      leaderboardDisplay.innerHTML = data.map((d, i) => `#${i + 1}: ${d.username} (${d.timeTaken}s)`).join("<br>");
    }
  });
}

window.toggleLeaderboard = function () {
  loadLeaderboard();
};

// Default load
categorySelect.value = "easy";
loadQuestionsFromGitHub(getCurrentMonth(), "easy");
