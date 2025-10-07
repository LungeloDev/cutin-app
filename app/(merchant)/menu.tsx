import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import BackgroundWaves from "@/components/ui/BackgroundWaves";
import {
  getMenuItems,
  addMenuItem,
  toggleMenuItemAvailability,
  uploadMenuImage,
} from "@/services/merchant.service";
import { useAuth } from "@/hooks/use-auth";

export default function MenuScreen() {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadMenu = async () => {
      const items = await getMenuItems(user.uid);
      setMenuItems(items);
    };
    loadMenu();
  }, [user]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleAddItem = async () => {
    if (!user || !newItemName || !newItemPrice) return;

    let uploadedImageUrl = null;
    if (imageUri) {
      uploadedImageUrl = await uploadMenuImage(user.uid, imageUri);
    }

    const newItem = {
      name: newItemName,
      price: parseFloat(newItemPrice),
      imageUrl: uploadedImageUrl,
      available: true,
    };

    const newId = await addMenuItem(user.uid, newItem);
    setMenuItems([...menuItems, { ...newItem, id: newId }]);

    setNewItemName("");
    setNewItemPrice("");
    setImageUri(null);
    setModalVisible(false);
  };

  const handleToggleAvailability = async (itemId: string, current: boolean) => {
    if (!user) return;
    await toggleMenuItemAvailability(user.uid, itemId, !current);
    setMenuItems(
      menuItems.map((item) =>
        item.id === itemId ? { ...item, available: !item.available } : item
      )
    );
  };

  return (
    <View className="flex-1 bg-white relative px-6">
      {/* Waves */}
      <BackgroundWaves />

      {/* Title */}
      <View className="items-center mt-28 mb-8">
        <MaskedView
          maskElement={
            <Text className="text-4xl font-extrabold tracking-tight text-center py-10">
              MENU
            </Text>
          }
        >
          <LinearGradient
            colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text className="text-4xl font-extrabold tracking-tight opacity-0 py-5">
              MENU
            </Text>
          </LinearGradient>
        </MaskedView>
        <Text className="text-gray-600 text-base mt-3">
          Manage your menu items 🍔
        </Text>
      </View>

      {/* Menu List */}
      <FlatList
        data={menuItems}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={({ item }) => (
          <View className="flex-row justify-between items-center bg-gray-100 rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center space-x-3">
              {item.imageUrl && (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-12 h-12 rounded-lg "
                />
              )}
              <View className="px-4">
                <Text className="text-lg font-semibold text-gray-900">
                  {item.name}
                </Text>
                <Text className="text-gray-500">R{item.price.toFixed(2)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleToggleAvailability(item.id, item.available)}
              className={`px-4 py-2 rounded-lg ${
                item.available ? "bg-green-500" : "bg-red-500"
              }`}
            >
              <Text className="text-white font-medium">
                {item.available ? "In Stock" : "Out"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Add Item Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="w-full h-14 rounded-xl overflow-hidden shadow-lg mt-6"
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text className="text-white font-semibold text-lg">+ Add Item</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-11/12 bg-white p-6 rounded-2xl shadow-lg">
            <Text className="text-xl font-bold mb-4">Add Menu Item</Text>

            <TextInput
              placeholder="Item Name"
              placeholderTextColor="#9CA3AF"
              value={newItemName}
              onChangeText={setNewItemName}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-4 text-base text-gray-900 shadow-sm"
            />

            <TextInput
              placeholder="Price"
              placeholderTextColor="#9CA3AF"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-4 mb-6 text-base text-gray-900 shadow-sm"
              keyboardType="numeric"
            />

            {/* Image Picker */}
            <TouchableOpacity
              onPress={handlePickImage}
              className="w-full h-40 bg-gray-100 border border-gray-200 rounded-xl mb-6 justify-center items-center"
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  className="w-full h-full rounded-xl"
                />
              ) : (
                <Text className="text-gray-500">+ Pick Image</Text>
              )}
            </TouchableOpacity>

            {/* Action Buttons */}
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 mr-2 h-12 bg-gray-200 rounded-xl justify-center items-center"
              >
                <Text className="text-gray-700 font-medium">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAddItem}
                className="flex-1 ml-2 h-12 rounded-xl overflow-hidden"
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#0F172A", "#1E3A8A", "#3B82F6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text className="text-white font-semibold">Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
