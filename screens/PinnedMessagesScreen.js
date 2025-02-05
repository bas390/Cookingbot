import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';

export default function PinnedMessagesScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [pinnedMessages, setPinnedMessages] = useState([]);

  useEffect(() => {
    loadPinnedMessages();
  }, []);

  const loadPinnedMessages = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const messagesRef = collection(db, 'chats');
      const q = query(
        messagesRef,
        where('userId', '==', currentUser.uid),
        where('isPinned', '==', true),
        orderBy('pinnedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPinnedMessages(messages);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อความที่ปักหมุดได้');
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
      
      // อัพเดท state ทันที
      setPinnedMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
    } catch (error) {
      console.error('Error unpinning message:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยกเลิกการปักหมุดข้อความได้');
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    const messageTime = new Date(item.timestamp).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
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
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}>
          <Text style={isUser ? styles.userText : styles.botText}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.timestamp,
              isUser ? styles.userTimestamp : styles.botTimestamp
            ]}>
              {messageTime}
            </Text>
            <TouchableOpacity
              style={styles.unpinButton}
              onPress={() => handleUnpinMessage(item.id)}
            >
              <MaterialIcons
                name="push-pin"
                size={16}
                color="#FFD700"
                style={{ transform: [{ rotate: '-45deg' }] }}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
      backgroundColor: '#6de67b',
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
      backgroundColor: '#6de67b',
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
    messageFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    timestamp: {
      fontSize: 12,
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
    unpinButton: {
      padding: 4,
      borderRadius: 12,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      marginBottom: 16,
      opacity: 0.5,
    },
    emptyText: {
      fontSize: 18,
      color: isDarkMode ? '#FFFFFF' : '#000000',
      textAlign: 'center',
      opacity: 0.7,
    },
  }), [isDarkMode]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ข้อความที่ปักหมุด</Text>
        </View>
      </View>

      {pinnedMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name="push-pin" 
            size={48} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>
            ยังไม่มีข้อความที่ปักหมุด
          </Text>
        </View>
      ) : (
        <FlatList
          data={pinnedMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}
    </View>
  );
} 