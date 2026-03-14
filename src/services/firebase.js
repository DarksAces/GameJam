import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  doc,
  getDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("🔥 Firebase Inicializado con ID:", firebaseConfig.projectId);

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
      console.log("📤 Intentando guardar puntuación...");
      await setDoc(playerRef, {
        name,
        score,
        updatedAt: new Date()
      }, { merge: true });
      console.log("✅ Puntuación guardada con éxito");
    } else {
      console.log("ℹ️ La puntuación actual no supera la máxima del jugador.");
    }
  } catch (error) {
    console.error(`❌ Error en saveHighScore (UID: ${uid}):`, error.code, error.message);
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
