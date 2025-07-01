import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  child,
  push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { 
  getStorage, 
  ref as storageRef,
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

// Piston API (free code execution)
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";

// Authentication with username
window.signupUser = function() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  
  if (!username || !password) {
    return alert("❌ Username and password required.");
  }
  if (username.length > 15) {
    return alert("❌ Username must be 15 characters or less");
  }

  const email = `${username}@dsachallenge.local`;
  
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      return updateProfile(userCredential.user, {
        displayName: username
      }).then(() => {
        alert("✅ Signup successful!");
        return set(ref(db, `users/${userCredential.user.uid}`), {
          username: username,
          createdAt: Date.now(),
          submissions: {}
        });
      });
    })
    .catch(err => alert("❌ " + err.message));
};

window.loginUser = function() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  
  if (!username || !password) {
    return alert("❌ Username and password required.");
  }

  const email = `${username}@dsachallenge.local`;
  
  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("✅ Login successful!");
      loadUserData();
    })
    .catch(err => alert("❌ " + err.message));
};

window.googleLogin = function() {
  signInWithPopup(auth, provider)
    .then((result) => {
      const username = result.user.displayName || result.user.email.split('@')[0];
      return updateProfile(result.user, {
        displayName: username
      }).then(() => {
        alert("✅ Google login successful!");
        return set(ref(db, `users/${result.user.uid}`), {
          username: username,
          createdAt: Date.now(),
          submissions: {}
        });
      });
    })
    .then(() => loadUserData())
    .catch(err => alert("❌ " + err.message));
};

// Timer functionality
let timerInterval = null;
let startTime = null;

window.startTimer = function() {
  if (!auth.currentUser) return alert("❌ Please login first");
  if (timerInterval) clearInterval(timerInterval);
  
  startTime = new Date();
  timerInterval = setInterval(() => {
    const now = new Date();
    const diff = Math.floor((now - startTime) / 1000);
    document.getElementById("timerDisplay").textContent = `${diff} sec`;
  }, 1000);
};

// Solution submission with Piston API
window.submitSolution = async function() {
  if (!auth.currentUser) return alert("❌ Please login first");
  if (!startTime) return alert("❌ Start timer first");
  
  clearInterval(timerInterval);
  const endTime = new Date();
  const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
  
  // Get challenge details
  const date = document.getElementById("datePicker").value;
  const category = document.getElementById("category").value;
  const dayNum = document.getElementById("dayNumber").value || 1;
  const questionId = `${date}-${category}-${dayNum}`;
  
  try {
    // Check if already submitted
    const userRef = ref(db, `users/${auth.currentUser.uid}/submissions/${questionId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return alert("❌ You've already submitted a solution for this challenge");
    }
    
    // Get solution code (simplified - would need actual editor integration)
    const solutionCode = await getEditorContent();
    if (!solutionCode || solutionCode.trim().length < 10) {
      return alert("❌ Please write some code before submitting");
    }
    
    // Get question details and test cases
    const questionText = document.getElementById("daily-question").textContent;
    const testCases = extractTestCases(questionText);
    
    if (testCases.length === 0) {
      return alert("❌ No test cases found for this question");
    }
    
    // Validate with Piston API
    const validationResults = [];
    let passedCount = 0;
    
    for (const testCase of testCases) {
      const result = await executeWithPiston(solutionCode, testCase);
      validationResults.push(result);
      if (result.passed) passedCount++;
    }
    
    // Prepare submission data
    const username = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
    const submissionData = {
      username: username,
      time: timeTaken,
      submittedAt: Date.now(),
      passed: passedCount === testCases.length,
      passedCount: passedCount,
      totalTests: testCases.length,
      questionId: questionId,
      results: validationResults
    };
    
    // Save submission
    await set(userRef, submissionData);
    
    // Update leaderboard only if at least one test passed
    if (passedCount > 0) {
      const leaderboardRef = ref(db, `leaderboard/${date}/${category}/${auth.currentUser.uid}`);
      await set(leaderboardRef, {
        username: username,
        time: timeTaken,
        passedCount: passedCount,
        totalTests: testCases.length,
        submittedAt: Date.now()
      });
    }
    
    // Show results to user
    showSubmissionResults(submissionData);
    loadLeaderboard("daily");
    
  } catch (error) {
    console.error("Submission error:", error);
    alert(`❌ Submission failed: ${error.message}`);
  }
};

// Execute code with Piston API
async function executeWithPiston(code, testCase) {
  const response = await fetch(PISTON_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language: "java",
      version: "15.0.2",
      files: [{
        content: code
      }],
      stdin: testCase.input,
      args: [],
      compile_timeout: 10000,
      run_timeout: 3000
    })
  });
  
  const data = await response.json();
  
  return {
    input: testCase.input,
    expected: testCase.expected,
    actual: data.run.output?.trim() || data.run.stderr?.trim() || "No output",
    passed: data.run.output?.trim() === testCase.expected
  };
}

// Extract test cases from question text
function extractTestCases(questionText) {
  // Try to find test cases in format:
  // Test Case 1:
  // Input: [input]
  // Expected Output: [output]
  const testCaseRegex = /Test Case \d+:\s*Input:\s*(.*?)\s*Expected Output:\s*(.*?)(?=\s*Test Case \d+|$)/gs;
  const matches = [...questionText.matchAll(testCaseRegex)];
  
  if (matches.length > 0) {
    return matches.map(match => ({
      input: match[1].trim(),
      expected: match[2].trim()
    }));
  }
  
  // Fallback to simple input/output pairs
  const ioPairs = questionText.match(/Input:\s*(.*?)\s*Output:\s*(.*?)(?=\s*Input:|$)/gs);
  if (ioPairs) {
    return ioPairs.map(pair => {
      const parts = pair.split(/Input:\s*|\s*Output:\s*/).filter(Boolean);
      return {
        input: parts[0]?.trim() || "",
        expected: parts[1]?.trim() || ""
      };
    });
  }
  
  // Default test cases if none found
  return [
    { input: "5", expected: "120" }, // Sample factorial test
    { input: "3", expected: "6" }
  ];
}

// Show submission results
function showSubmissionResults(submission) {
  const resultsHTML = `
    <div class="submission-results">
      <div class="submission-summary ${submission.passed ? 'success' : 'failure'}">
        ${submission.passed ? '✅' : '❌'} 
        ${submission.passedCount}/${submission.totalTests} Test Cases Passed
        (Time: ${submission.time}s)
      </div>
      ${submission.results.map((test, i) => `
        <div class="test-result ${test.passed ? 'passed' : 'failed'}">
          <strong>Test Case ${i + 1}:</strong>
          <div>Input: <code>${test.input}</code></div>
          <div>Expected: <code>${test.expected}</code></div>
          <div>Actual: <code>${test.actual}</code></div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById("daily-question").insertAdjacentHTML('beforeend', resultsHTML);
}

// Leaderboard functions
window.loadLeaderboard = function(view = "daily") {
  const today = new Date();
  const oneDay = 86400000;
  const dates = [];
  
  if (view === "daily") {
    dates.push(today.toISOString().split("T")[0]);
  } else {
    // Weekly view - last 7 days
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
        Object.entries(snapshot.val()).forEach(([userId, entry]) => {
          if (!allEntries[userId]) {
            allEntries[userId] = {
              username: entry.username,
              totalPassed: 0,
              totalTests: 0,
              totalTime: 0,
              count: 0
            };
          }
          allEntries[userId].totalPassed += entry.passedCount || 0;
          allEntries[userId].totalTests += entry.totalTests || 0;
          allEntries[userId].totalTime += parseFloat(entry.time) || 0;
          allEntries[userId].count++;
        });
      }
    })
  ).then(() => {
    const processed = Object.entries(allEntries).map(([userId, data]) => {
      const avgTime = data.totalTime / data.count;
      const successRate = (data.totalPassed / data.totalTests) * 100;
      return {
        userId,
        username: data.username,
        avgTime,
        successRate,
        totalPassed: data.totalPassed
      };
    });
    
    // Sort by success rate then by time
    processed.sort((a, b) => {
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return a.avgTime - b.avgTime;
    });
    
    // Update leaderboard display
    const leaderboardText = processed.slice(0, 3).map((entry, i) => 
      `${i + 1}. ${entry.username} (${entry.totalPassed} passed, ${entry.avgTime.toFixed(2)}s)`
    ).join(' | ');
    
    document.getElementById("leaderboardDisplay").textContent = 
      view === "daily" ? "Daily: " + leaderboardText : "Weekly: " + leaderboardText;
    
  }).catch(err => console.error("Leaderboard error:", err));
};

window.toggleLeaderboard = function(view) {
  document.getElementById("weeklyLeaderboard").classList.toggle("active", view === "weekly");
  document.getElementById("monthlyLeaderboard").classList.toggle("active", view === "monthly");
  loadLeaderboard(view);
};

// Question loading
window.loadQuestionByDate = async function() {
  const selectedDate = document.getElementById("datePicker").value;
  const category = document.getElementById("category").value;
  const dayNum = document.getElementById("dayNumber").value || 1;
  
  if (!selectedDate) return;
  
  try {
    // In a real app, you would fetch from your backend
    // This is a mock implementation
    const dateObj = new Date(selectedDate);
    const month = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
    const mockQuestions = {
      easy: [
        `Day ${dayNum}: Sum of Two Numbers
        Write a function that returns the sum of two numbers.
        
        Test Case 1:
        Input: 5, 7
        Expected Output: 12
        
        Test Case 2:
        Input: -3, 9
        Expected Output: 6`,
        
        `Day ${dayNum}: Factorial Calculation
        Calculate the factorial of a number.
        
        Test Case 1:
        Input: 5
        Expected Output: 120
        
        Test Case 2:
        Input: 3
        Expected Output: 6`
      ],
      medium: [
        `Day ${dayNum}: Fibonacci Sequence
        Return the nth Fibonacci number.
        
        Test Case 1:
        Input: 6
        Expected Output: 8
        
        Test Case 2:
        Input: 10
        Expected Output: 55`
      ],
      hard: [
        `Day ${dayNum}: Prime Number Check
        Check if a number is prime.
        
        Test Case 1:
        Input: 7
        Expected Output: true
        
        Test Case 2:
        Input: 10
        Expected Output: false`
      ]
    };
    
    const questions = mockQuestions[category] || mockQuestions.easy;
    const questionText = questions[dayNum % questions.length];
    
    document.getElementById("daily-question").innerHTML = `
      <h3>${category.toUpperCase()} Challenge - Day ${dayNum}</h3>
      <div class="question-content">${questionText.replace(/\n/g, '<br>')}</div>
    `;
    
    // Show challenge banner
    document.getElementById("dateBannerContainer").style.display = "block";
    document.getElementById("currentDateDisplay").textContent = 
      new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    
  } catch (error) {
    document.getElementById("daily-question").textContent = "Error loading question";
    console.error("Question load error:", error);
  }
};

// Theme toggle
window.toggleTheme = function() {
  const isDark = document.getElementById("themeSwitch").checked;
  document.body.classList.toggle("dark-theme", isDark);
  document.getElementById("themeIcon").textContent = isDark ? "🌙" : "🌞";
  localStorage.setItem("theme", isDark ? "dark" : "light");
};

// Get editor content (placeholder - needs actual implementation)
async function getEditorContent() {
  // In a real implementation, you would get this from your code editor
  return "// Sample solution code\npublic class Solution {\n  public static void main(String[] args) {\n    System.out.println(\"Hello World\");\n  }\n}";
}

// Load user data
function loadUserData() {
  if (!auth.currentUser) return;
  
  get(ref(db, `users/${auth.currentUser.uid}`))
    .then(snapshot => {
      if (snapshot.exists()) {
        console.log("User data loaded:", snapshot.val());
      }
    })
    .catch(err => console.error("User data load error:", err));
}

// Initialize the app
window.onload = function() {
  // Set default date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("datePicker").value = today;
  
  // Set current year in footer
  document.getElementById("currentYear").textContent = new Date().getFullYear();
  
  // Load initial data
  loadQuestionByDate();
  loadLeaderboard("daily");
  
  // Load saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") {
    document.getElementById("themeSwitch").checked = true;
    document.body.classList.add("dark-theme");
    document.getElementById("themeIcon").textContent = "🌙";
  }
  
  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    if (user) {
      console.log("User logged in:", user.displayName || user.email);
      loadUserData();
    } else {
      console.log("User logged out");
    }
  });
};

// Make functions available globally
window.signupUser = signupUser;
window.loginUser = loginUser;
window.googleLogin = googleLogin;
window.startTimer = startTimer;
window.submitSolution = submitSolution;
window.loadQuestionByDate = loadQuestionByDate;
window.loadLeaderboard = loadLeaderboard;
window.toggleLeaderboard = toggleLeaderboard;
window.toggleTheme = toggleTheme;
