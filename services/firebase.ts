import { Platform } from "react-native";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  type Auth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBvzvEeowe88BaHgruhPp8GatBI25ZwDco",
  authDomain: "cutin-ee507.firebaseapp.com",
  databaseURL: "https://cutin-ee507-default-rtdb.firebaseio.com",
  projectId: "cutin-ee507",
  storageBucket: "cutin-ee507.firebasestorage.app",
  messagingSenderId: "117624122437",
  appId: "1:117624122437:web:8c9fed169ed8b31acd872c"
};

export const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence);
} else {
  try {
    // dynamic require keeps Metro bundler happy
    const authModule = require("firebase/auth");
    const getReactNativePersistence =
      authModule.getReactNativePersistence as undefined | ((s: any) => any);

    auth = initializeAuth(app, {
      persistence: getReactNativePersistence
        ? getReactNativePersistence(AsyncStorage)
        : undefined,
    });
  } catch {
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
