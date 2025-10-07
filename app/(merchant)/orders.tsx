import { View, Text } from "react-native";

export default function MerchantOrdersScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold">Orders</Text>
      <Text className="text-gray-500">Incoming customer orders</Text>
    </View>
  );
}
