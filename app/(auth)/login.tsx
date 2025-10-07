import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { getUserRole, loginUser } from "@/services/auth";
import { router } from "expo-router";
import BackgroundWaves from "@/components/ui/BackgroundWaves";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await loginUser(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };


  return (
    <View className="flex-1 bg-white justify-center items-center px-6 relative">
      {/* Signature Waves */}
      <BackgroundWaves />

      {/* Gradient Title */}
      <MaskedView
        maskElement={
          <Text className="text-5xl font-extrabold mb-2 tracking-tight text-center">
            CUTIN LOGIN
          </Text>
        }
      >
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text className="text-5xl font-extrabold mb-2 tracking-tight opacity-0">
            CUTIN LOGIN
          </Text>
        </LinearGradient>
      </MaskedView>

      <Text className="text-gray-500 mb-8 text-base">
        Cut the wait, not the taste 🍴
      </Text>

      {error ? <Text className="text-red-500 mb-3">{error}</Text> : null}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-4 text-base text-gray-900 shadow-sm"
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-6 text-base text-gray-900 shadow-sm"
        secureTextEntry
      />

      {/* Login Button */}
      <TouchableOpacity
        onPress={handleLogin}
        className="w-full h-14 rounded-xl overflow-hidden shadow-lg mt-4"
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }} // ✅ fill parent
        >
          <Text className="text-white font-semibold text-lg">Login</Text>
        </LinearGradient>
      </TouchableOpacity>



      {/* Register link */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/register")}
        className="mt-6"
      >
        <Text className="text-blue-700 text-sm font-medium">
          Don’t have an account? Register
        </Text>
      </TouchableOpacity>
      
    </View>
  );
}
