// app/(customer)/help.tsx
import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function HelpScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-5 py-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Terms & Conditions</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text className="text-gray-900 text-lg font-semibold mb-3">
          Agreement to Terms
        </Text>
        <Text className="text-gray-700 mb-4">
          Acceptance of Terms: By downloading, installing, or using the Cutin app,
          you agree to be bound by these Terms and Conditions. If you do not agree,
          do not use the app.
        </Text>

        <Text className="text-gray-900 text-lg font-semibold mb-3">
          Description of Services
        </Text>
        <Text className="text-gray-700 mb-4">
          Cutin is a food ordering and takeout platform that connects users with
          restaurants, tuckshops and eateries in their area. Users can browse menus,
          place orders, and pay for their meals directly through the app.
        </Text>

        {/* 👇 continue sections in similar format */}
        <Text className="text-gray-900 text-lg font-semibold mb-3">
          User Accounts
        </Text>
        <Text className="text-gray-700 mb-4">
          • To create an account independently, users must be 18+.
          {"\n"}• With parental permission, users under 18 may use the app for
          authorized tuckshops.
          {"\n"}• Cutin will implement additional safeguards for under-18 users.
          {"\n"}• You must keep your account details safe.
        </Text>

        <Text className="text-gray-900 text-lg font-semibold mb-3">
          User Conduct
        </Text>
        <Text className="text-gray-700 mb-4">
          You agree to use Cutin lawfully. You will not transmit harmful, abusive,
          or unlawful content, interfere with servers, or break laws.
        </Text>

        {/* ...continue with Content Ownership, IP, Warranty, Liability, Termination, Governing Law, etc. */}

        <Text className="text-gray-900 text-lg font-semibold mb-3">
          Contact Us
        </Text>
        <Text className="text-gray-700">
          Cutin{"\n"}Email: support@cutin.tech{"\n"}Phone: 063 777 2244
        </Text>

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
