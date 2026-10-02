import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBc6unSx5NB-v2oBke6qdNcEi1E6VB0BuY",
  authDomain: "rezusure.firebaseapp.com",
  projectId: "rezusure",
  storageBucket: "rezusure.firebasestorage.app",
  messagingSenderId: "32776108250",
  appId: "1:32776108250:web:8660ab41ff8042ed7e0de3",
  measurementId: "G-66Y8L44F4N",
};

const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);

export default firebaseApp;