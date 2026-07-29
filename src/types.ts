export type PlatformType =
  | 'Netflix'
  | 'Disney+'
  | 'Max'
  | 'Prime Video'
  | 'Spotify'
  | 'YouTube Premium'
  | 'Crunchyroll'
  | 'Paramount+'
  | 'Apple TV+'
  | 'IPTV / Magis'
  | 'Canva Pro'
  | 'Otro';

export interface PlatformConfig {
  name: PlatformType;
  color: string;
  badgeBg: string;
  textColor: string;
  iconName: string;
  defaultProfiles: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  gracePeriodUntil: string; // ISO string date (+3 days from signup)
  subscriptionUntil: string; // ISO string date
  tokensRedeemed: number;
  isAdmin?: boolean;
  hasAcceptedTerms?: boolean;
  acceptedTermsAt?: string;
}

export interface Provider {
  id: string;
  userId: string;
  name: string;
  contactName?: string;
  phone: string;
  email?: string;
  telegram?: string;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export interface Profile {
  id: string;
  profileName: string; // e.g. "Perfil 1 - Juan" or "Screen 1"
  pin?: string;
  status: 'available' | 'sold' | 'maintenance';
  currentSaleId?: string;
}

export interface Account {
  id: string;
  userId: string;
  platform: PlatformType;
  customPlatformName?: string;
  accountEmail: string;
  accountPassword: string;
  masterPin?: string;
  providerId: string;
  providerName?: string;
  cost: number; // Purchase cost
  totalProfiles: number;
  profiles: Profile[];
  isFullAccount: boolean; // True if bought to sell as 1 single full account
  isFullAccountSold?: boolean;
  purchaseDate: string;
  renewalDate: string; // Renewal date with provider
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export type SaleStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'partial';

export interface Sale {
  id: string;
  userId: string;
  type: 'profile' | 'full_account';
  accountId: string;
  profileId?: string; // If profile sale
  profileName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  platform: PlatformType;
  accountEmail: string;
  accountPassword: string;
  pin?: string;
  salePrice: number;
  costPrice: number;
  profit: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  lastRenewalDate?: string;
  createdAt: string;
}

export type TemplateType =
  | 'welcome_credentials'
  | 'reminder_soon'
  | 'expiration_today'
  | 'expired_notice'
  | 'password_change'
  | 'custom';

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  type: TemplateType;
  body: string;
  isDefault?: boolean;
}

export interface SubscriptionToken {
  id: string;
  code: string;
  days: number; // Defaults to 30
  isUsed: boolean;
  usedByEmail?: string;
  usedAt?: string;
  usedIp?: string;
  createdAt: string;
}

export interface TokenAuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  tokenCode: string;
  status: 'SUCCESS' | 'INVALID_CHECKSUM' | 'NOT_FOUND' | 'ALREADY_REDEEMED' | 'RATE_LIMITED';
  ip: string;
  timestamp: string;
  details?: string;
}

export interface CustomService {
  id: string;
  userId?: string;
  name: string;
  color: string;
  badgeBg?: string;
  textColor?: string;
  iconName?: string;
  defaultProfiles: number;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  currency: string;
  currencySymbol?: string;
  theme: 'theme-dark-red' | 'theme-dark-emerald' | 'theme-dark-violet' | 'theme-dark-blue' | 'theme-dark-gold' | 'theme-dark-rose' | 'theme-light';
  customServices: CustomService[];
}

export type NavigationTab =
  | 'dashboard'
  | 'accounts'
  | 'sales'
  | 'expirations'
  | 'suppliers'
  | 'customers'
  | 'templates'
  | 'tokens'
  | 'settings'
  | 'info';

export interface FinancialStats {
  totalSalesCount: number;
  activeSalesCount: number;
  expiringSalesCount: number;
  expiredSalesCount: number;
  totalIncome: number;
  totalCosts: number;
  netProfit: number;
  profitMarginPercent: number;
  totalAccountsCount: number;
  totalProfilesCount: number;
  soldProfilesCount: number;
  availableProfilesCount: number;
  providerSpending: { providerName: string; totalSpent: number; count: number }[];
  platformRevenue: { platform: string; revenue: number; profit: number; count: number }[];
}
