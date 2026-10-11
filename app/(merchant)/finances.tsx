
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
import {
  getMerchantSettlements,
  type MerchantSettlementResponse,
} from "@/services/merchant-settlement.service";

type Order = {
  id: string;
  amount: number;
  createdAt: Date;
  items: {
    name: string;
    price: number;
    qty?: number;
    quantity?: number;
  }[];
  platformFee: number;
  merchantAmount: number;
};

const money = (value: number) =>
  `R ${value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="bg-white border border-gray-100 rounded-3xl p-4 mb-3">
      <View className="w-10 h-10 rounded-2xl bg-blue-50 items-center justify-center mb-3">
        <Ionicons name={icon} size={21} color="#2563EB" />
      </View>
      <Text className="text-gray-500 text-xs">{title}</Text>
      <Text className="text-gray-950 font-extrabold text-xl mt-2">
        {value}
      </Text>
    </View>
  );
}

export default function FinancesScreen() {
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlements, setSettlements] =
    useState<MerchantSettlementResponse | null>(null);
  const [settlementLoading, setSettlementLoading] =
    useState(false);
  const [settlementError, setSettlementError] =
    useState(false);

  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const past = new Date();
    past.setMonth(past.getMonth() - 3);

    const q = query(
      collection(db, "orders"),
      where("merchantId", "==", user.uid),
      where("createdAt", ">=", Timestamp.fromDate(past)),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs
          .map((docSnap) => {
            const d = docSnap.data();

            return {
              id: docSnap.id,
              amount: Number(d.total) || 0,
              createdAt:
                d.createdAt?.toDate?.() || new Date(0),
              items: Array.isArray(d.items) ? d.items : [],
              platformFee: Number(
                d.paymentSplit?.platformFee
              ) || 0,
              merchantAmount: Number(
                d.paymentSplit?.merchantAmount
              ) || 0,
              paymentStatus: d.paymentStatus,
            };
          })
          .filter(
            (o: any) =>
              o.paymentStatus === "paid"
          );

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.error("Finance orders error:", error);
        setLoading(false);
      }
    );
  }, [user?.uid]);

  const loadSettlements = async () => {
    if (!user?.uid) return;

    setSettlementLoading(true);
    setSettlementError(false);

    try {
      const result = await getMerchantSettlements();
      setSettlements(result);
    } catch (error) {
      console.error("Settlement loading error:", error);
      setSettlementError(true);
    } finally {
      setSettlementLoading(false);
    }
  };

  useEffect(() => {
    setSettlements(null);
    if (user?.uid) {
      loadSettlements();
    }
  }, [user?.uid]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    const todayOrders = orders.filter(
      (o) =>
        o.createdAt.toDateString() === now.toDateString()
    );

    const weekOrders = orders.filter(
      (o) => o.createdAt >= weekStart
    );

    const monthOrders = orders.filter(
      (o) =>
        o.createdAt.getMonth() === now.getMonth() &&
        o.createdAt.getFullYear() === now.getFullYear()
    );

    const sum = (
      list: Order[],
      field: "amount" | "platformFee" | "merchantAmount"
    ) => list.reduce((total, o) => total + o[field], 0);

    const itemTotals: Record<string, number> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const quantity = Number(
          item.qty ?? item.quantity ?? 1
        );

        const amount =
          (Number(item.price) || 0) * quantity;

        itemTotals[item.name] =
          (itemTotals[item.name] || 0) + amount;
      }
    }

    return {
      today: sum(todayOrders, "amount"),
      week: sum(weekOrders, "amount"),
      month: sum(monthOrders, "amount"),
      commission: sum(monthOrders, "platformFee"),
      merchantShare: sum(monthOrders, "merchantAmount"),
      count: monthOrders.length,
      itemTotals,
    };
  }, [orders]);

  const selling = Number(sellPrice.replace(",", ".")) || 0;
  const cost = Number(costPrice.replace(",", ".")) || 0;
  const profit = selling - cost;
  const margin = selling > 0
    ? (profit / selling) * 100
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 110,
          }}
          refreshControl={
            <RefreshControl
              refreshing={settlementLoading}
              onRefresh={loadSettlements}
            />
          }
        >
          <Text className="text-gray-500 text-sm">
            Your business
          </Text>
          <Text className="text-gray-950 text-3xl font-extrabold mt-1">
            Finances
          </Text>
          <Text className="text-gray-500 mt-2 mb-6">
            Track your sales, earnings and bank settlements.
          </Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#2563EB"
            />
          ) : (
            <>
              {/* Revenue hero */}
              <View className="bg-[#0F172A] rounded-[30px] p-6 mb-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-slate-300">
                    Revenue this month
                  </Text>
                  <Ionicons
                    name="stats-chart-outline"
                    size={23}
                    color="#93C5FD"
                  />
                </View>

                <Text className="text-white text-4xl font-extrabold mt-3">
                  {money(stats.month)}
                </Text>

                <Text className="text-slate-400 text-sm mt-3">
                  {stats.count} paid orders this month
                </Text>
              </View>

              {/* Revenue cards */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <StatCard
                    title="Today"
                    value={money(stats.today)}
                    icon="today-outline"
                  />
                </View>
                <View className="flex-1">
                  <StatCard
                    title="Last 7 days"
                    value={money(stats.week)}
                    icon="calendar-outline"
                  />
                </View>
              </View>

              <Text className="text-xl font-extrabold text-gray-950 mt-5 mb-3">
                Earnings breakdown
              </Text>

              <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-5">
                <View className="flex-row justify-between mb-4">
                  <Text className="text-gray-500">
                    Gross sales
                  </Text>
                  <Text className="font-bold text-gray-950">
                    {money(stats.month)}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-4">
                  <Text className="text-gray-500">
                    Cutin commission
                  </Text>
                  <Text className="font-bold text-gray-950">
                    - {money(stats.commission)}
                  </Text>
                </View>

                <View className="h-px bg-gray-100 mb-4" />

                <View className="flex-row justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-gray-950">
                      Merchant share
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      Before Paystack fees
                    </Text>
                  </View>

                  <Text className="text-blue-600 font-extrabold text-xl">
                    {money(stats.merchantShare)}
                  </Text>
                </View>
              </View>

              {/* Settlement tracking */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-extrabold text-gray-950">
                  Bank settlements
                </Text>

                <TouchableOpacity
                  onPress={loadSettlements}
                  disabled={settlementLoading}
                  accessibilityLabel="Refresh settlements"
                >
                  <Ionicons
                    name="refresh-outline"
                    size={23}
                    color="#2563EB"
                  />
                </TouchableOpacity>
              </View>

              <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-5">
                {settlementLoading && !settlements ? (
                  <ActivityIndicator color="#2563EB" />
                ) : settlementError ? (
                  <Text className="text-gray-500">
                    Could not retrieve Paystack settlements.
                    Pull down to try again.
                  </Text>
                ) : !settlements?.connected ? (
                  <Text className="text-gray-500">
                    Connect your merchant payout account
                    in Settings to view bank settlements.
                  </Text>
                ) : (
                  <>
                    <View className="flex-row items-center mb-4">
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={22}
                        color="#059669"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="font-bold text-gray-950">
                          Paystack connected
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          Settlement records from Paystack
                        </Text>
                      </View>
                    </View>

                    <View className="bg-gray-50 rounded-2xl p-4 mb-4">
                      <Text className="text-gray-500 text-xs">
                        Successful settlements (latest 50 records)
                      </Text>
                      <Text className="text-gray-950 text-2xl font-extrabold mt-2">
                        {money(settlements.summary.paidOut)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-3">
                      <Text className="text-gray-500">
                        Pending
                      </Text>
                      <Text className="font-bold text-gray-950">
                        {money(settlements.summary.pending)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-500">
                        Processing
                      </Text>
                      <Text className="font-bold text-gray-950">
                        {money(settlements.summary.processing)}
                      </Text>
                    </View>

                    {settlements.hasMore && (
                      <Text className="text-amber-700 text-xs mt-4">
                        Additional older settlement records are
                        not included in these totals.
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Settlement history */}
              <Text className="text-xl font-extrabold text-gray-950 mb-3">
                Settlement history
              </Text>

              <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
                {!settlements?.settlements.length ? (
                  <Text className="text-gray-500">
                    No settlement records available yet.
                  </Text>
                ) : (
                  settlements.settlements.map((item) => (
                    <View
                      key={item.id}
                      className="flex-row items-center justify-between py-3 border-b border-gray-100"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="font-bold text-gray-950 capitalize">
                          {item.status}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                          {item.date
                            ? new Date(item.date).toLocaleDateString(
                              "en-ZA"
                            )
                            : "Date unavailable"}
                        </Text>
                      </View>
                      <Text className="font-extrabold text-gray-950">
                        {money(item.amount)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* Product earnings */}
              <Text className="text-xl font-extrabold text-gray-950 mb-3">
                Sales by product
              </Text>

              <View className="bg-white rounded-3xl p-5 border border-gray-100 mb-6">
                {Object.entries(stats.itemTotals).length === 0 ? (
                  <Text className="text-gray-500">
                    No paid sales in the last three months.
                  </Text>
                ) : (
                  Object.entries(stats.itemTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, amount]) => (
                      <View
                        key={name}
                        className="flex-row justify-between py-3 border-b border-gray-100"
                      >
                        <Text className="text-gray-700 flex-1 pr-3">
                          {name}
                        </Text>
                        <Text className="font-bold text-gray-950">
                          {money(amount)}
                        </Text>
                      </View>
                    ))
                )}
              </View>

              {/* Profit calculator */}
              <Text className="text-xl font-extrabold text-gray-950 mb-3">
                Profit calculator
              </Text>

              <View className="bg-white rounded-3xl p-5 border border-gray-100">
                <Text className="text-gray-500 mb-2">
                  Selling price
                </Text>
                <TextInput
                  value={sellPrice}
                  onChangeText={setSellPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 75.00"
                  className="bg-gray-50 rounded-2xl px-4 py-4 mb-4 text-gray-950"
                />

                <Text className="text-gray-500 mb-2">
                  Cost price
                </Text>
                <TextInput
                  value={costPrice}
                  onChangeText={setCostPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 40.00"
                  className="bg-gray-50 rounded-2xl px-4 py-4 mb-5 text-gray-950"
                />

                <View className="bg-blue-50 rounded-2xl p-4">
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-700">
                      Gross profit per item
                    </Text>
                    <Text className="font-extrabold text-gray-950">
                      {money(profit)}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-gray-700">
                      Gross margin
                    </Text>
                    <Text className="font-extrabold text-blue-700">
                      {margin.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-400 text-xs mt-3">
                  Calculator excludes Cutin commissions,
                  Paystack fees, taxes and other costs.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
