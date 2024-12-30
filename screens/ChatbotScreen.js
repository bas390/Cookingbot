import React, { useState, useEffect, useRef } from 'react';
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
import { collection, query, onSnapshot, addDoc, deleteDoc, where, getDocs, doc, orderBy, startAfter, limit } from 'firebase/firestore';
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
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      borderTopLeftRadius: 4,
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

// ย้าย baseStyles มาไว้นอก component สำหรับ styles ที่ไม่เปลี่ยนแปลงตาม theme
const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
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
  timestamp: {
    fontSize: 12,
    marginTop: 4,
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
  const route = useRoute();
  const chatTitle = route.params?.title || 'Chat';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationValue = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null);
  const [useGPT, setUseGPT] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // สร้าง dynamic styles ภายใน component
  const styles = StyleSheet.create({
    ...baseStyles, // นำ baseStyles มารวม
    safeArea: {
      ...baseStyles.safeArea,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    container: {
      ...baseStyles.container,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    headerButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    headerButton: {
      padding: 8,
      borderRadius: 8,
    },
    headerButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    headerThemeButton: {
      padding: 8,
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
      width: '100%',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    input: {
      flex: 1,
      height: 40,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: 16,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginRight: 8,
    },
    sendButton: {
      width: 40,
      height: 40,
      backgroundColor: '#00B900',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: '#666666',
    },
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
    },
    userBubble: {
      backgroundColor: '#00B900',
      borderTopRightRadius: 4,
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      borderTopLeftRadius: 4,
    },
    botText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
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
    typingContainer: {
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      paddingHorizontal: 16,
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typingText: {
      color: isDarkMode ? '#999999' : '#666666',
      fontSize: 14,
    },
  });

  // ดึงข้อความเมื่อ component โหลด
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const loadMessages = async () => {
      try {
        const messagesRef = collection(db, 'chats');
        const q = query(
          messagesRef,
          where('userId', '==', currentUser.uid)
        );
        
        const snapshot = await getDocs(q);
        const messageList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        
        setMessages(messageList);
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();
  }, []); // ลบ chatId ออกจาก dependencies

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

  const getSimpleResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // อาหารประเภทต้ม/แกง
    if (message.includes('ต้มยำ')) {
      return 'ต้มยำกุ้งมีส่วนประกอบหลักคือ\n1. กุ้ง\n2. เห็ด\n3. ข่า ตะไคร้ ใบมะกรูด\n4. พริกขี้หนู\n5. มะนาว\n\nวิธีทำ:\n1. ต้มน้ำให้เดือด ใส่ข่า ตะไคร้ ใบมะกรูด\n2. ใส่เห็ด รอสักครู่\n3. ใส่กุ้ง รอจนกุ้งสุก\n4. ปรุงรสด้วยน้ำปลา น้ำมะนาว พริก\n5. โรยผักชี พร้อมเสิร์ฟ';
    } 
    else if (message.includes('แกงเขียวหวาน')) {
      return 'แกงเขียวหวานไก่ มีส่วนประกอบ:\n1. เนื้อไก่\n2. มะเขือพวง มะเขือเปราะ\n3. พริกแกงเขียวหวาน\n4. กะทิ\n5. ใบโหระพา\n\nวิธีทำ:\n1. ผัดพริกแกงกับหัวกะทิจนหอม\n2. ใส่เนื้อไก่ผัดให้สุก\n3. เติมกะทิ ต้มจนเดือด\n4. ใส่มะเขือ ปรุงรส\n5. ใส่ใบโหระพา พร้อมเสิร์ฟ';
    }
    
    // อาหารประเภทผัด
    else if (message.includes('ผัดกะเพรา')) {
      return 'ผัดกะเพรามีส่วนประกอบ:\n1. เนื้อสัตว์ (หมูสับ/ไก่สับ)\n2. กระเทียม พริก\n3. ใบกะเพรา\n\nวิธีทำ:\n1. ผัดกระเทียมพริกให้หอม\n2. ใส่เนื้อสัตว์ผัดให้สุก\n3. ปรุงรสด้วยน้ำปลา น้ำมันหอย\n4. ใส่ใบกะเพราผัดให้เข้ากัน\n5. เสิร์ฟพร้อมข้าวและไข่ดาว';
    }
    else if (message.includes('ผัดไทย')) {
      return 'ผัดไทยมีส่วนประกอบ:\n1. เส้นจันท์\n2. ไข่ กุ้งแห้ง เต้าหู้\n3. ถั่วงอก ใบกุยช่าย\n4. ซอสผัดไทย\n\nวิธีทำ:\n1. แช่เส้นจนนุ่ม\n2. ผัดกุ้งแห้ง เต้าหู้ ไข่\n3. ใส่เส้น ผัดให้เข้ากัน\n4. ปรุงรสด้วยซอสผัดไทย\n5. ใส่ถั่วงอก ใบกุยช่าย\n6. เสิร์ฟพร้อมถั่วป่น มะนาว';
    }

    // อาหารประเภทยำ
    else if (message.includes('ส้มตำ')) {
      return 'ส้มตำไทยมีส่วนประกอบ:\n1. มะละกอเส้น\n2. มะเขือเทศ\n3. ถั่วฝักยาว\n4. กุ้งแห้ง\n5. พริก กระเทียม\n\nวิธีทำ:\n1. ตำพริกกระเทียม\n2. ใส่มะเขือเทศ ถั่วฝักยาว\n3. ใส่มะละกอ ตำเบาๆ\n4. ปรุงรสด้วยน้ำปลา มะนาว น้ำตาล\n5. คลุกเคล้าให้เข้ากัน';
    }

    // อาหารประเภทของหวาน
    else if (message.includes('มะม่วงข้าวเหนียว')) {
      return 'มะม่วงข้าวเหนียวมีส่วนประกอบ:\n1. ข้าวเหนียว\n2. มะม่วงสุก\n3. กะทิ\n4. น้ำตาล เกลือ\n\nวิธีทำ:\n1. แช่ข้าวเหนียว นึ่งให้สุก\n2. ผสมกะทิกับน้ำตาล เกลือ\n3. ราดกะทิลงบนข้าวเหนียว\n4. เสิร์ฟพร้อมมะม่วงสุก';
    }

    // ถ้าไม่ตรงกับเงื่อนไขใดๆ
    return 'สวัสดีค่ะ ดิฉันสามารถแนะนำวิธีทำอาหารไทยยอดนิยมได้แก่:\n1. ต้มยำ\n2. แกงเขียวหวาน\n3. ผัดกะเพรา\n4. ผัดไทย\n5. ส้มตำ\n6. มะม่วงข้าวเหนียว\n\nกรุณาพิมพ์ชื่ออาหารที่ต้องการทราบวิธีทำค่ะ';
  };

  const handleSend = async () => {
    if (!input.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ข้อความก่อนส่ง');
      return;
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

      // โหลดข้อความใหม่หลังส่ง
      const q = query(
        messagesRef,
        where('userId', '==', currentUser.uid)
      );
      
      const snapshot = await getDocs(q);
      const messageList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => b.createdAt - a.createdAt);
      
      setMessages(messageList);

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

  const renderItem = ({ item }) => (
    <Animated.View
      style={[
        styles.messageRow,
        item.sender === 'user' ? styles.userRow : styles.botRow,
        {
          opacity: animationValue,
          transform: [
            {
              scale: animationValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
              }),
            },
          ],
        },
      ]}
    >
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
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text style={item.sender === 'user' ? styles.userText : styles.botText}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          item.sender === 'user' ? styles.userTimestamp : styles.botTimestamp
        ]}>
          {item.timestamp}
        </Text>
      </View>
    </Animated.View>
  );

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
      // ทำความสะอาดเมื่อออกจากหน้าจอ
      setMessages([]);
      setInput('');
      setIsTyping(false);
    };
  }, []);

  return (
    <RNSSafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons 
                name="arrow-back" 
                size={24} 
                color={isDarkMode ? "#fff" : "#000"} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              แชท
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerThemeButton}
              onPress={toggleTheme}
            >
              <MaterialIcons 
                name={isDarkMode ? "light-mode" : "dark-mode"} 
                size={24} 
                color={isDarkMode ? "#FFFFFF" : "#000000"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: '#00B900' }]}
              onPress={clearMessages}
            >
              <MaterialIcons 
                name="delete-sweep" 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, { backgroundColor: useGPT ? '#00B900' : '#666666' }]}
              onPress={() => setUseGPT(!useGPT)}
            >
              <Text style={styles.headerButtonText}>
                {useGPT ? 'GPT' : 'Simple'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={messages}
          renderItem={renderItem}
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
