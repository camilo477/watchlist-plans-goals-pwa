import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import admin from "firebase-admin";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Falta ${name}`);
  }
  return value;
};

const serviceAccountPath = resolve(
  process.cwd(),
  process.env.SERVICE_ACCOUNT_PATH || "service-account.json",
);
const uid = required("FIREBASE_AUTH_UID");
const email = required("FIREBASE_AUTH_EMAIL");
const password = required("FIREBASE_AUTH_PASSWORD");

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const user = await admin.auth().updateUser(uid, {
  email,
  password,
  emailVerified: true,
});

console.log("Usuario actualizado:");
console.log(`uid: ${user.uid}`);
console.log(`email: ${user.email}`);
