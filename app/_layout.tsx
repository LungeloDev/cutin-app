// app/_layout.tsx
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { CartProvider } from "@/context/cart-context";
import AuthGuard from "@/components/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import '../global.css'

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <CartProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(merchant)" />
            </Stack>
          </AuthGuard>
        </CartProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
