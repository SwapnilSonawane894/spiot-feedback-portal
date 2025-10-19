import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App;
let db: Firestore;

function initializeFirebase() {
  if (getApps().length === 0) {
    const serviceAccountKey = {
      type: "service_account",
      project_id: "student-feedback-portal-9c298",
      private_key_id: "3971b0d6cfd266bc3a8fb249a69a2ea515b67206",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4reKhsky2oaHC\nx8lklsX1ovnAL8FlI1RJegC60TRRIu6eI/MZqisgqwMlQo8OxIiOwr3hSZwXRx91\nbbGdh+QZQypXNPDJpV+r9gjlzn2nbSJNI5dEDBNgMCPHA7oQxIaz8ecRhJkYeyWc\nY1a0Yd3wCxh0Jjdz5uoYz6dqJ8BE2Jo6zCIdQ3A9vo2IGfUmuSozBIwDoX8dP+bR\n1zCKcz46GkSPpRqJpmCfyOes7gqsGB3jyKNab+dGcBR8ndMvw+3qLVIVAy+D6hTj\nBrLLTn2rK6a2LWKFX+cUacb2GsnBo5PYlnFVZUlnTxYoJHZpfkrHJCvGhqZHtymr\nAXbjhzmTAgMBAAECggEAAaN9VszztE0j18wZA9z4nbDYAXYLA8A3/7zm48F2ct/Z\n+So9fnVNk6kgyoRYK5vf0FB3Cdgy29wEMfEKueiaRAUeC48LMebXPfndY1idMc6c\nls2hineG9nwG3T2xuXNc9JzJXZTtHNP+5e/VtZ0GsJoQmfs607rxSc4R4LXAlXvI\nqRkxUUOT4CDmuxOZWJoJ5iIpCi6KpYypYk+yEZaiwgQohnmANhjYXIoKmu+azUIu\naAUQvPxah6UJJDznmbf+aNOEvX+iJlirja3w7F+6FAD1mrsRRq285B8niY2ywM/l\nJ42PKekc31wbjpO8pg+IwFl/ySI+uduGApUVdW0x3QKBgQDmXYREpvDjA7R+6pyB\nHKmbebw/HhUXQ7BR8+V/TJpJCM6rtJxMHv5oJLcbEflU8Dc4M84V1i4dHCSHOjqz\nsePtOF5vXF4dXZFqvfbf5eBnPZTUqo1kXLC0xhXTI6kCCRqTOogbsBWN3kjh0IIm\nOSfZLkPJC07zQhR0qq5Iruu/7QKBgQDNOuWCIZ9P8UcXpl6rpDIdueqsRz7/sVz7\nrNJ88rJIxXkkyyyapS7sNHQhJDf2ShVu9Dp+hqNL0R4Uu6c2HBmeKOzK8NTFjorl\nbGIahEpy/0rU0sIbxE2nCBbouXeWoSMZ9D/EKNJcA9wyuFuOIbquZsyD6TWPUT9F\nWohueeCvfwKBgQCP7xZZnsUb0pDQS96FfVcr4aAQ/8bFxnFAg1d9dmtf/rTC7BJM\nLYFfqLEPpOdYfs7BuvylADHH1nGsXGGZLSjwayv2AIx9ZJ0bSJ4bvxG67+syBW5a\nqt9t0+aHCdzrfKyyGPw58IdHIQAAt7raDxQqypFn6DzoGP2W9531o/WA8QKBgGfG\nd1U1ESzIUW2JB+f88AaOAzc4E4gRtHXirtDVnAcmK5rKTfSowDBaWbqEaPPWBD6F\nqqpeBGaLCI3tUaEP1nheM1ZvLvfymxNlmbnU2RyLMNiq9dI6khV7BrKJTgpR0sEF\n+9SB29UBcrAG/uzA63fSrWmqXBXrPHYiUEikwlObAoGBANvau8OFJ7xib279uQp4\nMNK9RkwGMwQnN2ohlgis4d8PU3qU7UekjLQ6EnujqDPsiz4Dv7gBs+nDlkKou6MD\nNx8eAkcQJXQN0sPh19AYwca1IoDE8f542KPiB01CVUideY+Z0qHKPzwE9j2EFGxu\nLVVDSgVKJSfX/0Ln2vtYxoLP\n-----END PRIVATE KEY-----\n",
      client_email:
        "firebase-adminsdk-fbsvc@student-feedback-portal-9c298.iam.gserviceaccount.com",
      client_id: "108616234227286708091",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url:
        "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40student-feedback-portal-9c298.iam.gserviceaccount.com",
      universe_domain: "googleapis.com",
    };

    app = initializeApp({
      credential: cert(serviceAccountKey),
    });
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  return { app, db };
}

const { db: firestore } = initializeFirebase();

export { firestore };
export default firestore;
