import { Audio } from 'expo-av';

// เสียงแจ้งเตือนทั่วไป
export const playNotificationSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/ding-101492.mp3')
    );
    await sound.playAsync();
    
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing notification sound:', error);
  }
};

// เสียงแจ้งเตือนเมื่อครบเวลาทำอาหาร
export const playTimerSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/service-bell-ring-14610.mp3')
    );
    await sound.playAsync();
    
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish) {
        await sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log('Error playing timer sound:', error);
  }
}; 