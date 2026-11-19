/* Firebase browser adapter; inert unless explicitly enabled with the verified public web-app config. */
export type Session = { uid: string; email: string; displayName: string };
type FirebaseModules = { app: any; auth: any; firestore: any };
const env = (import.meta as any).env ?? {};
export const firebaseIsConfigured = () => env.VITE_FIREBASE_ENABLED === 'true' && env.VITE_FIREBASE_PROJECT_ID === 'stream-flow-pro' && Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_AUTH_DOMAIN && env.VITE_FIREBASE_APP_ID);
let modulesPromise: Promise<FirebaseModules> | null = null;
async function modules(): Promise<FirebaseModules> {
  if (!firebaseIsConfigured()) throw new Error('Firebase no está habilitado. La configuración y las reglas todavía requieren verificación.');
  if (!modulesPromise) {
    const load = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const version = '11.10.0';
    modulesPromise = Promise.all([
      load(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      load(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      load(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
    ]).then(([app, auth, firestore]) => {
      const config = { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID, ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID } : {}) };
      const instance = app.getApps().length ? app.getApp() : app.initializeApp(config);
      return { app: instance, auth: auth.getAuth(instance), firestore: firestore.getFirestore(instance) };
    }).catch((error) => { modulesPromise = null; throw error; });
  }
  return modulesPromise;
}
const toSession = (user: any): Session | null => user ? ({ uid: user.uid, email: user.email ?? '', displayName: user.displayName ?? user.email?.split('@')[0] ?? '' }) : null;
export async function observeSession(callback: (session: Session | null) => void): Promise<() => void> {
  if (!firebaseIsConfigured()) { callback(null); return () => undefined; }
  const m = await modules();
  return m.auth.onAuthStateChanged(m.auth, (u: any) => callback(toSession(u)));
}
export async function signIn(email: string, password: string): Promise<Session> {
  const m = await modules();
  return toSession((await m.auth.signInWithEmailAndPassword(m.auth, email.trim(), password)).user)!;
}
export async function register(email: string, password: string, name: string): Promise<Session> {
  const m = await modules();
  const result = await m.auth.createUserWithEmailAndPassword(m.auth, email.trim(), password);
  if (name.trim()) await m.auth.updateProfile(result.user, { displayName: name.trim() });
  return toSession(result.user)!;
}
export async function signOut(): Promise<void> { const m = await modules(); await m.auth.signOut(m.auth); }
export async function getCurrentSession(): Promise<Session | null> { const m = await modules(); return toSession(m.auth.getAuth(m.app).currentUser); }
function ownerUid(m: FirebaseModules): string {
  const uid = m.auth.getAuth(m.app).currentUser?.uid;
  if (!uid) throw new Error('Se requiere una sesión autenticada.');
  return uid;
}
const collectionNames = { accounts: 'accounts', sales: 'sales', customers: 'clients' } as const;
type SharedCollection = keyof typeof collectionNames;
export async function listOwned<T>(collection: SharedCollection): Promise<T[]> {
  const m = await modules(); const uid = ownerUid(m);
  const path = m.firestore.collection(m.firestore.getFirestore(m.app), 'users', uid, collectionNames[collection]);
  const result = await m.firestore.getDocs(path);
  return result.docs.map((snapshot: any) => ({ ...snapshot.data(), id: snapshot.id, userId: uid }));
}
const protectedFields = new Set(['accountpassword', 'password', 'masterpin', 'pin', 'credential', 'credentials', 'secret', 'token']);
function assertNoPlaintextCredentials(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (protectedFields.has(key.toLowerCase()) && typeof child === 'string' && child.length > 0) throw new Error('No se guardan contraseñas ni PIN en texto plano. Hace falta acordar y probar cifrado interoperable con Android.');
  }
}
export async function saveOwned<T extends { id?: string; userId?: string }>(collection: SharedCollection, record: T): Promise<T> {
  assertNoPlaintextCredentials(record);
  const m = await modules(); const uid = ownerUid(m);
  if (record.userId && record.userId !== uid) throw new Error('El registro no pertenece a la sesión actual.');
  const db = m.firestore.getFirestore(m.app); const col = m.firestore.collection(db, 'users', uid, collectionNames[collection]);
  const docRef = record.id ? m.firestore.doc(col, record.id) : m.firestore.doc(col);
  const { id: _ignored, ...data } = record as any;
  await m.firestore.setDoc(docRef, { ...data, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
  return { ...record, id: docRef.id, userId: uid };
}
export async function deleteOwned(collection: SharedCollection, id: string): Promise<void> {
  const m = await modules(); const uid = ownerUid(m);
  await m.firestore.deleteDoc(m.firestore.doc(m.firestore.getFirestore(m.app), 'users', uid, collectionNames[collection], id));
}
