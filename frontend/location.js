// location.js - Updated with backend integration
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, PermissionsAndroid, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { apiClient, authUtils } from './config/api';

const LocationScreen = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState(null);
  const [locationString, setLocationString] = useState('');
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        getCurrentLocation();
      } else {
        setPermissionGranted(false);
        Alert.alert(
          'Location Permission Required', 
          'LAMPY needs access to your location to find counselors near you. Please grant location permission.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Grant Permission', onPress: requestLocationPermission }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setPermissionGranted(true);
        getCurrentLocation();
      } else {
        Alert.alert(
          'Permission Denied', 
          'Location access is required to provide personalized counselor recommendations. You can manually enter your location or grant permission later.',
          [
            { text: 'Continue Anyway', onPress: () => setLocationString('Location not provided') },
            { text: 'Try Again', onPress: requestLocationPermission }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLocation(location);
      
      // Reverse geocoding to get address
      let address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      if (address && address.length > 0) {
        const addr = address[0];
        const locationStr = `${addr.city || addr.subregion || ''}, ${addr.region || ''}, ${addr.country || ''}`.replace(/^,\s*|,\s*$/g, '');
        setLocationString(locationStr || 'Location detected');
      } else {
        setLocationString(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
      }
      
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Failed to get your current location. Please try again or enter manually.');
      setLocationString('Location detection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSubmit = async () => {
    if (!locationString) {
      Alert.alert('Error', 'Please allow location access or wait for location detection to complete.');
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

      await apiClient.post('/users/location', { 
        location: locationString 
      }, token);

      Alert.alert(
        'Location Updated!', 
        'Your location has been saved successfully.',
        [
          { text: 'Continue', onPress: () => navigation.navigate('PhotoUpload') }
        ]
      );
      
    } catch (error) {
      console.error('Location update error:', error);
      Alert.alert('Error', error.message || 'Failed to update location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const skipLocation = () => {
    Alert.alert(
      'Skip Location?',
      'Skipping location will limit our ability to recommend counselors near you. Are you sure?',
      [
        { text: 'Go Back', style: 'cancel' },
        { 
          text: 'Skip Anyway', 
          onPress: async () => {
            try {
              const token = await authUtils.getToken();
              await apiClient.post('/users/location', { 
                location: 'Location not provided' 
              }, token);
              navigation.navigate('PhotoUpload');
            } catch (error) {
              console.error('Skip location error:', error);
              navigation.navigate('PhotoUpload'); // Continue anyway
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable Location Access</Text>
      
      <Text style={styles.subtitle}>
        LAMPY uses your location to find the best counselors near you and provide personalized recommendations.
      </Text>

      <View style={styles.locationContainer}>
        <Text style={styles.locationLabel}>Current Location:</Text>
        <Text style={styles.locationText}>
          {loading ? 'Detecting location...' : locationString || 'Location not detected'}
        </Text>
      </View>

      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Benefits of sharing location:</Text>
        <Text style={styles.benefit}>• Find counselors near you</Text>
        <Text style={styles.benefit}>• Get personalized recommendations</Text>
        <Text style={styles.benefit}>• Reduce travel time to sessions</Text>
        <Text style={styles.benefit}>• Emergency support when needed</Text>
      </View>

      {!permissionGranted && (
        <TouchableOpacity 
          style={styles.permissionButton} 
          onPress={requestLocationPermission}
          disabled={loading}
        >
          <Text style={styles.permissionButtonText}>Grant Location Permission</Text>
        </TouchableOpacity>
      )}

      {permissionGranted && !loading && (
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={getCurrentLocation}
        >
          <Text style={styles.refreshButtonText}>Refresh Location</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={[styles.continueButton, loading && styles.buttonDisabled]} 
        onPress={handleLocationSubmit}
        disabled={loading || !locationString}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'UPDATING...' : 'CONTINUE'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.skipButton} 
        onPress={skipLocation}
        disabled={loading}
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
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  locationContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 16,
    color: '#007AFF',
  },
  benefitsContainer: {
    marginBottom: 30,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  benefit: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    paddingLeft: 10,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButton: {
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
  continueButtonText: {
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

export default LocationScreen;