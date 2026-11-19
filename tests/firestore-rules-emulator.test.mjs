import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'demo-stream-flow-contract';
const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({ projectId, firestore: { rules } });
const collections = ['accounts', 'sales', 'clients'];
const safeDoc = (uid, marker, collectionName) => {
  const common = { userId: uid, createdAt: '2026-11-19T00:00:00.000Z', notes: marker };
  if (collectionName === 'accounts') return { ...common, platform: 'Netflix', cost: 10, totalProfiles: 1, isFullAccount: false };
  if (collectionName === 'sales') return { ...common, type: 'profile', accountId: 'synthetic-account', customerName: 'Synthetic Customer', customerPhone: '0000000000', salePrice: 20, costPrice: 10, profit: 10, startDate: '2026-11-19', endDate: '2026-12-19', status: 'active', paymentStatus: 'paid', paymentMethod: 'cash' };
  return { ...common, name: 'Synthetic Customer', phone: '0000000000' };
};

try {
  // Seed legacy/unrelated paths with synthetic sentinel records in rules-disabled context.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'usuarios', 'sentinel'), { marker: 'must-survive' });
    await setDoc(doc(db, 'tokens_usados', 'sentinel'), { marker: 'must-survive' });
    await setDoc(doc(db, 'unrelated_collection', 'sentinel'), { marker: 'must-survive' });
  });

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
      await assertFails(setDoc(doc(db, 'users', uid, collectionName, 'bad-password'), { ...safeDoc(uid, 'bad', collectionName), accountPassword: 'synthetic-secret' }), 'credential field denied');
      await assertFails(setDoc(doc(db, 'users', uid, collectionName, 'bad-pin'), { ...safeDoc(uid, 'bad', collectionName), profilePin: '1234' }), 'PIN field denied');
      await assertFails(setDoc(doc(db, 'users', uid, collectionName, 'bad-uid'), safeDoc('other-test-uid', 'spoof', collectionName)), 'spoofed userId denied');
    }
  }

  const alice = env.authenticatedContext('alice-test-uid').firestore();
  const bob = env.authenticatedContext('bob-test-uid').firestore();
  for (const name of collections) {
    const aliceRef = doc(alice, 'users', 'alice-test-uid', name, 'cross-owner-fixture');
    await assertSucceeds(setDoc(aliceRef, safeDoc('alice-test-uid', name, name)));
    await assertFails(getDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture')), `cross-owner read denied: ${name}`);
    await assertFails(setDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-write'), safeDoc('alice-test-uid', 'spoof', name)), `cross-owner create denied: ${name}`);
    await assertFails(updateDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture'), { notes: 'tampered' }), `cross-owner update denied: ${name}`);
    await assertFails(deleteDoc(doc(bob, 'users', 'alice-test-uid', name, 'cross-owner-fixture')), `cross-owner delete denied: ${name}`);
  }

  const unauthenticated = env.unauthenticatedContext().firestore();
  for (const name of collections) {
    const ref = doc(unauthenticated, 'users', 'alice-test-uid', name, 'anonymous');
    await assertFails(getDoc(ref), `anonymous read denied: ${name}`);
    await assertFails(setDoc(ref, safeDoc('alice-test-uid', 'anonymous', name)), `anonymous write denied: ${name}`);
  }

  // Assert protected pre-existing namespaces were neither granted by this ruleset nor changed.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const path of ['usuarios/sentinel', 'tokens_usados/sentinel', 'unrelated_collection/sentinel']) {
      assert.equal((await getDoc(doc(db, path))).data().marker, 'must-survive', `sentinel preserved: ${path}`);
    }
  });
  for (const path of ['usuarios/sentinel', 'tokens_usados/sentinel', 'unrelated_collection/sentinel']) {
    await assertFails(getDoc(doc(alice, ...path.split('/'))), `unrelated path remains denied: ${path}`);
  }
  console.log('PASS: synthetic owner CRUD, cross-owner and unauthenticated denials, UID spoofing, credential/PIN rejection, unrelated path preservation');
} finally {
  await env.cleanup();
}
