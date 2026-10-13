
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileOptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
};

function ProfileOption({
  icon,
  title,
  subtitle,
  onPress,
}: ProfileOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className="flex-row items-center bg-white rounded-2xl px-4 py-4 mb-3 border border-gray-100"
    >
      <View className="w-11 h-11 bg-blue-50 rounded-2xl items-center justify-center">
        <Ionicons
          name={icon}
          size={21}
          color="#2563EB"
        />
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-gray-950 font-bold text-base">
          {title}
        </Text>

        {subtitle && (
          <Text className="text-gray-500 text-xs mt-1">
            {subtitle}
          </Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={19}
        color="#94A3B8"
      />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logoutUser } = useAuth();

  const displayName =
    user?.displayName?.trim() || "Cutin Customer";

  const email = user?.email || "No email available";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const handleLogout = async () => {
    Alert.alert(
      "Sign out",
      "Are you sure you want to sign out of Cutin?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await logoutUser();
              router.replace("/(auth)/login");
            } catch (error: any) {
              Alert.alert(
                "Sign out failed",
                error?.message ||
                "Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleTerms = () => {
    Alert.alert(
      "Terms & Conditions",
      "The Cutin Terms & Conditions page is being prepared."
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Policy",
      "The Cutin Privacy Policy page is being prepared."
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 45,
        }}
      >
        {/* HEADER */}
        <View className="mb-6">
          <Text className="text-gray-500 text-sm font-medium">
            Your account
          </Text>

          <Text className="text-gray-950 text-3xl font-extrabold mt-1">
            Profile
          </Text>

          <Text className="text-gray-500 text-sm mt-2">
            Manage your account and preferences.
          </Text>
        </View>

        {/* PROFILE CARD */}
        <View className="bg-[#0F172A] rounded-[30px] p-5 mb-7">
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-3xl bg-blue-600 items-center justify-center mr-4">
              <Text className="text-white font-extrabold text-xl">
                {initials || "C"}
              </Text>
            </View>

            <View className="flex-1">
              <Text
                className="text-white font-extrabold text-xl"
                numberOfLines={1}
              >
                {displayName}
              </Text>

              <Text
                className="text-slate-300 text-sm mt-1"
                numberOfLines={1}
              >
                {email}
              </Text>
            </View>
          </View>

          <View className="h-px bg-white/10 my-5" />

          <View className="flex-row items-center">
            <View className="bg-blue-500/20 rounded-full px-3 py-2 flex-row items-center">
              <Ionicons
                name="person-outline"
                size={14}
                color="#93C5FD"
              />

              <Text className="text-blue-200 text-xs font-semibold ml-2">
                Customer account
              </Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT SECTION */}
        <Text className="text-gray-950 text-lg font-extrabold mb-3">
          Account
        </Text>

        <ProfileOption
          icon="person-circle-outline"
          title="Account information"
          subtitle="View your account details"
          onPress={() =>
            Alert.alert(
              "Account information",
              `Name: ${displayName}\nEmail: ${email}`
            )
          }
        />

        {/* SUPPORT SECTION */}
        <Text className="text-gray-950 text-lg font-extrabold mt-5 mb-3">
          Support & Legal
        </Text>

        <ProfileOption
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="Get assistance with Cutin"
          onPress={() =>
            router.push("/(customer)/help")
          }
        />

        <ProfileOption
          icon="document-text-outline"
          title="Terms & Conditions"
          subtitle="Read the terms of using Cutin"
          onPress={handleTerms}
        />

        <ProfileOption
          icon="shield-checkmark-outline"
          title="Privacy Policy"
          subtitle="Learn how your information is handled"
          onPress={handlePrivacy}
        />

        {/* LOGOUT */}
        <Text className="text-gray-950 text-lg font-extrabold mt-5 mb-3">
          Session
        </Text>

        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          className="bg-red-50 rounded-2xl p-4 flex-row items-center border border-red-100"
        >
          <View className="w-11 h-11 rounded-2xl bg-red-100 items-center justify-center">
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#DC2626"
            />
          </View>

          <Text className="text-red-600 font-bold text-base ml-3 flex-1">
            Sign out
          </Text>

          <Ionicons
            name="chevron-forward"
            size={19}
            color="#DC2626"
          />
        </TouchableOpacity>

        {/* FOOTER */}
        <View className="items-center mt-10 mb-4">
          <View className="flex-row items-center">
            <Ionicons
              name="shield-checkmark-outline"
              size={17}
              color="#94A3B8"
            />

            <Text className="text-gray-400 text-xs ml-2">
              Your account, your control
            </Text>
          </View>

          <Text className="text-gray-400 text-xs mt-3">
            Cutin Technologies
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
