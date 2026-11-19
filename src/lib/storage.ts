import { Account, Customer, MessageTemplate, Provider, Sale, SubscriptionToken, User } from '../types';

const UNAVAILABLE = 'El acceso está deshabilitado temporalmente: no uses credenciales reales. Falta implementar autenticación segura del lado del servidor.';
const fail = (): never => { throw new Error(UNAVAILABLE); };

export async function apiLogin(_email: string, _password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  return { success: false, error: UNAVAILABLE };
}

export async function apiRegister(_email: string, _password?: string, _name?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  return { success: false, error: UNAVAILABLE };
}

export async function apiRedeemToken(_userId: string, _tokenCode: string): Promise<{ success: boolean; message?: string; user?: User; error?: string }> {
  return { success: false, error: UNAVAILABLE };
}

export async function apiAcceptTerms(_userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  return { success: false, error: UNAVAILABLE };
}

export async function fetchAppData(_userId?: string) {
  return null;
}

export async function apiUpdateCredentials(_userId: string, _creds: { newEmail?: string; newPassword?: string; newName?: string }) {
  return fail();
}

export async function apiSaveProvider(_provider: Partial<Provider>): Promise<Provider> { return fail(); }
export async function apiDeleteProvider(_id: string) { return fail(); }
export async function apiSaveAccount(_account: Partial<Account>): Promise<Account> { return fail(); }
export async function apiDeleteAccount(_id: string) { return fail(); }
export async function apiSaveCustomer(_customer: Partial<Customer>): Promise<Customer> { return fail(); }
export async function apiDeleteCustomer(_id: string) { return fail(); }
export async function apiSaveSale(_sale: Partial<Sale>): Promise<Sale> { return fail(); }
export async function apiRenewSale(_saleId: string, _days = 30, _paymentMethod?: string) { return fail(); }
export async function apiDeleteSale(_id: string) { return fail(); }
export async function apiSaveTemplate(_template: Partial<MessageTemplate>): Promise<MessageTemplate> { return fail(); }
export async function apiDeleteTemplate(_id: string) { return fail(); }
export async function apiGenerateTokens(_count = 1, _days = 30): Promise<SubscriptionToken[]> { return fail(); }
export async function apiRestoreBackup(_jsonData: unknown) { return fail(); }
export async function apiSaveSettings(_settings: { userId: string; currency?: string; currencySymbol?: string; theme?: string }) { return fail(); }
export async function apiSaveCustomService(_service: { userId: string; name: string; color?: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles?: number }) { return fail(); }
export async function apiDeleteCustomService(_id: string) { return fail(); }
