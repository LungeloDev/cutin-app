import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { router, Slot } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, role } = useAuth(); // <- role can come from Firestore

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/(auth)/login");
      } else if (role === "merchant") {
        router.replace("/(merchant)/dashboard");
      } else {
        router.replace("/(customer)/home");
      }
    }
  }, [loading, user, role]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>; // ✅ Only one navigation tree
}
