import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "API_KEY_HNA",
  authDomain: "pcr-education.firebaseapp.com",
  projectId: "pcr-education",
  storageBucket: "pcr-education.firebasestorage.app",
  messagingSenderId: "925934232667",
  appId: "APP_ID_HNA"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);