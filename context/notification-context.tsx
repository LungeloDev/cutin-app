import { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/services/notification.service';

type NotificationContextType = {
  hasPermission: boolean;
  requestPermission: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const granted = await registerForPushNotifications();
    setHasPermission(granted);
  };

  const requestPermission = async () => {
    const granted = await registerForPushNotifications();
    setHasPermission(granted);
  };

  return (
    <NotificationContext.Provider value={{ hasPermission, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}