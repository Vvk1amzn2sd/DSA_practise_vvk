// firebase.js (inside public/)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

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

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const database = getDatabase(firebaseApp);

export { firebaseApp, auth, database };
