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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { collection, orderBy, query, onSnapshot, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const animationValue = useState(new Animated.Value(0))[0];
  const flatListRef = useRef(null); // Smooth Scroll
  const botAvatar = require('../assets/bot-icon.png');

  useEffect(() => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = [];
      snapshot.forEach(doc => {
        messageList.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setMessages(messageList);
    });

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

  const getBotResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('สวัสดี') || message.includes('หวัดดี')) {
      return 'สวัสดีค่ะ มีอะไรให้ช่วยไหมคะ?';
    }
    if (message.includes('ขอเมนู') || message.includes('อยากทำอาหาร')) {
      return 'ต้องการเมนูประเภทไหนคะ? เช่น อาหารไทย อาหารจานเดียว หรือของหวาน?';
    }
    if (message.includes('ขอบคุณ')) {
      return 'ยินดีค่ะ หากมีอะไรให้ช่วยเพิ่มเติม บอกได้เลยนะคะ';
    }
    
    return 'ขออภัยค่ะ ไม่เข้าใจคำถาม กรุณาถามใหม่อีกครั้ง';
  };

  const handleSend = async () => {
    if (!input.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณาใส่ข้อความก่อนส่ง');
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    
    const messagesRef = collection(db, 'messages');
    await addDoc(messagesRef, {
      text: input,
      sender: 'user',
      timestamp: timestamp,
      createdAt: new Date().getTime(),
    });

    setInput('');
    setIsTyping(true);

    const notificationStatus = await Notifications.getPermissionsAsync();
    if (notificationStatus.status === 'granted') {
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'ข้อความใหม่จากบอท',
          body: 'บอทได้ส่งข้อความถึงคุณ',
        },
        trigger: null,
      });
    } else {
      console.warn('Notification permissions are not granted.');
    }

    setTimeout(async () => {
      const botTimestamp = new Date().toLocaleTimeString();
      const botResponse = getBotResponse(input);
      
      await addDoc(messagesRef, {
        text: botResponse,
        sender: 'bot',
        timestamp: botTimestamp,
        createdAt: new Date().getTime(),
      });
      
      setIsTyping(false);
      startAnimation();
    }, 1500);
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
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ลบ', 
        onPress: async () => {
          const messagesRef = collection(db, 'messages');
          const snapshot = await getDocs(messagesRef);
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
      {item.sender === 'bot' && <Image source={botAvatar} style={styles.botAvatar} />}
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userBubble : styles.botBubble,
        ]}
      >
        <Text style={item.sender === 'user' ? styles.userText : styles.botText}>{item.text}</Text>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.inner}>
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ref={flatListRef} // Smooth Scroll Ref
          inverted
          contentContainerStyle={styles.chatPadding}
          initialNumToRender={10}
        />
        {isTyping && <BotTyping botAvatar={botAvatar} />}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendButtonText}>ส่ง</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearMessages}>
            <Text style={styles.clearButtonText}>ล้าง</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  inner: { flex: 1 },
  chatPadding: { paddingHorizontal: 16, paddingVertical: 8 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 5,
  },
  botRow: { alignSelf: 'flex-start' },
  userRow: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageBubble: { padding: 10, borderRadius: 10, maxWidth: '75%' },
  userBubble: { backgroundColor: '#DCF8C6' },
  botBubble: { backgroundColor: '#E8E8E8' },
  userText: { color: '#333' },
  botText: { color: '#333' },
  botAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  typingBubble: {
    backgroundColor: '#E8E8E8',
    padding: 10,
    borderRadius: 10,
    maxWidth: '50%',
  },
  typingText: { fontStyle: 'italic', color: '#888' },
  timestamp: { fontSize: 10, color: '#888', marginTop: 5 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    padding: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#FF5722',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
  clearButton: {
    backgroundColor: '#f44336',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  clearButtonText: { color: '#fff', fontWeight: 'bold' },
});
