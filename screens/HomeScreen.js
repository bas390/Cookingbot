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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [editingChat, setEditingChat] = useState(null);

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
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <Swipeable renderRightActions={swipeActions}>
        <View style={styles.chatItem}>
          <TouchableOpacity
            style={styles.chatInfo}
            onPress={() => handleChatPress(item.id)}
          >
            <MaterialIcons name="chat" size={24} color="#FF5722" />
            <Text style={styles.chatTitle}>{item.title}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setEditingChat(item);
              setNewChatName(item.title);
            }}
          >
            <MaterialIcons name="edit" size={24} color="#FF5722" />
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={styles.chatList}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialIcons name="logout" size={28} color="#FFF" />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  chatList: { padding: 10 },
  chatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chatInfo: { flexDirection: 'row', alignItems: 'center' },
  chatTitle: { marginLeft: 10, fontSize: 16, color: '#333' },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#FF5722',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  logoutButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF5722',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  swipeActions: {
    flex: 0.4,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deleteButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f44336',
    borderRadius: 8,
  },
  deleteText: { color: '#fff', fontSize: 12 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    marginBottom: 15,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#FF5722',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#AAA' },
  modalButtonText: { color: '#FFF', fontWeight: 'bold' },
});
