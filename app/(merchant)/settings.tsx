import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import BackgroundWaves from "@/components/ui/BackgroundWaves";

import {
  saveMerchantProfile,
  getMerchantProfile,
} from "@/services/merchant.service";

import {
  getPaystackBanks,
  validatePaystackAccount,
  createMerchantPayoutAccount,
  PaystackBank,
  MerchantPaymentAccount,
} from "@/services/merchant-payment.service";

import { useAuth } from "@/hooks/use-auth";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "@/services/firebase";

export default function MerchantSettingsScreen() {
  const { user } = useAuth();

  // =========================================================
  // STORE PROFILE
  // =========================================================

  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // =========================================================
  // PAYOUTS
  // =========================================================

  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);

  const [selectedBankCode, setSelectedBankCode] = useState("");

  const [accountNumber, setAccountNumber] = useState("");

  const [accountHolderName, setAccountHolderName] =
    useState("");

  const [accountType, setAccountType] =
    useState<"personal" | "business">("business");

  const [documentNumber, setDocumentNumber] =
    useState("");

  const [personalDocumentType, setPersonalDocumentType] =
    useState<
      "identityNumber" | "passportNumber"
    >("identityNumber");

  const [accountVerified, setAccountVerified] =
    useState(false);

  const [verifyingAccount, setVerifyingAccount] =
    useState(false);

  const [activatingPayouts, setActivatingPayouts] =
    useState(false);

  const [paymentAccount, setPaymentAccount] =
    useState<MerchantPaymentAccount | null>(null);

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const profile =
          await getMerchantProfile(user.uid);

        if (!profile) return;

        setShopName(
          profile.shopName || ""
        );

        setAddress(
          profile.address || ""
        );

        setPhone(
          profile.phone || ""
        );

        setBannerUrl(
          profile.bannerUrl || null
        );

        if (
          profile.paymentAccount
            ?.setupComplete
        ) {
          setPaymentAccount(
            profile.paymentAccount
          );
        }
      } catch (error) {
        console.error(
          "Failed to load merchant profile:",
          error
        );
      }
    };

    loadProfile();
  }, [user]);

  // =========================================================
  // LOAD BANKS
  // =========================================================

  useEffect(() => {
    if (!user || paymentAccount) {
      return;
    }

    const loadBanks = async () => {
      try {
        setBanksLoading(true);

        const result =
          await getPaystackBanks();

        setBanks(
          [...result].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      } catch (error) {
        console.error(
          "Failed to load banks:",
          error
        );

        Alert.alert(
          "Banks unavailable",
          "We couldn't load supported banks."
        );
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, [user, paymentAccount]);

  // =========================================================
  // BANNER
  // =========================================================

  const pickBanner = async () => {
    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });

      if (!result.canceled) {
        await uploadBanner(
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.error(
        "Image picker error:",
        error
      );

      Alert.alert(
        "Image error",
        "We couldn't open your photo library."
      );
    }
  };

  const uploadBanner = async (
    uri: string
  ) => {
    if (!user) return;

    try {
      setLoading(true);

      const response =
        await fetch(uri);

      const blob =
        await response.blob();

      const storageRef =
        ref(
          storage,
          `banners/${user.uid}.jpg`
        );

      await uploadBytes(
        storageRef,
        blob
      );

      const downloadUrl =
        await getDownloadURL(
          storageRef
        );

      setBannerUrl(
        downloadUrl
      );

      await saveMerchantProfile(
        user.uid,
        {
          bannerUrl:
            downloadUrl,
        }
      );
    } catch (error) {
      console.error(
        "Banner upload failed:",
        error
      );

      Alert.alert(
        "Upload failed",
        "We couldn't upload your banner."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // SAVE STORE PROFILE
  // =========================================================

  const handleSave = async () => {
    if (!user) return;

    if (!shopName.trim()) {
      Alert.alert(
        "Restaurant name required",
        "Enter your restaurant name."
      );

      return;
    }

    try {
      setLoading(true);

      await saveMerchantProfile(
        user.uid,
        {
          shopName:
            shopName.trim(),

          address:
            address.trim(),

          phone:
            phone.trim(),

          bannerUrl,
        }
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Save settings error:",
        error
      );

      Alert.alert(
        "Save failed",
        "Your restaurant settings could not be saved."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // PAYOUT FIELD CHANGES
  // =========================================================

  const handleBankChange = (
    bankCode: string
  ) => {
    setSelectedBankCode(
      bankCode
    );

    setAccountVerified(false);
  };

  const handleAccountNumberChange = (
    value: string
  ) => {
    const clean =
      value.replace(/\D/g, "");

    setAccountNumber(
      clean
    );

    setAccountVerified(false);
  };

  const handleAccountHolderNameChange = (
    value: string
  ) => {
    setAccountHolderName(
      value
    );

    setAccountVerified(false);
  };

  const handleAccountTypeChange = (
    value:
      | "personal"
      | "business"
  ) => {
    setAccountType(value);

    setDocumentNumber("");

    setAccountVerified(false);
  };

  const handlePersonalDocumentTypeChange = (
    value:
      | "identityNumber"
      | "passportNumber"
  ) => {
    setPersonalDocumentType(
      value
    );

    setDocumentNumber("");

    setAccountVerified(false);
  };

  // =========================================================
  // VALIDATE ACCOUNT
  // =========================================================

  const handleVerifyAccount =
    async () => {
      if (!selectedBankCode) {
        Alert.alert(
          "Select a bank",
          "Choose your bank first."
        );

        return;
      }

      if (
        !accountHolderName.trim()
      ) {
        Alert.alert(
          "Account holder required",
          "Enter the name registered on the bank account."
        );

        return;
      }

      if (
        accountNumber.length < 5
      ) {
        Alert.alert(
          "Account number required",
          "Enter a valid bank account number."
        );

        return;
      }

      if (
        !documentNumber.trim()
      ) {
        Alert.alert(
          "Identification required",
          accountType === "business"
            ? "Enter the business registration number."
            : "Enter your identification number."
        );

        return;
      }

      const documentType =
        accountType === "business"
          ? "businessRegistrationNumber"
          : personalDocumentType;

      try {
        setVerifyingAccount(
          true
        );

        setAccountVerified(
          false
        );

        const result =
          await validatePaystackAccount(
            accountNumber,
            selectedBankCode,
            accountHolderName.trim(),
            accountType,
            documentNumber.trim(),
            documentType
          );
        console.log(
          "PAYSTACK ACCOUNT VALIDATION:",
          JSON.stringify(result, null, 2)
        );

        if (!result.verified) {
          throw new Error(
            result.verificationMessage ||
            "Account validation failed."
          );
        }

        setAccountVerified(
          true
        );

        Alert.alert(
          "Account validated",
          result.verificationMessage ||
          "Your bank account was successfully validated."
        );
      } catch (error: any) {
        console.error(
          "Account validation:",
          error
        );

        setAccountVerified(
          false
        );

        Alert.alert(
          "Could not validate account",
          error?.message ||
          "Check your details and try again."
        );
      } finally {
        setVerifyingAccount(
          false
        );
      }
    };

  // =========================================================
  // ACTIVATE PAYOUTS
  // =========================================================

  const handleActivatePayouts =
    async () => {
      if (!user) return;

      if (!shopName.trim()) {
        Alert.alert(
          "Restaurant name required",
          "Save your restaurant profile first."
        );

        return;
      }

      if (
        !selectedBankCode ||
        !accountNumber ||
        !accountHolderName.trim() ||
        !accountVerified
      ) {
        Alert.alert(
          "Validate your account",
          "Validate your bank account before activating payouts."
        );

        return;
      }

      const selectedBank =
        banks.find(
          (bank) =>
            bank.code ===
            selectedBankCode
        );

      if (!selectedBank) {
        Alert.alert(
          "Bank unavailable",
          "Please select your bank again."
        );

        return;
      }

      try {
        setActivatingPayouts(
          true
        );

        const result =
          await createMerchantPayoutAccount(
            {
              businessName:
                shopName.trim(),

              bankCode:
                selectedBank.code,

              bankName:
                selectedBank.name,

              accountNumber,

              accountName:
                accountHolderName.trim(),

              phone:
                phone.trim() ||
                undefined,
            }
          );

        const newPaymentAccount: MerchantPaymentAccount =
        {
          provider:
            "paystack",

          subaccountCode:
            result.subaccountCode,

          accountName:
            result.accountName,

          bankName:
            result.bankName,

          bankCode:
            selectedBank.code,

          accountNumberLast4:
            result.accountNumberLast4,

          status:
            "active",

          payoutsEnabled:
            true,

          setupComplete:
            true,
        };

        setPaymentAccount(
          newPaymentAccount
        );

        setAccountNumber("");
        setAccountHolderName("");
        setSelectedBankCode("");
        setDocumentNumber("");
        setAccountVerified(false);

        Alert.alert(
          "Payouts activated 🎉",
          "Your Cutin earnings can now be settled through Paystack."
        );
      } catch (error: any) {
        console.error(
          "Payout activation:",
          error
        );

        Alert.alert(
          "Payout setup failed",
          error?.message ||
          "We couldn't activate payouts."
        );
      } finally {
        setActivatingPayouts(
          false
        );
      }
    };

  // =========================================================
  // UI
  // =========================================================

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 100,
        }}
        className="relative px-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <BackgroundWaves />

        {/* HEADER */}

        <View className="items-center mt-28 mb-10">
          <MaskedView
            maskElement={
              <Text className="text-4xl font-extrabold tracking-tight text-center py-10">
                SETTINGS
              </Text>
            }
          >
            <LinearGradient
              colors={[
                "#0F172A",
                "#1E3A8A",
                "#3B82F6",
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
            >
              <Text className="text-4xl font-extrabold tracking-tight opacity-0 py-5">
                SETTINGS
              </Text>
            </LinearGradient>
          </MaskedView>

          <Text className="text-gray-600 text-base mt-3">
            Manage your restaurant and payouts 🍽️
          </Text>
        </View>

        {/* STORE PROFILE */}

        <View className="bg-white border border-gray-200 rounded-3xl p-5 mb-6 shadow-sm">
          <View className="flex-row items-center mb-5">
            <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mr-3">
              <Ionicons
                name="storefront-outline"
                size={22}
                color="#2563EB"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-950 text-lg font-bold">
                Store Profile
              </Text>

              <Text className="text-gray-500 text-sm mt-1">
                Details customers see on Cutin
              </Text>
            </View>
          </View>

          {bannerUrl ? (
            <Image
              source={{
                uri: bannerUrl,
              }}
              className="w-full h-40 rounded-2xl mb-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-40 bg-gray-100 rounded-2xl mb-3 items-center justify-center border border-gray-200">
              <Ionicons
                name="image-outline"
                size={30}
                color="#9CA3AF"
              />

              <Text className="text-gray-500 mt-2">
                Add a store banner
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={pickBanner}
            disabled={loading}
            className="h-11 border border-blue-200 bg-blue-50 rounded-xl items-center justify-center mb-6"
          >
            <Text className="text-blue-700 font-semibold">
              {bannerUrl
                ? "Change Banner"
                : "Upload Banner"}
            </Text>
          </TouchableOpacity>

          <Text className="text-gray-700 text-sm font-semibold mb-2">
            Restaurant name
          </Text>

          <TextInput
            placeholder="Restaurant Name"
            placeholderTextColor="#9CA3AF"
            value={shopName}
            onChangeText={setShopName}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 text-base text-gray-900"
          />

          <Text className="text-gray-700 text-sm font-semibold mb-2">
            Address
          </Text>

          <TextInput
            placeholder="Restaurant Address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={setAddress}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 text-base text-gray-900"
          />

          <Text className="text-gray-700 text-sm font-semibold mb-2">
            Phone number
          </Text>

          <TextInput
            placeholder="Phone Number"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 text-base text-gray-900"
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className="w-full h-14 rounded-xl overflow-hidden"
          >
            <LinearGradient
              colors={[
                "#0F172A",
                "#1E3A8A",
                "#3B82F6",
              ]}
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 1,
              }}
              style={{
                flex: 1,
                justifyContent:
                  "center",
                alignItems:
                  "center",
              }}
            >
              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Save Store Profile
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {saved && (
            <View className="flex-row items-center justify-center mt-4">
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#16A34A"
              />

              <Text className="text-green-600 ml-2 font-medium">
                Store profile saved
              </Text>
            </View>
          )}
        </View>

        {/* PAYOUTS */}

        <View className="bg-white border border-gray-200 rounded-3xl p-5 mb-8 shadow-sm">
          <View className="flex-row items-center mb-2">
            <View className="w-11 h-11 rounded-2xl bg-green-50 items-center justify-center mr-3">
              <Ionicons
                name="wallet-outline"
                size={23}
                color="#16A34A"
              />
            </View>

            <View className="flex-1">
              <Text className="text-gray-950 text-lg font-bold">
                Payouts
              </Text>

              <Text className="text-gray-500 text-sm mt-1">
                Receive your Cutin earnings
              </Text>
            </View>
          </View>

          {paymentAccount ? (
            <View className="mt-5">
              <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={23}
                    color="#16A34A"
                  />

                  <View className="ml-3 flex-1">
                    <Text className="text-green-900 font-bold">
                      Automatic payouts active
                    </Text>

                    <Text className="text-green-700 text-xs mt-1">
                      Your payout account is connected
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-gray-500 text-xs uppercase font-semibold">
                  Payout account
                </Text>

                <Text className="text-gray-950 text-lg font-bold mt-3">
                  {paymentAccount.bankName}
                </Text>

                <Text className="text-gray-700 text-base mt-1">
                  ••••{" "}
                  {paymentAccount.accountNumberLast4}
                </Text>

                <Text className="text-gray-500 text-sm mt-1">
                  {paymentAccount.accountName}
                </Text>

                <View className="h-px bg-gray-200 my-4" />

                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-500 text-sm">
                    Provider
                  </Text>

                  <Text className="text-gray-900 font-semibold">
                    Paystack
                  </Text>
                </View>

                <View className="flex-row items-center justify-between mt-3">
                  <Text className="text-gray-500 text-sm">
                    Status
                  </Text>

                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />

                    <Text className="text-green-600 font-semibold">
                      Active
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View className="mt-5">
              <Text className="text-gray-600 text-sm leading-5 mb-6">
                Connect your South African bank account to receive earnings from Cutin automatically.
              </Text>

              {/* Account Holder */}

              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Account holder name
              </Text>

              <TextInput
                placeholder="Name registered with your bank"
                placeholderTextColor="#9CA3AF"
                value={accountHolderName}
                onChangeText={
                  handleAccountHolderNameChange
                }
                autoCapitalize="words"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 text-base text-gray-900"
              />

              {/* Account Type */}

              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Account type
              </Text>

              <View className="flex-row mb-5">
                <TouchableOpacity
                  onPress={() =>
                    handleAccountTypeChange(
                      "business"
                    )
                  }
                  className={`flex-1 h-14 rounded-xl border items-center justify-center mr-2 ${accountType ===
                    "business"
                    ? "bg-blue-50 border-blue-600"
                    : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={
                        accountType ===
                          "business"
                          ? "#2563EB"
                          : "#6B7280"
                      }
                    />

                    <Text
                      className={`font-semibold ml-2 ${accountType ===
                        "business"
                        ? "text-blue-700"
                        : "text-gray-600"
                        }`}
                    >
                      Business
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleAccountTypeChange(
                      "personal"
                    )
                  }
                  className={`flex-1 h-14 rounded-xl border items-center justify-center ml-2 ${accountType ===
                    "personal"
                    ? "bg-blue-50 border-blue-600"
                    : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={
                        accountType ===
                          "personal"
                          ? "#2563EB"
                          : "#6B7280"
                      }
                    />

                    <Text
                      className={`font-semibold ml-2 ${accountType ===
                        "personal"
                        ? "text-blue-700"
                        : "text-gray-600"
                        }`}
                    >
                      Personal
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Personal Document Type */}

              {accountType ===
                "personal" && (
                  <>
                    <Text className="text-gray-700 text-sm font-semibold mb-2">
                      Identification type
                    </Text>

                    <View className="flex-row mb-5">
                      <TouchableOpacity
                        onPress={() =>
                          handlePersonalDocumentTypeChange(
                            "identityNumber"
                          )
                        }
                        className={`flex-1 h-14 rounded-xl border items-center justify-center mr-2 ${personalDocumentType ===
                          "identityNumber"
                          ? "bg-blue-50 border-blue-600"
                          : "bg-gray-50 border-gray-200"
                          }`}
                      >
                        <Text
                          className={`font-semibold ${personalDocumentType ===
                            "identityNumber"
                            ? "text-blue-700"
                            : "text-gray-600"
                            }`}
                        >
                          SA ID
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          handlePersonalDocumentTypeChange(
                            "passportNumber"
                          )
                        }
                        className={`flex-1 h-14 rounded-xl border items-center justify-center ml-2 ${personalDocumentType ===
                          "passportNumber"
                          ? "bg-blue-50 border-blue-600"
                          : "bg-gray-50 border-gray-200"
                          }`}
                      >
                        <Text
                          className={`font-semibold ${personalDocumentType ===
                            "passportNumber"
                            ? "text-blue-700"
                            : "text-gray-600"
                            }`}
                        >
                          Passport
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

              {/* Document Number */}

              <Text className="text-gray-700 text-sm font-semibold mb-2">
                {accountType ===
                  "business"
                  ? "Business registration number"
                  : personalDocumentType ===
                    "identityNumber"
                    ? "South African ID number"
                    : "Passport number"}
              </Text>

              <TextInput
                placeholder={
                  accountType ===
                    "business"
                    ? "e.g. 2026/123456/07"
                    : personalDocumentType ===
                      "identityNumber"
                      ? "13-digit SA ID number"
                      : "Passport number"
                }
                placeholderTextColor="#9CA3AF"
                value={documentNumber}
                onChangeText={(value) => {
                  setDocumentNumber(
                    value
                  );

                  setAccountVerified(
                    false
                  );
                }}
                autoCapitalize={
                  personalDocumentType ===
                    "passportNumber"
                    ? "characters"
                    : "none"
                }
                keyboardType={
                  accountType ===
                    "personal" &&
                    personalDocumentType ===
                    "identityNumber"
                    ? "number-pad"
                    : "default"
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mb-5 text-base text-gray-900"
              />

              {/* Bank */}

              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Bank
              </Text>

              <View className="border border-gray-200 bg-gray-50 rounded-xl overflow-hidden mb-5">
                {banksLoading ? (
                  <View className="h-14 flex-row items-center justify-center">
                    <ActivityIndicator
                      size="small"
                      color="#2563EB"
                    />

                    <Text className="text-gray-500 ml-2">
                      Loading banks...
                    </Text>
                  </View>
                ) : (
                  <Picker
                    selectedValue={
                      selectedBankCode
                    }
                    onValueChange={
                      handleBankChange
                    }
                    style={{
                      color:
                        "#111827",
                    }}
                  >
                    <Picker.Item
                      label="Select your bank"
                      value=""
                    />

                    {banks.map(
                      (bank) => (
                        <Picker.Item
                          key={
                            bank.code
                          }
                          label={
                            bank.name
                          }
                          value={
                            bank.code
                          }
                        />
                      )
                    )}
                  </Picker>
                )}
              </View>

              {/* Account Number */}

              <Text className="text-gray-700 text-sm font-semibold mb-2">
                Account number
              </Text>

              <TextInput
                placeholder="Enter bank account number"
                placeholderTextColor="#9CA3AF"
                value={accountNumber}
                onChangeText={
                  handleAccountNumberChange
                }
                keyboardType="number-pad"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
              />

              {/* Verification */}

              {accountVerified ? (
                <View className="bg-green-50 border border-green-200 rounded-2xl p-4 mt-4">
                  <View className="flex-row items-start">
                    <Ionicons
                      name="checkmark-circle"
                      size={23}
                      color="#16A34A"
                    />

                    <View className="ml-3 flex-1">
                      <Text className="text-green-700 text-xs font-bold">
                        ACCOUNT VALIDATED
                      </Text>

                      <Text className="text-green-950 font-bold text-base mt-1">
                        {accountHolderName}
                      </Text>

                      <Text className="text-green-700 text-sm mt-1">
                        {banks.find(
                          (bank) =>
                            bank.code ===
                            selectedBankCode
                        )?.name ||
                          "Bank"}{" "}
                        ••••{" "}
                        {accountNumber.slice(
                          -4
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={
                    handleVerifyAccount
                  }
                  disabled={
                    verifyingAccount ||
                    !selectedBankCode ||
                    !accountNumber ||
                    !accountHolderName.trim() ||
                    !documentNumber.trim()
                  }
                  className={`h-14 rounded-xl items-center justify-center mt-4 ${!selectedBankCode ||
                    !accountNumber ||
                    !accountHolderName.trim() ||
                    !documentNumber.trim()
                    ? "bg-gray-200"
                    : "bg-blue-600"
                    }`}
                >
                  {verifyingAccount ? (
                    <ActivityIndicator
                      color="#FFFFFF"
                    />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={19}
                        color={
                          !selectedBankCode ||
                            !accountNumber ||
                            !accountHolderName.trim() ||
                            !documentNumber.trim()
                            ? "#6B7280"
                            : "#FFFFFF"
                        }
                      />

                      <Text
                        className={`font-semibold ml-2 ${!selectedBankCode ||
                          !accountNumber ||
                          !accountHolderName.trim() ||
                          !documentNumber.trim()
                          ? "text-gray-500"
                          : "text-white"
                          }`}
                      >
                        Validate Bank Account
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              {/* Activate */}

              {accountVerified && (
                <TouchableOpacity
                  onPress={
                    handleActivatePayouts
                  }
                  disabled={
                    activatingPayouts
                  }
                  className="w-full h-14 rounded-xl overflow-hidden mt-5"
                >
                  <LinearGradient
                    colors={[
                      "#0F172A",
                      "#1E3A8A",
                      "#3B82F6",
                    ]}
                    start={{
                      x: 0,
                      y: 0,
                    }}
                    end={{
                      x: 1,
                      y: 1,
                    }}
                    style={{
                      flex: 1,
                      justifyContent:
                        "center",
                      alignItems:
                        "center",
                    }}
                  >
                    {activatingPayouts ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="wallet-outline"
                          size={19}
                          color="#FFFFFF"
                        />

                        <Text className="text-white font-semibold text-base ml-2">
                          Activate Automatic
                          Payouts
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Security */}

              <View className="flex-row items-start mt-5">
                <Ionicons
                  name="lock-closed-outline"
                  size={15}
                  color="#9CA3AF"
                />

                <Text className="text-gray-400 text-xs ml-2 flex-1 leading-4">
                  Your payout account is validated and processed securely through Paystack. Cutin only stores the last four digits of your account number.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}