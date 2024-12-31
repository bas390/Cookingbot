import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function RecipeRecommendationScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [ingredients, setIngredients] = useState([]);
  const [calories, setCalories] = useState('');
  const [difficulty, setDifficulty] = useState('ปานกลาง');
  const [recommendations, setRecommendations] = useState([]);

  const difficultyLevels = ['ง่าย', 'ปานกลาง', 'ยาก'];

  const handleAddIngredient = (text) => {
    if (text.trim() && !ingredients.includes(text.trim())) {
      setIngredients([...ingredients, text.trim()]);
    }
  };

  const handleRemoveIngredient = (ingredient) => {
    setIngredients(ingredients.filter(i => i !== ingredient));
  };

  const getRecommendations = async () => {
    try {
      const recipesRef = collection(db, 'recipes');
      let q = query(recipesRef);

      // กรองตามวัตถุดิบ
      if (ingredients.length > 0) {
        q = query(q, where('ingredients', 'array-contains-any', ingredients));
      }

      // กรองตามแคลอรี่
      if (calories) {
        q = query(q, where('calories', '<=', parseInt(calories)));
      }

      // กรองตามระดับความยาก
      if (difficulty) {
        q = query(q, where('difficulty', '==', difficulty));
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRecommendations(results);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดเมนูแนะนำได้');
    }
  };

  const renderRecipe = ({ item }) => (
    <TouchableOpacity 
      style={styles.recipeCard}
      onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.recipeImage}
      />
      <View style={styles.recipeInfo}>
        <Text style={[styles.recipeName, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          {item.name}
        </Text>
        <Text style={styles.recipeDetails}>
          {item.calories} แคลอรี่ • {item.cookingTime} นาที • {item.difficulty}
        </Text>
        <View style={styles.ingredientTags}>
          {item.ingredients.slice(0, 3).map((ingredient, index) => (
            <View key={index} style={styles.ingredientTag}>
              <Text style={styles.ingredientTagText}>{ingredient}</Text>
            </View>
          ))}
          {item.ingredients.length > 3 && (
            <Text style={styles.moreIngredients}>+{item.ingredients.length - 3}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          เมนูแนะนำ
        </Text>
      </View>

      <View style={styles.filters}>
        {/* วัตถุดิบ */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            วัตถุดิบที่มี
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
            placeholder="เพิ่มวัตถุดิบ..."
            placeholderTextColor={isDarkMode ? '#999' : '#666'}
            onSubmitEditing={(e) => {
              handleAddIngredient(e.nativeEvent.text);
              e.target.clear();
            }}
          />
          <View style={styles.ingredientTags}>
            {ingredients.map((ingredient) => (
              <TouchableOpacity
                key={ingredient}
                style={styles.ingredientTag}
                onPress={() => handleRemoveIngredient(ingredient)}
              >
                <Text style={styles.ingredientTagText}>{ingredient}</Text>
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* แคลอรี่ */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            แคลอรี่สูงสุด
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
            placeholder="ระบุแคลอรี่..."
            placeholderTextColor={isDarkMode ? '#999' : '#666'}
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />
        </View>

        {/* ระดับความยาก */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            ระดับความยาก
          </Text>
          <View style={styles.difficultyButtons}>
            {difficultyLevels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  difficulty === level && styles.selectedDifficulty
                ]}
                onPress={() => setDifficulty(level)}
              >
                <Text style={[
                  styles.difficultyText,
                  difficulty === level && styles.selectedDifficultyText
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={getRecommendations}>
          <Text style={styles.searchButtonText}>ค้นหาเมนูแนะนำ</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={recommendations}
        renderItem={renderRecipe}
        keyExtractor={item => item.id}
        style={styles.recipeList}
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  filters: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  ingredientTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ingredientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00B900',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 4,
  },
  ingredientTagText: {
    color: '#FFFFFF',
    marginRight: 4,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  selectedDifficulty: {
    backgroundColor: '#00B900',
  },
  difficultyText: {
    color: '#000000',
  },
  selectedDifficultyText: {
    color: '#FFFFFF',
  },
  searchButton: {
    backgroundColor: '#00B900',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recipeList: {
    padding: 16,
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recipeDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  moreIngredients: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
}); 