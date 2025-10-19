# Firebase Setup Guide for Faculty Feedback Portal

This guide will help you set up Firebase Firestore as the database for your Faculty Feedback Portal.

## Prerequisites

- A Google account
- Node.js installed (already configured in your project)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "Faculty Feedback Portal")
4. Click **Continue**
5. Choose whether to enable Google Analytics (optional, but recommended)
6. Click **Create project**
7. Wait for the project to be created, then click **Continue**

## Step 2: Enable Firestore Database

1. In the Firebase Console, click on **"Build"** in the left sidebar
2. Click on **"Firestore Database"**
3. Click **"Create database"**
4. Choose **"Start in production mode"** (recommended for security)
5. Select your preferred location (choose the one closest to your users)
6. Click **"Enable"**

The database will be created in a few moments.

## Step 3: Set Up Security Rules

1. In the Firestore Database page, click on the **"Rules"** tab
2. Replace the default rules with the following (since we're using Firebase Admin SDK, these rules won't apply to server operations):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

**Note:** We set the rules to deny all client access because this application uses the Firebase Admin SDK on the server side, which bypasses security rules.

## Step 4: Generate Service Account Key

1. In the Firebase Console, click on the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project settings"**
3. Navigate to the **"Service accounts"** tab
4. Click **"Generate new private key"**
5. A dialog will appear warning you about the key. Click **"Generate key"**
6. A JSON file will be downloaded to your computer. **Keep this file secure!**

⚠️ **IMPORTANT:** This file contains sensitive credentials. Never commit it to version control or share it publicly.

## Step 5: Configure Environment Variables in Replit

1. Open your Replit project
2. Click on the **"Tools"** button in the left sidebar (or look for the lock icon 🔒)
3. Select **"Secrets"**
4. Add a new secret:
   - **Key:** `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Value:** Open the downloaded JSON file and copy its **entire contents** (it should start with `{` and end with `}`)
5. Click **"Add new secret"**

The environment variable is now securely stored and will be available to your application.

## Step 6: Initialize Your Database with Collections

Firebase Firestore is a NoSQL database, so collections are created automatically when you add documents to them. However, you need to add initial data for your application to function properly.

### Required Collections

Your application uses the following collections:

1. **users** - Stores all users (ADMIN, HOD, STAFF, STUDENT)
2. **departments** - Academic departments
3. **staff** - Staff profiles linked to users
4. **academicYears** - Academic year information
5. **subjects** - Course/subject information
6. **facultyAssignments** - Links staff to subjects for specific semesters
7. **feedback** - Student feedback submissions
8. **hodSuggestions** - HOD comments on faculty reports

### Adding Initial Data

You can add initial data through the Firebase Console or by running a seed script.

#### Option A: Using Firebase Console (Manual)

1. Go to Firestore Database in Firebase Console
2. Click **"Start collection"**
3. Collection ID: `users`
4. Add a document with an auto-generated ID
5. Add fields for your admin user:
   - `name` (string): "Admin"
   - `email` (string): "admin@example.com"
   - `hashedPassword` (string): Use bcrypt to hash a password (see below)
   - `role` (string): "ADMIN"
   - `createdAt` (timestamp): Click **"Use current time"**
   - `updatedAt` (timestamp): Click **"Use current time"**

To generate a hashed password, you can use this Node.js command:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your_password', 10).then(console.log)"
```

Repeat this process for departments and academic years as needed.

#### Option B: Using a Seed Script (Recommended)

Create a file named `seed-firebase.js` in your project root:

```javascript
const admin = require('firebase-admin');
const bcrypt = require('bcrypt');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function seed() {
  console.log('Starting Firebase seed...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminRef = await db.collection('users').add({
    name: 'Admin User',
    email: 'admin@college.edu',
    hashedPassword: adminPassword,
    role: 'ADMIN',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created admin user:', adminRef.id);

  // Create Departments
  const csDept = await db.collection('departments').add({
    name: 'Computer Science',
    abbreviation: 'CS',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created CS department:', csDept.id);

  const eeDept = await db.collection('departments').add({
    name: 'Electrical Engineering',
    abbreviation: 'EE',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created EE department:', eeDept.id);

  // Create Academic Years
  const firstYear = await db.collection('academicYears').add({
    name: 'First Year',
    abbreviation: 'FY',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created First Year:', firstYear.id);

  const secondYear = await db.collection('academicYears').add({
    name: 'Second Year',
    abbreviation: 'SY',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Created Second Year:', secondYear.id);

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch(console.error);
```

Run the seed script:
```bash
node seed-firebase.js
```

## Step 7: Verify Your Setup

1. Restart your Replit server (stop and start the workflow)
2. Check the server logs for any Firebase connection errors
3. If you see errors about `FIREBASE_SERVICE_ACCOUNT_KEY`, verify that:
   - The secret is named exactly `FIREBASE_SERVICE_ACCOUNT_KEY`
   - The value is valid JSON (starts with `{` and ends with `}`)
   - There are no extra quotes or escape characters

## Step 8: Test Your Application

1. Try logging in with your admin credentials
2. Create a department, staff member, or student
3. Check the Firestore Database in Firebase Console to verify data is being saved

## Troubleshooting

### Error: "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"

**Solution:** Make sure you've added the secret in Replit's Secrets panel (Tools → Secrets).

### Error: "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY"

**Solution:** The JSON is malformed. Copy the entire contents of the downloaded service account JSON file again. Make sure there are no extra characters or line breaks.

### Error: "Permission denied" or "PERMISSION_DENIED"

**Solution:** 
1. Check that your service account key is valid
2. Verify that the Firebase project is active
3. Make sure Firestore is enabled in your Firebase project

### Data not appearing in Firestore

**Solution:**
1. Check the server logs for error messages
2. Verify your Firebase service account has the correct permissions
3. Make sure you're looking at the correct Firebase project in the console

## Security Best Practices

1. **Never commit the service account JSON file to Git** - It's already in `.gitignore`
2. **Use environment variables** - Always store the key in Replit Secrets
3. **Rotate keys periodically** - Generate new service account keys every few months
4. **Monitor usage** - Check Firebase Console for unusual activity
5. **Restrict access** - Only share the service account key with trusted team members

## Data Migration from PostgreSQL (If Applicable)

If you're migrating from an existing PostgreSQL database, you'll need to export your data and import it into Firestore. Contact your administrator for a migration script or use the Firebase Admin SDK to batch-import data.

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## Support

If you encounter any issues during setup, please check the Firebase Console logs or contact your system administrator.

---

**Last Updated:** October 19, 2025
