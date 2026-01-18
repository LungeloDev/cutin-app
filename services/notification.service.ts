import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export async function showOrderNotification(orderData: {
  customerName: string;
  items: string[];
  total: number;
}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 New Order Received!',
      body: `${orderData.customerName} ordered ${orderData.items.length} item(s) - R${orderData.total.toFixed(2)}`,
      data: { type: 'new_order', ...orderData },
    },
    trigger: null, // Show immediately
  });
}