// ageverification.js - Updated with backend integration
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, authUtils } from './config/api';

const AgePhotoUpload = () => {
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9, // Higher quality for ID documents
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo of your ID.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.9,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Upload ID Document',
      'Choose how you want to upload your ID',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleNext = async () => {
    if (!photo) {
      Alert.alert('Upload Required', 'Please upload a valid ID document to continue.');
      return;
    }

    setUploading(true);
    
    try {
      const token = await authUtils.getToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        navigation.navigate('Home');
        return;
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('id_document', {
        uri: photo,
        type: 'image/jpeg',
        name: 'id_document.jpg',
      });

      const response = await apiClient.postFile('/auth/verify-age', formData, token);
      
      if (response.status === 'pending') {
        Alert.alert(
          'ID Document Uploaded!',
          'Your ID document has been submitted for age verification. Our team will review it shortly.',
          [
            { text: 'Continue', onPress: () => navigation.navigate('Question') }
          ]
        );
      }
      
    } catch (error) {
      console.error('Age verification upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload ID document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Age Verification Request</Text>
      <Text style={styles.subtitle}>
        To verify your age, please upload a valid ID with your photo and date of birth.
        Accepted IDs: Aadhaar Card, PAN Card, Driving License, Passport, School/College ID.
      </Text>

      <Text style={styles.guidelinesTitle}>Photo Upload Guidelines:</Text>
      <Text style={styles.guideline}>1. The ID must be clear and fully visible.</Text>
      <Text style={styles.guideline}>2. Your photo and DOB must be readable.</Text>
      <Text style={styles.guideline}>3. Only valid and unexpired IDs are accepted.</Text>
      <Text style={styles.guideline}>4. Ensure good lighting and no glare.</Text>

      <TouchableOpacity
        style={[styles.photoBox, photo ? styles.photoBoxFilled : styles.photoBoxEmpty]}
        onPress={showImageOptions}
        disabled={uploading}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.plus}>+</Text>
            <Text style={styles.photoText}>Tap to upload ID</Text>
          </View>
        )}
      </TouchableOpacity>

      {!photo && (
        <Text style={styles.error}>⚠ Please upload 1 valid ID photo to continue.</Text>
      )}

      {photo && (
        <TouchableOpacity style={styles.changeButton} onPress={showImageOptions}>
          <Text style={styles.changeButtonText}>Change ID Photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.nextButton, (!photo || uploading) && styles.buttonDisabled]} 
        onPress={handleNext}
        disabled={!photo || uploading}
      >
        <Text style={styles.nextButtonText}>
          {uploading ? 'UPLOADING...' : 'SUBMIT FOR VERIFICATION'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate('Question')}
        disabled={uploading}
      >
        <Text style={styles.skipButtonText}>Skip age verification for now</Text>
      </TouchableOpacity>
    </View>
  );
};