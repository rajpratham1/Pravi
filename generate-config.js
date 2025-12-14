const fs = require('fs');

// Debug: Log available environment variables (keys only) to help troubleshooting
console.log('Current Environment Variables (Keys):', Object.keys(process.env).filter(k => k.startsWith('PUBLIC_')));

const requiredVars = [
    'PUBLIC_FIREBASE_API_KEY',
    'PUBLIC_FIREBASE_AUTH_DOMAIN',
    'PUBLIC_FIREBASE_DATABASE_URL',
    'PUBLIC_FIREBASE_PROJECT_ID',
    'PUBLIC_FIREBASE_STORAGE_BUCKET',
    'PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'PUBLIC_FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(key => !process.env[key]);

if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach(key => console.error(` - ${key}`));
    console.error('Please check your Vercel Project Settings > Environment Variables. Ensure they are enabled for "Production", "Preview", and "Development".');
    process.exit(1);
}

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
