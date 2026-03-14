import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  setDoc, 
  doc, 
  getDoc 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqA3PcI1M9VIH1TXaGSxW7-OydGqahAY4",
  authDomain: "gamejam-1ebfb.firebaseapp.com",
  projectId: "gamejam-1ebfb",
  storageBucket: "gamejam-1ebfb.firebasestorage.app",
  messagingSenderId: "877077507125",
  appId: "1:877077507125:web:918852eb2b532639a4157c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const loginAnonymously = async (username) => {
  try {
    const userCredential = await signInAnonymously(auth);
    localStorage.setItem('game_username', username);
    localStorage.setItem('game_uid', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

export const saveHighScore = async (uid, name, score) => {
  try {
    const playerRef = doc(db, "leaderboard", uid);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists() || score > playerSnap.data().score) {
      await setDoc(playerRef, {
        name,
        score,
        updatedAt: new Date()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error saving high score:", error);
  }
};

export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, "leaderboard"), orderBy("score", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
};
