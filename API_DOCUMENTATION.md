# Pravi Marketplace - API & Backend Connection Guide

This document outlines how the Pravi frontend connects to the backend services and how to configure the API connection.

## 1. Architecture Overview

Pravi is a **serverless application**. It does not have a traditional Node.js/Express backend server. Instead, it connects directly from the browser to **Google Firebase** services using the Firebase Web SDK.

-   **Frontend:** HTML, CSS, Vanilla JavaScript (`app.js`)
-   **Backend API:** Firebase SDK (Authentication, Realtime Database)
-   **Hosting:** Vercel

## 2. Connection Configuration

The application connects to Firebase using configuration keys stored in `firebase-config.js`.

### 2.1. Environment Variables
For security, API keys are not hardcoded in the source code. They are injected via Environment Variables during the build process.

**Required Variables:**
Ensure these are set in your Vercel Project Settings or local `.env` file:

| Variable Name | Description |
| :--- | :--- |
| `PUBLIC_FIREBASE_API_KEY` | Firebase Project API Key |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth Domain (e.g., `project.firebaseapp.com`) |
| `PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL (Must start with `https://`) |
| `PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage Bucket URL |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID for messaging |
| `PUBLIC_FIREBASE_APP_ID` | App ID |

### 2.2. Build Process (`generate-config.js`)
When deploying to Vercel, the build command `node generate-config.js` runs.
1.  It reads the environment variables.
2.  It creates a file named `firebase-config.js` in the root directory.
3.  `app.js` loads this file to initialize the Firebase connection.

## 3. Data API Structure (Realtime Database)

The application interacts with the Firebase Realtime Database JSON tree. Below are the key data nodes (endpoints):

### `users/`
Stores user profile data.
-   **Path:** `users/{uid}`
-   **Fields:** `name`, `email`, `phone`, `role` ('user', 'seller', 'admin'), `createdAt`.
-   **Security:** Users can read/write their own data. Admins can read all.

### `listings/`
Stores website listings for sale.
-   **Path:** `listings/{listingId}`
-   **Fields:** `title`, `description`, `price`, `websiteURL`, `imageBase64`, `userId`, `contactEmail`.
-   **Security:** Public read access. Only owners and admins can write/delete.

### `orders/`
Stores purchase records.
-   **Path:** `orders/{orderId}`
-   **Fields:** `userId`, `items` (Array), `total`, `status` ('pending', 'completed').
-   **Security:** Users can read their own orders. Admins can manage all.

### `applications/`
Stores seller verification requests.
-   **Path:** `applications/{applicationId}`
-   **Fields:** `applicantId`, `aadhaarData` (Base64), `panData` (Base64), `status`.
-   **Security:** Write-only for applicants. Read-only for Admins.

## 4. Authentication API

Authentication is handled via `firebase.auth()`.

-   **Provider:** Email/Password
-   **Session:** Managed automatically by Firebase SDK (persisted in LocalStorage/IndexedDB).
-   **Admin Access:** The specific email `master-dev@pravi.internal` is hardcoded in `app.js` to trigger Admin account creation on first login.

## 5. Troubleshooting Connection Issues

If you see "Firebase Config Error" or "404 Not Found" for `firebase-config.js`:
1.  **Check Vercel Logs:** Look at the build logs to see if `generate-config.js` ran successfully.
2.  **Verify Variables:** Ensure all `PUBLIC_FIREBASE_...` variables are present in Vercel settings.
3.  **Database URL:** Ensure `PUBLIC_FIREBASE_DATABASE_URL` starts with `https://`.