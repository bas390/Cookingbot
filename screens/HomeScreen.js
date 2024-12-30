import React, { useState, useEffect } from 'react';
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
import { addDoc, collection } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [editingChat, setEditingChat] = useState(null);
  const [messages, setMessages] = useState([]);

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
      Alert.alert('Error', 'Please enter a chat name.');
      return;
    }
    const newChat = { id: generateUniqueId(), title: newChatName.trim() };
    setChats([...chats, newChat]);
    setNewChatName('');
    setModalVisible(false);
  };

  // ฟังก์ชันแก้ไขชื่อแชท
  const handleEditChat = () => {
    if (!newChatName.trim()) {
      Alert.alert('Error', 'Please enter a chat name.');
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
    setChats(chats.filter((chat) => chat.id !== chatId));
  };

  // ฟังก์ชันสร้าง ID ที่ไม่ซ้ำ
  const generateUniqueId = () => {
    let id;
    do {
      id = Math.random().toString(36).substr(2, 9);
    } while (chats.some((chat) => chat.id === id));
    return id;
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => navigation.replace('Login') },
    ]);
  };

  const handleChatPress = (chatId) => {
    navigation.navigate('Chatbot', { chatId });
  };

  const renderChatItem = ({ item }) => {
    const swipeActions = () => (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item.id)}
        >
          <MaterialIcons name="delete" size={24} color="#fff" />
          <Text style={styles.deleteText}>ลบ</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={swipeActions}>
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => handleChatPress(item.id)}
        >
          <View style={styles.chatAvatar}>
            <MaterialIcons name="chat" size={24} color="#00B900" />
          </View>
          <View style={styles.chatContent}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.chatPreview} numberOfLines={1}>
              แตะเพื่อเริ่มสนทนา
            </Text>
          </View>
          <Text style={styles.chatTime}>วันนี้</Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // ติดตามการเปลี่ยนแปลงของรายการแชท
    const userChatsRef = ref(database, `${dbRef.userChats}/${currentUser.uid}`);
    const chatsQuery = query(userChatsRef, orderByChild('lastMessageTime'));

    const unsubscribe = onValue(chatsQuery, (snapshot) => {
      const chatList = [];
      snapshot.forEach((childSnapshot) => {
        chatList.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      setChats(chatList.reverse());
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat History</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {chats.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="chat-bubble-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>ยังไม่มีแชท</Text>
            <Text style={styles.emptySubtext}>แตะปุ่ม + เพื่อเริ่มแชทใหม่</Text>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={styles.chatList}
          />
        )}

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={32} color="#FFF" />
        </TouchableOpacity>

        <Modal visible={modalVisible || !!editingChat} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingChat ? 'Edit Chat' : 'New Chat'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter chat name"
                value={newChatName}
                onChangeText={setNewChatName}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={editingChat ? handleEditChat : handleAddChat}
                >
                  <Text style={styles.modalButtonText}>
                    {editingChat ? 'Save' : 'Add'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    setEditingChat(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  logoutButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  chatList: {
    flexGrow: 1,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#00B900',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
    marginRight: 8,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#8E8E93',
  },
  chatTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  swipeActions: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#00B900',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
