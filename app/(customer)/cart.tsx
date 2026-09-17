// app/(customer)/cart.tsx

import { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";

import { useCart } from "@/context/cart-context";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/services/firebase";

import * as WebBrowser from "expo-web-browser";

import {
  initializePaystackPayment,
  verifyPaystackPayment,
} from "@/services/payment.service";

import {
  createCustomerCheckout,
  PaymentMethod,
} from "@/services/customer.service";

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  productId?: string;
  imageUrl?: string;
  category?: string;
};

export default function CartScreen() {
  const {
    cart,
    total,
    totalQty,
    removeItem,
    clearCart,
    changeQty,
  } = useCart();

  const { user } = useAuth();

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("pay_in_store");

  const [processing, setProcessing] = useState(false);

  const items = (cart.items ?? []) as CartItem[];

  const VAT_RATE = 0.15;

  /*
   * Assumption:
   * product prices already include VAT.
   *
   * This extracts the VAT portion for display.
   * It does not add another 15% on top of the order.
   */
  const vatAmount = useMemo(() => {
    return total - total / (1 + VAT_RATE);
  }, [total]);

  const subtotalBeforeVat = useMemo(() => {
    return total - vatAmount;
  }, [total, vatAmount]);

  const grandTotal = total;

  const formatMoney = (amount: number) => {
    return `R ${Number(amount || 0).toFixed(2)}`;
  };

  /**
   * Notify the merchant after the order has been created.
   *
   * Notification failure should not cancel a successfully created order.
   */
  const notifyMerchant = async (
    merchantId: string,
    orderId: string,
    orderNumber: string
  ) => {
    try {
      const merchantUserReference = doc(db, "users", merchantId);
      const merchantSnapshot = await getDoc(merchantUserReference);

      if (!merchantSnapshot.exists()) {
        console.warn("Merchant user account was not found.");
        return;
      }

      const merchantToken = merchantSnapshot.data()?.expoPushToken;

      if (!merchantToken) {
        console.log("Merchant has no Expo push token.");
        return;
      }

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: merchantToken,
          sound: "default",
          title: "🍽️ New Order Received!",
          body: `Order ${orderNumber} has been placed.`,
          data: {
            orderId,
            orderNumber,
          },
        }),
      });
    } catch (error) {
      /*
       * The order already exists at this point.
       * Therefore, do not throw and make the customer think checkout failed.
       */
      console.error("Merchant notification failed:", error);
    }
  };

  const handleCheckout = async () => {
    if (processing) {
      return;
    }

    if (!user) {
      Alert.alert(
        "Not logged in",
        "Please log in before placing an order."
      );

      return;
    }

    if (!user.email) {
      Alert.alert(
        "Email required",
        "Your account needs an email address before you can make an online payment."
      );

      return;
    }

    if (!cart.merchantId) {
      Alert.alert(
        "Merchant unavailable",
        "The merchant information is missing from this cart."
      );

      return;
    }

    if (!items.length) {
      Alert.alert(
        "Cart empty",
        "Add at least one item before checking out."
      );

      return;
    }

    const hasInvalidItem = items.some(
      (item) =>
        !item.id ||
        !item.name ||
        Number(item.price) <= 0 ||
        Number(item.qty) <= 0
    );

    if (hasInvalidItem) {
      Alert.alert(
        "Invalid cart",
        "One or more cart items contain invalid information."
      );

      return;
    }

    try {
      setProcessing(true);

      const checkoutItems = items.map(
        (item) => ({
          id: item.id,

          productId:
            item.productId ?? item.id,

          name: item.name,

          price:
            Number(item.price),

          quantity:
            Number(item.qty),

          imageUrl:
            item.imageUrl,

          category:
            item.category ?? "Other",
        })
      );

      // =========================================================
      // PAY IN STORE
      // =========================================================

      if (
        selectedPaymentMethod ===
        "pay_in_store"
      ) {
        const result =
          await createCustomerCheckout({
            customerId:
              user.uid,

            merchantId:
              cart.merchantId,

            merchantName:
              cart.merchantName ??
              "Merchant",

            items:
              checkoutItems,

            paymentMethod:
              "pay_in_store",

            provider:
              "mock",

            requestedRewards:
              0,

            collectionMethod:
              "pickup",
          });

        await notifyMerchant(
          cart.merchantId,
          result.orderId,
          result.orderNumber
        );

        clearCart();

        Alert.alert(
          "Order placed",
          `Order ${result.orderNumber
          } has been created. Please pay ${formatMoney(
            result.breakdown
              .customerAmount
          )} at ${cart.merchantName ??
          "the store"
          }.`,
          [
            {
              text:
                "View Orders",

              onPress: () =>
                router.replace(
                  "/(customer)/orders"
                ),
            },
          ]
        );

        return;
      }

      // =========================================================
      // PAYSTACK CARD PAYMENT
      // =========================================================

      const checkout =
        await createCustomerCheckout({
          customerId:
            user.uid,

          merchantId:
            cart.merchantId,

          merchantName:
            cart.merchantName ??
            "Merchant",

          items:
            checkoutItems,

          paymentMethod:
            "card",

          provider:
            "paystack",

          requestedRewards:
            0,

          collectionMethod:
            "pickup",
        });

      // At this point:
      // - order exists
      // - payment exists
      // - paymentStatus is processing
      // - cart must NOT be cleared yet

      const payment =
        await initializePaystackPayment({
          email:
            user.email,

          orderId:
            checkout.orderId,
        });

      // =========================================================
      // OPEN PAYSTACK HOSTED CHECKOUT
      // =========================================================

      await WebBrowser.openBrowserAsync(
        payment.authorizationUrl
      );

      // The user has returned from the Paystack browser.
      // Always verify with our Firebase backend.

      const verification =
        await verifyPaystackPayment(
          payment.reference
        );

      if (!verification.success) {
        Alert.alert(
          "Payment not completed",
          "We could not confirm your payment. Your cart has not been cleared."
        );

        return;
      }

      // =========================================================
      // PAYMENT CONFIRMED
      // =========================================================

      await notifyMerchant(
        cart.merchantId,
        checkout.orderId,
        checkout.orderNumber
      );

      clearCart();

      Alert.alert(
        "Payment successful 🎉",
        `${formatMoney(
          verification.paidAmount
        )} was paid successfully. Order ${checkout.orderNumber
        } has been sent to ${cart.merchantName ??
        "the merchant"
        }.`,
        [
          {
            text:
              "View Orders",

            onPress: () =>
              router.replace(
                "/(customer)/orders"
              ),
          },
        ]
      );
    } catch (error: any) {
      console.error(
        "Checkout error:",
        error
      );

      Alert.alert(
        "Checkout failed",
        error?.message ??
        "Something went wrong while processing your order."
      );
    } finally {
      setProcessing(false);
    }
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const quantity = Number(item.qty || 0);
    const lineTotal = Number(item.price || 0) * quantity;

    return (
      <View className="bg-white rounded-3xl p-4 mb-4 border border-gray-100 shadow-sm">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center mr-3">
            <Ionicons
              name="fast-food-outline"
              size={22}
              color="#EA580C"
            />
          </View>

          <View className="flex-1">
            <Text className="text-gray-950 font-bold text-base">
              {item.name}
            </Text>

            <Text className="text-gray-500 text-sm mt-1">
              {formatMoney(item.price)} each
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => removeItem(item.id)}
            disabled={processing}
            className="w-10 h-10 rounded-2xl bg-red-50 items-center justify-center"
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#DC2626"
            />
          </TouchableOpacity>
        </View>

        <View className="h-[1px] bg-gray-100 my-4" />

        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (quantity <= 1) {
                  removeItem(item.id);
                  return;
                }

                changeQty(item.id, quantity - 1);
              }}
              disabled={processing}
              className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center"
            >
              <Ionicons
                name="remove"
                size={20}
                color="#111827"
              />
            </TouchableOpacity>

            <Text className="text-gray-950 font-bold text-base mx-4">
              {quantity}
            </Text>

            <TouchableOpacity
              onPress={() => changeQty(item.id, quantity + 1)}
              disabled={processing}
              className="w-10 h-10 rounded-2xl bg-gray-100 items-center justify-center"
            >
              <Ionicons
                name="add"
                size={20}
                color="#111827"
              />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-950 font-extrabold text-lg">
            {formatMoney(lineTotal)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F9FAFB]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-gray-100">
        <View>
          <Text className="text-gray-500 text-sm">
            {totalQty} {totalQty === 1 ? "item" : "items"}
          </Text>

          <Text className="text-2xl font-extrabold text-gray-950">
            Your Cart
          </Text>
        </View>

        {items.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                "Clear cart?",
                "All items will be removed from your cart.",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: clearCart,
                  },
                ]
              );
            }}
            disabled={processing}
          >
            <Text className="text-red-500 font-bold">
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-24 h-24 rounded-full bg-orange-100 items-center justify-center">
            <Ionicons
              name="cart-outline"
              size={48}
              color="#EA580C"
            />
          </View>

          <Text className="text-gray-950 font-bold text-xl mt-5">
            Your cart is empty
          </Text>

          <Text className="text-gray-500 text-center mt-2 leading-5">
            Browse nearby stores and add something you would like to order.
          </Text>

          <TouchableOpacity
            onPress={() => router.replace("/(customer)")}
            className="bg-blue-600 px-6 py-4 rounded-2xl mt-6"
          >
            <Text className="text-white font-bold">
              Browse Stores
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 390,
          }}
          ListFooterComponent={
            <View>
              {/* Payment method */}
              <View className="bg-white rounded-3xl p-5 mb-4 border border-gray-100 shadow-sm">
                <Text className="text-gray-950 font-bold text-lg mb-4">
                  Payment Method
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setSelectedPaymentMethod("pay_in_store")
                  }
                  disabled={processing}
                  className={`flex-row items-center p-4 rounded-2xl border mb-3 ${selectedPaymentMethod === "pay_in_store"
                    ? "bg-blue-50 border-blue-600"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <View
                    className={`w-11 h-11 rounded-2xl items-center justify-center ${selectedPaymentMethod === "pay_in_store"
                      ? "bg-blue-600"
                      : "bg-gray-100"
                      }`}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={22}
                      color={
                        selectedPaymentMethod === "pay_in_store"
                          ? "#FFFFFF"
                          : "#6B7280"
                      }
                    />
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="text-gray-950 font-bold">
                      Pay in Store
                    </Text>

                    <Text className="text-gray-500 text-xs mt-1">
                      Pay when collecting your order
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selectedPaymentMethod === "pay_in_store"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={
                      selectedPaymentMethod === "pay_in_store"
                        ? "#2563EB"
                        : "#9CA3AF"
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedPaymentMethod("card")}
                  disabled={processing}
                  className={`flex-row items-center p-4 rounded-2xl border ${selectedPaymentMethod === "card"
                    ? "bg-blue-50 border-blue-600"
                    : "bg-white border-gray-200"
                    }`}
                >
                  <View
                    className={`w-11 h-11 rounded-2xl items-center justify-center ${selectedPaymentMethod === "card"
                      ? "bg-blue-600"
                      : "bg-gray-100"
                      }`}
                  >
                    <Ionicons
                      name="card-outline"
                      size={22}
                      color={
                        selectedPaymentMethod === "card"
                          ? "#FFFFFF"
                          : "#6B7280"
                      }
                    />
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="text-gray-950 font-bold">
                      Pay Online
                    </Text>

                    <Text className="text-gray-500 text-xs mt-1">
                      Secure card payment with Paystack
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      selectedPaymentMethod === "card"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={22}
                    color={
                      selectedPaymentMethod === "card"
                        ? "#2563EB"
                        : "#9CA3AF"
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* Order summary */}
              <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <Text className="text-gray-950 font-bold text-lg mb-4">
                  Order Summary
                </Text>

                <View className="flex-row justify-between mb-3">
                  <Text className="text-gray-500">
                    Subtotal excluding VAT
                  </Text>

                  <Text className="text-gray-900 font-semibold">
                    {formatMoney(subtotalBeforeVat)}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-3">
                  <Text className="text-gray-500">
                    VAT included
                  </Text>

                  <Text className="text-gray-900 font-semibold">
                    {formatMoney(vatAmount)}
                  </Text>
                </View>

                <View className="h-[1px] bg-gray-100 my-2" />

                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-950 font-bold text-lg">
                    Total
                  </Text>

                  <Text className="text-gray-950 font-extrabold text-xl">
                    {formatMoney(grandTotal)}
                  </Text>
                </View>
              </View>
            </View>
          }
        />
      )}

      {/* Checkout footer */}
      {items.length > 0 && (
        <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-100 px-5 pt-4 pb-5 shadow-lg">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-gray-500 text-xs">
                Amount payable
              </Text>

              <Text className="text-gray-950 font-extrabold text-2xl mt-1">
                {formatMoney(grandTotal)}
              </Text>
            </View>

            <View className="items-end">
              <Text className="text-gray-500 text-xs">
                Payment
              </Text>

              <Text className="text-gray-900 font-semibold mt-1">
                {selectedPaymentMethod === "pay_in_store"
                  ? "Pay in Store"
                  : "Paystack"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCheckout}
            disabled={processing}
            activeOpacity={0.85}
            className={`py-4 rounded-2xl flex-row items-center justify-center ${processing ? "bg-blue-400" : "bg-blue-600"
              }`}
          >
            {processing ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />

                <Text className="text-white text-center font-bold text-lg ml-3">
                  Processing...
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={
                    selectedPaymentMethod === "pay_in_store"
                      ? "storefront-outline"
                      : "card-outline"
                  }
                  size={21}
                  color="#FFFFFF"
                />

                <Text className="text-white text-center font-bold text-lg ml-2">
                  {selectedPaymentMethod === "pay_in_store"
                    ? "Place Order"
                    : `Pay ${formatMoney(grandTotal)}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {selectedPaymentMethod === "card" && (
            <View className="flex-row items-center justify-center mt-3">
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color="#9CA3AF"
              />

              <Text className="text-gray-400 text-xs ml-1">
                Secure payment processed by Paystack
              </Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}