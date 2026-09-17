// app/(customer)/profile.tsx
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, logoutUser } = useAuth();

  // Prototype values for now
  const referralPoints = 30;
  const walletBalance = referralPoints; // 10 points = R10, so 1 point = R1
  const referralCode = "CUTIN-LUNG10";

  const handleLogout = async () => {
    try {
      await logoutUser();
      Alert.alert("Logged out", "You have been signed out.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const handlePaymentSetup = () => {
    Alert.alert(
      "Payment Integration",
      "This will connect to a payment provider like PayFast, Peach Payments, Paystack or Stripe."
    );
  };

  const handleReferralShare = () => {
    Alert.alert(
      "Referral Code",
      `Share this code with friends: ${referralCode}`
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-10"
      >
        {/* Header */}
        <View className="pt-4 mb-5">
          <Text className="text-gray-500 text-sm">Your account</Text>
          <Text className="text-3xl font-extrabold text-gray-950">
            Profile
          </Text>
        </View>

        {/* Profile Card */}
        <View className="bg-blue-950 rounded-[30px] p-5 mb-5">
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-3xl bg-blue-500 items-center justify-center mr-4">
              <Ionicons name="person" size={30} color="white" />
            </View>

            <View className="flex-1">
              <Text className="text-white font-bold text-lg">
                {user?.displayName ?? "Cutin Customer"}
              </Text>
              <Text className="text-gray-400 text-sm mt-1">
                {user?.email ?? "Guest user"}
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-white/10 my-5" />

          <View className="flex-row">
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Wallet Balance</Text>
              <Text className="text-white font-extrabold text-2xl mt-1">
                R {walletBalance.toFixed(2)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Reward Points</Text>
              <Text className="text-white font-extrabold text-2xl mt-1">
                {referralPoints}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Prototype */}
        <View className="bg-white rounded-[28px] p-5 mb-5 shadow-sm border border-blue-100">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-950 font-bold text-xl">
                Payments
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Manage checkout and wallet payments
              </Text>
            </View>

            <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center">
              <Ionicons name="card-outline" size={24} color="#2563EB" />
            </View>
          </View>

          <TouchableOpacity
            onPress={handlePaymentSetup}
            activeOpacity={0.85}
            className="bg-blue-950 rounded-2xl p-4 flex-row items-center justify-between"
          >
            <View>
              <Text className="text-white font-bold">
                Add Payment Method
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Card, EFT or app wallet coming soon
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Rewards & Referrals */}
        <View className="bg-white rounded-[28px] p-5 mb-5 shadow-sm border border-blue-100">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-950 font-bold text-xl">
                Rewards
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Earn R10 for every successful referral
              </Text>
            </View>

            <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center">
              <Ionicons name="gift-outline" size={24} color="#2563EB" />
            </View>
          </View>

          <View className="bg-[#FFF7ED] rounded-2xl p-4 mb-4">
            <Text className="text-gray-500 text-xs mb-1">
              Your referral code
            </Text>

            <View className="flex-row items-center justify-between">
              <Text className="text-gray-950 font-extrabold text-lg">
                {referralCode}
              </Text>

              <TouchableOpacity
                onPress={handleReferralShare}
                className="bg-blue-500 px-4 py-2 rounded-full"
              >
                <Text className="text-white font-bold text-xs">Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1 bg-gray-50 rounded-2xl p-4 mr-2">
              <Text className="text-gray-500 text-xs">Per referral</Text>
              <Text className="text-gray-950 font-extrabold text-lg mt-1">
                10 pts
              </Text>
            </View>

            <View className="flex-1 bg-gray-50 rounded-2xl p-4 ml-2">
              <Text className="text-gray-500 text-xs">Redeem value</Text>
              <Text className="text-gray-950 font-extrabold text-lg mt-1">
                R10
              </Text>
            </View>
          </View>
        </View>

        {/* ZakaMate Preview */}
        <TouchableOpacity
          activeOpacity={0.85}
          // onPress={() => router.push("/(customer)/budgeting")}
          className="bg-white rounded-[28px] p-5 mb-5 shadow-sm border border-blue-100"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-gray-950 font-bold text-xl">
                ZakaMate Budgeting
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Track food spending, monthly habits and smart saving insights.
              </Text>
            </View>

            <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center ml-4">
              <Ionicons name="analytics-outline" size={24} color="#2563EB" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Account Options */}
        <View className="mb-5">
          <TouchableOpacity className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm">
            <Ionicons name="lock-closed-outline" size={21} color="#2563EB" />
            <Text className="ml-3 text-gray-900 font-semibold flex-1">
              Change Password
            </Text>
            <Text className="text-gray-400 text-xs">Soon</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm"
            onPress={() => router.push("/(customer)/help")}
          >
            <Ionicons name="help-circle-outline" size={22} color="#2563EB" />
            <Text className="ml-3 text-gray-900 font-semibold flex-1">
              Help & Support
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.85}
          className="flex-row items-center justify-center bg-red-50 p-4 rounded-2xl"
        >
          <Ionicons name="log-out-outline" size={22} color="#2563EB" />
          <Text className="ml-2 text-red-600 font-bold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}