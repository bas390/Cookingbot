import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
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
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, onSnapshot, addDoc, deleteDoc, where, getDocs, doc, orderBy, startAfter, limit, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { OPENAI_API_KEY } from '@env';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../context/ThemeContext';
import { playNotificationSound, playTimerSound, playSendSound, playReceiveSound } from '../utils/soundUtils';
import { haptics } from '../utils/haptics';
import ErrorState from '../components/ErrorState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import * as Clipboard from 'expo-clipboard';
import CustomPopup from '../components/CustomPopup';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import MessageOptionsMenu from '../components/MessageOptionsMenu';
import { Keyboard } from 'react-native';
import { extractIngredients, findRecipesByIngredients, rankRecipesByIngredients } from '../utils/recipeUtils';
import { findFAQAnswer } from '../utils/faqUtils';
import { SlideInRight, SlideInLeft, FadeIn, FadeOut, withSpring, runOnJS } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

// ตั้งค่า notifications ที่ส่วนบนของไฟล์
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// เพิ่มฟังก์ชันขอสิทธิ์การแจ้งเตือน
const requestNotificationPermission = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

// BotTyping Component
const BotTyping = () => {
  const { isDarkMode } = useTheme();
  const dotAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(dotAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  const styles = StyleSheet.create({
    messageRow: {
      flexDirection: 'row',
      marginVertical: 2,
      paddingHorizontal: 8,
      alignItems: 'flex-start',
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 4,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    chefImage: {
      width: 24,
      height: 24,
      borderRadius: 12,
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
      backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
      borderTopLeftRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 4,
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDarkMode ? '#FFFFFF80' : '#00000080',
      marginHorizontal: 2,
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
      <View style={styles.messageBubble}>
        {[0, 1, 2].map((index) => (
          <Animated.View
            key={index}
            style={[
              styles.typingDot,
              {
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.7],
                }),
                transform: [
                  {
                    translateY: dotAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, -3, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
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
    marginVertical: 2,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  userText: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 20,
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
  const { isDarkMode } = useTheme();
  const isUser = message.sender === 'user';

  const enteringAnimation = isUser ? 
    SlideInRight.duration(300).springify() : 
    SlideInLeft.duration(300).springify();

  return (
    <Animated.View 
      entering={enteringAnimation}
      style={[
        styles.messageRow,
        isUser ? styles.userRow : styles.botRow
      ]}
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
      
      <Animated.View 
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
          { transform: [{ scale: 1 }] } // เพื่อให้ animation ทำงานได้ดีขึ้น
        ]}
      >
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.botText
        ]}>
          {message.text}
        </Text>
        <Text style={[
          styles.timestamp,
          isUser ? styles.userTimestamp : styles.botTimestamp
        ]}>
          {formatTimestamp(message.createdAt)}
        </Text>
      </Animated.View>

      {isUser && (
        <TouchableOpacity
          style={styles.messageOptions}
          onPress={() => onOptionsPress(message)}
        >
          <MaterialIcons 
            name="more-vert" 
            size={20} 
            color={isDarkMode ? '#CCCCCC' : '#666666'} 
          />
        </TouchableOpacity>
      )}
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
  const [userPreferences, setUserPreferences] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState('');

  // เพิ่ม state สำหรับ simple mode
  const [isSimpleMode, setIsSimpleMode] = useState(false);

  // เพิ่ม state สำหรับ animation
  const [timerScale] = useState(new Animated.Value(1));
  const [timerRotate] = useState(new Animated.Value(0));

  // เพิ่ม state สำหรับเก็บ active timer
  const [activeTimerId, setActiveTimerId] = useState(null);

  // เพิ่ม state สำหรับเก็บ animation values แยกตาม timer
  const [timerAnimations, setTimerAnimations] = useState({});

  // เพิ่ม useEffect สำหรับโหลดค่า GPT Mode
  useEffect(() => {
    const loadGPTMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('useGPT');
        if (savedMode !== null) {
          setUseGPT(JSON.parse(savedMode));
        }
      } catch (error) {
        console.error('Error loading GPT mode:', error);
      }
    };

    loadGPTMode();
  }, []);

  // แก้ไขฟังก์ชันสลับโหมด
  const toggleGPTMode = async () => {
    try {
      const newMode = !useGPT;
      await AsyncStorage.setItem('useGPT', JSON.stringify(newMode));
      setUseGPT(newMode);
      
      // แสดง popup แจ้งเตือนการเปลี่ยนโหมด
      setPopupMessage(newMode ? 'เปลี่ยนเป็นโหมด AI แล้ว' : 'เปลี่ยนเป็นโหมดพื้นฐานแล้ว');
      setPopupVisible(true);
      
      // สั่นเพื่อให้ feedback
      haptics.medium();
    } catch (error) {
      console.error('Error saving GPT mode:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเปลี่ยนโหมดได้');
    }
  };

  // สร้าง styles ด้วย useMemo
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    messageList: {
      flex: 1,
    },
    chatContent: {
      paddingHorizontal: 8,
    },
    inputContainer: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      height: Platform.OS === 'ios' ? 80 : 64,
      paddingBottom: Platform.OS === 'ios' ? 24 : 0,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      height: Platform.OS === 'ios' ? 70 : 64,
      gap: 2,
    },
    inputAnimatedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      transition: 'all 0.3s ease',
    },
    input: {
      height: 40,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      paddingHorizontal: 16,
      paddingRight: 8,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 20,
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' 
        ? StatusBar.currentHeight + 16
        : 50,
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
      gap: 8,
    },
    headerButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerButtonText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 14,
      fontWeight: '500',
    },
    messageRow: {
      flexDirection: 'row',
      marginVertical: 2,
      paddingHorizontal: 8,
      alignItems: 'flex-start',
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 4,
      backgroundColor: isDarkMode ? '#2C2C2C' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    chefImage: {
      width: 24,
      height: 24,
      borderRadius: 12,
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
      marginVertical: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    userBubble: {
      backgroundColor: '#6de67b',
      borderTopRightRadius: 4,
      marginLeft: 'auto',
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginRight: 4,
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#333333' : '#F5F5F5',
      borderTopLeftRadius: 4,
      marginRight: 'auto',
      marginLeft: 4,
    },
    userText: {
      color: '#000000',
      fontSize: 15,
      lineHeight: 20,
    },
    botText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 15,
      lineHeight: 20,
    },
    timestamp: {
      fontSize: 12,
      marginTop: 4,
      opacity: 0.7,
    },
    userTimestamp: {
      fontSize: 11,
      color: 'rgba(0,0,0,0.6)',
      textAlign: 'right',
      marginTop: 2,
    },
    botTimestamp: {
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'left',
    },
    input: {
      height: 40,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      paddingHorizontal: 16,
      paddingRight: 8,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 20,
      flex: 1,
    },
    sendButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: -4,
    },
    sendButtonIcon: {
      marginLeft: 2,
      transform: [{ translateX: 1 }],
      opacity: 0.9,
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
      paddingBottom: 16,
      paddingHorizontal: 8,
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
      justifyContent: 'flex-end',
      alignItems: 'center',
      marginTop: 2,
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
      minWidth: 120,
      maxWidth: '60%',
    },
    timerContainer: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      backgroundColor: isDarkMode ? '#444' : '#E5E5E5',
      padding: 8,
      borderRadius: 12,
    },
    timerDisabled: {
      opacity: 0.5,
      backgroundColor: isDarkMode ? '#333' : '#DDDDDD',
    },
    timerText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontVariant: ['tabular-nums'],
    },
    timerTextDisabled: {
      color: isDarkMode ? '#999999' : '#666666',
    },
    timerWarning: {
      color: '#FF3B30',
    },
    timerButtons: {
      flexDirection: 'row',
      gap: 4,
    },
    timerButton: {
      padding: 4,
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#555' : '#D5D5D5',
    },
    timerButtonDisabled: {
      backgroundColor: isDarkMode ? '#444' : '#CCCCCC',
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
      position: 'absolute',
      top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 16,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderBottomWidth: 1,
      borderColor: isDarkMode ? '#333' : '#E5E5E5',
      zIndex: 999,
    },
    selectionCount: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 16,
      fontWeight: '500',
    },
    selectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    tagContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 8,
      gap: 6,
      alignItems: 'center',
    },
    tag: {
      backgroundColor: isDarkMode ? '#444' : '#F0F0F0',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#555' : '#E0E0E0',
      minHeight: 26,
    },
    tagText: {
      color: isDarkMode ? '#CCC' : '#666',
      fontSize: 13,
      fontWeight: '500',
    },
    addTagButton: {
      backgroundColor: isDarkMode ? '#444' : '#F0F0F0',
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#555' : '#E0E0E0',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    tagInputContainer: {
      width: '80%',
      borderRadius: 12,
      padding: 16,
    },
    tagInputTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    tagInput: {
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
    },
    tagInputButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
    },
    tagButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    cancelButton: {
      backgroundColor: '#999',
    },
    addButton: {
      backgroundColor: '#6de67b',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
    },
    searchResultsContainer: {
      width: '90%',
      maxHeight: '80%',
      borderRadius: 20,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    searchHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#444' : '#E5E5E5',
      paddingBottom: 12,
    },
    searchTitle: {
      fontSize: 20,
      fontWeight: '600',
    },
    emptyText: {
      textAlign: 'center',
      marginTop: 32,
      fontSize: 16,
      color: isDarkMode ? '#999' : '#666',
    },
    tagsList: {
      marginBottom: 16,
      paddingVertical: 8,
    },
    tagChip: {
      backgroundColor: isDarkMode ? '#444' : '#F0F0F0',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: isDarkMode ? '#555' : '#E0E0E0',
    },
    tagChipText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
      fontSize: 15,
      fontWeight: '500',
    },
    tagChipActive: {
      backgroundColor: '#6de67b',
      borderColor: '#5bc569',
    },
    tagChipTextActive: {
      color: '#000000',
    },
    searchResultsTitle: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 12,
      color: isDarkMode ? '#CCCCCC' : '#666666',
    },
    messageOptions: {
      padding: 8,
      marginLeft: 4,
      justifyContent: 'center',
    },
  }), [isDarkMode]);

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

  // เพิ่ม useEffect เพื่อดึงข้อมูลตั้งค่า
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserPreferences(userDoc.data().preferences || {});
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
  };

    loadUserPreferences();
  }, []);

  // แก้ไขฟังก์ชัน getSimpleResponse
  const getSimpleResponse = (message) => {
    const lowerMessage = message.toLowerCase();

    // ตรวจจับตัวเลขเพื่อสร้างตัวจับเวลา
      const timeMatch = lowerMessage.match(/\d+/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[0]);
        return `⏰ ตั้งเวลา ${minutes} นาที

เวลาที่เหลือ: ${minutes}:00

[เริ่มจับเวลา]  [หยุด]  [รีเซ็ต]

หมายเหตุ: กดปุ่ม "เริ่มจับเวลา" เพื่อเริ่มนับถอยหลัง
เมื่อครบเวลา บอทจะส่งข้อความแจ้งเตือน`;
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

    // เมนูอื่นๆ และคำตอบทั่วไป...
    return `สวัสดีค่ะ ดิฉันสามารถแนะนำวิธีทำอาหารไทยยอดนิยมได้แก่:

1. ต้มยำ
2. แกงเขียวหวาน
3. ผัดกะเพรา
4. ผัดไทย
5. ส้มตำ
6. มะม่วงข้าวเหนียว
7. ต้มไข่

กรุณาพิมพ์ชื่ออาหารที่ต้องการทราบวิธีทำค่ะ`;
  };

  // เพิ่มฟังก์ชันจัดการตัวจับเวลา
  const startTimer = async (messageId) => {
    try {
      // ปิดตัวจับเวลาเก่าก่อนเริ่มตัวใหม่
      if (activeTimerId && activeTimerId !== messageId) {
        await stopTimer(activeTimerId);
      }
      
      // อัพเดท active timer ใน Firestore
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        activeTimerId: messageId
      });
      
      setActiveTimerId(messageId);
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              timer: {
                ...msg.timer,
                isRunning: true,
                startedAt: new Date().getTime()
              }
            };
          }
          return msg;
        })
      );
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const stopTimer = async (messageId) => {
    try {
      const messageRef = doc(db, 'chats', messageId);
      await updateDoc(messageRef, {
        'timer.isRunning': false
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              timer: { 
                ...msg.timer, 
                isRunning: false 
              }
            }
          : msg
      ));
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  };

  const resetTimer = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message || !message.timer) return;

      const messageRef = doc(db, 'chats', messageId);
      await updateDoc(messageRef, {
        'timer.isRunning': false,
        'timer.remainingTime': message.timer.initialTime
      });

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { 
              ...msg, 
              timer: { 
                ...msg.timer, 
                isRunning: false,
                remainingTime: msg.timer.initialTime
              }
            }
          : msg
      ));
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  };

  // แก้ไขฟังก์ชัน handleSend เพื่อรองรับการสร้างตัวจับเวลา
  const handleSend = async () => {
    try {
      // ปิดตัวจับเวลาที่กำลังทำงานอยู่เมื่อส่งข้อความใหม่
      if (activeTimerId) {
        await stopTimer(activeTimerId);
        
        // รีเซ็ต active timer ใน Firestore
        const chatRef = doc(db, 'chats', chatId);
        await updateDoc(chatRef, {
          activeTimerId: null
        });
        
        setActiveTimerId(null);
      }
      
      if (!input.trim() || isSending) return;

      setIsSending(true);
      const currentUser = auth.currentUser;
      if (!currentUser || !chatId) return;

      // ส่งข้อความผู้ใช้
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
      await playSendSound();
      setIsTyping(true);

      // ตรวจสอบการตั้งเวลาก่อน ไม่ว่าจะอยู่ในโหมดไหน
      const timeMatch = input.match(/\d+/);
      if (timeMatch) {
        const minutes = parseInt(timeMatch[0]);
        const botMessage = {
          text: `⏰ ตั้งเวลา ${minutes} นาที`,
          sender: 'bot',
          userId: currentUser.uid,
          chatId: chatId,
          type: 'message',
          createdAt: new Date().getTime(),
          timer: {
            initialTime: minutes * 60,
            remainingTime: minutes * 60,
            isRunning: false
          }
        };
        await addDoc(messagesRef, botMessage);
        await playReceiveSound();
        setIsTyping(false);
        return;
      }

      // ถ้าไม่ใช่การตั้งเวลา ให้ตอบตามโหมดที่เลือก
      let botResponse;
      if (useGPT) {
        try {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: `คุณเป็นผู้เชี่ยวชาญด้านอาหารไทย คอยให้คำแนะนำเกี่ยวกับการทำอาหาร วัตถุดิบ และเคล็ดลับต่างๆ`
                },
                {
                  role: "user",
                  content: input.trim()
                }
              ]
            },
            {
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          botResponse = response.data.choices[0].message.content;
        } catch (error) {
          console.error('GPT API Error:', error);
          botResponse = 'ขออภัย ไม่สามารถเชื่อมต่อกับ AI ได้ในขณะนี้';
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        botResponse = getSimpleResponse(input.trim());
      }

      const botMessage = {
        text: botResponse,
        sender: 'bot',
        userId: currentUser.uid,
        chatId: chatId,
        type: 'message',
        createdAt: new Date().getTime()
      };

      await addDoc(messagesRef, botMessage);
      await playReceiveSound();
      haptics.success();

    } catch (error) {
      console.error('Error in handleSend:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSending(false);
      setIsTyping(false);
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
              content: `คุณเป็นผู้เชี่ยวชาญด้านอาหารไทยและอาหารนานาชาติ 

            ข้อมูลผู้ใช้:
            - แพ้อาหารเหล่านี้: ${userPreferences?.allergies?.join(', ') || 'ไม่มี'} 
            - ไม่ทานอาหารเหล่านี้: ${userPreferences?.restrictions?.join(', ') || 'ไม่มี'}
            - ระดับความเชี่ยวชาญ: ${userPreferences?.skillLevel || 'ระดับเริ่มต้น'}

            คำแนะนำในการตอบ:
            1. ห้ามแนะนำเมนูที่มีส่วนประกอบที่ผู้ใช้แพ้หรือไม่ทาน
            2. ปรับความละเอียดของคำอธิบายตามระดับความเชี่ยวชาญ
            3. อธิบายเทคนิคการทำอาหารไทยอย่างละเอียด เช่น:
               - การปรุงรส้ห้สมดุล (เปรี้ยว หวาน เค็ม เผ็ด)
               - เทคนิคการสับ ตำ โขลก คั่ว
               - การเลือกและเตรียมวัตถุดิบ
               - ขั้นตอนที่ต้องระวังเป็นพิเศษ
            4. แนะนำเครื่องปรุงและสมุนไพรไทยที่สำคัญ`
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
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
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
    if (isSelectionMode) {
      setSelectedMessages(prev => {
        if (prev.includes(messageId)) {
          return prev.filter(id => id !== messageId);
        } else {
          return [...prev, messageId];
        }
      });
    }
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

  const handleLongPress = (message) => {
    if (!isSelectionMode) {
      if (!message?.id) {
        console.error('No message ID in handleLongPress:', message);
        return;
      }
      setSelectedMessageId(message.id);
      setSelectedMessageText(message.text);
      setMenuVisible(true);
    }
  };

  const renderTags = (message) => {
    if (!message.tags) return null;
    
    return (
      <View style={styles.tagContainer}>
        {message.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
        <TouchableOpacity 
          style={styles.addTagButton}
          onPress={() => {
            setShowTagInput(true);
            setSelectedMessageId(message.id);
          }}
        >
          <MaterialIcons 
            name="add" 
            size={14} 
            color={isDarkMode ? '#CCC' : '#666'} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    if (isUser) {
      return (
        <TouchableOpacity
          style={[styles.messageRow, styles.userRow]}
          onPress={handlePress}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={[styles.messageBubble, styles.userBubble]}>
            <Text style={styles.userText}>{item.text}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.userTimestamp}>
                {new Date(item.createdAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
                })}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    const isSelected = selectedMessages.includes(item.id);
    
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
        style={[styles.messageRow, styles.botRow]}
        onPress={handlePress}
        onLongPress={() => handleLongPress(item)}
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
            isSelected && styles.selectedBubble,
          ]}
        >
          <View style={styles.messageContent}>
          <Text style={isUser ? styles.userText : styles.botText}>
            {item.text}
          </Text>
          {item.timer && (
            <Animated.View 
              style={[
                styles.timerContainer,
                activeTimerId && activeTimerId !== item.id && styles.timerDisabled,
                {
                  transform: timerAnimations[item.id] ? [
                    { scale: timerAnimations[item.id].scale },
                    {
                      rotate: timerAnimations[item.id].rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }
                  ] : []
                }
              ]}
            >
              <Text style={[
                styles.timerText,
                item.timer?.isWarning && styles.timerWarning,
                activeTimerId && activeTimerId !== item.id && styles.timerTextDisabled
              ]}>
                {formatTime(item.timer.remainingTime)}
              </Text>
              <View style={styles.timerButtons}>
                {(!activeTimerId || activeTimerId === item.id) && (
                  <>
                <TouchableOpacity
                      style={[
                        styles.timerButton,
                        !item.timer.isRunning && styles.timerButtonDisabled
                      ]}
                      onPress={() => {
                        pulseTimer(item.id);
                        item.timer.isRunning ? stopTimer(item.id) : startTimer(item.id);
                      }}
                      disabled={activeTimerId && activeTimerId !== item.id}
                >
                  <MaterialIcons
                    name={item.timer.isRunning ? 'pause' : 'play-arrow'}
                    size={20}
                    color={isDarkMode ? '#FFFFFF' : '#000000'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timerButton}
                      onPress={() => {
                        rotateTimer(item.id);
                        resetTimer(item.id);
                      }}
                >
                  <MaterialIcons
                    name="refresh"
                    size={20}
                    color={isDarkMode ? '#FFFFFF' : '#000000'}
                  />
                </TouchableOpacity>
                  </>
                )}
              </View>
            </Animated.View>
          )}
            {renderTags(item)}
          </View>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.botTimestamp
            ]}>
              {messageTime}
            </Text>
            {!item.timer && (
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
            )}
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
      
      // อัพเดต state ทันที
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
          if (msg.timer && msg.timer.isRunning) {
            const now = new Date().getTime();
            const startedAt = msg.timer.startedAt;
            const elapsedSeconds = Math.floor((now - startedAt) / 1000);
            const remainingTime = msg.timer.initialTime - elapsedSeconds;

            // เช็คเวลาใกล้หมด (10 วินาทีสุดท้าย)
            if (remainingTime <= 10 && remainingTime > 0) {
              // เพิ่ม animation และ haptic feedback
              pulseTimer(msg.id);
              if (remainingTime === 10 || remainingTime === 5) {
                haptics.warning();
              }
            }

            if (remainingTime <= 0) {
              stopTimer(msg.id);
              playTimerSound();
              haptics.success();
              
              // ส่ง notification เมื่อหมดเวลา
              Notifications.scheduleNotificationAsync({
                content: {
                  title: "⏰ หมดเวลาแล้ว!",
                  body: `${msg.text} ครบกำหนดเวลาแล้ว`,
                  sound: true,
                  priority: 'high',
                  vibrate: [0, 250, 250, 250],
                },
                trigger: null,
              });

              setPopupMessage('⏰ หมดเวลาแล้ว!');
              setPopupVisible(true);
              
              hasChanges = true;
              return {
                ...msg,
                timer: {
                  ...msg.timer,
                  remainingTime: 0,
                  isRunning: false
                }
              };
            }
            
            hasChanges = true;
            return {
              ...msg,
              timer: {
                ...msg.timer,
                remainingTime,
                isWarning: remainingTime <= 10 // เพิ่ม flag สำหรับสถานะใกล้หมดเวลา
              }
            };
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
  };

  const handleTimerComplete = async () => {
    await playTimerSound();
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

  // เพิ่มฟังก์ชันแนะนำเมนูตามวัตถุดิบ
  const suggestRecipesByIngredients = async (ingredients) => {
    try {
      const recipesRef = collection(db, 'recipes');
      const q = query(
        recipesRef,
        where('ingredients', 'array-contains-any', ingredients)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error suggesting recipes:', error);
      return [];
    }
  };

  // เพิ่มฟังก์ชันตอบคำถามอัตโนมัติ
  const getAutoResponse = async (question) => {
    try {
      const faqsRef = collection(db, 'faqs');
      const q = query(
        faqsRef,
        where('keywords', 'array-contains-any', question.toLowerCase().split(' '))
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data().answer;
      }
      return null;
    } catch (error) {
      console.error('Error getting FAQ:', error);
      return null;
    }
  };

  // เพิ่มฟังก์ชันสำหรับการสร้างอนิเมชั่นตัวจับเวลา
  const pulseTimer = (messageId) => {
    // สร้าง animation values ถ้ายังไม่มี
    if (!timerAnimations[messageId]) {
      const newAnimations = {
        ...timerAnimations,
        [messageId]: {
          scale: new Animated.Value(1),
          rotate: new Animated.Value(0)
        }
      };
      setTimerAnimations(newAnimations);
      
      // รอให้ state อัพเดทก่อนเริ่ม animation
      setTimeout(() => {
        if (newAnimations[messageId]) {
          Animated.sequence([
            Animated.timing(newAnimations[messageId].scale, {
              toValue: 1.1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(newAnimations[messageId].scale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start();
        }
      }, 0);
      return;
    }

    // ถ้ามี animation values แล้วให้เริ่ม animation ได้เลย
    Animated.sequence([
      Animated.timing(timerAnimations[messageId].scale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(timerAnimations[messageId].scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const rotateTimer = (messageId) => {
    if (!timerAnimations[messageId]) {
      const newAnimations = {
        ...timerAnimations,
        [messageId]: {
          scale: new Animated.Value(1),
          rotate: new Animated.Value(0)
        }
      };
      setTimerAnimations(newAnimations);
      
      setTimeout(() => {
        if (newAnimations[messageId]) {
          newAnimations[messageId].rotate.setValue(0);
          Animated.timing(newAnimations[messageId].rotate, {
            toValue: 1,
            duration: 500,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }).start();
        }
      }, 0);
      return;
    }

    timerAnimations[messageId].rotate.setValue(0);
    Animated.timing(timerAnimations[messageId].rotate, {
      toValue: 1,
      duration: 500,
      easing: Easing.elastic(1),
      useNativeDriver: true,
    }).start();
  };

  // เพิ่ม useEffect เพื่อโหลด active timer เมื่อเปิดแชท
  useEffect(() => {
    if (!chatId) return;

    const loadActiveTimer = async () => {
      try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists() && chatDoc.data().activeTimerId) {
          setActiveTimerId(chatDoc.data().activeTimerId);
        }
      } catch (error) {
        console.error('Error loading active timer:', error);
      }
    };

    loadActiveTimer();
  }, [chatId]);

  // เพิ่ม useEffect สำหรับขอสิทธิ์ notification เมื่อเปิดแอพ
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // เพิ่มฟังก์ชันจัดการ notification เมื่อกดที่การแจ้งเตือน
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // นำผู้ใช้ไปยังข้อความที่เกี่ยวข้อง
      if (data.messageId) {
        // TODO: scroll to message
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? -10 : 0}
    >
      <CustomPopup
        visible={popupVisible}
        message={popupMessage}
        onClose={() => setPopupVisible(false)}
      />

      <MessageOptionsMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setSelectedMessageId('');
          setSelectedMessageText('');
        }}
        onCopy={() => handleCopyText(selectedMessageText)}
        onSelect={() => {
          setIsSelectionMode(true);
          setMenuVisible(false);
          handleSelectMessage(selectedMessageId);
        }}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons 
                name="arrow-back" 
                size={24} 
                color={isDarkMode ? '#FFFFFF' : '#000000'} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{route.params?.title || 'Chat'}</Text>
            </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[
                styles.headerButton,
                useGPT && { backgroundColor: '#6de67b' }
              ]}
              onPress={toggleGPTMode}
            >
              <MaterialIcons 
                name={useGPT ? 'psychology' : 'psychology-alt'} 
                size={24} 
                color={useGPT ? '#000000' : (isDarkMode ? '#FFFFFF' : '#000000')} 
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
        
          <Animated.FlatList
            onScroll={Animated.event(
            [{ 
              nativeEvent: { 
                contentOffset: { y: scrollY } 
              }
            }],
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
            { paddingBottom: Platform.OS === 'ios' ? 90 : 80 }
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

      <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
          <Animated.View 
            style={[
              styles.inputAnimatedContainer,
              { flex: input.trim() ? 0.95 : 1 }
            ]}
            entering={FadeIn.springify().damping(15)}
          >
          <TextInput
            style={styles.input}
            value={input}
              onChangeText={handleInputChange}
            placeholder="พิมพ์ข้อความ..."
            placeholderTextColor="#999999"
            multiline={false}
          />
          </Animated.View>
          
          {input.trim() && (
            <Animated.View
              entering={SlideInRight.springify()
                .damping(15)
                .stiffness(180)
                .mass(0.4)
                .withInitialValues({
                  transform: [{ scale: 0.8 }, { translateX: 5 }],
                })}
                exiting={FadeOut.duration(150)}
            >
          <TouchableOpacity 
                style={styles.sendButton}
                onPress={() => {
                  handleSend();
                  haptics.light();
                }}
                activeOpacity={0.85}
                onPressIn={() => {
                  Animated.spring(new Animated.Value(1), {
                    toValue: 0.95,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 7
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(new Animated.Value(0.95), {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 100,
                    friction: 7
                  }).start();
                }}
              >
                <MaterialIcons
                  name="send"
                  size={22}
                  color={isDarkMode ? '#8de89b' : '#6de67b'}
                  style={styles.sendButtonIcon}
                />
          </TouchableOpacity>
            </Animated.View>
          )}
      </View>
      </View>

      {isSelectionMode && (
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionCount}>
            เลือกแล้ว {selectedMessages.length} ข้อความ
          </Text>
          <View style={styles.selectionActions}>
            {selectedMessages.length > 0 && (
              <TouchableOpacity 
                onPress={handleDeleteSelected}
                style={styles.headerButton}
              >
                <MaterialIcons
                  name="delete"
                  size={24}
                  color={isDarkMode ? '#FF453A' : '#FF3B30'}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedMessages([]);
              }}
              style={styles.headerButton}
            >
              <MaterialIcons
                name="close"
                size={24}
                color={isDarkMode ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
