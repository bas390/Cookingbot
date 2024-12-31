import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../context/ThemeContext';

export default function PinnedMessagesScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPinnedMessages(messages);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.botMessage]}>
      {item.sender === 'bot' && (
        <View style={styles.avatarContainer}>
          <Image 
            source={require('../assets/icon.png')} 
            style={styles.chefImage}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble
      ]}>
        <View style={styles.messageHeader}>
          <MaterialIcons 
            name="push-pin" 
            size={16} 
            color="#00B900"
            style={styles.pinIcon}
          />
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.botText
        ]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 16,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333' : '#E5E5E5',
      backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
      borderRadius: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    messageList: {
      flex: 1,
      padding: 16,
    },
    messageContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      alignItems: 'flex-start',
    },
    userMessage: {
      justifyContent: 'flex-end',
    },
    botMessage: {
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
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    userBubble: {
      backgroundColor: '#00B900',
      borderTopRightRadius: 4,
    },
    botBubble: {
      backgroundColor: isDarkMode ? '#333' : '#F5F5F5',
      borderTopLeftRadius: 4,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    pinIcon: {
      marginRight: 4,
      transform: [{ rotate: '45deg' }],
    },
    timestamp: {
      fontSize: 12,
      color: isDarkMode ? '#999999' : '#666666',
    },
    messageText: {
      fontSize: 16,
      lineHeight: 24,
    },
    userText: {
      color: '#FFFFFF',
    },
    botText: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '500',
      color: isDarkMode ? '#FFFFFF' : '#000000',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptySubtext: {
      fontSize: 14,
      color: isDarkMode ? '#999999' : '#666666',
      textAlign: 'center',
    },
  }), [isDarkMode]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
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
        <Text style={styles.title}>ข้อความที่ปักหมุด</Text>
      </View>

      {pinnedMessages.length > 0 ? (
        <FlatList
          data={pinnedMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons 
            name="push-pin" 
            size={48} 
            color={isDarkMode ? '#666666' : '#CCCCCC'}
            style={[styles.emptyIcon, { transform: [{ rotate: '45deg' }] }]}
          />
          <Text style={styles.emptyText}>ไม่มีข้อความที่ปักหมุด</Text>
          <Text style={styles.emptySubtext}>
            ข้อความที่คุณปักหมุดจะแสดงที่นี่
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
} 