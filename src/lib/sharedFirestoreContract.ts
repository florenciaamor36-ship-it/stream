import type { Account, Sale, Profile } from '../types';

export type SharedAccount = {
  userId: string; platform: string; cost: number; totalProfiles: number;
  isFullAccount: boolean; purchaseDate: string; renewalDate: string;
  customPlatformName?: string; providerId?: string; providerName?: string;
  isFullAccountSold?: boolean; notes?: string; createdAt?: string;
};
export type SharedSale = {
  userId: string; type: 'profile' | 'full_account'; accountId: string;
  customerId: string; customerName: string; customerPhone: string;
  salePrice: number; costPrice: number; profit: number; startDate: string; endDate: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'partial'; paymentMethod: string;
  profileId?: string; profileName?: string; platform?: string; notes?: string;
  lastRenewalDate?: string; createdAt?: string;
};
const omitEmpty = (out: Record<string, unknown>) => Object.fromEntries(Object.entries(out).filter(([, value]) => value !== undefined && value !== ''));
const day = (value: string | number | undefined): string => {
  if (typeof value === 'number') return new Date(value).toISOString().slice(0, 10);
  return typeof value === 'string' ? value.slice(0, 10) : '';
};
export function accountToShared(account: Account): SharedAccount {
  return omitEmpty({
    userId: account.userId, platform: account.platform, customPlatformName: account.customPlatformName,
    providerId: account.providerId, providerName: account.providerName, cost: account.cost,
    totalProfiles: account.totalProfiles, isFullAccount: account.isFullAccount,
    isFullAccountSold: account.isFullAccountSold, purchaseDate: day(account.purchaseDate) || new Date().toISOString().slice(0, 10),
    renewalDate: day(account.renewalDate) || day(account.purchaseDate) || new Date().toISOString().slice(0, 10), notes: account.notes, createdAt: account.createdAt,
  }) as unknown as SharedAccount;
}
export function accountFromShared(id: string, data: Record<string, any>): Account {
  const total = Math.max(0, Math.min(50, Number(data.totalProfiles) || 0));
  const profiles: Profile[] = Array.from({ length: total }, (_, i) => ({
    id: `${id}-profile-${i + 1}`, profileName: `Perfil ${i + 1}`, status: 'available',
  }));
  return {
    id, userId: String(data.userId ?? ''), platform: data.platform ?? 'Otro',
    customPlatformName: data.customPlatformName ?? '', accountEmail: '', accountPassword: '',
    masterPin: '', providerId: data.providerId ?? '', providerName: data.providerName ?? '',
    cost: Number(data.cost) || 0, totalProfiles: total, profiles,
    isFullAccount: Boolean(data.isFullAccount), isFullAccountSold: Boolean(data.isFullAccountSold),
    purchaseDate: day(data.purchaseDate), renewalDate: day(data.renewalDate),
    notes: data.notes ?? '', createdAt: data.createdAt ?? '',
  };
}
export function saleToShared(sale: Sale): SharedSale {
  return omitEmpty({
    userId: sale.userId, type: sale.type, accountId: sale.accountId,
    profileId: sale.profileId, profileName: sale.profileName, customerId: sale.customerId,
    customerName: sale.customerName, customerPhone: sale.customerPhone, platform: sale.platform,
    salePrice: sale.salePrice, costPrice: sale.costPrice, profit: sale.profit,
    startDate: day(sale.startDate), endDate: day(sale.endDate), status: sale.status,
    paymentStatus: sale.paymentStatus, paymentMethod: sale.paymentMethod, notes: sale.notes,
    lastRenewalDate: sale.lastRenewalDate ? day(sale.lastRenewalDate) : undefined,
    createdAt: sale.createdAt,
  }) as unknown as SharedSale;
}
export function saleFromShared(id: string, data: Record<string, any>): Sale {
  return {
    id, userId: String(data.userId ?? ''), type: data.type === 'full_account' ? 'full_account' : 'profile',
    accountId: data.accountId ?? '', profileId: data.profileId, profileName: data.profileName ?? '',
    customerId: data.customerId ?? '', customerName: data.customerName ?? '', customerPhone: data.customerPhone ?? '',
    platform: data.platform ?? 'Otro', accountEmail: '', accountPassword: '', pin: '',
    salePrice: Number(data.salePrice) || 0, costPrice: Number(data.costPrice) || 0,
    profit: Number(data.profit) || 0, startDate: day(data.startDate), endDate: day(data.endDate),
    status: data.status ?? 'active', paymentStatus: data.paymentStatus ?? 'pending',
    paymentMethod: data.paymentMethod ?? '', notes: data.notes ?? '',
    lastRenewalDate: data.lastRenewalDate ? day(data.lastRenewalDate) : undefined,
    createdAt: data.createdAt ?? '',
  };
}
