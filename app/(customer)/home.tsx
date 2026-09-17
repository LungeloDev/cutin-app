// app/(customer)/home.tsx
import BackgroundWaves from "@/components/ui/BackgroundWaves";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchMerchants,
  getMerchantById,
  getMerchantMenu,
  searchMerchants,
} from "@/services/customer.service";
import { db } from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Merchant = {
  id: string;
  shopName?: string;
  address?: string;
  phone?: string;
  bannerUrl?: string;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available?: boolean;
  imageUrl?: string;
};

const categories = [
  { label: "Kota", icon: "fast-food-outline" },
  { label: "Burgers", icon: "restaurant-outline" },
  { label: "Drinks", icon: "cafe-outline" },
  { label: "Chicken", icon: "nutrition-outline" },
  { label: "Pizza", icon: "pizza-outline" },
  { label: "Deals", icon: "flame-outline" },
];

type Order = {
  id: string;
  orderNumber?: string;
  merchantName: string;
  total: number;
  status: string;
  createdAt: Date;
  category?: string;
};

export default function CustomerHomeScreen() {
  const { addItem, cart, total, totalQty } = useCart();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [suggestions, setSuggestions] = useState<Merchant[]>([]);
  const [selected, setSelected] = useState<Merchant | null>(null);

  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuCache, setMenuCache] = useState<Record<string, MenuItem[]>>({});
  const formatMoney = (amount: number) => `R ${amount.toFixed(2)}`;
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const all = await fetchMerchants(50);
        setMerchants(all as Merchant[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const value = search.trim();

      if (!value) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }

      setSearching(true);

      try {
        const results = await searchMerchants(value, 15);
        setSuggestions(results as Merchant[]);
        setDropdownOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const list: Order[] = snap.docs.map((doc) => {
        const data = doc.data() as any;

        return {
          id: doc.id,
          orderNumber: data.orderNumber,
          merchantName: data.merchantName ?? "Restaurant",
          total: Number(data.total ?? data.totalAmount ?? data.amount ?? 0),
          status: data.status ?? "",
          createdAt:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : new Date(data.createdAt),
          category: data.category || null,
        };
      });

      setOrders(list);
    });

    return () => unsubscribe();
  }, [user]);

  const featuredMerchants = useMemo(() => merchants.slice(0, 6), [merchants]);

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

  const onSelectMerchant = async (m: Merchant) => {
    setSelected(m);
    setSearch(m.shopName ?? "");
    setDropdownOpen(false);

    if (menuCache[m.id]) {
      setMenu(menuCache[m.id]);
      return;
    }

    setMenuLoading(true);

    try {
      const latest = await getMerchantById(m.id);

      if (latest) {
        setSelected(latest as Merchant);
      }

      const items = await getMerchantMenu(m.id);

      const parsed = items.map((i: any) => ({
        id: i.id,
        name: i.name || i.title || "Item",
        description: i.description ?? "",
        price: Number(i.price || 0),
        available: i.available !== false,
        imageUrl: i.imageUrl || null,
        category: i.category || null,
      }));

      setMenu(parsed);
      setMenuCache((prev) => ({ ...prev, [m.id]: parsed }));
    } finally {
      setMenuLoading(false);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setDropdownOpen(false);
    setSelected(null);
    setMenu([]);
  };

  const renderSuggestion = ({ item }: { item: Merchant }) => (
    <TouchableOpacity
      onPress={() => onSelectMerchant(item)}
      className="px-4 py-3 border-b border-gray-100 bg-white"
    >
      <Text className="text-gray-900 font-semibold">
        {item.shopName || "Restaurant"}
      </Text>
      {!!item.address && (
        <Text className="text-gray-500 text-xs mt-1" numberOfLines={1}>
          {item.address}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View className="flex-row items-center bg-white rounded-2xl p-3 mb-3 shadow-sm border border-gray-100">
      <View className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden mr-3">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="restaurant-outline" size={20} color="#94a3b8" />
          </View>
        )}
      </View>

      <View className="flex-1">
        <Text className="text-gray-900 font-bold">{item.name}</Text>

        {!!item.description && (
          <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <Text className="text-gray-900 font-extrabold mt-1">
          R {item.price.toFixed(2)}
        </Text>
      </View>

      <TouchableOpacity
        disabled={item.available === false}
        onPress={() =>
          selected &&
          addItem(
            { id: selected.id, shopName: selected.shopName },
            { id: item.id, name: item.name, price: item.price }
          )
        }
        className={`px-4 py-3 rounded-xl ${item.available === false ? "bg-gray-200" : "bg-blue-600"
          }`}
      >
        <Text
          className={`text-sm font-bold ${item.available === false ? "text-gray-500" : "text-white"
            }`}
        >
          {item.available === false ? "Out" : "Add"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <BackgroundWaves />

      <View className="px-5 pt-24 pb-3 border-b border-gray-100">
        <Text className="text-gray-500 font-medium">Good evening 👋</Text>

        <Text className="text-3xl font-extrabold text-gray-900 mt-1">
          What are you craving?
        </Text>

        <View className="relative mt-4">
          <View className="flex-row items-center bg-gray-100 rounded-2xl px-4">
            <Ionicons name="search-outline" size={22} color="#6b7280" />

            <TextInput
              placeholder="Search food, restaurants or drinks"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              className="flex-1 px-3 py-4 text-gray-900"
              onFocus={() => setDropdownOpen(!!search)}
            />

            {searching && <ActivityIndicator size="small" />}

            {!!search && (
              <TouchableOpacity onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {dropdownOpen && suggestions.length > 0 && (
            <View className="absolute top-14 left-0 right-0 bg-white rounded-2xl shadow-lg z-20 max-h-72 overflow-hidden">
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(i) => i.id}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={selected ? menu : []}
        renderItem={renderMenuItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
        ListHeaderComponent={
          <>
            {!selected && (
              <View className="pt-5">
                <View className="bg-blue-950 rounded-3xl p-5 mb-5">
                  <Text className="text-white text-lg font-bold">
                    Food Budget
                  </Text>
                  <Text className="text-blue-100 mt-1">
                    Track your food spending.
                  </Text>

                  <View className="mt-4 bg-white/20 rounded-2xl p-4">
                    <Text className="text-white text-sm">This month</Text>
                    <Text className="text-white text-3xl font-extrabold mt-1">
                      {formatMoney(stats.monthSpent)}
                    </Text>
                  </View>
                </View>

                {/* <Text className="text-xl font-extrabold text-gray-900 mb-3">
                  Categories
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-5"
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.label}
                      onPress={() => setSearch(cat.label)}
                      className="mr-3 bg-gray-100 rounded-2xl px-4 py-3 items-center min-w-[92px]"
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={22}
                        color="#2563EB"
                      />
                      <Text className="text-gray-900 font-semibold mt-2">
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView> */}

                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-xl font-extrabold text-gray-900">
                    Featured stores
                  </Text>
                  <Text className="text-blue-600 font-semibold">See all</Text>
                </View>

                {loading ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator />
                  </View>
                ) : featuredMerchants.length === 0 ? (
                  <View className="bg-gray-50 rounded-2xl p-5">
                    <Text className="text-gray-700 font-semibold">
                      No restaurants yet
                    </Text>
                    <Text className="text-gray-500 mt-1">
                      Restaurants will appear here once merchants register.
                    </Text>
                  </View>
                ) : (
                  featuredMerchants.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => onSelectMerchant(m)}
                      className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
                    >
                      <View className="h-36 bg-gray-100">
                        {m.bannerUrl ? (
                          <Image
                            source={{ uri: m.bannerUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Ionicons
                              name="image-outline"
                              size={24}
                              color="#94a3b8"
                            />
                          </View>
                        )}
                      </View>

                      <View className="p-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-gray-900 text-lg font-extrabold">
                            {m.shopName || "Restaurant"}
                          </Text>

                          <View className="bg-green-100 px-3 py-1 rounded-full">
                            <Text className="text-green-700 text-xs font-bold">
                              Open
                            </Text>
                          </View>
                        </View>

                        {!!m.address && (
                          <View className="flex-row items-center mt-2">
                            <Ionicons
                              name="location-outline"
                              size={15}
                              color="#6B7280"
                            />
                            <Text
                              className="text-gray-500 text-sm ml-1 flex-1"
                              numberOfLines={1}
                            >
                              {m.address}
                            </Text>
                          </View>
                        )}

                        <View className="flex-row items-center mt-3">
                          <Text className="text-yellow-500 font-bold">★</Text>
                          <Text className="text-gray-700 ml-1 font-semibold">
                            New
                          </Text>
                          <Text className="text-gray-400 mx-2">•</Text>
                          <Text className="text-gray-600">Pickup</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {selected && (
              <View className="pt-5">
                <View className="w-full h-40 bg-gray-100 rounded-2xl overflow-hidden">
                  {selected.bannerUrl ? (
                    <Image
                      source={{ uri: selected.bannerUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="#94a3b8" />
                    </View>
                  )}
                </View>

                <View className="mt-4 bg-white rounded-3xl shadow-md p-5 border border-gray-100">
                  <Text className="text-2xl font-extrabold text-gray-900">
                    {selected.shopName ?? "Restaurant"}
                  </Text>

                  {!!selected.address && (
                    <View className="flex-row items-center mt-3">
                      <Ionicons
                        name="location-outline"
                        size={17}
                        color="#6B7280"
                      />
                      <Text className="text-gray-600 text-sm ml-2 flex-1">
                        {selected.address}
                      </Text>
                    </View>
                  )}

                  {!!selected.phone && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="call-outline" size={17} color="#6B7280" />
                      <Text className="text-gray-600 text-sm ml-2">
                        {selected.phone}
                      </Text>
                    </View>
                  )}
                </View>

                <Text className="text-xl font-extrabold text-gray-900 mt-6 mb-3">
                  Menu
                </Text>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          selected && menuLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : selected ? (
            <View className="py-10 items-center">
              <Text className="text-gray-500">
                No items found for this restaurant.
              </Text>
            </View>
          ) : null
        }
      />

      {totalQty > 0 && (
        <View className="absolute left-0 right-0 bottom-0 px-5 pb-5">
          <View className="bg-white rounded-2xl shadow-lg flex-row items-center justify-between px-4 py-3 border border-gray-100">
            <View>
              <Text className="text-gray-900 font-bold">
                {cart.merchantName || "Cart"}
              </Text>
              <Text className="text-gray-600 text-sm">
                {totalQty} item{totalQty > 1 ? "s" : ""} • R {total.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              className="bg-blue-600 px-5 py-3 rounded-xl"
              onPress={() => router.push("/(customer)/cart")}
            >
              <Text className="text-white font-bold">Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}