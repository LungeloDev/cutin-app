// app/(customer)/orders.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/services/firebase";
import { SafeAreaView } from "react-native-safe-area-context";

type Order = {
  id: string;
  orderNumber?: string;
  merchantName: string;
  total: number;
  status: string;
  createdAt: Date;
};

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    // ✅ Realtime listener
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Order[] = snap.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            orderNumber: data.orderNumber,
            merchantName: data.merchantName,
            total: data.total,
            status: data.status,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
          };
        });
        setOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error("Realtime orders error:", err);
        setError("⚠️ Failed to sync orders. Try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);


  const renderOrder = ({ item }: { item: Order }) => (
    <View className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm">
      <View className="flex-row justify-between items-center mb-2">
        {/* ✅ Show orderNumber if available */}
        <Text className="font-semibold text-gray-900">
          #{item.orderNumber ?? item.id}
        </Text>
        <View
          className={`px-3 py-1 rounded-full ${
            item.status === "Completed"
              ? "bg-green-100"
              : item.status === "Pending"
              ? "bg-yellow-100"
              : "bg-blue-100"
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              item.status === "Completed"
                ? "text-green-700"
                : item.status === "Pending"
                ? "text-yellow-700"
                : "text-blue-700"
            }`}
          >
            {item.status}
          </Text>
        </View>
      </View>
      <Text className="text-gray-700 mb-1">{item.merchantName}</Text>
      <Text className="text-gray-900 font-bold">R {item.total.toFixed(2)}</Text>
      <Text className="text-gray-500 text-xs mt-1">
        {item.createdAt.toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" />
        <Text className="text-gray-500 mt-3">Loading your orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-6 bg-white">
        <Ionicons name="alert-circle" size={40} color="red" />
        <Text className="text-red-600 mt-3 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-5 pt-5">
      <Text className="text-2xl font-bold text-gray-900 mb-5">Your Orders</Text>

      {orders.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
          <Text className="text-gray-500 mt-3">
            You haven’t placed any orders yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
