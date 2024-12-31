import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ตั้งค่าการแจ้งเตือน
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ขอสิทธิ์การแจ้งเตือน
export const registerForPushNotificationsAsync = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return false;
    }

    // สำหรับ iOS ต้องลงทะเบียน token
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
};

// ส่งการแจ้งเตือนในเครื่อง
export const scheduleLocalNotification = async (title, body, trigger = null) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: trigger || null,
    });
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

// บันทึกการตั้งค่าการแจ้งเตือน
export const saveNotificationSettings = async (settings) => {
  try {
    await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return false;
  }
};

// โหลดการตั้งค่าการแจ้งเตือน
export const loadNotificationSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem('notificationSettings');
    return settings ? JSON.parse(settings) : null;
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return null;
  }
};

// ตั้งเวลาแจ้งเตือนประจำวัน
export const scheduleRecipeReminder = async (hour, minute) => {
  try {
    const trigger = {
      hour,
      minute,
      repeats: true,
    };

    const id = await scheduleLocalNotification(
      'เมนูแนะนำประจำวัน',
      'มาดูเมนูอาหารที่น่าสนใจวันนี้กันเถอะ!',
      trigger
    );

    return id;
  } catch (error) {
    console.error('Error scheduling recipe reminder:', error);
    return null;
  }
};

// แจ้งเตือนการตอบกลับ
export const sendReplyNotification = async (message) => {
  try {
    await scheduleLocalNotification(
      'มีการตอบกลับใหม่',
      message
    );
  } catch (error) {
    console.error('Error sending reply notification:', error);
  }
};

// ยกเลิกการแจ้งเตือน
export const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// ยกเลิกการแจ้งเตือนทั้งหมด
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return true;
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    return false;
  }
}; 