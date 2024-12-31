import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, database, dbRef } from '../firebase';
import { ref, query, orderByChild, onValue } from 'firebase/database';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { signOut } from 'firebase/auth';

export default function HomeScreen({ navigation }) {
  const { isDarkMode, toggleTheme } = useTheme();
  const [chats, setChats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [editingChat, setEditingChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // โหลดข้อมูลแชทจาก AsyncStorage
  useEffect(() => {
    const loadChats = async () => {
      try {
        const savedChats = await AsyncStorage.getItem('chats');
        if (savedChats) setChats(JSON.parse(savedChats));
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };
    loadChats();
  }, []);

  // บันทึกข้อมูลแชทลง AsyncStorage
  useEffect(() => {
    const saveChats = async () => {
      try {
        await AsyncStorage.setItem('chats', JSON.stringify(chats));
      } catch (error) {
        console.error('Error saving chats:', error);
      }
    };
    saveChats();
  }, [chats]);

  // ฟังก์ชันเพิ่มแชทใหม่
  const handleAddChat = () => {
    if (!newChatName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาใส่ชื่อแชท');
      return;
    }
    const newChat = { 
      id: generateUniqueId(), 
      title: newChatName.trim(),
      createdAt: new Date().toISOString(),
      lastMessage: 'เริ่มต้นสนทนาใหม่',
      lastMessageTime: new Date().toISOString()
    };
    setChats([newChat, ...chats]);
    setNewChatName('');
    setModalVisible(false);
  };

  // ฟังก์ชันแก้ไขชื่อแชท
  const handleEditChat = () => {
    if (!newChatName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณาใส่ชื่อแชท');
      return;
    }
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === editingChat.id ? { ...chat, title: newChatName.trim() } : chat
      )
    );
    setEditingChat(null);
    setNewChatName('');
  };

  // ฟังก์ชันลบแชท
  const handleDeleteChat = (chatId) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบแชทนี้ใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          onPress: () => setChats(chats.filter((chat) => chat.id !== chatId)),
          style: 'destructive'
        },
      ]
    );
  };

  // ฟังก์ชันสร้าง ID ที่ไม่ซ้ำ
  const generateUniqueId = () => {
    let id;
    do {
      id = Math.random().toString(36).substr(2, 9);
    } while (chats.some((chat) => chat.id === id));
    return id;
  };

  const handleChatPress = (chatId) => {
    navigation.navigate('Chatbot', { chatId });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const renderChatItem = ({ item }) => {
    const swipeActions = () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            setEditingChat(item);
            setNewChatName(item.title);
          }}
        >
          <MaterialIcons name="edit" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>แก้ไข</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item.id)}
        >
          <MaterialIcons name="delete" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>ลบ</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={swipeActions}>
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => handleChatPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.chatIcon}>
            <MaterialIcons name="chat" size={24} color="#00B900" />
          </View>
          <View style={styles.chatInfo}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.lastMessage || 'แตะเพื่อเริ่มสนทนา'}
            </Text>
          </View>
          <Text style={styles.chatTime}>
            {new Date(item.lastMessageTime || item.createdAt).toLocaleDateString('th-TH')}
          </Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

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
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    themeButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    logoutButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    searchInput: {
      height: 40,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 20,
      paddingHorizontal: 16,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    chatList: {
      flexGrow: 1,
      paddingVertical: 8,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    chatIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    chatInfo: {
      flex: 1,
      marginRight: 8,
    },
    chatTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 4,
    },
    chatPreview: {
      fontSize: 14,
      color: isDarkMode ? '#999999' : '#666666',
    },
    chatTime: {
      fontSize: 12,
      color: isDarkMode ? '#999999' : '#666666',
      alignSelf: 'flex-start',
    },
    swipeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    editButton: {
      backgroundColor: '#2196F3',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
    },
    deleteButton: {
      backgroundColor: '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
    },
    actionButtonText: {
      color: '#FFFFFF',
      fontSize: 12,
      marginTop: 4,
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
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '500',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '80%',
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
      textAlign: 'center',
    },
    input: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      backgroundColor: '#00B900',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '500',
    },
  }), [isDarkMode]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>หน้าหลัก</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.themeButton}
            onPress={toggleTheme}
          >
            <MaterialIcons 
              name={isDarkMode ? 'light-mode' : 'dark-mode'} 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialIcons 
              name="logout" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
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

      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons 
            name="chat-bubble-outline" 
            size={64} 
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
          contentContainerStyle={styles.chatList}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible || !!editingChat}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setEditingChat(null);
          setNewChatName('');
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingChat ? 'แก้ไขชื่อแชท' : 'สร้างแชทใหม่'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="ใส่ชื่อแชท"
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
                  setEditingChat(null);
                  setNewChatName('');
                }}
              >
                <Text style={styles.modalButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={editingChat ? handleEditChat : handleAddChat}
              >
                <Text style={styles.modalButtonText}>
                  {editingChat ? 'บันทึก' : 'สร้าง'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
