import assert from 'node:assert/strict';
import { accountFromShared, accountToShared, saleFromShared, saleToShared } from '../src/lib/sharedFirestoreContract';
import type { Account, Sale } from '../src/types';

const account = {
  id: 'synthetic-account', userId: 'alice-test-uid', platform: 'Netflix', customPlatformName: '',
  accountEmail: 'private@example.invalid', accountPassword: 'fake-password', masterPin: '4321',
  providerId: 'provider-fixture', providerName: 'Synthetic Provider', cost: 12.5, totalProfiles: 2,
  profiles: [{ id: 'p1', profileName: 'Screen A', pin: '1234', status: 'sold', currentSaleId: 'sale-fixture' }, { id: 'p2', profileName: 'Screen B', status: 'available' }],
  isFullAccount: false, purchaseDate: '2026-11-19T09:00:00.000Z', renewalDate: '2026-12-19T09:00:00.000Z', notes: 'synthetic', createdAt: '2026-11-19T09:00:00.000Z',
} as Account;
const sharedAccount = accountToShared(account);
assert.equal(sharedAccount.platform, 'Netflix');
assert.equal(sharedAccount.purchaseDate, '2026-11-19');
assert.equal(sharedAccount.renewalDate, '2026-12-19');
assert.equal(sharedAccount.totalProfiles, 2);
assert.equal('accountPassword' in sharedAccount, false);
assert.equal('masterPin' in sharedAccount, false);
assert.equal('profiles' in sharedAccount, false);
const accountRoundTrip = accountFromShared('synthetic-account', { ...sharedAccount });
assert.equal(accountRoundTrip.id, account.id);
assert.equal(accountRoundTrip.userId, account.userId);
assert.equal(accountRoundTrip.platform, account.platform);
assert.equal(accountRoundTrip.accountEmail, '');
assert.equal(accountRoundTrip.accountPassword, '');
assert.equal(accountRoundTrip.profiles.length, 2);

const sale = {
  id: 'synthetic-sale', userId: 'alice-test-uid', type: 'profile', accountId: 'synthetic-account', profileId: 'p1', profileName: 'Screen A',
  customerId: 'synthetic-customer', customerName: 'Fixture Customer', customerPhone: '0000000000', platform: 'Netflix',
  accountEmail: 'private@example.invalid', accountPassword: 'fake-password', pin: '1234', salePrice: 20, costPrice: 5, profit: 15,
  startDate: '2026-11-19T09:00:00.000Z', endDate: '2026-12-19T09:00:00.000Z', status: 'active', paymentStatus: 'partial', paymentMethod: 'cash', notes: 'synthetic', createdAt: '2026-11-19T09:00:00.000Z',
} as Sale;
const sharedSale = saleToShared(sale);
assert.equal(sharedSale.customerId, sale.customerId);
assert.equal(sharedSale.paymentStatus, 'partial');
assert.equal(sharedSale.startDate, '2026-11-19');
assert.equal(sharedSale.endDate, '2026-12-19');
assert.equal('accountPassword' in sharedSale, false);
assert.equal('pin' in sharedSale, false);
const saleRoundTrip = saleFromShared('synthetic-sale', { ...sharedSale });
assert.equal(saleRoundTrip.id, sale.id);
assert.equal(saleRoundTrip.accountId, sale.accountId);
assert.equal(saleRoundTrip.customerName, sale.customerName);
assert.equal(saleRoundTrip.paymentStatus, 'partial');
assert.equal(saleRoundTrip.accountPassword, '');
assert.equal(saleRoundTrip.pin, '');
console.log('PASS synthetic account/sale shared mapping round trips; protected credentials excluded');
