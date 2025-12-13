const fs = require('fs');

// These environment variables must be set in your Vercel project settings.
const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID,
};

// Validate that all required environment variables are present.
if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL || !firebaseConfig.projectId) {
    console.error("Error: Missing required Firebase environment variables (PUBLIC_FIREBASE_API_KEY, PUBLIC_FIREBASE_DATABASE_URL, PUBLIC_FIREBASE_PROJECT_ID).");
    // Exit with an error code to fail the Vercel build if config is incomplete.
    process.exit(1); 
}

const configContent = `const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};`;

try {
    // We are in the 'Pravi' subdirectory, so we write the file to the current directory.
    fs.writeFileSync('firebase-config.js', configContent);
    console.log('Successfully generated firebase-config.js');
} catch (error) {
    console.error('Failed to write firebase-config.js:', error);
    process.exit(1);
}
