
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
import { registerUser } from "@/services/auth";

type Role = "customer" | "merchant";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await registerUser(cleanEmail, password, role);
      // Existing auth listener handles role-based navigation.
    } catch (err: any) {
      setError(
        err?.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : err?.message || "Unable to create your account."
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
          {/* Brand header */}
          <LinearGradient
            colors={["#0F172A", "#172554", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: 28,
              paddingTop: 35,
              paddingBottom: 58,
              borderBottomLeftRadius: 38,
              borderBottomRightRadius: 38,
            }}
          >
            <View className="flex-row items-center mb-8">
              <View className="w-11 h-11 rounded-2xl bg-white/15 items-center justify-center mr-3">
                <Ionicons
                  name="restaurant-outline"
                  size={23}
                  color="#FFFFFF"
                />
              </View>

              <Text className="text-white text-3xl font-black">
                cutin.
              </Text>
            </View>

            <Text className="text-white text-3xl font-extrabold">
              Join the Cutin family.
            </Text>

            <Text className="text-blue-100 mt-3 text-sm leading-6">
              Discover great food or grow your business
              with one powerful marketplace.
            </Text>
          </LinearGradient>

          {/* Registration form */}
          <View className="px-6 pb-10" style={{ marginTop: -25 }}>
            <View className="bg-white rounded-[30px] p-6 border border-gray-100">
              <Text className="text-gray-950 text-2xl font-extrabold">
                Create account
              </Text>

              <Text className="text-gray-500 text-sm mt-2 mb-6">
                Let's get you started.
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

              {/* Role selection */}
              <Text className="text-gray-800 font-semibold text-sm mb-3">
                I want to join as
              </Text>

              <View className="flex-row mb-6">
                <TouchableOpacity
                  onPress={() => setRole("customer")}
                  disabled={loading}
                  activeOpacity={0.8}
                  className={`flex-1 rounded-2xl p-4 border mr-2 ${role === "customer"
                      ? "bg-blue-50 border-blue-600"
                      : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={25}
                    color={
                      role === "customer"
                        ? "#2563EB"
                        : "#64748B"
                    }
                  />

                  <Text
                    className={`font-extrabold mt-3 ${role === "customer"
                        ? "text-blue-700"
                        : "text-gray-800"
                      }`}
                  >
                    Customer
                  </Text>

                  <Text className="text-gray-500 text-xs mt-1">
                    Order food
                  </Text>

                  {role === "customer" && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2563EB"
                      style={{
                        position: "absolute",
                        right: 12,
                        top: 12,
                      }}
                    />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole("merchant")}
                  disabled={loading}
                  activeOpacity={0.8}
                  className={`flex-1 rounded-2xl p-4 border ml-2 ${role === "merchant"
                      ? "bg-blue-50 border-blue-600"
                      : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={25}
                    color={
                      role === "merchant"
                        ? "#2563EB"
                        : "#64748B"
                    }
                  />

                  <Text
                    className={`font-extrabold mt-3 ${role === "merchant"
                        ? "text-blue-700"
                        : "text-gray-800"
                      }`}
                  >
                    Merchant
                  </Text>

                  <Text className="text-gray-500 text-xs mt-1">
                    Sell on Cutin
                  </Text>

                  {role === "merchant" && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#2563EB"
                      style={{
                        position: "absolute",
                        right: 12,
                        top: 12,
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Email */}
              <Text className="text-gray-800 font-semibold text-sm mb-2">
                Email address
              </Text>

              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 mb-4">
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#94A3B8"
                />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!loading}
                  className="flex-1 ml-3 py-4 text-gray-950"
                />
              </View>

              {/* Password */}
              <Text className="text-gray-800 font-semibold text-sm mb-2">
                Password
              </Text>

              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 mb-4">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#94A3B8"
                />

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  editable={!loading}
                  className="flex-1 ml-3 py-4 text-gray-950"
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
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm password */}
              <Text className="text-gray-800 font-semibold text-sm mb-2">
                Confirm password
              </Text>

              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 mb-6">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#94A3B8"
                />

                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!loading}
                  className="flex-1 ml-3 py-4 text-gray-950"
                />
              </View>

              {/* Submit */}
              <TouchableOpacity
                onPress={handleRegister}
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
                      <Text className="text-white font-bold text-base mr-2">
                        Create account
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

              <Text className="text-gray-400 text-xs text-center mt-5 leading-5">
                By creating an account, you agree to
                Cutin's Terms & Conditions and Privacy Policy.
              </Text>
            </View>

            <View className="flex-row justify-center mt-7">
              <Text className="text-gray-500 text-sm">
                Already have an account?{" "}
              </Text>

              <TouchableOpacity
                onPress={() => router.replace("/(auth)/login")}
              >
                <Text className="text-blue-700 font-extrabold text-sm">
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
