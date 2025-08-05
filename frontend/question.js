// question.js - Updated with backend integration (FIXED VERSION)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient, authUtils } from './config/api';

const Question = () => {
  const navigation = useNavigation();
  const [selectedCauses, setSelectedCauses] = useState([]);
  const [loading, setLoading] = useState(false);
  const maxSelection = 3;

  const causesList = [
    'Stress Management',
    'Mental Health Concerns',
    'Career Guidance',
    'Relationship Issues',
    'Personal Growth',
    'Grief or Loss',
    'Decision-Making Support',
  ];

  const handleCauseSelect = (cause) => {
    if (selectedCauses.includes(cause)) {
      // Remove from selection if already selected
      setSelectedCauses(selectedCauses.filter((item) => item !== cause));
    } else if (selectedCauses.length < maxSelection) {
      // Add to selection if less than maxSelection
      setSelectedCauses([...selectedCauses, cause]);
    } else {
      Alert.alert('Selection Limit', `You can only choose up to ${maxSelection} options.`);
    }
  };

  const handleSave = async () => {
    if (selectedCauses.length === 0) {
      Alert.alert(
        'No Selection',
        'Please select at least one area you\'d like to discuss with a counselor.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    
    try {
      const token = await authUtils.getToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        navigation.navigate('Home');
        return;
      }

      await apiClient.post('/users/preferences', {
        preferences: selectedCauses
      }, token);

      Alert.alert(
        'Preferences Saved!',
        `We've saved your consultation preferences: ${selectedCauses.join(', ')}. Now let's find the best counselors for you!`,
        [
          { text: 'Find Counselors', onPress: () => navigation.navigate('Counsellor') }
        ]
      );
      
    } catch (error) {
      console.error('Preferences save error:', error);
      Alert.alert('Error', error.message || 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skipPreferences = async () => {
    Alert.alert(
      'Skip Preferences?',
      'Skipping will show you all available counselors instead of personalized recommendations. Are you sure?',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip Anyway', 
          onPress: async () => {
            try {
              const token = await authUtils.getToken();
              await apiClient.post('/users/preferences', {
                preferences: ['General Consultation']
              }, token);
              navigation.navigate('Counsellor');
            } catch (error) {
              console.error('Skip preferences error:', error);
              navigation.navigate('Counsellor'); // Continue anyway
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Why Do You Want to Meet a Counselor?</Text>
      <Text style={styles.subHeader}>
        To help us better understand your needs and provide the best support, please share the reasons 
        you wish to meet a counselor and the topics you would like to discuss.
      </Text>
      
      <View style={styles.counterContainer}>
        <Text style={styles.counter}>
          You've chosen {selectedCauses.length} out of {maxSelection} options.
        </Text>
      </View>

      <View style={styles.causesContainer}>
        {causesList.map((cause, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.causeButton,
              selectedCauses.includes(cause) ? styles.causeButtonSelected : null,
            ]}
            onPress={() => handleCauseSelect(cause)}
            disabled={loading}
          >
            <Text
              style={[
                styles.causeText,
                selectedCauses.includes(cause) ? styles.causeTextSelected : null,
              ]}
            >
              {cause} {selectedCauses.includes(cause) ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>
          {loading ? 'SAVING...' : 'FIND MY COUNSELORS'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={skipPreferences}
        disabled={loading}
      >
        <Text style={styles.skipButtonText}>Skip and show all counselors</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  counterContainer: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  counter: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    fontWeight: '500',
  },
  causesContainer: {
    marginBottom: 30,
  },
  causeButton: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  causeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  causeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  causeTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 15,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default Question;