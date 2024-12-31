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

// BotTyping Component
const BotTyping = () => {
  const [dotIndex, setDotIndex] = useState(0);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex((prevIndex) => (prevIndex + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const typingStyles = StyleSheet.create({
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
      backgroundColor: '#00B900',
      borderWidth: 2,
      borderColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
    },
    botText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
    }
  });

  const dots = '.'.repeat(dotIndex);

  return (
    <View style={[typingStyles.messageRow, typingStyles.botRow]}>
      <View style={typingStyles.avatarContainer}>
        <Image 
          source={require('../assets/icon.png')} 
          style={typingStyles.chefImage}
          resizeMode="contain"
        />
        <View style={typingStyles.statusDot} />
      </View>
      <View style={typingStyles.messageBubble}>
        <Text style={typingStyles.botText}>บอทกำลังพิมพ์{dots}</Text>
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
  botRow: {
    justifyContent: 'flex-start',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  botTimestamp: {
    color: '#999999',
    textAlign: 'left',
  },
});

export default function ChatbotScreen({ navigation }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const route = useRoute();
  const chatTitle = route.params?.title || 'Chat';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationValue = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null);
  const [useGPT, setUseGPT] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [timers, setTimers] = useState({});

  // สร้าง styles ด้วย useMemo
  const styles = useMemo(() => ({
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
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    messageList: {
      flex: 1,
      paddingVertical: 8,
    },
    messageRow: {
      flexDirection: 'row',
      marginVertical: 4,
      paddingHorizontal: 16,
    },
    userRow: {
      justifyContent: 'flex-end',
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
      backgroundColor: '#00B900',
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
      backgroundColor: '#00B900',
      borderTopRightRadius: 4,
      marginLeft: 'auto',
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderTopLeftRadius: 4,
      marginRight: 'auto',
    },
    userText: {
      color: '#FFFFFF',
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
      color: 'rgba(255,255,255,0.7)',
      textAlign: 'right',
    },
    botTimestamp: {
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'left',
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    sendButton: {
      width: 40,
      height: 40,
      backgroundColor: '#00B900',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.5,
    },
    sendButtonDisabled: {
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
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
      borderLeftColor: '#00B900',
    },
    pinnedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
    },
    pinnedHeaderIcon: {
      marginRight: 4,
      transform: [{ rotate: '45deg' }],
    },
    pinnedHeaderText: {
      fontSize: 12,
      color: '#00B900',
      fontWeight: '500',
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    pinButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    pinnedButton: {
      backgroundColor: 'rgba(0, 185, 0, 0.1)',
    },
    pinIcon: {
      transform: [{ rotate: '45deg' }],
    },
  }), [isDarkMode]);

  // ดึงข้อความเมื่อ component โหลด
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

        const messagesRef = collection(db, 'chats');
        const q = query(
          messagesRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    // ใช้ onSnapshot แทน getDocs เพื่อรับการอัพเดทแบบเรียลไทม์
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
      }));
        setMessages(messageList);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem('messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    };
    saveMessages();
  }, [messages]);

  const getChatGPTResponse = async (userMessage) => {
    try {
      console.log('Sending request to ChatGPT...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "คุณเป็นผู้เชี่ยวชาญด้านอาหารไทย สามารถให้คำแนะนำเกี่ยวกับการทำอาหาร สูตรอาหาร และเคล็ดลับการทำอาหารไทยได้"
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
      console.error('ChatGPT API Error:', error.message);
      return 'ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
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
   - เส้นจันท์แช่น้ำ
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

  const handleTimerMessage = (minutes) => {
    const timerMessage = {
      id: generateMessageId(),
      text: `ตั้งเวลา ${minutes} นาที`,
      sender: 'bot',
      createdAt: new Date().toISOString(),
      isTimer: true,
      timerMinutes: minutes,
      timerStartedAt: null,
      timerStatus: 'ready' // 'ready', 'running', 'paused', 'finished'
    };
    
    setMessages(prevMessages => [timerMessage, ...prevMessages]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // ตรวจสอบว่าเป็นคำสั่งตั้งเวลาหรือไม่
    const timerMatch = input.match(/^(\d+)$/);
    if (timerMatch) {
      const minutes = parseInt(timerMatch[1]);
      if (minutes > 0 && minutes <= 180) { // จำกัดไม่เกิน 3 ชั่วโมง
        handleTimerMessage(minutes);
        setInput('');
        return;
      }
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const timestamp = new Date().toLocaleTimeString();
    const messagesRef = collection(db, 'chats');

    try {
      // เก็บข้อความของผู้ใช้
      await addDoc(messagesRef, {
        text: input,
        sender: 'user',
        timestamp: timestamp,
        createdAt: new Date().getTime(),
        userId: currentUser.uid
      });

      setInput('');
      setIsTyping(true);

      // ตรวจสอบว่าเป็นคำสั่งจับเวลาหรือตัวเลขจำนวนนาที
      const timerMatch = input.toLowerCase().match(/จับเวลา\s*(\d+)\s*นาที/) || input.match(/^\d+$/);
      if (timerMatch) {
        const minutes = parseInt(timerMatch[1] || timerMatch[0]);
        await handleTimerMessage(minutes);
      } else {
      // เลือกใช้ GPT หรือ Simple Response
      const botResponse = useGPT ? 
        await getChatGPTResponse(input) : 
        getSimpleResponse(input);

      const botTimestamp = new Date().toLocaleTimeString();
      
      await addDoc(messagesRef, {
        text: botResponse,
        sender: 'bot',
        timestamp: botTimestamp,
        createdAt: new Date().getTime(),
        userId: currentUser.uid
      });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsTyping(false);
      startAnimation();
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

  const clearMessages = () => {
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
          if (!currentUser) return;

          const messagesRef = collection(db, 'chats');
          const q = query(
            messagesRef,
            where('userId', '==', currentUser.uid)
          );
          const snapshot = await getDocs(q);
          
            // ลบข้อความทั้งหมดใน Firestore
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            
            // อัพเดท state ให้เป็นอาเรย์ว่าง
            setMessages([]); // ตรวจสอบว่ามีการเรียกใช้ setMessages([]) หลังจากลบเสร็จแล้ว

          } catch (error) {
            console.error('Error clearing messages:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบข้อความได้ กรุณาลองใหม่อีกครั้ง');
          }
        }, 
        style: 'destructive' 
      },
    ]);
  };

  const renderMessage = ({ item }) => {
    if (item.isTimer) {
      // ... existing timer code ...
    }

    return (
      <View style={[styles.messageRow, item.sender === 'user' ? styles.userRow : styles.botRow]}>
        {item.sender === 'bot' && (
          <View style={styles.avatarContainer}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.chefImage}
              resizeMode="contain"
            />
            <View style={styles.statusDot} />
          </View>
        )}
        <View style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userBubble : styles.botBubble,
          item.isPinned && styles.pinnedBubble
        ]}>
          {item.isPinned && (
            <View style={styles.pinnedHeader}>
              <MaterialIcons 
                name="push-pin" 
                size={14} 
                color="#00B900"
                style={styles.pinnedHeaderIcon}
              />
              <Text style={styles.pinnedHeaderText}>ข้อความที่ปักหมุด</Text>
            </View>
          )}
          <View style={styles.messageContent}>
            <Text style={item.sender === 'user' ? styles.userText : styles.botText}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.timestamp,
                item.sender === 'user' ? styles.userTimestamp : styles.botTimestamp
              ]}>
                {item.timestamp}
              </Text>
              <TouchableOpacity 
                style={[
                  styles.pinButton,
                  item.isPinned && styles.pinnedButton
                ]}
                onPress={() => handlePinMessage(item.id)}
              >
                <MaterialIcons 
                  name={item.isPinned ? "push-pin" : "push-pin"} 
                  size={16} 
                  color={item.isPinned ? "#00B900" : (isDarkMode ? "#999999" : "#666666")}
                  style={[styles.pinIcon, !item.isPinned && { opacity: 0.5 }]}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
      const messagesRef = collection(db, 'chats');
      const q = query(
        messagesRef,
        where('userId', '==', auth.currentUser.uid),
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
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleError = (error, customMessage = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง') => {
    console.error('Error:', error);
    Alert.alert('ข้อผิดพลาด', customMessage);
  };

  // ฟังก์ชันตรวจสอบการเชื่อมต่อ
  const checkConnection = async () => {
    try {
      const response = await fetch('https://www.google.com');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    return () => {
      // ทำความสะอาดเมื่อออจากหน้าจอ
      setMessages([]);
      setInput('');
      setIsTyping(false);
    };
  }, []);

  const handlePinMessage = async (messageId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const messageRef = doc(db, 'chats', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const messageData = messageDoc.data();
        const isPinned = messageData.isPinned || false;
        
        // อัพเดทสถานะการปักหมุด
        await updateDoc(messageRef, {
          isPinned: !isPinned,
          pinnedAt: !isPinned ? new Date().getTime() : null
        });

        // อัพเดท state
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId 
              ? { ...msg, isPinned: !isPinned, pinnedAt: !isPinned ? new Date().getTime() : null }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Error pinning message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อความได้ กรุณาลองใหม่อีกครั้ง');
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

  const startTimer = (messageId) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              timerStatus: 'running',
              timerStartedAt: new Date().toISOString(),
              remainingTime: msg.timerMinutes 
            }
          : msg
      )
    );
  };

  const stopTimer = (messageId) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { ...msg, timerStatus: 'ready', timerStartedAt: null }
          : msg
      )
    );
  };

  const resetTimer = (messageId) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              timerStatus: 'ready',
              timerStartedAt: null,
              remainingTime: msg.timerMinutes 
            }
          : msg
      )
    );
  };

  return (
    <RNSSafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
              <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              แชท
          </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('PinnedMessages')}
            >
              <MaterialIcons name="push-pin" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
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
              style={styles.headerThemeButton}
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
        
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            ref={flatListRef}
            inverted
            contentContainerStyle={styles.chatContent}
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

        {isTyping && <BotTyping />}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={styles.inputContainer}
        >
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
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendButtonText}>ส่ง</Text>
          </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
      </View>
    </RNSSafeAreaView>
  );
}
