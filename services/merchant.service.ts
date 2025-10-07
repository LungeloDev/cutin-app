// core/services/merchant.service.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db, storage } from "@/services/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// 🔹 Save or update merchant profile
export async function saveMerchantProfile(uid: string, data: any) {
  const refDoc = doc(db, "merchants", uid);
  await setDoc(refDoc, { ...data, updatedAt: Date.now() }, { merge: true });
}

// 🔹 Get merchant profile
export async function getMerchantProfile(uid: string) {
  const refDoc = doc(db, "merchants", uid);
  const snap = await getDoc(refDoc);
  return snap.exists() ? snap.data() : null;
}

// 🔹 Add menu item
export async function addMenuItem(merchantId: string, item: any) {
  const refCol = collection(db, "menus", merchantId, "items");
  const docRef = await addDoc(refCol, {
    ...item,
    available: true,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// 🔹 Get all menu items
export async function getMenuItems(merchantId: string) {
  const refCol = collection(db, "menus", merchantId, "items");
  const snap = await getDocs(refCol);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 🔹 Update menu item
export async function updateMenuItem(
  merchantId: string,
  itemId: string,
  data: any
) {
  const refDoc = doc(db, "menus", merchantId, "items", itemId);
  await updateDoc(refDoc, { ...data, updatedAt: Date.now() });
}

// 🔹 Delete menu item
export async function deleteMenuItem(merchantId: string, itemId: string) {
  const refDoc = doc(db, "menus", merchantId, "items", itemId);
  await deleteDoc(refDoc);
}

// 🔹 Toggle availability (stock status)
export async function toggleMenuItemAvailability(
  merchantId: string,
  itemId: string,
  available: boolean
) {
  const refDoc = doc(db, "menus", merchantId, "items", itemId);
  await updateDoc(refDoc, { available });
}

// 🔹 Upload menu image to Firebase Storage
export async function uploadMenuImage(merchantId: string, fileUri: string) {
  const response = await fetch(fileUri);
  const blob = await response.blob();

  const storageRef = ref(storage, `menus/${merchantId}/${Date.now()}.jpg`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// 🔹 Fetch merchant orders
export async function getMerchantOrders(merchantId: string) {
  const refCol = collection(db, "orders");
  const q = query(
    refCol,
    where("merchantId", "==", merchantId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 🔹 Update order status
export async function updateOrderStatus(orderId: string, status: string) {
  const refDoc = doc(db, "orders", orderId);
  await updateDoc(refDoc, { status, updatedAt: Date.now() });
}
