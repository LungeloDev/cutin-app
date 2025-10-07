import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  limit,
  startAt,
  endAt,
} from "firebase/firestore";
import { db } from "@/services/firebase";

/**
 * Return all merchants (cap to a sensible limit for home).
 */
export async function fetchMerchants(max = 50) {
  const col = collection(db, "merchants");
  const q = query(col, orderBy("shopName"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
}

/**
 * Case-insensitive prefix search by shopName.
 * (Works best if you also store a 'shopNameLowercase' field on merchant docs)
 */
export async function searchMerchants(term: string, max = 20) {
  const t = term.trim().toLowerCase();
  if (!t) return [];

  // If you maintain 'shopNameLowercase' in your merchant docs:
  //   const col = collection(db, "merchants");
  //   const q = query(
  //     col,
  //     orderBy("shopNameLowercase"),
  //     startAt(t),
  //     endAt(t + "\uf8ff"),
  //     limit(max)
  //   );

  // Fallback: simple client-side filter over a small set
  const all = await fetchMerchants(100);
  return all.filter((m: any) =>
    String(m.shopName || "").toLowerCase().includes(t)
  );
}

/**
 * Get a single merchant's public profile by id.
 */
export async function getMerchantById(merchantId: string) {
  const ref = doc(db, "merchants", merchantId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
}

/**
 * Get menu items for a merchant (re-exports if you prefer using the core file).
 * Keeping here for customer side to avoid cross-import confusion.
 */
export async function getMerchantMenu(merchantId: string) {
  const { getMenuItems } = await import("@/services/merchant.service");
  return getMenuItems(merchantId);
}
