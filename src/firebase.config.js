import { initializeApp } from "firebase/app"
import { getFirestore } from 'firebase/firestore'


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATqZSToKT38Xf_U2GypNumK2AB6hIlAGU",
  authDomain: "house-marketplace-app-35481.firebaseapp.com",
  projectId: "house-marketplace-app-35481",
  storageBucket: "house-marketplace-app-35481.appspot.com",
  messagingSenderId: "507982037297",
  appId: "1:507982037297:web:722f18cdd6327580acb010"
}

// Initialize Firebase
initializeApp(firebaseConfig)
export const db = getFirestore()