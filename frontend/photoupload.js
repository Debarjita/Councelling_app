// photoupload.js - ONLY PhotoUpload component
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, authUtils } from './config/api';

const PhotoUpload = () => {
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigation = useNavigation();

  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!photo) {
      Alert.alert('No Photo Selected', 'Please select or take a photo first.');
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
      formData.append('photo', {
        uri: photo,
        type: 'image/jpeg',
        name: 'profile_photo.jpg',
      });

      const response = await apiClient.postFile('/users/upload-photo', formData, token);
      
      Alert.alert(
        'Photo Uploaded!', 
        'Your profile photo has been uploaded successfully.',
        [
          { text: 'Continue', onPress: () => navigation.navigate('PhotoVerification') }
        ]
      );
      
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImageFromLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Your Photo</Text>
      <Text style={styles.subtitle}>
        Please upload a clear photo of yourself. This will be used for verification purposes.
      </Text>

      <TouchableOpacity
        style={[styles.photoBox, photo ? styles.photoBoxFilled : styles.photoBoxEmpty]}
        onPress={showImageOptions}
        disabled={uploading}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.plus}>+</Text>
            <Text style={styles.photoText}>Tap to add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {photo && (
        <TouchableOpacity style={styles.changeButton} onPress={showImageOptions}>
          <Text style={styles.changeButtonText}>Change Photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.uploadButton, (!photo || uploading) && styles.buttonDisabled]}
        onPress={handleUpload}
        disabled={!photo || uploading}
      >
        <Text style={styles.uploadButtonText}>
          {uploading ? 'UPLOADING...' : 'UPLOAD PHOTO'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate('PhotoVerification')}
        disabled={uploading}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  photoBox: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 30,
    borderWidth: 2,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxEmpty: {
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoBoxFilled: {
    borderColor: '#007AFF',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  plus: {
    fontSize: 40,
    color: '#aaa',
    marginBottom: 10,
  },
  photoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  changeButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  changeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  uploadButton: {
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
  uploadButtonText: {
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

export default PhotoUpload;