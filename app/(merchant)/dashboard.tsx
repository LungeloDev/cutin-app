// app/(merchant)/dashboard.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";

const FILTERS = ["Weekly", "Monthly", "3 Months", "6 Months"];
type FilterType = typeof FILTERS[number];

type Order = {
  orderNumber?: string;
  id: string;
  customerName: string;
  amount: number;
  status: string;
  createdAt: Date;
  items: { name: string; price: number; qty: number }[];
};

export default function MerchantDashboardScreen() {
  const { logoutUser, user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("Weekly");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    customers: 0,
  });

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 🔹 Date range based on filter
  function getDateRange(filter: FilterType) {
    const now = new Date();
    let past = new Date();
    if (filter === "Weekly") past.setDate(now.getDate() - 7);
    if (filter === "Monthly") past.setMonth(now.getMonth() - 1);
    if (filter === "3 Months") past.setMonth(now.getMonth() - 3);
    if (filter === "6 Months") past.setMonth(now.getMonth() - 6);
    return past;
  }

  // 🔹 Fetch orders from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const pastDate = getDateRange(filter);

        const q = query(
          collection(db, "orders"),
          where("merchantId", "==", user.uid),
          where("createdAt", ">=", Timestamp.fromDate(pastDate)),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        const list: Order[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            customerName: data.customerEmail || "Unknown",
            amount: data.total || 0,
            status: data.status || "Pending",
            createdAt: data.createdAt?.toDate?.() || new Date(),
            items: data.items || [],
            orderNumber: data.orderNumber
          };
        });

        setOrders(list);

        // Calculate stats
        const totalRevenue = list.reduce((sum, o) => sum + o.amount, 0);
        const uniqueCustomers = new Set(list.map((o) => o.customerName)).size;

        setStats({
          orders: list.length,
          revenue: totalRevenue,
          customers: uniqueCustomers,
        });
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, filter]);

  // ✅ Update order status
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) {
      console.error("Error updating order:", err);
    }
  };

  // ✅ Stat Card
  function StatCard({
    icon,
    label,
    value,
  }: {
    icon: any;
    label: string;
    value: string | number;
  }) {
    return (
      <View className="bg-white rounded-xl p-5 shadow-md mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Ionicons name={icon} size={24} color="#1E3A8A" />
          <Text className="ml-2 text-gray-700 font-medium">{label}</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900">{value}</Text>
      </View>
    );
  }

  // ✅ Order row
  const renderOrder = ({ item }: { item: Order }) => (
    <View className="flex-row justify-between items-center bg-white rounded-xl px-4 py-3 mb-3 shadow-sm">
      <View className="flex-1">
        <Text className="font-semibold text-gray-900">{item.orderNumber}</Text>
        <Text className="text-gray-600 text-sm">{item.customerName}</Text>
      </View>
      <Text className="text-gray-800 font-medium mr-3">
        R {item.amount.toFixed(2)}
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

      <TouchableOpacity
        onPress={() => {
          setSelectedOrder(item);
          setModalVisible(true);
        }}
        className="ml-3 px-3 py-1 bg-blue-600 rounded-lg"
      >
        <Text className="text-white text-sm">View</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Dashboard</Text>
        <TouchableOpacity
          onPress={logoutUser}
          className="px-3 py-1 bg-red-500 rounded-lg"
        >
          <Text className="text-white font-medium">Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Filters */}
          <View className="flex-row justify-between mb-6">
            {FILTERS.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                className={`px-4 py-2 rounded-xl ${
                  filter === item ? "bg-blue-600" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`font-medium ${
                    filter === item ? "text-white" : "text-gray-700"
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Stats */}
          <StatCard icon="cart-outline" label="Orders" value={stats.orders} />
          <StatCard
            icon="cash-outline"
            label="Revenue"
            value={`R ${stats.revenue.toLocaleString()}`}
          />
          <StatCard
            icon="people-outline"
            label="Customers"
            value={stats.customers}
          />

          {/* Orders */}
          <Text className="text-lg font-bold text-gray-900 mb-4 mt-6">
            Recent Orders
          </Text>
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </ScrollView>
      )}

      {/* Order Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6 shadow-lg">
            {selectedOrder && (
              <>
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  {selectedOrder.orderNumber}
                </Text>
                <Text className="text-gray-700 mb-2">
                  Customer: {selectedOrder.customerName}
                </Text>
                <Text className="text-gray-700 mb-2">
                  Total: R {selectedOrder.amount.toFixed(2)}
                </Text>
                <Text className="text-gray-700 mb-4">
                  Status: {selectedOrder.status}
                </Text>

                <Text className="font-semibold text-gray-900 mb-2">Items:</Text>
                {selectedOrder.items.map((it, idx) => (
                  <Text key={idx} className="text-gray-600 text-sm mb-1">
                    - {it.name} x{it.qty} • R {(it.price * it.qty).toFixed(2)}
                  </Text>
                ))}

                {/* Status actions */}
                <View className="flex-row justify-end mt-5">
                  {selectedOrder.status !== "Completed" && (
                    <TouchableOpacity
                      onPress={() =>
                        updateOrderStatus(
                          selectedOrder.id,
                          selectedOrder.status === "Pending"
                            ? "Preparing"
                            : "Completed"
                        )
                      }
                      className="px-4 py-2 bg-green-600 rounded-lg"
                    >
                      <Text className="text-white font-medium">
                        {selectedOrder.status === "Pending"
                          ? "Mark Preparing"
                          : "Mark Completed"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    className="ml-3 px-4 py-2 bg-gray-300 rounded-lg"
                  >
                    <Text className="text-gray-900 font-medium">Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
