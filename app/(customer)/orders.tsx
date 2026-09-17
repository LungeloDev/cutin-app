// app/(customer)/orders.tsx
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Order = {
  id: string;
  orderNumber?: string;
  merchantName: string;
  total: number;
  status: string;
  createdAt: Date;
};

const formatMoney = (amount: number) => `R ${amount.toFixed(2)}`;

const getStatusStyle = (status: string) => {
  const value = status.toLowerCase();

  if (value === "completed") {
    return {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: "checkmark-circle" as const,
      iconColor: "#047857",
    };
  }

  if (value === "pending") {
    return {
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: "time" as const,
      iconColor: "#B45309",
    };
  }

  if (value === "cancelled" || value === "rejected") {
    return {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: "close-circle" as const,
      iconColor: "#B91C1C",
    };
  }

  return {
    bg: "bg-blue-100",
    text: "text-blue-700",
    icon: "bicycle" as const,
    iconColor: "#1D4ED8",
  };
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

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const list: Order[] = snap.docs.map((doc) => {
          const data = doc.data() as any;

          return {
            id: doc.id,
            orderNumber: data.orderNumber,
            merchantName: data.merchantName,
            total: Number(data.total ?? 0),
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
        setError("Failed to sync orders. Try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const stats = useMemo(() => {
    const completed = orders.filter(
      (order) => order.status?.toLowerCase() === "completed"
    );

    const now = new Date();
    const thisMonth = completed.filter(
      (order) =>
        order.createdAt.getMonth() === now.getMonth() &&
        order.createdAt.getFullYear() === now.getFullYear()
    );

    const totalSpent = completed.reduce((sum, order) => sum + order.total, 0);
    const monthSpent = thisMonth.reduce((sum, order) => sum + order.total, 0);
    const averageSpent = completed.length ? totalSpent / completed.length : 0;

    return {
      totalSpent,
      monthSpent,
      averageSpent,
      completedCount: completed.length,
    };
  }, [orders]);

  const renderOrder = ({ item }: { item: Order }) => {
    const status = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        className="bg-white rounded-3xl p-4 mb-4 border border-gray-100 shadow-sm"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-row items-center flex-1">
            <View className="w-12 h-12 rounded-2xl bg-blue-100 items-center justify-center mr-3">
              <Ionicons name="receipt-outline" size={22} color="#2563EB" />
            </View>

            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-base">
                {item.merchantName}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                Order #{item.orderNumber ?? item.id.slice(0, 8)}
              </Text>
            </View>
          </View>

          <View className={`${status.bg} px-3 py-1 rounded-full flex-row items-center`}>
            <Ionicons name={status.icon} size={12} color={status.iconColor} />
            <Text className={`${status.text} text-xs font-bold ml-1`}>
              {item.status}
            </Text>
          </View>
        </View>

        <View className="h-[1px] bg-gray-100 my-4" />

        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-gray-400 text-xs">Placed on</Text>
            <Text className="text-gray-700 text-sm font-medium mt-1">
              {item.createdAt.toLocaleDateString()}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-gray-400 text-xs">Total</Text>
            <Text className="text-gray-900 font-extrabold text-lg mt-1">
              {formatMoney(item.total)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] justify-center items-center px-6">
        <View className="bg-white p-6 rounded-3xl items-center shadow-sm">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-gray-900 font-bold mt-4">
            Loading your orders
          </Text>
          <Text className="text-gray-500 text-center mt-1">
            We’re syncing your latest activity.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] justify-center items-center px-6">
        <View className="bg-white p-6 rounded-3xl items-center shadow-sm">
          <Ionicons name="alert-circle" size={42} color="#2563EB" />
          <Text className="text-gray-900 font-bold mt-4">
            Something went wrong
          </Text>
          <Text className="text-red-500 text-center mt-2">{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-8"
        ListHeaderComponent={
          <View className="pt-3">
            <View className="flex-row justify-between items-center mb-5">
              <View>
                <Text className="text-gray-500 text-sm">Track your food</Text>
                <Text className="text-3xl font-extrabold text-gray-950">
                  My Orders
                </Text>
              </View>

              <View className="w-11 h-11 rounded-2xl bg-white items-center justify-center shadow-sm">
                <Ionicons name="receipt" size={22} color="#2563EB" />
              </View>
            </View>

            <View className="bg-blue-950 rounded-[28px] p-5 mb-5">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-white text-lg font-bold">
                    Spending Overview
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">
                    Based on completed orders
                  </Text>
                </View>

                <View className="w-10 h-10 rounded-2xl bg-blue-500 items-center justify-center">
                  <Ionicons name="wallet-outline" size={20} color="white" />
                </View>
              </View>

              <View className="flex-row">
                <View className="flex-1 bg-white/10 rounded-2xl p-3 mr-2">
                  <Text className="text-gray-400 text-xs">This month</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {formatMoney(stats.monthSpent)}
                  </Text>
                </View>

                <View className="flex-1 bg-white/10 rounded-2xl p-3 ml-2">
                  <Text className="text-gray-400 text-xs">Average</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {formatMoney(stats.averageSpent)}
                  </Text>
                </View>
              </View>

              <View className="flex-row mt-3">
                <View className="flex-1 bg-white/10 rounded-2xl p-3 mr-2">
                  <Text className="text-gray-400 text-xs">Total spent</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {formatMoney(stats.totalSpent)}
                  </Text>
                </View>

                <View className="flex-1 bg-white/10 rounded-2xl p-3 ml-2">
                  <Text className="text-gray-400 text-xs">Completed</Text>
                  <Text className="text-white font-extrabold text-lg mt-1">
                    {stats.completedCount}
                  </Text>
                </View>
              </View>
            </View>

            <Text className="text-gray-950 font-bold text-xl mb-3">
              Recent Orders
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-20 px-6">
            <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center">
              <Ionicons name="receipt-outline" size={42} color="#EA580C" />
            </View>

            <Text className="text-gray-950 font-bold text-xl mt-5">
              No orders yet
            </Text>

            <Text className="text-gray-500 text-center mt-2 leading-5">
              Once you place an order, it will appear here with its status,
              total amount and store details.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}