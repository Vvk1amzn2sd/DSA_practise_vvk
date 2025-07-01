import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage,
  ref as sRef,
  uploadString
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

window.signupUser = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("❌ Email and password required.");
  createUserWithEmailAndPassword(auth, email, password)
    .then(() => alert("✅ Signup successful!"))
    .catch((err) => alert("❌ " + err.message));
};

window.loginUser = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  if (!email || !password) return alert("❌ Email and password required.");
  signInWithEmailAndPassword(auth, email, password)
    .then(() => alert("✅ Login successful!"))
    .catch((err) => alert("❌ " + err.message));
};

window.googleLogin = function () {
  signInWithPopup(auth, provider)
    .then(() => alert("✅ Google login successful!"))
    .catch((err) => alert("❌ " + err.message));
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
    .then(() => alert("✅ Submitted to leaderboard!"))
    .catch((err) => alert("❌ " + err.message));
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

window.onload = () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datePicker").value = today;
  loadQuestionByDate();
};
