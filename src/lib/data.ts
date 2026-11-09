import * as firestore from "firebase/firestore";
import { isDemoMode } from "./demo";
import { DemoStore } from "./demoStore";
export type { DocumentData } from "firebase/firestore";

let storage: Storage | undefined;
if (isDemoMode) { try { storage = window.sessionStorage; } catch { /* In-memory fallback. */ } }
const demo = new DemoStore(storage);
export const resetDemo = () => demo.reset();

export function collection(database: firestore.Firestore, name: string): firestore.CollectionReference {
  return isDemoMode ? { path: name } as firestore.CollectionReference : firestore.collection(database, name);
}
export function doc(database: firestore.Firestore, name: string, id: string): firestore.DocumentReference {
  return isDemoMode ? { path: `${name}/${id}`, id, type: "document" } as firestore.DocumentReference : firestore.doc(database, name, id);
}
export function orderBy(field: string, direction: firestore.OrderByDirection = "asc"): firestore.QueryConstraint {
  return isDemoMode ? { field, direction } as unknown as firestore.QueryConstraint : firestore.orderBy(field, direction);
}
export function query(reference: firestore.CollectionReference, ...constraints: firestore.QueryConstraint[]): firestore.Query {
  return isDemoMode ? { path: reference.path, sort: constraints[0] } as unknown as firestore.Query : firestore.query(reference, ...constraints);
}
export function onSnapshot(reference: firestore.DocumentReference, next: (snapshot: firestore.DocumentSnapshot) => void, error?: (error: firestore.FirestoreError) => void): () => void;
export function onSnapshot(reference: firestore.Query, next: (snapshot: firestore.QuerySnapshot) => void, error?: (error: firestore.FirestoreError) => void): () => void;
export function onSnapshot(reference: any, next: (snapshot: any) => void, error?: (error: firestore.FirestoreError) => void) {
  if (!isDemoMode) return firestore.onSnapshot(reference, next, error);
  return demo.subscribe(() => {
    if (reference.type === "document") {
      const [name, id] = reference.path.split("/");
      const value = demo.get(name, id);
      next({ id, exists: () => value !== undefined, data: () => value });
    } else next({ docs: demo.list(reference.path, reference.sort) });
  });
}
export function serverTimestamp() {
  return isDemoMode ? { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } : firestore.serverTimestamp();
}
export async function addDoc(reference: firestore.CollectionReference, value: firestore.DocumentData) {
  if (!isDemoMode) return firestore.addDoc(reference, value);
  const id = crypto.randomUUID();
  demo.put(reference.path, id, value);
  return { id };
}
export async function updateDoc(reference: firestore.DocumentReference, value: firestore.DocumentData) {
  if (!isDemoMode) return firestore.updateDoc(reference, value);
  const [name, id] = reference.path.split("/");
  demo.put(name, id, value, true);
}
export async function setDoc(reference: firestore.DocumentReference, value: firestore.DocumentData, options: { merge: boolean }) {
  if (!isDemoMode) return firestore.setDoc(reference, value, options);
  const [name, id] = reference.path.split("/");
  demo.put(name, id, value, options.merge);
}
export async function deleteDoc(reference: firestore.DocumentReference) {
  if (!isDemoMode) return firestore.deleteDoc(reference);
  const [name, id] = reference.path.split("/");
  demo.remove(name, id);
}
