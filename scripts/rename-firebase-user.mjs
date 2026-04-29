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

const optional = (name) => {
  const value = process.env[name]?.trim();
  return value || undefined;
};

const serviceAccountPath = resolve(
  process.cwd(),
  process.env.SERVICE_ACCOUNT_PATH || "service-account.json",
);

const uid = required("FIREBASE_AUTH_UID");
const newEmail = required("FIREBASE_AUTH_EMAIL").toLowerCase();
const newName = required("FIREBASE_AUTH_NAME");
const oldEmail = optional("FIREBASE_AUTH_OLD_EMAIL")?.toLowerCase();
const newPassword = optional("FIREBASE_AUTH_PASSWORD");

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const authUpdate = {
  email: newEmail,
  displayName: newName,
  emailVerified: true,
};

if (newPassword) {
  authUpdate.password = newPassword;
}

const user = await admin.auth().updateUser(uid, authUpdate);

console.log("Auth actualizado:");
console.log(`uid: ${user.uid}`);
console.log(`email: ${user.email}`);
console.log(`displayName: ${user.displayName ?? ""}`);

const collections = ["watchlist", "plans", "goals", "tamagotchi"];
const byUidFields = ["createdByUid", "updatedByUid"];
const byEmailFields = ["createdByEmail", "updatedByEmail"];

function patchForData(data) {
  const patch = {};

  const createdMatches =
    data.createdByUid === uid ||
    (oldEmail && String(data.createdByEmail ?? "").toLowerCase() === oldEmail);
  const updatedMatches =
    data.updatedByUid === uid ||
    (oldEmail && String(data.updatedByEmail ?? "").toLowerCase() === oldEmail);

  if (createdMatches) {
    patch.createdByUid = uid;
    patch.createdByEmail = newEmail;
    patch.createdByName = newName;
  }

  if (updatedMatches) {
    patch.updatedByUid = uid;
    patch.updatedByEmail = newEmail;
    patch.updatedByName = newName;
  }

  return patch;
}

async function patchQuery(collectionName, field, value, seenRefs, batchState) {
  const snap = await db.collection(collectionName).where(field, "==", value).get();

  for (const doc of snap.docs) {
    if (seenRefs.has(doc.ref.path)) continue;

    const patch = patchForData(doc.data());
    if (Object.keys(patch).length === 0) continue;

    batchState.batch.update(doc.ref, patch);
    batchState.count++;
    seenRefs.add(doc.ref.path);

    if (batchState.count % 450 === 0) {
      await batchState.batch.commit();
      batchState.batch = db.batch();
    }
  }
}

let changed = 0;

for (const collectionName of collections) {
  const seenRefs = new Set();
  const batchState = { batch: db.batch(), count: 0 };

  for (const field of byUidFields) {
    await patchQuery(collectionName, field, uid, seenRefs, batchState);
  }

  if (oldEmail) {
    for (const field of byEmailFields) {
      await patchQuery(collectionName, field, oldEmail, seenRefs, batchState);
    }
  }

  if (batchState.count % 450 !== 0) {
    await batchState.batch.commit();
  }

  changed += batchState.count;
  console.log(`${collectionName}: ${batchState.count} documentos actualizados`);
}

console.log(`Firestore actualizado: ${changed} documentos`);
