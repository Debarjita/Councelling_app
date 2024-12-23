# Mental Health Counseling App ( Using React Native)
## Introduction
The Mental Health Counseling App is a React Native-based mobile application designed to provide users with a streamlined and user-friendly experience for 
connecting with professional mental health counselors. This app focuses on verifying the identity of users through robust authentication methods and offering personalized recommendations for counselors based on the user's specific concerns.
  * This app is currently focused on the frontend functionality, with all logic and features designed for user interaction, identity verification,
   and counselor display. Future developments may include backend integration and real-time booking features.
## Table of Contents
- Key Features
- Technologies Used
- project structure
- Demo App Link
- Future Enchancements
- License
- Acknowlwdgements

# Key Features
  - **Identity Verification:**
      - Users are required to verify their identity through live photo verification to ensure authenticity.
      - Age verification is conducted using an official ID to ensure age-appropriate counseling recommendations.
- **Personalized Recommendations:**
     - Users can specify the type of mental health issue or concern they wish to address.
     - The app suggests a curated list of professional counselors who specialize in the relevant domain.
         
- **Counselor Profiles:**
     - Detailed profiles of counselors are displayed, including their qualifications, years of experience, ratings, and session fees.
  
- **Streamlined Navigation:**
    - A clean and intuitive interface facilitates easy access to verification features and counselor recommendations.

## Technologies Used
- React Native: Framework for building native apps using React.
- Expo: Platform for developing, building, and deploying React Native apps.
- React Navigation: Library for routing and navigation in React Native apps.
- Linear Gradient: Gradient design with expo-linear-gradient.
- StyleSheet: Built-in React Native utility for component styling.
- JavaScript (ES6+): Core programming language.
## Tools & Libraries:
- Expo CLI: Simplifies project creation, testing, and deployment.
- Node.js & npm: For managing dependencies.
- Interactive buttons with TouchableOpacity for user feedback.

# Project Structure
```go
LAMPY/
│   ├──app.js      ( The main app configuration, serves as the entry point for the Lampy app, setting up navigation and rendering the main screens with React Native and Expo.)
|   ├──login.js     (contains logic for the first login page with logo and singup/in options)
│   ├── createacc.js    (Contains logic for entering email, and creating password for a new user)
│   ├── location.js  (Contains logic for asking for accessing location permission from user)
│   ├──  locationpopup.js             (popup for accessing location while acessing the app)
│   ├── photoupload.js      (code for uploading user photoes for further verification)
│   ├── photoverification.js      (prompting user to take live picture in a particular ai generated pose , for further verification )
│   ├── photoaiverification.js     (Ai checks and verifies the account, else asks for retake)
│   ├── ageverification.js          (prompts user to upload a govt ID , for age verification using AI)
│   ├── question.js        (prompts user to select topics they want to consult a psycologist about)
│   ├── councellor.js   (According to their answer, shows the list of councellors specialising in the domain )
├── package.json
├── package-lock.json
```
### Demo Video

[Click here to watch the demo](https://drive.google.com/file/d/1XYDenW0VgXUHcgolqDm1HuiKmk67C9hE/view?usp=sharing)

## Future Enhancements
- Improved UI/UX
- Additional counselor filters
- Integration with third-party APIs
- AI implementation for verification
# License
This project is licensed under the MIT License.
# Acknowledgments
- React Native
- OpenAI for guidance.
