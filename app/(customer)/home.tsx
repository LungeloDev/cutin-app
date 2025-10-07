// app/(customer)/home.tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchMerchants,
  searchMerchants,
  getMerchantById,
  getMerchantMenu,
} from "@/services/customer.service";
import { useCart } from "@/context/cart-context";
import { SafeAreaView } from "react-native-safe-area-context";
import BackgroundWaves from "@/components/ui/BackgroundWaves";

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

export default function CustomerHomeScreen() {
  const { addItem, cart, total, totalQty } = useCart();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [suggestions, setSuggestions] = useState<Merchant[]>([]);
  const [selected, setSelected] = useState<Merchant | null>(null);

  const [menuLoading, setMenuLoading] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);

  // State for caching
  const [merchantCache, setMerchantCache] = useState<Record<string, Merchant>>({});
  const [menuCache, setMenuCache] = useState<Record<string, MenuItem[]>>({});

  // Initial merchants load
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

  // Search (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) {
        setSuggestions([]);
        setDropdownOpen(false);
        return;
      }
      setSearching(true);
      try {
        const results = await searchMerchants(search.trim(), 15);
        setSuggestions(results as Merchant[]);
        setDropdownOpen(true);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Load selected merchant’s menu
  const loadMenu = async (merchantId: string) => {
    setMenuLoading(true);
    try {
      const items = (await getMerchantMenu(merchantId)) as any[];
      const parsed = items.map((i: any) => ({
        id: i.id,
        name: i.name || i.title || "Item",
        description: i.description ?? "",
        price: Number(i.price || 0),
        available: i.available !== false,
        imageUrl: i.imageUrl || null,
      }));
      setMenu(parsed);
    } finally {
      setMenuLoading(false);
    }
  };

  const onSelectMerchant = async (m: Merchant) => {
    setSelected(m);
    setSearch(m.shopName ?? "");
    setDropdownOpen(false);

    // If already cached, use it
    if (menuCache[m.id]) {
      setMenu(menuCache[m.id]);
      return;
    }

    // Otherwise fetch fresh
    const latest = await getMerchantById(m.id);
    if (latest) {
      setSelected(latest);
      setMerchantCache((prev) => ({ ...prev, [m.id]: latest }));
    }

    const items = await getMerchantMenu(m.id);
    const parsed = items.map((i: any) => ({
      id: i.id,
      name: i.name || i.title || "Item",
      description: i.description ?? "",
      price: Number(i.price || 0),
      available: i.available !== false,
      imageUrl: i.imageUrl || null,
    }));

    setMenu(parsed);
    setMenuCache((prev) => ({ ...prev, [m.id]: parsed }));
  };

  // --- UI helpers ------------------------------------------------------------

  const renderSuggestion = ({ item }: { item: Merchant }) => (
    <TouchableOpacity
      onPress={() => onSelectMerchant(item)}
      className="px-3 py-3 border-b border-gray-100 bg-white"
    >
      <Text className="text-gray-900 font-medium">
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
    <View className="flex-row items-center bg-white rounded-xl p-3 mb-3 shadow-sm">
      <View className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden mr-3">
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
        <Text className="text-gray-900 font-semibold">{item.name}</Text>
        {!!item.description && (
          <Text className="text-gray-500 text-xs" numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <Text className="text-gray-900 font-bold mt-1">
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
        className={`px-3 py-2 rounded-lg ${
          item.available === false ? "bg-gray-200" : "bg-blue-600"
        }`}
      >
        <Text
          className={`text-sm font-medium ${
            item.available === false ? "text-gray-500" : "text-white"
          }`}
        >
          {item.available === false ? "Out" : "Add"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // --- Render ---------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-white py-20">
      {/* Background Waves */}
      <BackgroundWaves />
      <View className="px-5 pt-4 pb-2 border-b border-gray-100">
        
        <Text className="text-2xl font-bold text-gray-900">
          Find a restaurant
        </Text>

        {/* Search box */}
        <View className="relative mt-3">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-3">
            <Ionicons name="search-outline" size={18} color="#6b7280" />
            <TextInput
              placeholder="Search shops by name"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              className="flex-1 px-2 py-3 text-gray-900"
              onFocus={() => setDropdownOpen(!!search)}
            />
            {searching && <ActivityIndicator size="small" />}
            {!!search && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  setDropdownOpen(false);
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete dropdown */}
          {dropdownOpen && suggestions.length > 0 && (
            <View className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-lg z-10 max-h-72">
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

      {/* Content */}
      <FlatList
        ListHeaderComponent={
          <>
            {selected && (
              <View className="px-5 pt-4">
                <View className="w-full h-40 bg-gray-100 rounded-xl overflow-hidden">
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

                <View className="mt-4 bg-white rounded-2xl shadow-md p-4">
                  <Text className="text-2xl font-extrabold text-gray-900">
                    {selected.shopName ?? "Restaurant"}
                  </Text>

                  {!!selected.address && (
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="location-outline" size={16} color="#6B7280" />
                      <Text className="text-gray-600 text-sm ml-1">{selected.address}</Text>
                    </View>
                  )}

                  {!!selected.phone && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="call-outline" size={16} color="#6B7280" />
                      <Text className="text-gray-600 text-sm ml-1">{selected.phone}</Text>
                    </View>
                  )}
                </View>


                <Text className="text-lg font-bold text-gray-900 mt-5 mb-2">
                  Menu
                </Text>
              </View>
            )}
          </>
        }
        data={selected ? menu : []}
        renderItem={renderMenuItem}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        ListEmptyComponent={
          loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : !selected ? (
            <View className="px-5 mt-5">
            {/* Instruction */}
            <View className="mb-5 ">
              <Text className="text-gray-800 text-lg font-semibold mb-1">
                How to get started 🚀
              </Text>
              <Text className="text-gray-600 items-center text-sm leading-relaxed">
                1. Search for a shop by name above.{"\n"}
                2. Select a shop to view their menu.{"\n"}
                3. Add items to your cart and checkout to place your order.
              </Text>
            </View>

          </View>
          ) : menuLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="py-10 items-center">
              <Text className="text-gray-500">
                No items found for this restaurant.
              </Text>
            </View>
          )
        }
      />

      {/* Cart bar */}
      {totalQty > 0 && (
        <View className="absolute left-0 right-0 bottom-0 px-5 pb-5">
          <View className="bg-white rounded-2xl shadow-lg flex-row items-center justify-between px-4 py-3">
            <View>
              <Text className="text-gray-900 font-semibold">
                {cart.merchantName || "Cart"}
              </Text>
              <Text className="text-gray-600 text-sm">
                {totalQty} item{totalQty > 1 ? "s" : ""} • R {total.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-600 px-4 py-2 rounded-xl"
              onPress={() => router.push("/(customer)/cart")}
            >
              <Text className="text-white font-semibold">Go to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
