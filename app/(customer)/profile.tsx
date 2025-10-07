// app/(customer)/profile.tsx
import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user, logoutUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert("Logged out", "You have been signed out.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-6 py-5 border-b border-gray-200 bg-white">
        <Text className="text-2xl font-bold text-gray-900">Profile</Text>
      </View>

      <View className="flex-1 px-6 py-8">
        {/* Avatar + Info */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center mb-3">
            <Ionicons name="person-outline" size={40} color="#6b7280" />
          </View>
          <Text className="text-lg font-semibold text-gray-900">
            {user?.email ?? "Guest"}
          </Text>
        </View>

        {/* Settings Options */}

        <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm">
          <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
          <Text className="ml-3 text-gray-900 font-medium">
            Change Password - Coming Soon
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center bg-white p-4 rounded-xl mb-3 shadow-sm"
          onPress={() => router.push("/(customer)/help")}
        >
          <Ionicons name="help-circle-outline" size={20} color="#3B82F6" />
          <Text className="ml-3 text-gray-900 font-medium">
            Help & Support
          </Text>
        </TouchableOpacity>


        {/* Logout Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center bg-red-50 p-4 rounded-xl mt-6"
        >
          <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          <Text className="ml-3 text-red-600 font-medium">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
