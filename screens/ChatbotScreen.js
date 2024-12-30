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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, onSnapshot, addDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OPENAI_API_KEY } from '@env';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

// BotTyping Component
const BotTyping = ({ botAvatar }) => {
  const [dotIndex, setDotIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex((prevIndex) => (prevIndex + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotIndex);

  return (
    <View style={[styles.messageRow, styles.botRow]}>
      <Image source={botAvatar} style={styles.botAvatar} />
      <View style={styles.typingBubble}>
        <Text style={styles.typingText}>บอทกำลังพิมพ์{dots}</Text>
      </View>
    </View>
  );
};

export default function ChatbotScreen({ navigation }) {
  const route = useRoute();
  const chatTitle = route.params?.title || 'Chat';
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationValue = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null);
  const botAvatar = require('../assets/bot-icon.png');
  const [useGPT, setUseGPT] = useState(false);

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
          const currentUser = auth.currentUser;
          if (!currentUser) return;

          const messagesRef = collection(db, 'chats');
          const q = query(
            messagesRef,
            where('userId', '==', currentUser.uid)
          );
          const snapshot = await getDocs(q);
          
          snapshot.forEach(async (doc) => {
            await deleteDoc(doc.ref);
          });
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

  return (
    <KeyboardAvoidingView 
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chatTitle}
          </Text>
          <View style={styles.headerButtonContainer}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={clearMessages}
            >
              <Text style={styles.headerButtonText}>ล้างข้อความ</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setUseGPT(!useGPT)}
            >
              <Text style={styles.headerButtonText}>{useGPT ? 'GPT' : 'Simple'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.messageList}>
          <FlatList
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ref={flatListRef}
            inverted
            contentContainerStyle={styles.chatContent}
          />
        </View>

        {isTyping && (
          <View style={styles.typingContainer}>
            <Image source={botAvatar} style={styles.typingAvatar} />
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>กำลังพิมพ์...</Text>
            </View>
          </View>
        )}

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#999999"
            multiline={false}
            maxHeight={50}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendButtonText}>ส่ง</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' 
      ? StatusBar.currentHeight + 20 
      : 44,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    height: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  headerButton: {
    padding: 8,
    backgroundColor: '#00B900',
    borderRadius: 25,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
    paddingBottom: 95,
  },
  chatContent: {
    paddingHorizontal: 8,
    flexGrow: 1,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
    height: 87,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    height: 59,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 30,
    fontSize: 16,
    color: '#333333',
  },
  sendButton: {
    backgroundColor: '#00B900',
    borderRadius: 30,
    paddingHorizontal: 18,
    height: 59,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 59,
  },
  sendButtonDisabled: {
    backgroundColor: '#B3B3B3',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  typingIndicator: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 16,
  },
  typingText: {
    color: '#999999',
    fontSize: 13,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 0,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botRow: {
    alignSelf: 'flex-start',
    marginLeft: -4,
  },
  avatarContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C300',
    borderWidth: 1,
    borderColor: '#fff',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  categoryButton: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  popularDishes: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dishesScroll: {
    paddingBottom: 8,
  },
  dishButton: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dishIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  dishName: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
    marginHorizontal: 0,
  },
  userBubble: {
    backgroundColor: '#00B900',
    borderTopRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  botText: {
    color: '#1A1A1A',
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    alignSelf: 'flex-start',
  },
  botTimestamp: {
    color: '#999999',
    alignSelf: 'flex-end',
  },
  typingBubble: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxWidth: '50%',
  },
  typingText: {
    color: '#999999',
    fontSize: 13,
  },
});
