import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCmfMTWu6p-Jv1_vsX_8VzgezhxTjS-gx0",
  authDomain: "skud-portal.firebaseapp.com",
  projectId: "skud-portal",
  storageBucket: "skud-portal.appspot.com",
  messagingSenderId: "963817433669",
  appId: "1:963817433669:web:13c1ba6fcee72a5aa5112c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Инициализация ролей
export const initializeRoles = async () => {
  try {
    const rolesDoc = await getDoc(doc(db, 'system', 'roles'));
    if (!rolesDoc.exists()) {
      await setDoc(doc(db, 'system', 'roles'), {
        admin: ['admin@example.com'],
        operators: ['operator@example.com']
      });
    }
  } catch (error) {
    console.error("Error initializing roles:", error);
  }
};