import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

type Order = {
  id: string;
  amount: number;
  createdAt: Date;
  items: { name: string; price: number; qty: number }[];
};

export default function FinancesScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Profit calculator local states
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  useEffect(() => {
    if (!user) return;

    const past = new Date();
    past.setMonth(past.getMonth() - 3);

    const q = query(
      collection(db, "orders"),
      where("merchantId", "==", user.uid),
      where("createdAt", ">=", Timestamp.fromDate(past)),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          id: doc.id,
          amount: d.total || 0,
          createdAt: d.createdAt?.toDate?.() || new Date(),
          items: d.items || [],
        };
      });

      setOrders(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // ---- Calculations ----
  const today = new Date().toDateString();
  const todayRevenue = orders
    .filter((o) => o.createdAt.toDateString() === today)
    .reduce((sum, o) => sum + o.amount, 0);

  const weekRevenue = orders
    .filter((o) => {
      const diff =
        (new Date().getTime() - o.createdAt.getTime()) /
        (1000 * 3600 * 24);
      return diff <= 7;
    })
    .reduce((sum, o) => sum + o.amount, 0);

  const monthRevenue = orders
    .filter((o) => {
      const now = new Date();
      return (
        o.createdAt.getMonth() === now.getMonth() &&
        o.createdAt.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, o) => sum + o.amount, 0);

  const itemTotals: Record<string, number> = {};
  orders.forEach((o) =>
    o.items.forEach((it) => {
      const earned = it.price * it.qty;
      itemTotals[it.name] = (itemTotals[it.name] || 0) + earned;
    })
  );

  // ---- Profit Calculator Logic ----
  const sp = parseFloat(sellPrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const profit = sp - cp;
  const margin = sp > 0 ? (profit / sp) * 100 : 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 py-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">Finances</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={20}  // prevents overlap with header
            >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Revenue Cards */}
          <View className="bg-white rounded-xl p-5 shadow mb-4">
            <Text className="text-gray-500">Today’s Revenue</Text>
            <Text className="text-3xl font-bold text-gray-900">
              R {todayRevenue.toFixed(2)}
            </Text>
          </View>

          <View className="bg-white rounded-xl p-5 shadow mb-4">
            <Text className="text-gray-500">Last 7 Days</Text>
            <Text className="text-3xl font-bold text-gray-900">
              R {weekRevenue.toFixed(2)}
            </Text>
          </View>

          <View className="bg-white rounded-xl p-5 shadow mb-4">
            <Text className="text-gray-500">This Month</Text>
            <Text className="text-3xl font-bold text-gray-900">
              R {monthRevenue.toFixed(2)}
            </Text>
          </View>

          {/* Items Breakdown */}
          <Text className="text-lg font-bold mt-4 mb-2">Earnings by Item</Text>
          <View className="bg-white rounded-xl p-5 shadow mb-4">
            {Object.keys(itemTotals).length === 0 ? (
              <Text className="text-gray-600">No sales yet</Text>
            ) : (
              Object.entries(itemTotals).map(([name, amount]) => (
                <View
                  key={name}
                  className="flex-row justify-between mb-2"
                >
                  <Text className="text-gray-700">{name}</Text>
                  <Text className="font-semibold text-gray-900">
                    R {amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* PROFIT CALCULATOR */}
          <Text className="text-lg font-bold mt-4 mb-2">
            Profit Calculator
          </Text>

          <View className="bg-white rounded-xl p-5 shadow mb-6">
            {/* Selling Price */}
            <Text className="text-gray-700 mb-1">Selling Price</Text>
            <TextInput
              placeholder="Enter selling price"
              keyboardType="numeric"
              value={sellPrice}
              onChangeText={setSellPrice}
              className="border border-gray-300 rounded-xl px-3 py-2 mb-4 text-gray-900"
            />

            {/* Cost Price */}
            <Text className="text-gray-700 mb-1">Cost Price</Text>
            <TextInput
              placeholder="Enter cost price"
              keyboardType="numeric"
              value={costPrice}
              onChangeText={setCostPrice}
              className="border border-gray-300 rounded-xl px-3 py-2 mb-4 text-gray-900"
            />

            {/* Results */}
            <View className="bg-gray-100 p-4 rounded-xl">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700">Profit per item:</Text>
                <Text className="font-semibold text-gray-900">
                  R {profit.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between">
                <Text className="text-gray-700">Profit margin:</Text>
                <Text className="font-semibold text-gray-900">
                  {margin.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
