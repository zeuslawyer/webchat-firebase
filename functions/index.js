/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// TODO(DEVELOPER): Import the Cloud Functions for Firebase and the Firebase Admin modules here.
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

 // helper - data and time string
 function getLocalDateAndTime() {
    return new Date().toLocaleString('en-GB', { timeZone: 'Australia/Melbourne' })
  }

// TODO(DEVELOPER): Write the addWelcomeMessages Function here.
exports.addWelcomeMessages = functions.auth.user().onCreate(async (user) => {
    const fullName = user.displayName || 'New Friend';
    console.log( fullName + ' signed in for the first time - at - ' + getLocalDateAndTime() );

    // Saves the new welcome message into the database
    // which then displays it in the FriendlyChat clients.
    await admin.database().ref('chatapp/messages').push({
      name: 'Admin',
      profilePicUrl: '/images/firebase-logo.png', // Firebase logo
      message: `Hi,  ${fullName}! Welcome!`,
      timestamp: getLocalDateAndTime()
    });
    console.log('Welcome message to ' + fullName + ' written to database.');
  });
  

// TODO(DEVELOPER): Write the blurOffensiveImages Function here.

// TODO(DEVELOPER): Write the sendNotifications Function here.
exports.sendNotifications = functions.database.ref('chatapp/messages/{messageId}').onCreate(
  async (snapshot, eventContext) => {
    // console.log('event context is :  ' + eventContext)
    // console.log('snapshot val is :  ' + snapshot.val())
    // console.log('GCLOUD project is :  ' + process.env.GCLOUD_PROJECT)
    // console.log('MessageID Param is  :  ' + eventContext.params)
    
    // Notification details.
    const text = snapshot.val().text;
    const payload = {
      notification: {
        title: `${snapshot.val().name} posted ${text ? 'a message' : 'an image'}`,
        body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
        icon: snapshot.val().photoUrl || '/images/profile_placeholder.png',
        click_action: `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`,
      }
    };

    // Get the list of device tokens.
    const allTokens = await admin.database().ref('chatapp/fcmTokens').once('value');
    if (allTokens.exists()) {
       // Listing all device tokens to send a notification to.
      console.dir('the all Tokens Snapshot is :  ' + allTokens.val())
      const tokens = Object.keys(allTokens.val());

      // Send notifications to all tokens.
      const response = await admin.messaging().sendToDevice(tokens, payload);
      await cleanupTokens(response, tokens);
      console.log('Notifications have been sent and tokens cleaned up.');
    }
  });

  function cleanupTokens(response, tokens) {
    // For each notification we check if there was an error.
    const tokensToRemove = {};
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup the tokens who are not registered anymore.
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          tokensToRemove[`/chatapp/fcmTokens/${tokens[index]}`] = null;
        }
      }
    });
    return admin.database().ref().update(tokensToRemove);
   }

// (OPTIONAL) TODO(DEVELOPER): Write the annotateMessages Function here.
