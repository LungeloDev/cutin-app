import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { registerUser } from "@/services/auth";
import { router } from "expo-router";
import MaskedView from "@react-native-masked-view/masked-view";
import BackgroundWaves from "@/components/ui/BackgroundWaves";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [error, setError] = useState("");

  const handleRegister = async () => {
  try {
    await registerUser(email, password, role);
  } catch (err: any) {
    setError(err.message);
  }
};

  return (
    <View className="flex-1 bg-white justify-center items-center px-6 relative">
      {/* Signature Waves */}
            <BackgroundWaves />

      {/* Gradient CUTIN */}
            <MaskedView
              maskElement={
                <Text className="text-5xl font-extrabold mb-2 tracking-tight text-center">
                  CUTIN REGISTER
                </Text>
              }
            >
              <LinearGradient
                colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text className="text-5xl font-extrabold mb-2 tracking-tight opacity-0">
                  CUTIN REGISTER
                </Text>
              </LinearGradient>
            </MaskedView>

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base text-gray-900 shadow-sm"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-base text-gray-900 shadow-sm"
        secureTextEntry
      />

      {/* Role toggle */}
      <View className="flex-row w-full mb-6">
        <TouchableOpacity
          onPress={() => setRole("customer")}
          className={`flex-1 mr-2 py-4 rounded-lg border ${
            role === "customer"
              ? "bg-blue-600 border-blue-600"
              : "bg-gray-100 border-gray-300"
          }`}
        >
          <Text
            className={`text-center font-medium ${
              role === "customer" ? "text-white" : "text-gray-900"
            }`}
          >
            Customer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRole("merchant")}
          className={`flex-1 ml-2 py-4 rounded-lg border ${
            role === "merchant"
              ? "bg-blue-600 border-blue-600"
              : "bg-gray-100 border-gray-300"
          }`}
        >
          <Text
            className={`text-center font-medium ${
              role === "merchant" ? "text-white" : "text-gray-900"
            }`}
          >
            Merchant
          </Text>
        </TouchableOpacity>
      </View>

      {/* Register Button */}
      <TouchableOpacity
        onPress={handleRegister}
        className="w-full h-14 rounded-xl overflow-hidden shadow-lg mt-4"
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }} // ✅ fill parent
        >
          <Text className="text-white font-semibold text-lg">Register</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to login */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        className="mt-6"
      >
        <Text className="text-blue-700 text-sm font-medium">
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
