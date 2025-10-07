import { useEffect, useState } from "react";
import { listenToAuthState, getUserRole, logoutUser } from "../services/auth";
import { User } from "firebase/auth";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"customer" | "merchant" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const role = await getUserRole(firebaseUser.uid);
        setRole(role);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, role, loading, logoutUser };
}
