import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"

import {
  getDatabase,
  ref,
  set
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"

const firebaseConfig = {

  apiKey:
    "AIzaSyDlVrXdzRwxNoKB_axHG4u5YXQvarAPb64",

  authDomain:
    "dicemagic-e8fe6.firebaseapp.com",

  databaseURL:
    "https://dicemagic-e8fe6-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId:
    "dicemagic-e8fe6",

  storageBucket:
    "dicemagic-e8fe6.firebasestorage.app",

  messagingSenderId:
    "122650723849",

  appId:
    "1:122650723849:web:7bd9fd2f94577316bc5ad8",

  measurementId:
    "G-V1P7E2Q6YE"
}

const app =
  initializeApp(firebaseConfig)

const db =
  getDatabase(app)

window.db = db
window.ref = ref
window.set = set