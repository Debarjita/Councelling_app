// locationpopup.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const LocationPopup = () => {
  const navigation = useNavigation();

  const handleOptionSelect = () => {
    navigation.navigate('PhotoUpload');
  };

  return (
    <View style={styles.container}>
      <View style={styles.popup}>
        <Text style={styles.title}>
          Allow LAMPY to access this device's location?
        </Text>

        {/* Location Options */}
        <View style={styles.optionsContainer}>
          <View style={styles.optionBox}>
            <Text style={styles.optionText}>Precise</Text>
          </View>
          <View style={styles.optionBox}>
            <Text style={styles.optionText}>Approximate</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.button} onPress={handleOptionSelect}>
          <Text style={styles.buttonText}>While using the app</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleOptionSelect}>
          <Text style={styles.buttonText}>Only this time</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleOptionSelect}>
          <Text style={styles.buttonText}>Don't allow</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  popup: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor:'darkblue',
    borderWidth:2,
    backgroundColor: '#E6E6FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  optionText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
   
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'blue',
    fontWeight:'bold',
    fontSize: 16,
  },
});

export default LocationPopup;
