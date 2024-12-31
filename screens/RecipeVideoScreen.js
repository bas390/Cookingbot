import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function RecipeVideoScreen({ route, navigation }) {
  const { recipe } = route.params;
  const { isDarkMode } = useTheme();
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [savedVideos, setSavedVideos] = useState([]);

  // โหลดวิดีโอที่บันทึกไว้
  const loadSavedVideos = async () => {
    try {
      const saved = await AsyncStorage.getItem('savedVideos');
      if (saved) {
        setSavedVideos(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved videos:', error);
    }
  };

  // บันทึกวิดีโอ
  const handleSaveVideo = async () => {
    try {
      const newSavedVideos = [...savedVideos, recipe.videoUrl];
      await AsyncStorage.setItem('savedVideos', JSON.stringify(newSavedVideos));
      setSavedVideos(newSavedVideos);
      Alert.alert('สำเร็จ', 'บันทึกวิดีโอแล้ว');
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกวิดีโอได้');
    }
  };

  // แสดงขั้นตอนการทำอาหาร
  const renderStep = ({ item, index }) => (
    <View style={styles.stepContainer}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <Text style={[styles.stepText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        {item}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          {recipe.name}
        </Text>
        <TouchableOpacity onPress={handleSaveVideo}>
          <MaterialIcons 
            name={savedVideos.includes(recipe.videoUrl) ? "bookmark" : "bookmark-border"} 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: recipe.videoUrl }}
          useNativeControls
          resizeMode="contain"
          isLooping
          onPlaybackStatusUpdate={setStatus}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => status.isPlaying ? videoRef.current.pauseAsync() : videoRef.current.playAsync()}
        >
          <MaterialIcons 
            name={status.isPlaying ? "pause" : "play-arrow"} 
            size={32} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={recipe.steps}
        renderItem={renderStep}
        keyExtractor={(item, index) => index.toString()}
        style={styles.stepsList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  videoContainer: {
    width: width,
    height: width * 9/16, // 16:9 aspect ratio
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00B900',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsList: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00B900',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
}); 