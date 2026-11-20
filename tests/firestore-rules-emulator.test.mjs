import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-stream-flow-combined-rules';
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });
const collections = ['accounts', 'sales', 'clients'];
const safeDoc = (uid, marker, collectionName) => {
  const common = { userId: uid, createdAt: '2026-11-19T00:00:00.000Z', notes: marker };
  if (collectionName === 'accounts') return { ...common, platform: 'Netflix', cost: 10, totalProfiles: 1, isFullAccount: false, purchaseDate: '2026-11-19', renewalDate: '2026-12-19', providerName: 'Synthetic Provider' };
  if (collectionName === 'sales') return { ...common, type: 'profile', accountId: 'synthetic-account', customerName: 'Synthetic Customer', customerPhone: '0000000000', salePrice: 20, costPrice: 10, profit: 10, startDate: '2026-11-19', endDate: '2026-12-19', status: 'active', paymentStatus: 'paid', paymentMethod: 'cash' };
  return { ...common, name: 'Synthetic Customer', phone: '0000000000' };
};

try {
  // All fixtures are synthetic and seeded only inside this emulator.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'usuarios', 'alice-test-uid'), { marker: 'legacy-user-sentinel' });
    await setDoc(doc(db, 'usuarios', 'bob-test-uid'), { marker: 'other-owner-sentinel' });
    await setDoc(doc(db, 'tokens_usados', 'synthetic-token-sentinel'), { marker: 'legacy-token-sentinel', used: false });
    await setDoc(doc(db, 'unrelated_collection', 'sentinel'), { marker: 'must-remain-denied' });
  });

  const alice = env.authenticatedContext('alice-test-uid').firestore();
  const bob = env.authenticatedContext('bob-test-uid').firestore();
  const unauthenticated = env.unauthenticatedContext().firestore();

  // Existing production behavior at /usuarios/{userId}: only that authenticated owner may read/write.
  const aliceLegacyUser = doc(alice, 'usuarios', 'alice-test-uid');
  await assertSucceeds(getDoc(aliceLegacyUser), 'legacy user owner read retained');
  await assertSucceeds(setDoc(aliceLegacyUser, { marker: 'legacy-user-updated' }), 'legacy user owner write retained');
  await assertFails(getDoc(doc(bob, 'usuarios', 'alice-test-uid')), 'legacy user cross-owner read denied');
  await assertFails(setDoc(doc(bob, 'usuarios', 'alice-test-uid'), { marker: 'tamper' }), 'legacy user cross-owner write denied');
  await assertFails(getDoc(doc(unauthenticated, 'usuarios', 'alice-test-uid')), 'legacy user unauthenticated read denied');
  await assertFails(setDoc(doc(unauthenticated, 'usuarios', 'alice-test-uid'), { marker: 'tamper' }), 'legacy user unauthenticated write denied');

  // Preserve the ACTIVE broad authenticated behavior for /tokens_usados/{token}, without touching real tokens.
  const legacyToken = doc(alice, 'tokens_usados', 'synthetic-token-sentinel');
  await assertSucceeds(getDoc(legacyToken), 'legacy token authenticated read retained');
  await assertSucceeds(setDoc(legacyToken, { marker: 'legacy-token-updated', used: true }), 'legacy token authenticated write retained');
  await assertSucceeds(getDoc(doc(bob, 'tokens_usados', 'synthetic-token-sentinel')), 'legacy token cross-user read retained');
  await assertSucceeds(setDoc(doc(bob, 'tokens_usados', 'synthetic-token-sentinel'), { marker: 'legacy-token-updated-by-bob', used: true }), 'legacy token cross-user write retained');
  await assertFails(getDoc(doc(unauthenticated, 'tokens_usados', 'synthetic-token-sentinel')), 'legacy token unauthenticated read denied');
  await assertFails(setDoc(doc(unauthenticated, 'tokens_usados', 'synthetic-token-sentinel'), { marker: 'tamper' }), 'legacy token unauthenticated write denied');

  // New web paths: owner CRUD works; cross-owner/anonymous access and sensitive fields are rejected.
  for (const uid of ['alice-test-uid', 'bob-test-uid']) {
    const db = env.authenticatedContext(uid).firestore();
    for (const collectionName of collections) {
      const own = doc(db, 'users', uid, collectionName, `fixture-${collectionName}`);
      await assertSucceeds(setDoc(own, safeDoc(uid, `${uid}-${collectionName}`, collectionName)), `${uid} create own ${collectionName}`);
      const ownSnapshot = await assertSucceeds(getDoc(own), `${uid} read own ${collectionName}`);
      assert.equal(ownSnapshot.data().userId, uid, 'stored owner is the authenticated uid');
      await assertSucceeds(updateDoc(own, { notes: `${uid}-updated` }), `${uid} update own ${collectionName}`);
      const ownList = await assertSucceeds(getDocs(collection(db, 'users', uid, collectionName)));
      assert.equal(ownList.size, 1, `${uid} list own ${collectionName}`);
      await assertSucceeds(deleteDoc(own), `${uid} delete own ${collectionName}`);
      for (const [field, value] of [['accountPassword', 'synthetic-secret'], ['password', 'synthetic-secret'], ['pin', '1234'], ['masterPin', '1234'], ['profilePin', '1234'], ['credentials', 'synthetic-secret']]) {
        await assertFails(setDoc(doc(db, 'users', uid, collectionName, `bad-${field}`), { ...safeDoc(uid, 'bad', collectionName), [field]: value }), `plaintext/sensitive field ${field} denied`);
      }
      await assertFails(setDoc(doc(db, 'users', uid, collectionName, 'bad-uid'), safeDoc('other-test-uid', 'spoof', collectionName)), 'spoofed userId denied');
    }
  }

  for (const name of collections) {
    const aliceRef = doc(alice, 'users', 'alice-test-uid', name, 'cross-owner-fixture');
    await assertSucceeds(setDoc(aliceRef, safeDoc('alice-test-uid', name, name)));
    await assertFails(getDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture')), `cross-owner read denied: ${name}`);
    await assertFails(setDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-write'), safeDoc('alice-test-uid', 'spoof', name)), `cross-owner create denied: ${name}`);
    await assertFails(updateDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture'), { notes: 'tampered' }), `cross-owner update denied: ${name}`);
    await assertFails(deleteDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture')), `cross-owner delete denied: ${name}`);
    const anon = doc(unauthenticated, 'users', 'alice-test-uid', name, 'anonymous');
    await assertFails(getDoc(anon), `anonymous read denied: ${name}`);
    await assertFails(setDoc(anon, safeDoc('alice-test-uid', 'anonymous', name)), `anonymous write denied: ${name}`);
  }

  for (const path of ['unrelated_collection/sentinel', 'users/alice-test-uid/unrelated/sentinel']) {
    await assertFails(getDoc(doc(alice, ...path.split('/'))), `unrelated path denied: ${path}`);
    await assertFails(setDoc(doc(alice, ...path.split('/')), { marker: 'no access' }), `unrelated write denied: ${path}`);
  }

  // Verify the synthetic legacy sentinels survive this test's new-path operations.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    assert.equal((await getDoc(doc(db, 'usuarios', 'alice-test-uid'))).data().marker, 'legacy-user-updated');
    assert.equal((await getDoc(doc(db, 'tokens_usados', 'synthetic-token-sentinel'))).data().marker, 'legacy-token-updated-by-bob');
    assert.equal((await getDoc(doc(db, 'unrelated_collection', 'sentinel'))).data().marker, 'must-remain-denied');
  });
  console.log('PASS combined rules: legacy /usuarios owner behavior and authenticated /tokens_usados behavior preserved; new owner-only CRUD, cross-owner/anonymous denial, UID spoofing, sensitive-field rejection, unrelated paths denied; synthetic emulator data only');
} finally {
  await env.cleanup();
}
