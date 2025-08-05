// councellor.js - Updated with backend integration
import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiClient, authUtils } from './config/api';

const Counsellor = () => {
  const navigation = useNavigation();
  const [counsellors, setCounsellors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState({});

  useEffect(() => {
    fetchCounsellors();
  }, []);

  const fetchCounsellors = async () => {
    try {
      const token = await authUtils.getToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        navigation.navigate('Home');
        return;
      }

      // First try to get recommended counsellors based on user preferences
      let response;
      try {
        response = await apiClient.get('/counsellors/recommended', token);
      } catch (error) {
        // If recommended fails, get all counsellors
        console.log('Recommended counsellors failed, getting all counsellors');
        response = await apiClient.get('/counsellors', token);
      }

      if (response && Array.isArray(response)) {
        setCounsellors(response);
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('Fetch counsellors error:', error);
      Alert.alert('Error', 'Failed to load counsellors. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCounsellors();
  };

  const handleBookSession = async (counsellorId, counsellorName) => {
    Alert.alert(
      'Book Session',
      `Would you like to book a session with ${counsellorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Book Now', 
          onPress: () => bookSession(counsellorId, counsellorName)
        }
      ]
    );
  };

  const bookSession = async (counsellorId, counsellorName) => {
    setBookingLoading(prev => ({ ...prev, [counsellorId]: true }));
    
    try {
      const token = await authUtils.getToken();
      
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        navigation.navigate('Home');
        return;
      }

      // Create a session for tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const response = await apiClient.post('/sessions/book', {
        counsellor_id: counsellorId,
        session_date: tomorrow.toISOString(),
        duration: 60,
        notes: 'Initial consultation session'
      }, token);

      if (response) {
        Alert.alert(
          'Session Booked Successfully!',
          `Your session with ${counsellorName} has been booked for ${tomorrow.toLocaleDateString()} at 10:00 AM. You will receive a confirmation shortly.`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Book session error:', error);
      Alert.alert('Booking Failed', error.message || 'Failed to book session. Please try again.');
    } finally {
      setBookingLoading(prev => ({ ...prev, [counsellorId]: false }));
    }
  };

  const handleViewProfile = (counsellor) => {
    Alert.alert(
      counsellor.name,
      `Role: ${counsellor.role}\nExperience: ${counsellor.experience}\nQualification: ${counsellor.qualification}\nRating: ${counsellor.rating} (${counsellor.total_ratings} ratings)\nSpecialties: ${counsellor.specialties?.join(', ') || 'General counseling'}\n\nSession starting at ${counsellor.price}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Book Session', onPress: () => handleBookSession(counsellor.id, counsellor.name) }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading counsellors...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Available Counsellors</Text>
        <Text style={styles.subHeaderText}>
          {counsellors.length > 0 ? 
            `Found ${counsellors.length} counsellors based on your preferences` : 
            'No counsellors found'
          }
        </Text>
      </View>

      {/* Counsellor List */}
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {counsellors.length === 0 ? (
          <View style={styles.emptyCont}>
            <Text style={styles.emptyText}>No counsellors available at the moment.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchCounsellors}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          counsellors.map((counsellor) => (
            <View key={counsellor.id} style={styles.box}>
              <Image 
                source={counsellor.image_url ? 
                  { uri: counsellor.image_url } : 
                  require('./assets/ci.png')
                } 
                style={styles.image} 
              />
              <View style={styles.infoContainer}>
                <Text style={styles.name}>{counsellor.name}</Text>
                <Text style={styles.role}>{counsellor.role}</Text>
                <Text style={styles.details}>
                  {counsellor.experience} | {counsellor.qualification}
                </Text>
                <Text style={styles.rating}>
                  ⭐ {counsellor.rating} ({counsellor.total_ratings} ratings)
                </Text>
                {counsellor.specialties && counsellor.specialties.length > 0 && (
                  <Text style={styles.specialties}>
                    Specialties: {counsellor.specialties.slice(0, 2).join(', ')}
                    {counsellor.specialties.length > 2 && '...'}
                  </Text>
                )}
                <Text style={styles.price}>Session starting at {counsellor.price}</Text>
                
                <View style={styles.buttonsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.bookButton, 
                      bookingLoading[counsellor.id] && styles.buttonDisabled
                    ]}
                    onPress={() => handleBookSession(counsellor.id, counsellor.name)}
                    disabled={bookingLoading[counsellor.id]}
                  >
                    <Text style={styles.buttonText}>
                      {bookingLoading[counsellor.id] ? 'Booking...' : 'Book Session'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.profileButton}
                    onPress={() => handleViewProfile(counsellor)}
                  >
                    <Text style={styles.buttonText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 LAMPY Mental Health Support</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={async () => {
            Alert.alert(
              'Logout',
              'Are you sure you want to logout?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Logout', 
                  onPress: async () => {
                    await authUtils.clearUserData();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Home' }],
                    });
                  }
                }
              ]
            );
          }}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    padding: 15,
    paddingBottom: 100, // Space for footer
  },
  emptyCont: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  box: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  rating: {
    fontSize: 12,
    color: '#ff9500',
    marginBottom: 4,
  },
  specialties: {
    fontSize: 11,
    color: '#28a745',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bookButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    flex: 1,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  profileButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    flex: 1,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default Counsellor;