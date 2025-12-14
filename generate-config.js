const fs = require('fs');

const firebaseConfig = {
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.PUBLIC_FIREBASE_APP_ID
};

const content = `const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};`;

try {
    fs.writeFileSync('firebase-config.js', content);
    console.log('firebase-config.js generated successfully.');
} catch (error) {
    console.error('Error generating firebase-config.js:', error);
    process.exit(1);
}
