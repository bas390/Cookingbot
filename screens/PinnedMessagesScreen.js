import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView as RNSSafeAreaView } from 'react-native-safe-area-context';

export default function PinnedMessagesScreen({ navigation }) {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' หรือ 'asc'
  const { isDarkMode } = useTheme();

  useEffect(() => {
    loadPinnedMessages();
  }, []);

  const loadPinnedMessages = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const messagesRef = collection(db, 'chats');
      const q = query(
        messagesRef,
        where('userId', '==', currentUser.uid),
        where('isPinned', '==', true),
        orderBy('pinnedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setPinnedMessages([]);
        return;
      }

      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPinnedMessages(messages);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
      if (error.code === 'failed-precondition') {
        Alert.alert('ข้อผิดพลาด', 'กรุณารอสักครู่ ระบบกำลังสร้าง index');
      } else {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความที่บันทึกได้');
      }
    }
  };

  const handleUnpin = async (messageId) => {
    try {
      const messageRef = doc(db, 'chats', messageId);
      await updateDoc(messageRef, {
        isPinned: false,
        pinnedAt: null
      });
      
      setPinnedMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error unpinning message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยกเลิกการบันทึกได้');
    }
  };

  const handleSort = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    
    const sorted = [...filteredMessages].sort((a, b) => {
      if (newOrder === 'desc') {
        return b.pinnedAt - a.pinnedAt;
      } else {
        return a.pinnedAt - b.pinnedAt;
      }
    });
    
    setFilteredMessages(sorted);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#F5F5F5' }]}>
      <View style={styles.messageContent}>
        <Text style={[styles.messageText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          {item.text}
        </Text>
        <Text style={[
          styles.timestamp,
          { textAlign: 'left' }
        ]}>
          {item.timestamp}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.unpinButton}
        onPress={() => handleUnpin(item.id)}
      >
        <MaterialIcons 
          name="push-pin" 
          size={20} 
          color={isDarkMode ? '#FFFFFF' : '#000000'} 
        />
      </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
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
      padding: 16,
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginLeft: 16,
    },
    messageContainer: {
      flexDirection: 'row',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
    },
    messageContent: {
      flex: 1,
    },
    messageText: {
      fontSize: 16,
      marginBottom: 4,
      lineHeight: 24,
    },
    timestamp: {
      fontSize: 12,
      color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#999999',
      marginTop: 4,
    },
    unpinButton: {
      padding: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#999999',
      textAlign: 'center',
    },
    sortButton: {
      padding: 8,
      marginLeft: 8,
    },
  });

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
            <Text style={styles.title}>ข้อความที่บันทึก</Text>
          </View>
          <TouchableOpacity 
            style={styles.sortButton}
            onPress={handleSort}
          >
            <MaterialIcons 
              name={sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward'} 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
        </View>

        {pinnedMessages.length > 0 ? (
          <FlatList
            data={pinnedMessages}
            renderItem={renderItem}
            keyExtractor={item => item.id}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>ไม่มีข้อความที่บันทึกไว้</Text>
          </View>
        )}
      </View>
    </RNSSafeAreaView>
  );
} 