
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser } from "@/services/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginUser(email.trim().toLowerCase(), password);
      // Existing auth state listener handles role-based navigation.
    } catch (err: any) {
      setError(
        err?.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : err?.message || "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Brand hero */}
          <LinearGradient
            colors={["#0F172A", "#172554", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 28,
              paddingTop: 46,
              paddingBottom: 65,
              borderBottomLeftRadius: 38,
              borderBottomRightRadius: 38,
            }}
          >
            <View className="flex-row items-center mb-12">
              <View className="w-12 h-12 rounded-2xl bg-white/15 items-center justify-center mr-3">
                <Ionicons
                  name="restaurant-outline"
                  size={25}
                  color="#FFFFFF"
                />
              </View>

              <Text className="text-white text-3xl font-black tracking-tight">
                cutin.
              </Text>
            </View>

            {/* <View className="w-14 h-14 bg-white/10 rounded-2xl items-center justify-center mb-5">
              <Ionicons
                name="fast-food-outline"
                size={30}
                color="#BFDBFE"
              />
            </View> */}

            <Text className="text-white text-4xl font-extrabold leading-[44px]">
              Welcome{"\n"}back.
            </Text>

            <Text className="text-blue-100 text-base mt-4 leading-6">
              Your next great meal is just a few taps away.
            </Text>
          </LinearGradient>

          {/* Form */}
          <View
            className="px-6 pb-8 flex-1"
            style={{ marginTop: -27 }}
          >
            <View className="bg-white rounded-[30px] p-6 border border-gray-100">
              <Text className="text-gray-950 text-2xl font-extrabold">
                Sign in
              </Text>

              <Text className="text-gray-500 text-sm mt-2 mb-7">
                Enter your details to continue to Cutin.
              </Text>

              {error ? (
                <View className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-5 flex-row items-start">
                  <Ionicons
                    name="alert-circle-outline"
                    size={19}
                    color="#DC2626"
                  />
                  <Text className="text-red-700 text-sm ml-2 flex-1">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Text className="text-gray-800 font-semibold text-sm mb-2">
                Email address
              </Text>

              <View className="flex-row items-center bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 mb-5">
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#94A3B8"
                />

                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError("");
                  }}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!loading}
                  returnKeyType="next"
                  className="flex-1 py-4 ml-3 text-gray-950 text-base"
                />
              </View>

              <Text className="text-gray-800 font-semibold text-sm mb-2">
                Password
              </Text>

              <View className="flex-row items-center bg-[#F8FAFC] border border-gray-200 rounded-2xl px-4 mb-7">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#94A3B8"
                />

                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  className="flex-1 py-4 ml-3 text-gray-950 text-base"
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={21}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={["#0F172A", "#1E40AF", "#2563EB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    height: 56,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text className="text-white text-base font-bold mr-2">
                        Sign in
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-center items-center mt-7">
              <Text className="text-gray-500 text-sm">
                New to Cutin?{" "}
              </Text>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/register")}
              >
                <Text className="text-blue-700 font-extrabold text-sm">
                  Create an account
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center justify-center mt-9">
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color="#94A3B8"
              />
              <Text className="text-gray-400 text-xs ml-2">
                Secure sign-in powered by Firebase
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
