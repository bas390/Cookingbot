import { Audio } from 'expo-av';

const loadSound = async (soundFile) => {
  try {
    const sound = new Audio.Sound();
    await sound.loadAsync(soundFile);
    return sound;
  } catch (error) {
    console.error('Error loading sound:', error);
    return null;
  }
};

let sendSound = null;
let receiveSound = null;

// โหลดเสียงเมื่อแอพเริ่มทำงาน
export const initSounds = async () => {
  sendSound = await loadSound(require('../assets/sounds/send.mp3'));
  receiveSound = await loadSound(require('../assets/sounds/receive.mp3'));
};

// เล่นเสียงส่งข้อความ
export const playSendSound = async () => {
  try {
    if (sendSound) {
      await sendSound.setPositionAsync(0);
      await sendSound.playAsync();
    }
  } catch (error) {
    console.error('Error playing send sound:', error);
  }
};

// เล่นเสียงรับข้อความ
export const playReceiveSound = async () => {
  try {
    if (receiveSound) {
      await receiveSound.setPositionAsync(0);
      await receiveSound.playAsync();
    }
  } catch (error) {
    console.error('Error playing receive sound:', error);
  }
};

// ทำความสะอาดเสียงเมื่อปิดแอพ
export const cleanupSounds = async () => {
  try {
    if (sendSound) {
      await sendSound.unloadAsync();
    }
    if (receiveSound) {
      await receiveSound.unloadAsync();
    }
  } catch (error) {
    console.error('Error cleaning up sounds:', error);
  }
};

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