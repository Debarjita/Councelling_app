// photoverification.js - ONLY PhotoVerification component
import React, { useState } from 'react';
import { ScrollView, View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiClient, authUtils } from './config/api';

const PhotoVerification = () => {
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required', 
        'Please allow camera access to take your verification photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => {
            // You can add deep linking to settings here if needed
          }}
        ]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      aspect: [3, 4],
    });

    if (!result.canceled && result.assets[0]) {
      await uploadVerificationPhoto(result.assets[0].uri);
    }
  };

  const uploadVerificationPhoto = async (photoUri) => {
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
        uri: photoUri,
        type: 'image/jpeg',
        name: 'verification_photo.jpg',
      });

      const response = await apiClient.postFile('/auth/verify-photo', formData, token);
      
      if (response.status === 'pending') {
        Alert.alert(
          'Verification Photo Uploaded!',
          'Your photo has been submitted for verification. Our team will review it shortly.',
          [
            { text: 'Continue', onPress: () => navigation.navigate('Photoaiverification') }
          ]
        );
      }
      
    } catch (error) {
      console.error('Verification photo upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload verification photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Pose Image */}
        <Image
          source={require('./assets/ci.png')} // Your pose reference image
          style={styles.poseImage}
        />

        <Text style={styles.title}>Copy this pose exactly</Text>
        <Text style={styles.instructions}>
          Hold your phone at arm's length and copy the pose shown above. Make sure your face is clearly visible and well-lit.
        </Text>

        <Text style={styles.subtitle}>To verify successfully:</Text>
        <Text style={styles.bulletText}>• Your face must be clearly visible</Text>
        <Text style={styles.bulletText}>• You must be copying this pose exactly</Text>
        <Text style={styles.bulletText}>• Ensure good lighting</Text>
        <Text style={styles.bulletText}>• Remove sunglasses or face coverings</Text>

        <Text style={styles.privacyInfo}>
          Your verification photo will be used only for identity verification and will not be visible on your profile.
        </Text>

        <TouchableOpacity 
          style={[styles.takePhotoButton, uploading && styles.buttonDisabled]} 
          onPress={handleTakePhoto}
          disabled={uploading}
        >
          <Text style={styles.takePhotoButtonText}>
            {uploading ? 'UPLOADING...' : 'TAKE MY PHOTO'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => navigation.navigate('Photoaiverification')}
          disabled={uploading}
        >
          <Text style={styles.skipButtonText}>Skip verification for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  poseImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    borderRadius: 100,
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  bulletText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginBottom: 5,
  },
  privacyInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 16,
  },
  takePhotoButton: {
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
  takePhotoButtonText: {
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

export default PhotoVerification;