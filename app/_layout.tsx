// app/_layout.tsx
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { CartProvider } from "@/context/cart-context";
import AuthGuard from "@/components/AuthGuard";
import '../global.css'
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <CartProvider>
        {/* ✅ Wrap the navigation inside AuthGuard */}
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(merchant)" />
          </Stack>
        </AuthGuard>
      </CartProvider>
    </SafeAreaProvider>
  );
}
