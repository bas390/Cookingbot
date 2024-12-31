import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

export default function AdvancedSearchScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [filters, setFilters] = useState({
    foodType: '',
    ingredients: [],
    cookingTime: 30,
    difficulty: 'ปานกลาง',
  });

  const [searchResults, setSearchResults] = useState([]);

  const foodTypes = ['อาหารคาว', 'อาหารหวาน', 'อาหารว่าง', 'เครื่องดื่ม'];
  const difficultyLevels = ['ง่าย', 'ปานกลาง', 'ยาก'];

  const handleSearch = async () => {
    try {
      // ค้นหาในฐานข้อมูล
      const recipesRef = collection(db, 'recipes');
      let q = query(recipesRef);

      if (filters.foodType) {
        q = query(q, where('type', '==', filters.foodType));
      }

      if (filters.ingredients.length > 0) {
        q = query(q, where('ingredients', 'array-contains-any', filters.ingredients));
      }

      if (filters.cookingTime) {
        q = query(q, where('cookingTime', '<=', filters.cookingTime));
      }

      if (filters.difficulty) {
        q = query(q, where('difficulty', '==', filters.difficulty));
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSearchResults(results);
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถค้นหาได้');
    }
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
    >
      <Text style={styles.resultTitle}>{item.name}</Text>
      <Text style={styles.resultInfo}>
        เวลา: {item.cookingTime} นาที • ระดับ: {item.difficulty}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          ค้นหาขั้นสูง
        </Text>
      </View>

      <ScrollView style={styles.filtersContainer}>
        {/* ประเภทอาหาร */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            ประเภทอาหาร
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {foodTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  filters.foodType === type && styles.selectedType
                ]}
                onPress={() => setFilters({ ...filters, foodType: type })}
              >
                <Text style={styles.typeText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* วัตถุดิบ */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            วัตถุดิบ
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: isDarkMode ? '#333' : '#F5F5F5' }]}
            placeholder="เพิ่มวัตถุดิบ..."
            placeholderTextColor={isDarkMode ? '#999' : '#666'}
            onSubmitEditing={(e) => {
              const ingredient = e.nativeEvent.text.trim();
              if (ingredient && !filters.ingredients.includes(ingredient)) {
                setFilters({
                  ...filters,
                  ingredients: [...filters.ingredients, ingredient]
                });
              }
              e.target.clear();
            }}
          />
          <View style={styles.ingredientTags}>
            {filters.ingredients.map((ingredient) => (
              <TouchableOpacity
                key={ingredient}
                style={styles.ingredientTag}
                onPress={() => {
                  setFilters({
                    ...filters,
                    ingredients: filters.ingredients.filter(i => i !== ingredient)
                  });
                }}
              >
                <Text style={styles.ingredientTagText}>{ingredient}</Text>
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* เวลาที่ใช้ */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            เวลาที่ใช้: {filters.cookingTime} นาที
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={180}
            step={5}
            value={filters.cookingTime}
            onValueChange={(value) => setFilters({ ...filters, cookingTime: value })}
            minimumTrackTintColor="#00B900"
            maximumTrackTintColor={isDarkMode ? '#666' : '#CCC'}
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
                  filters.difficulty === level && styles.selectedDifficulty
                ]}
                onPress={() => setFilters({ ...filters, difficulty: level })}
              >
                <Text style={[
                  styles.difficultyText,
                  filters.difficulty === level && styles.selectedDifficultyText
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>ค้นหา</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={item => item.id}
        style={styles.resultsList}
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
  filtersContainer: {
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  selectedType: {
    backgroundColor: '#00B900',
  },
  typeText: {
    color: '#000000',
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
  slider: {
    width: '100%',
    height: 40,
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
  resultsList: {
    padding: 16,
  },
  resultItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultInfo: {
    color: '#666',
  },
}); 