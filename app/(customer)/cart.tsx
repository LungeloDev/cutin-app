// app/(customer)/cart.tsx
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "@/context/cart-context";
import { router } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/services/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";

export default function CartScreen() {
  const { cart, total, totalQty, removeItem, clearCart, changeQty } = useCart();
  const { user } = useAuth();
  const items = cart.items ?? [];

  const VAT_RATE = 0.15; // 15% VAT
  const vatAmount = total * VAT_RATE;
  const grandTotal = total;

  // ✅ Random 3-digit human friendly order number
  const generateOrderNumber = () => {
    const random = Math.floor(Math.random() * 900) + 100; // 100–999
    return `ORD-${random}`;
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert("Not logged in", "Please log in to place an order.");
      return;
    }

    try {
      const orderNumber = generateOrderNumber();

      const orderData = {
        orderNumber,
        customerId: user.uid,
        customerEmail: user.email,
        customerName: user.displayName || "Guest",
        merchantId: cart.merchantId,
        merchantName: cart.merchantName,
        items,
        subtotal: total,
        vat: vatAmount,
        total: grandTotal,
        status: "Pending",
        createdAt: serverTimestamp(),
      };

      // 1️⃣ Save order in Firestore
      const docRef = await addDoc(collection(db, "orders"), orderData);

      // 2️⃣ Get merchant push token
      if (!cart.merchantId) {
        throw new Error("Merchant ID is missing");
      }
      const merchantRef = doc(db, "users", cart.merchantId);
      const merchantSnap = await getDoc(merchantRef);
      const merchantToken = merchantSnap.data()?.expoPushToken;

      // 3️⃣ Send push notification to merchant
      if (merchantToken) {
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
            data: { orderId: docRef.id, orderNumber },
          }),
        });
      }

      // 4️⃣ Clear cart + navigate
      clearCart();
      router.replace("/(customer)/orders");

      Alert.alert(
        "✅ Order placed!",
        `Your order (${orderNumber}) has been created. Please pay in store at ${cart.merchantName}.`
      );

    } catch (error: any) {
      console.error("Checkout error:", error);
      Alert.alert("❌ Failed", error.message);
    }
  };


  // ✅ Render each cart item
  const renderItem = ({ item }: any) => (
    <View className="flex-row items-center justify-between bg-white rounded-xl p-4 mb-3 shadow-sm">
      {/* Item Info */}
      <View className="flex-1">
        <Text className="text-gray-900 font-semibold">{item.name}</Text>
        <Text className="text-gray-600 text-sm">R {item.price.toFixed(2)}</Text>
      </View>

      {/* Qty controls */}
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => changeQty(item.id, item.qty - 1)}
          className="bg-gray-200 px-2 py-1 rounded-lg"
        >
          <Ionicons name="remove" size={18} color="#111827" />
        </TouchableOpacity>

        <Text className="text-gray-700 font-medium mx-3">{item.qty}</Text>

        <TouchableOpacity
          onPress={() => changeQty(item.id, item.qty + 1)}
          className="bg-gray-200 px-2 py-1 rounded-lg"
        >
          <Ionicons name="add" size={18} color="#111827" />
        </TouchableOpacity>

      </View>

      {/* Remove button */}
      <TouchableOpacity
        onPress={() => removeItem(item.id)}
        className="bg-red-100 px-3 py-2 rounded-lg ml-3"
      >
        <Ionicons name="trash-outline" size={18} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <Text className="text-xl font-bold text-gray-900">Your Cart</Text>
        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart}>
            <Text className="text-red-500 font-medium">Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cart Items */}
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Ionicons name="cart-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-500 mt-3">Your cart is empty</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        />
      )}

      {/* Cart Summary + Checkout */}
      {items.length > 0 && (
        <View className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
          <View className="flex-row justify-between mb-4">
            <Text className="text-lg font-bold text-gray-900">Total</Text>
            <Text className="text-lg font-bold text-gray-900">
              R {grandTotal.toFixed(2)}
            </Text>
          </View>

          {/* Checkout button */}
          <TouchableOpacity
            onPress={handleCheckout}
            className="bg-blue-600 py-4 rounded-xl"
          >
            <Text className="text-white text-center font-semibold text-lg">
              Pay in Store
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
