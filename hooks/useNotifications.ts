import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuth } from "./use-auth";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const register = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;

      // Save merchant’s token in Firestore
      await updateDoc(doc(db, "users", user.uid), {
        expoPushToken,
      });
    };

    register();
  }, [user]);
}
