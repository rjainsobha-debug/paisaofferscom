import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

export const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
};

export const app = initializeApp(firebaseConfig);
