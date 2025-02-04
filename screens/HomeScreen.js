import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, database, dbRef, db } from '../firebase';
import { ref, query, orderByChild, onValue, set, update, remove } from 'firebase/database';
import { addDoc, collection, deleteDoc, doc, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { signOut } from 'firebase/auth';
import { haptics } from '../utils/haptics';

const ChatItem = React.memo(({ chat, onPress, onDelete, onEdit }) => {
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
      {/* existing chat item JSX */}
    </Animated.View>
  );
});

export default function HomeScreen({ navigation }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [chats, setChats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [editingChat, setEditingChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
  }, []);

  // โหลดข้อมูลแชท
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('userId', '==', currentUser.uid),
      where('type', '==', 'chat_info'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    }, (error) => {
      console.error('Error loading chats:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแชทได้');
    });

    return () => unsubscribe();
  }, []);

  // เพิ่ม useEffect สำหรับตรวจสอบการเชื่อมต่อ
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const response = await fetch('https://www.google.com');
        setIsOnline(response.status === 200);
      } catch (error) {
        setIsOnline(false);
      }
    };

    const interval = setInterval(checkConnectivity, 30000); // ตรวจสอบทุก 30 วินาที
    checkConnectivity();

    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันเพิ่มแชทใหม่
  const handleAddChat = async () => {
    if (!newChatName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาใส่ชื่อแชท');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const newChat = {
        title: newChatName.trim(),
        createdAt: new Date().getTime(),
        userId: currentUser.uid,
        type: 'chat_info'
      };

      const chatsRef = collection(db, 'chats');
      const docRef = await addDoc(chatsRef, newChat);

      setNewChatName('');
      setModalVisible(false);

      // นำทางไปยังห้องแชทใหม่
      navigation.navigate('Chatbot', { 
        title: newChat.title,
        chatId: docRef.id
      });
    } catch (error) {
      console.error('Error adding chat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถสร้างแชทได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ฟังก์ชันแก้ไขชื่อแชท
  const handleEditChat = () => {
    if (!newChatName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาใส่ชื่อแชท');
      return;
    }

    const user = auth.currentUser;
    if (!user || !editingChat) return;

    const chatRef = ref(database, `${dbRef.userChats}/${user.uid}/${editingChat.id}`);
    update(chatRef, { title: newChatName.trim() })
      .then(() => {
        setEditingChat(null);
        setNewChatName('');
      })
      .catch((error) => {
        console.error('Error updating chat:', error);
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถแก้ไขแชทได้ กรุณาลองใหม่');
      });
  };

  // ฟังก์ชันลบแชท
  const handleDeleteChat = async (chatId) => {
    try {
      haptics.heavy();
      Alert.alert(
        'ยืนยันการลบ',
        'คุณต้องการลบแชทนี้ใช่หรือไม่?',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ลบ',
            onPress: async () => {
              const currentUser = auth.currentUser;
              if (!currentUser) return;

              try {
                // ลบข้อมูลห้องแชท
                const chatsRef = collection(db, 'chats');
                const chatQuery = query(
                  chatsRef,
                  where('userId', '==', currentUser.uid),
                  where('type', 'in', ['chat_info', 'message']),
                  where('chatId', '==', chatId)
                );
                const snapshot = await getDocs(chatQuery);
                
                const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);

                // ลบเอกสารห้องแชทหลัก
                const mainChatRef = doc(db, 'chats', chatId);
                await deleteDoc(mainChatRef);

              } catch (error) {
                console.error('Error deleting chat:', error);
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบแชทได้ กรุณาลองใหม่อีกครั้ง');
              }
            },
            style: 'destructive'
          },
        ]
      );
      haptics.success();
    } catch (error) {
      haptics.error();
      console.error('Error deleting chat:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบแชทได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ฟังก์ชันสร้าง ID ที่ไม่ซ้ำ
  const generateUniqueId = () => {
    let id;
    do {
      id = Math.random().toString(36).substr(2, 9);
    } while (chats.some((chat) => chat.id === id));
    return id;
  };

  const handleChatPress = (chat) => {
    navigation.navigate('Chatbot', { 
      chatId: chat.id,
      title: chat.title 
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ลบข้อมูล login เมื่อ logout
      await AsyncStorage.removeItem('userEmail');
      await AsyncStorage.removeItem('userPassword');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const renderChatItem = ({ item }) => {
    const renderRightActions = (progress, dragX) => {
      const scale = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });

      return (
        <View style={styles.rightActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditChat(item)}
          >
            <MaterialIcons name="edit" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteChat(item.id)}
          >
            <MaterialIcons name="delete" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        rightThreshold={40}
      >
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => handleChatPress(item)}
        >
          <View style={styles.chatInfo}>
            <Text style={[styles.chatTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              {item.title}
            </Text>
            <Text style={styles.chatDate}>
              {new Date(item.createdAt).toLocaleDateString('th-TH')}
            </Text>
          </View>
          <MaterialIcons 
            name="chevron-right" 
            size={24} 
            color={isDarkMode ? '#666666' : '#999999'} 
          />
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
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
    headerRight: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    logoutButton: {
      padding: 8,
      borderRadius: 12,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    searchContainer: {
      padding: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      gap: 12
    },
    searchInput: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    chatList: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 12,
      marginBottom: 12,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    chatInfo: {
      flex: 1,
      marginRight: 12,
    },
    chatTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    chatDate: {
      fontSize: 14,
      color: isDarkMode ? '#999999' : '#666666',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
    },
    actionButton: {
      padding: 12,
      borderRadius: 12,
      marginLeft: 8,
    },
    editButton: {
      backgroundColor: '#2196F3',
    },
    deleteButton: {
      backgroundColor: '#FF3B30',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 32,
    },
    emptyText: {
      fontSize: 24,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 16,
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'center',
    },
    addButton: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#00B900',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 16,
    },
    modalContent: {
      width: '100%',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    confirmButton: {
      backgroundColor: '#00B900',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    menuButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: '#F5F5F5',
      borderRadius: 8,
      gap: 8
    },
    darkMenuButton: {
      backgroundColor: '#1E1E1E'
    },
    menuText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    recipeCard: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginRight: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    recipeImage: {
      width: 100,
      height: 100,
      borderRadius: 8,
      marginBottom: 8,
    },
    recipeName: {
      fontSize: 18,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    fabButton: {
      position: 'absolute',
      right: 20,
      bottom: Platform.OS === 'ios' ? 40 : 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#00B900',
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    chatListContent: {
      paddingTop: 16,
      paddingBottom: 100,
      paddingHorizontal: 16,
    },
    offlineBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#FF3B30',
      borderRadius: 8,
    },
    offlineText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 8,
    },
  }), [isDarkMode]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chatbot</Text>
          <View style={styles.headerButtons}>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => navigation.navigate('PinnedMessages')}
              >
                <MaterialIcons name="push-pin" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
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
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="ค้นหาแชท..."
            placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {!isOnline && (
          <View style={styles.offlineBar}>
            <MaterialIcons name="cloud-off" size={16} color="#FFFFFF" />
            <Text style={styles.offlineText}>ไม่มีการเชื่อมต่ออินเทอร์เน็ต</Text>
          </View>
        )}

        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name="chat-bubble-outline" 
              size={80} 
              color={isDarkMode ? '#666666' : '#CCCCCC'} 
            />
            <Text style={styles.emptyText}>ยังไม่มีแชท</Text>
            <Text style={styles.emptySubtext}>แตะปุ่ม + เพื่อเริ่มแชทใหม่</Text>
          </View>
        ) : (
          <FlatList
            data={chats.filter(chat => 
              chat.title.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.chatListContent}
          />
        )}
      </Animated.View>

      <TouchableOpacity 
        style={styles.fabButton}
        onPress={() => setModalVisible(true)}
      >
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>สร้างแชทใหม่</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="ชื่อแชท"
              placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
              value={newChatName}
              onChangeText={setNewChatName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewChatName('');
                }}
              >
                <Text style={styles.modalButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddChat}
              >
                <Text style={styles.modalButtonText}>สร้าง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
