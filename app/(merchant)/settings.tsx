import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import * as ImagePicker from "expo-image-picker";
import BackgroundWaves from "@/components/ui/BackgroundWaves";
import {
  saveMerchantProfile,
  getMerchantProfile,
} from "@/services/merchant.service";
import { useAuth } from "@/hooks/use-auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/services/firebase";

export default function MerchantSettingsScreen() {
  const { user } = useAuth();
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      const profile = await getMerchantProfile(user.uid);
      if (profile) {
        setShopName(profile.shopName || "");
        setAddress(profile.address || "");
        setPhone(profile.phone || "");
        setBannerUrl(profile.bannerUrl || null);
      }
    };
    loadProfile();
  }, [user]);

  const pickBanner = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      await uploadBanner(uri);
    }
  };

  const uploadBanner = async (uri: string) => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `banners/${user.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      
      // Update UI
      setBannerUrl(downloadUrl);

      // Immediately save to Firestore
      await saveMerchantProfile(user.uid, {
        bannerUrl: downloadUrl,
      });

      setLoading(false);
    } catch (error) {
      console.error("Upload failed:", error);
      setLoading(false);
    }
  };


  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    await saveMerchantProfile(user.uid, {
      shopName,
      address,
      phone,
      bannerUrl,
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="relative px-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Background Waves */}
        <BackgroundWaves />

        {/* Title + Subtitle */}
        <View className="items-center mt-28 mb-12 ">
          <MaskedView
            maskElement={
              <Text className="text-4xl font-extrabold tracking-tight text-center py-10 ">
                SETTINGS
              </Text>
            }
          >
            <LinearGradient
              colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text className="text-4xl font-extrabold tracking-tight opacity-0 py-5">
                SETTINGS
              </Text>
            </LinearGradient>
          </MaskedView>

          <Text className="text-gray-600 text-base mt-3">
            Manage your restaurant details 🍽️
          </Text>
        </View>

        {/* Banner Upload */}
        <View className="items-center mb-8">
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              className="w-full h-40 rounded-xl mb-4"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-40 bg-gray-200 rounded-xl mb-4 items-center justify-center">
              <Text className="text-gray-500">No Banner Selected</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={pickBanner}
            className="px-6 py-3 bg-blue-600 rounded-xl"
          >
            <Text className="text-white font-semibold">Upload Banner</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <TextInput
          placeholder="Restaurant Name"
          placeholderTextColor="#9CA3AF"
          value={shopName}
          onChangeText={setShopName}
          className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-6 text-base text-gray-900 shadow-sm"
        />

        <TextInput
          placeholder="Address"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
          className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-6 text-base text-gray-900 shadow-sm"
        />

        <TextInput
          placeholder="Phone Number"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-8 text-base text-gray-900 shadow-sm"
          keyboardType="phone-pad"
        />

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          className="w-full h-14 rounded-xl overflow-hidden shadow-lg mt-8"
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text className="text-white font-semibold text-lg">
              {loading ? "Saving..." : "Save Settings"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {saved && (
          <Text className="text-green-600 text-center mt-6">
            ✅ Settings saved successfully!
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
