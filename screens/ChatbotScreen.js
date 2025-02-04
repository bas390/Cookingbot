import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, onSnapshot, addDoc, deleteDoc, where, getDocs, doc, orderBy, startAfter, limit, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OPENAI_API_KEY } from '@env';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { SafeAreaView as RNSSafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../context/ThemeContext';
import { playNotificationSound, playTimerSound } from '../utils/soundUtils';
import { haptics } from '../utils/haptics';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import * as Clipboard from 'expo-clipboard';
import CustomPopup from '../components/CustomPopup';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import MessageOptionsMenu from '../components/MessageOptionsMenu';
import { Keyboard } from 'react-native';

// BotTyping Component
const BotTyping = () => {
  const [dots, setDots] = useState('');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const styles = StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      marginVertical: 4,
      paddingHorizontal: 16,
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    chefImage: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    statusDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#6de67b',
      borderWidth: 2,
      borderColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
      maxWidth: '80%',
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
      borderTopLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
    },
  });

  return (
    <View style={[styles.messageRow, styles.botRow]}>
      <View style={styles.avatarContainer}>
        <Image 
          source={require('../assets/icon.png')} 
          style={styles.chefImage}
          resizeMode="contain"
        />
        <View style={styles.statusDot} />
      </View>
      <View style={[
        styles.messageBubble,
        styles.botBubble,
        { maxWidth: '50%' }
      ]}>
        <Text style={[
          styles.messageText,
          { color: isDarkMode ? '#CCCCCC' : '#666666' }
        ]}>
          กำลังพิมพ์{dots}
        </Text>
      </View>
    </View>
  );
};

// styles ที่ไม่เปลี่ยนแปลงตาม theme
const staticStyles = StyleSheet.create({
  messageList: {
    flex: 1,
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  userText: {
    color: '#000000',
    fontSize: 16,
  },
  userTimestamp: {
    color: 'rgba(0,0,0,0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999999',
    textAlign: 'left',
  },
});

const Message = React.memo(({ message, onPin, onDelete }) => {
  return (
    <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
      {/* existing message JSX */}
    </Animated.View>
  );
});

export default function ChatbotScreen({ navigation, route }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationValue = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null);
  const [useGPT, setUseGPT] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [timers, setTimers] = useState({});
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const chatId = route.params?.chatId;
  const [isSending, setIsSending] = useState(false);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMessageText, setSelectedMessageText] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // สร้าง styles ด้วย useMemo
  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    messageList: {
      flex: 1,
      paddingVertical: 8,
      marginBottom: isKeyboardVisible ? 60 : Platform.OS === 'ios' ? 90 : 70,
      zIndex: 1,
    },
    messageRow: {
      flexDirection: 'row',
      marginVertical: 4,
      paddingHorizontal: 16,
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 8,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    chefImage: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    statusDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#6de67b',
      borderWidth: 2,
      borderColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
      marginVertical: 4,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    userBubble: {
      backgroundColor: '#6de67b',
      borderTopRightRadius: 4,
      marginLeft: 'auto',
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderTopLeftRadius: 4,
      marginRight: 'auto',
    },
    userText: {
      color: '#000000',
      fontSize: 16,
      lineHeight: 24,
    },
    botText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
      lineHeight: 24,
    },
    timestamp: {
      fontSize: 12,
      marginTop: 4,
      opacity: 0.7,
    },
    userTimestamp: {
      color: 'rgba(0,0,0,0.7)',
      textAlign: 'right',
    },
    botTimestamp: {
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'left',
    },
    inputContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 3,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333333' : '#E5E5E5',
      paddingVertical: 8,
      paddingBottom: isKeyboardVisible ? 8 : Platform.OS === 'ios' ? 34 : 16,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      maxHeight: 100,
      minHeight: 40,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#6de67b',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    sendButtonDisabled: {
      backgroundColor: isDarkMode ? '#333333' : '#E5E5E5',
      shadowOpacity: 0,
      elevation: 0,
    },
    sendButtonIcon: {
      marginLeft: -1,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 50,
    },
    messageContent: {
      flex: 1,
    },
    pinnedBubble: {
      borderLeftWidth: 3,
      borderLeftColor: '#FFD700',
      backgroundColor: isDarkMode ? '#2C2C2E' : '#F5F5F5',
    },
    pinnedIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    pinnedIcon: {
      marginRight: 4,
      transform: [{ rotate: '-45deg' }],
    },
    pinnedText: {
      fontSize: 12,
      color: '#FFD700',
      fontWeight: '500',
    },
    messageFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    pinButton: {
      padding: 4,
      borderRadius: 12,
    },
    pinnedButton: {
      backgroundColor: 'rgba(0, 185, 0, 0.1)',
    },
    pinIcon: {
      transform: [{ rotate: '45deg' }],
    },
    timerBubble: {
      minWidth: 150,
    },
    timerContainer: {
      marginTop: 8,
      alignItems: 'center',
    },
    timerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    timerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    timerButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    offlineText: {
      fontSize: 12,
      color: isDarkMode ? '#FF6B6B' : '#FF4444',
      marginTop: 2,
    },
    messageContainer: {
      width: '100%',
    },
    popupContainer: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : 20,
      left: 0,
      right: 0,
      alignItems: 'center',
      zIndex: 1000,
    },
    selectedBubble: {
      borderWidth: 2,
      borderColor: '#6de67b',
    },
    selectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    },
    selectionCount: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
      fontWeight: '500',
    },
    chatContent: {
      paddingBottom: 16,
    },
    chatContainer: {
      flex: 1,
      position: 'relative',
    },
    typingContainer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: isKeyboardVisible ? 60 : Platform.OS === 'ios' ? 90 : 70,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
      zIndex: 2,
    },
  }), [isDarkMode, isKeyboardVisible]);

  // โหลดข้อมูลแชทเมื่อเปิดหน้าจอ
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) return;
      
      try {
        setIsLoading(true);
        setError(null);

        const currentUser = auth.currentUser;
        if (!currentUser) {
          navigation.replace('Login');
          return;
        }

        const messagesRef = collection(db, 'chats');
        const q = query(
          messagesRef,
          where('userId', '==', currentUser.uid),
          where('chatId', '==', chatId),
          where('type', '==', 'message'),
          orderBy('createdAt', 'desc')
        );

        // ใช้ onSnapshot แทน getDocs เพื่อรับการอัพเดทแบบ realtime
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messageList);
          setIsLoading(false);
        }, (error) => {
          console.error('Error loading messages:', error);
          setError(error);
          setIsLoading(false);
        });

        // Cleanup subscription
        return () => unsubscribe();

      } catch (error) {
        console.error('Error in loadMessages:', error);
        setError(error);
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const currentUser = auth.currentUser;
    if (!currentUser || !chatId) return;

    try {
      setIsSending(true);
      haptics.light();
      
      // ส่งข้อความของผู้ใช้
      const messagesRef = collection(db, 'chats');
      const userMessage = {
        text: input.trim(),
        sender: 'user',
        userId: currentUser.uid,
        chatId: chatId,
        type: 'message',
        createdAt: new Date().getTime()
      };

      await addDoc(messagesRef, userMessage);
      setInput('');

      // แสดงสถานะกำลังพิมพ์
      setIsTyping(true);

      // หน่วงเวลาเพื่อจำลองการพิมพ์
      await new Promise(resolve => setTimeout(resolve, 2000));

      // สร้างคำตอบของบอท
      const botResponse = useGPT ? 
        await getChatGPTResponse(input) : 
        getSimpleResponse(input);

      const botMessage = {
        text: botResponse,
        sender: 'bot',
        userId: currentUser.uid,
        chatId: chatId,
        type: 'message',
        createdAt: new Date().getTime()
      };

      await addDoc(messagesRef, botMessage);
      haptics.success();
      
    } catch (error) {
      console.error('Error sending message:', error);
      haptics.error();
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSending(false);
      setIsTyping(false); // ปิดสถานะกำลังพิมพ์
    }
  };

  const getChatGPTResponse = async (userMessage) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "คุณเป็นผู้เชี่ยวชาญด้านการทำอาหาร คอยให้คำแนะนำเกี่ยวกับการทำอาหาร สูตรอาหาร และเทคนิคการทำอาหารต่างๆ"
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Response received:', data);
      return data.choices[0].message.content;

    } catch (error) {
      console.error('ChatGPT API Error:', error);
      return 'ขออภัย ไม่สามารถเชื่อมต่อกับ ChatGPT ได้ในขณะนี้';
    }
  };

  const getSimpleResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    // การจับเวลา
    if (lowerMessage.includes('จับเวลา') || lowerMessage.match(/^\d+$/)) {
      const timeMatch = lowerMessage.match(/\d+/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[0]);
        return `⏰ ตั้งเวลา ${minutes} นาที

เวลาที่เหลือ: ${minutes}:00

[เริ่มจับเวลา]  [หยุด]  [รีเซ็ต]

หมายเหตุ: กดปุ่ม "เริ่มจับเวลา" เพื่อเริ่มนับถอยหลัง
เมื่อครบเวลา บอทจะส่งข้อความแจ้งเตือน`;
      }
    }

    // เมนูต้มไข่
    if (lowerMessage.includes('ต้มไข่')) {
      return `วิธีทำไข่ต้มมีดังนี้:

1. เตรียมส่วนผสม:
   - ไข่ไก่
   - น้ำเปล่า
   - เกลือ (ถ้าต้องการ)

2. วิธีทำ:
   - ต้มน้ำให้เดือด
   - ใส่ไข่ลงไปต้ม
   ⏰ ระยะเวลาต้ม:
   - ไข่ไก่ลวก (ไข่แดงเหลว): 3 นาที
   - ไข่ไก่ต้มไข่แดงยางมะตูม: 5 นาที
   - ไข่ไก่ต้มสุก: 7 นาที

เคล็ดลับ:
- ใส่เกลือเล็กน้อยจะช่วยให้ปอกเปลือกง่าย
- แช่ในน้ำเย็นทันทีเพื่อให้ปอกเปลือกง่าย

⏱️ ต้องการจับเวลาไหมคะ? 
พิมพ์ตัวเลขนาทีที่ต้องการ:
"3" สำหรับไข่ลวก
"5" สำหรับไข่ยางมะตูม
"7" สำหรับไข่ต้มสุก`;
    }

    // เมนูต้มยำ
    if (lowerMessage.includes('ต้มยำ')) {
      return `วิธีทำต้มยำมีดังนี้:

1. เตรียมส่วนผสม:
   - น้ำซุปหรือน้ำเปล่า 2 ถ้วย
   - ข่า ตะไคร้ ใบมะกรูด พริกขี้หนู
   - เห็ด กุ้ง หรือไก่ตามชอบ
   - น้ำพริกเผา น้ำปลา มะนาว
   - ผักชี ต้นหอม

2. วิธีทำ:
   - ต้มน้ำให้เดือด ใส่ข่า ตะไคร้ ใบมะกรูด (⏰ 5 นาที)
   - ใส่เห็ดหรือเนื้อสัตว์ที่เตรียมไว้ (⏰ 3-5 นาที)
   - ปรุงรสด้วยน้ำพริกเผา น้ำปลา
   - เมื่อสุกใส่มะนาว ผักชี ต้นหอม

เคล็ดลับ: 
- ใส่น้ำพริกเผาก่อนมะนาวเพื่อให้รสชาติกลมกล่อม
- ไม่ต้มนานเกินไปเพื่อให้ผักยังกรอบอยู่

⏱️ ต้องการจับเวลาไหมคะ?
พิมพ์ "จับเวลา 5 นาที" สำหรับต้มเครื่องต้มยำ
พิมพ์ "จับเวลา 3 นาที" สำหรับต้มกุ้ง/เห็ด`;
    }

    // เมนูแกงเขียวหวาน
    if (lowerMessage.includes('แกงเขียวหวาน')) {
      return `วิธีทำแกงเขียวหวานมีดังนี้:

1. เตรียมเครื่องแกง:
   - พริกเขียว หอมแดง ข่า ตะไคร้
   - กระเทียม ผิวมะกรูด รากผักชี
   - ลูกผักชี ยี่หร่า พริกไทย กะปิ

2. วิธีทำ:
   - โขลกเครื่องแกงให้ละเอียด
   - ผัดเครื่องแกงกับหัวกะทิจนหอม
   - ใส่เนื้อไก่หรือเนื้อสัตว์ที่เตรียมไว้
   - เติมน้ำกะทิ ใส่มะเขือ พริกชี้ฟ้า
   - ปรุงรสด้วยน้ำปลา น้ำตาล ใบโหระพา

เคล็ดลับ:
- แยกกะทิเป็นหัวกะทิและหางกะทิ
- ผัดเครื่องแกงจนมีกลิ่นหอมก่อนใส่กะทิ
- ใส่ใบโหระพาตอนใกล้ปิดไฟ

ต้องการทราบอะไรเพิ่มเติมไหมคะ?`;
    }

    // เมนูผัดกะเพรา
    if (lowerMessage.includes('ผัดกะเพรา')) {
      return `วิธีทำผัดกะเพรามีดังนี้:

1. เตรียมส่วนผสม:
   - เนื้อหมูสับ/ไก่สับ/เนื้อสับ
   - กระเทียม พริกขี้หนูสด
   - ใบกะเพรา น้ำมัน
   - ซอสปรุงรส น้ำปลา น้ำตาล

2. วิธีทำ:
   - โขลกกระเทียมและพริกให้แหลก
   - ตั้งกระทะใส่น้ำมัน ผัดกระเทียมพริก
   - ใส่เนื้อสับลงผัด
   - ปรุงรสด้วยน้ำปลา น้ำตาล
   - ใส่ใบกะเพราผัดให้เข้ากัน

เคล็ดลับ:
- ใช้ไฟแรงในการผัด
- ใส่ใบกะเพราตอนท้าย
- ไม่ต้องใส่น้ำ จะได้รสชาติที่เข้มข้น

ต้องการทราบอะไรเพิ่มเติมไหมคะ?`;
    }

    // เมนูผัดไทย
    if (lowerMessage.includes('ผัดไทย')) {
      return `วิธีทำผัดไทยมีดังนี้:

1. เตรียมส่วนผสม:
   - เส้นจันท์แช่น้ำปรุงรสให้นุ่ม
   - ไข่ กุ้งแห้ง เต้าหู้
   - ถั่วงอก ใบกุยช่าย
   - น้ำตาลปี๊บ น้ำปลา น้ำมะขาม
   - ถั่วลิสงป่น พริกป่น

2. วิธีทำ:
   - ผัดเส้นกับน้ำปรุงรสให้นุ่ม
   - ตอกไข่ลงผัดให้สุก
   - ใส่ถั่วงอก ใบกุยช่าย
   - โรยหน้าด้วยถั่วลิสงป่น

เคล็ดลับ:
- แช่เส้นให้นุ่มพอดี ไม่เละ
- ผัดเส้นให้แห้ง ไม่เหนียวติดกัน
- ปรุงรสให้ได้ความหวาน เค็ม เปรี้ยว สมดุล

ต้องการทราบอะไรเพิ่มเติมไหมคะ?`;
    }

    // เมนูส้มตำ
    if (lowerMessage.includes('ส้มตำ')) {
      return `วิธีทำส้มตำมีดังนี้:

1. เตรียมส่วนผสม:
   - มะละกอเขียวขูด
   - มะเขือเทศ กระเทียม พริกสด
   - ถั่วฝักยาว กุ้งแห้ง
   - น้ำปลา น้ำตาล มะนาว
   - ถั่วลิสงคั่ว

2. วิธีทำ:
   - ตำกระเทียม พริกให้แหลก
   - ใส่มะเขือเทศ ถั่วฝักยาว
   - ใส่มะละกอ ปรุงรส คลุกเคล้า
   - โรยหน้าด้วยถั่วลิสงคั่ว

เคล็ดลับ:
- เลือกมะละกอเขียวแก่ ขูดเป็นเส้นยาว
- ปรุงรสให้เปรี้ยวนำ เค็มตาม หวานเล็กน้อย
- ตำเบาๆ ไม่ให้มะละกอเละ

ต้องการทราบอะไรเพิ่มเติมไหมคะ?`;
    }

    // เมนูมะม่วงข้าวเหนียว
    if (lowerMessage.includes('มะม่วงข้าวเหนียว')) {
      return `วิธีทำมะม่วงข้าวเหนียวมีดังนี้:

1. เตรียมส่วนผสม:
   - ข้าวเหนียว
   - มะม่วงสุก
   - กะทิ น้ำตาล เกลือ
   - งาคั่ว

2. วิธีทำ:
   - แช่ข้าวเหนียว 4-6 ชั่วโมง
   - นึ่งข้าวเหนียวให้สุก
   - ทำกะทิ: ผสมกะทิ น้ำตาล เกลือ
   - ราดกะทิลงบนข้าวเหนียว
   - เสิร์ฟพร้อมมะม่วงสุก

เคล็ดลับ:
- เลือกมะม่วงสุกหวานหอม
- นึ่งข้าวเหนียวให้สุกนุ่มพอดี
- ราดกะทิตอนข้าวยังอุ่นๆ

ต้องการทราบอะไรเพิ่มเติมไหมคะ?`;
    }

    // ถ้าไม่ตรงกับเงื่อนไขใดๆ
    return 'สวัสดีค่ะ ดิฉันสามารถแนะนำวิธีทำอาหารไทยยอดนิยมได้แก่:\n1. ต้มยำ\n2. แกงเขียวหวาน\n3. ผัดกะเพรา\n4. ผัดไทย\n5. ส้มตำ\n6. มะม่วงข้าวเหนียว\n7. ต้มไข่\n\nกรุณาพิมพ์ชื่ออาหารที่ต้องการทราบวิธีทำค่ะ';
  };

  const handleTimerMessage = async (minutes) => {
    const totalSeconds = minutes * 60;
    const messageId = Date.now().toString();
    const now = new Date();
    
    const currentUser = auth.currentUser;
    if (!currentUser || !chatId) return;

    const messagesRef = collection(db, 'chats');
    const newMessage = {
      text: `ตั้งเวลา ${minutes} นาที`,
      sender: 'bot',
      timestamp: now.toISOString(),
      createdAt: now.getTime(),
      userId: currentUser.uid,
      chatId: chatId,
      type: 'message',
      timer: {
        initialTime: totalSeconds,
        remainingTime: totalSeconds,
        isRunning: false
      }
    };
    
    try {
      const docRef = await addDoc(messagesRef, newMessage);
      startTimer(docRef.id);
    } catch (error) {
      console.error('Error adding timer message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถตั้งเวลาได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = (messageId) => {
    if (timers[messageId]) return; // ถ้ามีตัวจับเวลาอยู่แล้วให้ return

    const timer = setInterval(() => {
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          if (msg.id === messageId && msg.timer) {
            const remainingTime = msg.timer.remainingTime - 1;
            if (remainingTime <= 0) {
              stopTimer(messageId);
              return {
                ...msg,
                timer: { ...msg.timer, remainingTime: 0, isRunning: false }
              };
            }
            return {
              ...msg,
              timer: { ...msg.timer, remainingTime, isRunning: true }
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    }, 1000);

    setTimers(prev => ({ ...prev, [messageId]: timer }));
  };

  const stopTimer = (messageId) => {
    if (timers[messageId]) {
      clearInterval(timers[messageId]);
      setTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[messageId];
        return newTimers;
      });

      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId && msg.timer
            ? { ...msg, timer: { ...msg.timer, isRunning: false } }
            : msg
        )
      );

      // เพิ่มการเล่นเสียงเมื่อเวลาหมด
      handleTimerComplete();

      Alert.alert(
        'หมดเวลา!',
        'ตัวจับเวลาได้สิ้นสุดลงแล้ว',
        [{ text: 'ตกลง' }]
      );
    }
  };

  const resetTimer = (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message?.timer) {
      stopTimer(messageId);
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                timer: {
                  ...msg.timer,
                  remainingTime: msg.timer.initialTime,
                  isRunning: false
                }
              }
            : msg
        )
      );
    }
  };

  const addMessage = (sender, text, timestamp) => {
    setMessages((prevMessages) => [
      { id: Date.now().toString(), sender, text, timestamp },
      ...prevMessages,
    ]);
    setTimeout(() => {
      flatListRef.current.scrollToOffset({ animated: true, offset: 0 }); // Smooth Scroll
    }, 100);
  };

  const startAnimation = () => {
    animationValue.setValue(0);
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const clearMessages = async () => {
    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบข้อความทั้งหมดหรือไม่?', [
      { 
        text: 'ยกเลิก', 
        style: 'cancel' 
      },
      { 
        text: 'ลบ', 
        onPress: async () => {
          try {
            const currentUser = auth.currentUser;
            if (!currentUser || !chatId) return;

            const messagesRef = collection(db, 'chats');
            const q = query(
              messagesRef,
              where('userId', '==', currentUser.uid),
              where('chatId', '==', chatId),
              where('type', '==', 'message')
            );
            const snapshot = await getDocs(q);
            
            // ลบเฉพาะข้อความในห้องแชทนี้
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            // อัพเดท state ให้เป็นอาเรย์ว่าง
            setMessages([]);

          } catch (error) {
            console.error('Error clearing messages:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้ กรุณาลองใหม่อีกครั้ง');
          }
        }, 
        style: 'destructive' 
      },
    ]);
  };

  const handleCopyText = async (text) => {
    try {
      await Clipboard.setStringAsync(text);
      haptics.light();
      console.log('Copying text:', text);
      setPopupMessage('คัดลอกข้อความแล้ว');
      setPopupVisible(true);
    } catch (error) {
      console.error('Error copying text:', error);
    }
  };

  const handleSelectMessage = (messageId) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(prev => prev.filter(id => id !== messageId));
      if (selectedMessages.length === 1) {
        setIsSelectionMode(false);
      }
    } else {
      setSelectedMessages(prev => [...prev, messageId]);
      setIsSelectionMode(true);
    }
    haptics.light();
  };

  const handleDeleteSelected = async () => {
    try {
      haptics.medium();
      
      Alert.alert(
        'ลบข้อความ',
        `คุณต้องการลบ ${selectedMessages.length} ข้อความที่เลือกใช่หรือไม่?`,
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async () => {
              for (const messageId of selectedMessages) {
                if (chatId) {
                  const messageRef = doc(db, 'chats', messageId);
                  await deleteDoc(messageRef);
                }
              }
              setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
              setSelectedMessages([]);
              setIsSelectionMode(false);
              setPopupMessage(`ลบ ${selectedMessages.length} ข้อความแล้ว`);
              setPopupVisible(true);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Error deleting messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้');
    }
  };

  const handleLongPress = (text) => {
    if (!isSelectionMode) {
      setSelectedMessageText(text);
      setMenuVisible(true);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const isSelected = selectedMessages.includes(item.id);
    
    // แก้ไขการแสดงเวลา
    const messageTime = item.createdAt 
      ? new Date(item.createdAt).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      : '';

    const handlePress = () => {
      if (isSelectionMode) {
        handleSelectMessage(item.id);
      }
    };

    return (
      <TouchableOpacity
        style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}
        onPress={handlePress}
        onLongPress={() => handleLongPress(item.text)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.chefImage}
              resizeMode="contain"
            />
            <View style={styles.statusDot} />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble,
            item.timer && styles.timerBubble,
            item.isPinned && styles.pinnedBubble,
            isSelected && styles.selectedBubble,
          ]}
        >
          <View style={styles.messageContent}>
            {item.isPinned && (
              <View style={styles.pinnedIndicator}>
                <MaterialIcons 
                  name="push-pin" 
                  size={14} 
                  color="#FFD700" 
                  style={styles.pinnedIcon}
                />
                <Text style={styles.pinnedText}>ปักหมุด</Text>
              </View>
            )}
            <Text style={isUser ? styles.userText : styles.botText}>
              {item.text}
            </Text>
            {item.timer && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {formatTime(item.timer.remainingTime)}
                </Text>
                <View style={styles.timerButtons}>
                  <TouchableOpacity
                    style={styles.timerButton}
                    onPress={() => item.timer.isRunning ? stopTimer(item.id) : startTimer(item.id)}
                  >
                    <MaterialIcons
                      name={item.timer.isRunning ? 'pause' : 'play-arrow'}
                      size={20}
                      color={isDarkMode ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timerButton}
                    onPress={() => resetTimer(item.id)}
                  >
                    <MaterialIcons
                      name="refresh"
                      size={20}
                      color={isDarkMode ? '#FFFFFF' : '#000000'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.botTimestamp
            ]}>
              {messageTime}
            </Text>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => item.isPinned ? handleUnpinMessage(item.id) : handlePinMessage(item.id)}
            >
              <MaterialIcons
                name={item.isPinned ? "push-pin" : "push-pin"}
                size={16}
                color={item.isPinned ? "#FFD700" : isDarkMode ? '#FFFFFF40' : '#00000040'}
                style={item.isPinned ? { transform: [{ rotate: '-45deg' }] } : null}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryButton = (category, icon) => (
    <TouchableOpacity 
      style={styles.categoryButton}
      onPress={() => setInput(`สอนทำอาหารประเภท${category}`)}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={styles.categoryText}>{category}</Text>
    </TouchableOpacity>
  );

  // เพิ่มฟังก์ชันสำหรับจัดการการพิมพ์
  const handleInputChange = (text) => {
    setInput(text);
    // ถ้าต้องการแสดงสถานะ "กำลังพิมพ์..." ให้กับผู้ใช้อื่น
    // updateTypingStatus(true);
  };

  // เพิ่มฟังก์ชันสำหรับจัดการเมื่อกด Enter
  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      handleSend();
    }
  };

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const lastMessage = messages[messages.length - 1];
      
      if (!lastMessage?.createdAt || !chatId) {
        setHasMore(false);
        return;
      }

      const messagesRef = collection(db, 'chats');
      const q = query(
        messagesRef,
        where('userId', '==', auth.currentUser.uid),
        where('chatId', '==', chatId),
        where('type', '==', 'message'),
        orderBy('createdAt', 'desc'),
        startAfter(lastMessage.createdAt),
        limit(20)
      );
      
      const snapshot = await getDocs(q);
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (newMessages.length < 20) {
        setHasMore(false);
      }
      
      setMessages(prev => [...prev, ...newMessages]);
    } catch (error) {
      console.error('Error loading more messages:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleError = (error, customMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') => {
    console.error('Error:', error);
    Alert.alert('ข้อผิดพลาด', customMessage);
    setIsTyping(false);
  };

  const checkConnection = async () => {
    try {
      const response = await fetch('https://www.google.com');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  const handlePinMessage = async (messageId) => {
    try {
      haptics.medium();
      
      const messageToPin = messages.find(msg => msg.id === messageId);
      if (!messageToPin) return;

      const newPinnedStatus = !messageToPin.isPinned;

      if (chatId) {
        // อัพเดต Firestore
        const messageRef = doc(db, 'chats', messageId);
        await updateDoc(messageRef, {
          isPinned: newPinnedStatus,
          pinnedAt: newPinnedStatus ? new Date().toISOString() : null,
        });
      }

      // อัพเดต local state
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, isPinned: newPinnedStatus }
            : msg
        )
      );

      // แสดง popup แจ้งเตือน
      setPopupMessage(newPinnedStatus ? 'ปักหมุดข้อความแล้ว' : 'ยกเลิกการปักหมุดแล้ว');
      setPopupVisible(true);
    } catch (error) {
      console.error('Error pinning message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถปักหมุดข้อความได้');
    }
  };

  const handleUnpinMessage = async (messageId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const messageRef = doc(db, 'chats', messageId);
      await updateDoc(messageRef, {
        isPinned: false,
        pinnedAt: null
      });
      
      // อัพเดท state ทันที
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, isPinned: false, pinnedAt: null }
            : msg
        )
      );
    } catch (error) {
      console.error('Error unpinning message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยกเลิกการปักหมุดข้อความได้');
    }
  };

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setMessages(prevMessages => {
        let hasChanges = false;
        const updatedMessages = prevMessages.map(msg => {
          if (msg.isTimer && msg.timerStatus === 'running') {
            const elapsedMinutes = Math.floor((Date.now() - new Date(msg.timerStartedAt).getTime()) / 60000);
            const remainingMinutes = msg.timerMinutes - elapsedMinutes;
            
            if (remainingMinutes <= 0) {
              hasChanges = true;
              return { ...msg, timerStatus: 'finished', remainingTime: 0 };
            }
            
            hasChanges = true;
            return { ...msg, remainingTime: remainingMinutes };
          }
          return msg;
        });
        
        return hasChanges ? updatedMessages : prevMessages;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  const handleNewMessage = async () => {
    await playNotificationSound();
    // โค้ดอื่นๆ...
  };

  const handleTimerComplete = async () => {
    await playTimerSound();
    // ...
  };

  useEffect(() => {
    console.log('Popup state changed:', { visible: popupVisible, message: popupMessage });
  }, [popupVisible, popupMessage]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <RNSSafeAreaView edges={['top']} style={styles.safeArea}>
        <CustomPopup
          visible={popupVisible}
          message={popupMessage}
          onClose={() => setPopupVisible(false)}
        />
        <MessageOptionsMenu
          visible={menuVisible}
          onClose={() => setMenuVisible(false)}
          onCopy={() => handleCopyText(selectedMessageText)}
          onSelect={() => {
            setIsSelectionMode(true);
            handleSelectMessage(selectedMessageText);
          }}
        />

        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>
                  {route.params?.title || 'Chat'}
                </Text>
                {!isOnline && (
                  <Text style={styles.offlineText}>
                    ออฟไลน์ - โหมดอ่านอย่างเดียว
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={clearMessages}
              >
                <MaterialIcons name="delete-outline" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => setUseGPT(!useGPT)}
              >
                <MaterialIcons 
                  name={useGPT ? 'psychology' : 'psychology-alt'} 
                  size={24} 
                  color={isDarkMode ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={toggleTheme}
              >
                <MaterialIcons 
                  name={isDarkMode ? 'light-mode' : 'dark-mode'} 
                  size={24} 
                  color={isDarkMode ? '#FFFFFF' : '#000000'} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState error={error} onRetry={loadMoreMessages} />
          ) : (
            <View style={styles.chatContainer}>
              <Animated.FlatList
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                data={[
                  ...(isTyping ? [{ id: 'typing', isTyping: true }] : []),
                  ...messages
                ]}
                renderItem={({ item }) => {
                  if (item.isTyping) {
                    return <BotTyping />;
                  }
                  return renderMessage({ item });
                }}
                keyExtractor={(item) => item.id}
                ref={flatListRef}
                inverted={true}
                contentContainerStyle={[
                  styles.chatContent,
                  { paddingBottom: isKeyboardVisible ? 60 : Platform.OS === 'ios' ? 90 : 70 }
                ]}
                style={styles.messageList}
                onEndReached={loadMoreMessages}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isLoadingMore ? <ActivityIndicator /> : null}
                refreshControl={
                  <RefreshControl
                    refreshing={isLoadingMore}
                    onRefresh={loadMoreMessages}
                    tintColor={isDarkMode ? '#FFFFFF' : '#000000'}
                  />
                }
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={handleInputChange}
                placeholder="พิมพ์ข้อความ..."
                placeholderTextColor="#999999"
                multiline={false}
                maxHeight={50}
                onKeyPress={handleKeyPress}
              />
              
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  !input.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSend}
                disabled={!input.trim()}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-upward"
                  size={24}
                  color={input.trim() ? '#FFFFFF' : isDarkMode ? '#666666' : '#999999'}
                  style={styles.sendButtonIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </RNSSafeAreaView>
    </KeyboardAvoidingView>
  );
}
