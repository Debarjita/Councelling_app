import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const Photoaiverification = () => {
  const navigation = useNavigation();

  const handleAgreeAndSubmit = () => {
    navigation.navigate('AgePhotoUpload'); // Navigates to ageverification.js page
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Photo Header */}
      <View style={styles.photoContainer}>
        <Image
          source={require('./assets/thumsup.png')} // Replace with the correct image paths
          style={styles.photo}
        />
        <Image
          source={require('./assets/ci.png')}
          style={styles.photo}
        />
      </View>

      {/* Instructional Text */}
      <Text style={styles.title}>Review and save your photo</Text>
      <Text style={styles.description}>
        • Lampy will compare this photo with your profile photo, which may include the use of facial recognition technology.{'\n\n'}
        • We’ll keep your photo and scans to verify your photos in the future.
      </Text>
      <Text style={styles.helpText}>
        Contact us via our Help Centre to withdraw your consent
      </Text>

      {/* Buttons */}
      <TouchableOpacity style={styles.agreeButton} onPress={handleAgreeAndSubmit}>
        <Text style={styles.agreeButtonText}>Agree and submit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.retakeButton}>
        <Text style={styles.retakeButtonText}>Retake</Text>
      </TouchableOpacity>

      {/* Additional Links */}
      <TouchableOpacity>
        <Text style={styles.link}>View Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.link}>Why is this needed?</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Text style={styles.link}>Withdraw consent via Support</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  photoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  photo: {
    width: 130,
    height: 130,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  description: {
    fontSize: 16,
    color: '#444',
    textAlign: 'left',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginVertical: 10,
  },
  agreeButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retakeButton: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
    marginVertical: 5,
  },
  retakeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    fontSize: 14,
    color: '#007BFF',
    textAlign: 'center',
    marginVertical: 5,
    textDecorationLine: 'underline',
  },
});

export default Photoaiverification;
