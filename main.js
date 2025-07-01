// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123xyz456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const datePicker = document.getElementById('datePicker');
const monthSelect = document.getElementById('monthSelect');
const daySelect = document.getElementById('daySelect');
const dailyQuestion = document.getElementById('daily-question');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const challengeStatus = document.getElementById('challengeStatus');
const themeSwitch = document.getElementById('themeSwitch');
const themeIcon = document.getElementById('themeIcon');
const currentYear = document.getElementById('currentYear');
const timerDisplay = document.getElementById('timerDisplay');
const weeklyLeaderboardBtn = document.getElementById('weeklyLeaderboard');
const monthlyLeaderboardBtn = document.getElementById('monthlyLeaderboard');
const startButton = document.querySelector('.start-button');
const submitButton = document.querySelector('.submit-button');

// Global variables
let timerInterval;
let seconds = 0;
let currentQuestion = null;
let currentUser = null;

// Set current year
currentYear.textContent = new Date().getFullYear();

// Set current date as default
const today = new Date();
datePicker.valueAsDate = today;
currentDateDisplay.textContent = formatDate(today);

// Initialize app
init();

function init() {
  // Check auth state
  auth.onAuthStateChanged((user) => {
    if (user) {
      currentUser = user;
      document.querySelector('.auth-section').style.display = 'none';
      loadQuestionsForMonth(monthSelect.value);
    } else {
      currentUser = null;
      document.querySelector('.auth-section').style.display = 'flex';
    }
  });

  // Event listeners
  datePicker.addEventListener('change', () => {
    const selectedDate = new Date(datePicker.value);
    currentDateDisplay.textContent = formatDate(selectedDate);
    loadQuestionForDate(selectedDate);
  });

  monthSelect.addEventListener('change', () => {
    loadQuestionsForMonth(monthSelect.value);
  });

  daySelect.addEventListener('change', () => {
    const month = monthSelect.value;
    const day = daySelect.value;
    loadQuestion(month, day);
  });

  themeSwitch.addEventListener('change', toggleTheme);

  weeklyLeaderboardBtn.addEventListener('click', () => leaderboard.toggle('weekly'));
  monthlyLeaderboardBtn.addEventListener('click', () => leaderboard.toggle('monthly'));
  startButton.addEventListener('click', timer.start);
  submitButton.addEventListener('click', solution.submit);

  // Check for saved theme preference
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    themeSwitch.checked = true;
    themeIcon.textContent = '🌙';
  }

  // Load today's question
  loadQuestionForDate(today);
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

async function loadQuestionsForMonth(month) {
  daySelect.innerHTML = '<option value="">Loading...</option>';
  
  try {
    // Fetch questions from GitHub
    const response = await fetch(`https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}`);
    const data = await response.json();
    
    const questions = data
      .filter(item => item.type === 'file' && item.name.endsWith('.md'))
      .map(item => ({
        title: item.name.replace('.md', ''),
        url: item.download_url
      }));
    
    daySelect.innerHTML = '';
    questions.forEach((q, index) => {
      const option = document.createElement('option');
      option.value = index + 1;
      option.textContent = `Day ${index + 1}: ${q.title}`;
      daySelect.appendChild(option);
    });
    
    // Select today's date if available
    const today = new Date();
    if (month === getCurrentMonth() && questions.length >= today.getDate()) {
      daySelect.value = today.getDate();
      loadQuestion(month, today.getDate());
    }
  } catch (error) {
    console.error('Error loading questions:', error);
    daySelect.innerHTML = '<option value="">Error loading questions</option>';
  }
}

function getCurrentMonth() {
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  return months[new Date().getMonth()];
}

async function loadQuestion(month, day) {
  if (!day) return;
  
  dailyQuestion.innerHTML = '<div class="loader"></div>';
  
  try {
    // Fetch question content from GitHub
    const response = await fetch(`https://api.github.com/repos/Vvk1amzn2sd/DSA_practise_vvk/contents/Questions/${month}`);
    const data = await response.json();
    
    const questionFile = data.find(item => 
      item.type === 'file' && 
      item.name.endsWith('.md') && 
      data.indexOf(item) === day - 1
    );
    
    if (questionFile) {
      const contentResponse = await fetch(questionFile.download_url);
      const content = await contentResponse.text();
      
      currentQuestion = {
        month,
        day,
        title: questionFile.name.replace('.md', ''),
        content
      };
      
      displayQuestion(currentQuestion);
      updateChallengeStatus(true);
    } else {
      dailyQuestion.textContent = 'Question not found';
      updateChallengeStatus(false);
    }
  } catch (error) {
    console.error('Error loading question:', error);
    dailyQuestion.textContent = 'Error loading question';
    updateChallengeStatus(false);
  }
}

function loadQuestionForDate(date) {
  const month = monthSelect.value;
  const day = date.getDate();
  
  // Check if the selected date is in the current month
  const selectedMonth = monthSelect.options[monthSelect.selectedIndex].text.toUpperCase();
  const currentMonth = getCurrentMonth();
  
  if (selectedMonth === currentMonth && date.getDate() <= daySelect.options.length) {
    daySelect.value = day;
    loadQuestion(month, day);
  }
}

function displayQuestion(question) {
  dailyQuestion.innerHTML = `
    <h2>${question.title}</h2>
    <div>${marked.parse(question.content)}</div>
  `;
}

function updateChallengeStatus(available) {
  if (available) {
    challengeStatus.textContent = 'CHALLENGE IS LIVE TODAY, TRY TO GAIN POSITION';
  } else {
    challengeStatus.textContent = 'NO CHALLENGE AVAILABLE FOR THIS DATE';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  themeIcon.textContent = isDarkMode ? '🌙' : '🌞';
}

// Auth functions
const auth = {
  signupUser: function() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }
    
    // Using Firebase auth with email pattern (since Firebase requires email)
    const email = `${username}@dsachallenge.com`;
    
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Save user data
        const user = userCredential.user;
        database.ref('users/' + user.uid).set({
          username: username,
          lastLogin: Date.now()
        });
        alert('Account created successfully!');
      })
      .catch((error) => {
        alert(error.message);
      });
  },
  
  loginUser: function() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    if (!username || !password) {
      alert('Please enter both username and password');
      return;
    }
    
    // Using Firebase auth with email pattern
    const email = `${username}@dsachallenge.com`;
    
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        // Update last login
        const user = userCredential.user;
        database.ref('users/' + user.uid).update({
          lastLogin: Date.now()
        });
      })
      .catch((error) => {
        alert(error.message);
      });
  }
};

// Timer functions
const timer = {
  start: function() {
    if (timerInterval) clearInterval(timerInterval);
    seconds = 0;
    timerDisplay.textContent = '0 sec';
    timerInterval = setInterval(() => {
      seconds++;
      timerDisplay.textContent = `${seconds} sec`;
    }, 1000);
  },
  
  stop: function() {
    if (timerInterval) clearInterval(timerInterval);
  },
  
  getTime: function() {
    return seconds;
  }
};

// Solution submission
const solution = {
  submit: function() {
    if (!currentUser) {
      alert('Please login to submit your solution');
      return;
    }
    
    if (!currentQuestion) {
      alert('No question selected');
      return;
    }
    
    const timeTaken = timer.getTime();
    timer.stop();
    
    // Get the code from the editor iframe
    const editorFrame = document.getElementById('codeEditor');
    const code = editorFrame.contentWindow?.document.getElementById('code')?.value || "// Could not fetch code";
    
    // Save to Firebase
    const submissionRef = database.ref('submissions').push();
    submissionRef.set({
      userId: currentUser.uid,
      username: currentUser.email.replace('@dsachallenge.com', ''),
      questionMonth: currentQuestion.month,
      questionDay: currentQuestion.day,
      questionTitle: currentQuestion.title,
      solutionCode: code,
      timeTaken: timeTaken,
      timestamp: Date.now()
    }).then(() => {
      alert('Solution submitted successfully!');
      this.evaluateSolution(code);
    }).catch((error) => {
      alert('Error submitting solution: ' + error.message);
    });
  },
  
  evaluateSolution: function(code) {
    // Using Judge0 API for code evaluation (free tier)
    const judge0Url = 'https://judge0-ce.p.rapidapi.com/submissions';
    const languageId = 62; // Java
    
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY',
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        // Add test cases if available
        stdin: '',
        expected_output: ''
      })
    };
    
    fetch(judge0Url, options)
      .then(response => response.json())
      .then(data => {
        console.log('Evaluation result:', data);
        // You can process the result here
      })
      .catch(err => console.error('Evaluation error:', err));
  }
};

// Leaderboard functions
const leaderboard = {
  toggle: function(type) {
    weeklyLeaderboardBtn.classList.toggle('active', type === 'weekly');
    monthlyLeaderboardBtn.classList.toggle('active', type === 'monthly');
    this.load(type);
  },
  
  load: function(type) {
    const leaderboardRef = type === 'weekly' 
      ? database.ref('leaderboard/weekly')
      : database.ref('leaderboard/monthly');
    
    leaderboardRef.once('value').then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Process and display leaderboard data
        document.getElementById('leaderboardDisplay').textContent = 
          `Top ${type} performers loaded`;
      } else {
        document.getElementById('leaderboardDisplay').textContent = 
          `No ${type} leaderboard data available`;
      }
    }).catch((error) => {
      console.error('Error loading leaderboard:', error);
      document.getElementById('leaderboardDisplay').textContent = 
        'Error loading leaderboard';
    });
  }
};
