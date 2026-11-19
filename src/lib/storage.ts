import { Account, Customer, CustomService, MessageTemplate, Provider, Sale, SubscriptionToken, User, UserSettings } from '../types';
import { deleteOwned, firebaseIsConfigured, getCurrentSession, listOwned, observeSession, register, saveOwned, Session, signIn, signOut } from './firebaseAdapter';

const disabled = 'La integración de Firebase sigue deshabilitada hasta verificar la configuración del proyecto, los esquemas compartidos y las reglas de propietario.';
const authError = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
const toUser = (session: Session): User => ({
  id: session.uid, email: session.email, name: session.displayName, createdAt: '',
  gracePeriodUntil: '', subscriptionUntil: '', tokensRedeemed: 0, isAdmin: false,
  // Terms are tracked locally only until an explicitly authorized user-profile contract exists.
  hasAcceptedTerms: localStorage.getItem(`stream-terms:${session.uid}`) === 'accepted',
});

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  if (!firebaseIsConfigured()) { callback(null); return () => undefined; }
  let unsubscribe: (() => void) | undefined;
  let cancelled = false;
  observeSession((session) => callback(session ? toUser(session) : null))
    .then((stop) => { if (cancelled) stop(); else unsubscribe = stop; })
    .catch(() => callback(null));
  return () => { cancelled = true; unsubscribe?.(); };
}

export async function apiLogin(email: string, password?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try { if (!password) throw new Error('Ingresá tu contraseña.'); return { success: true, user: toUser(await signIn(email, password)) }; }
  catch (error) { return { success: false, error: authError(error) }; }
}
export async function apiRegister(email: string, password?: string, name?: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try { if (!password) throw new Error('Ingresá una contraseña.'); return { success: true, user: toUser(await register(email, password, name ?? '')) }; }
  catch (error) { return { success: false, error: authError(error) }; }
}
export async function apiLogout(): Promise<void> { await signOut(); }
export async function apiRedeemToken(_userId: string, _tokenCode: string): Promise<{ success: boolean; message?: string; user?: User; error?: string }> { return { success: false, error: 'El canje de tokens todavía no está habilitado: requiere un flujo de servidor seguro.' }; }
export async function apiAcceptTerms(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (!firebaseIsConfigured()) throw new Error(disabled);
    localStorage.setItem(`stream-terms:${userId}`, 'accepted');
    const session = await getCurrentSession();
    if (!session || session.uid !== userId) throw new Error('No se encontró una sesión autenticada.');
    return { success: true, user: toUser(session) };
  } catch (error) { return { success: false, error: authError(error) }; }
}
export async function fetchAppData(userId?: string) {
  if (!firebaseIsConfigured()) return null;
  const [accounts, sales, customers] = await Promise.all([
    listOwned<Account>('accounts'), listOwned<Sale>('sales'), listOwned<Customer>('customers'),
  ]);
  if (userId && accounts.some((item) => item.userId !== userId)) throw new Error('La sesión cambió durante la sincronización.');
  return { accounts, sales, customers, providers: [] as Provider[], templates: [] as MessageTemplate[], tokens: [] as SubscriptionToken[], tokenAuditLogs: [], customServices: [] as CustomService[], settings: null as UserSettings | null };
}
export async function apiUpdateCredentials(_userId: string, _creds: { newEmail?: string; newPassword?: string; newName?: string }) { throw new Error('Actualización de credenciales no implementada.'); }
export async function apiSaveProvider(_provider: Partial<Provider>): Promise<Provider> { throw new Error('Proveedores no forman parte del contrato compartido verificado.'); }
export async function apiDeleteProvider(_id: string) { throw new Error('Proveedores no forman parte del contrato compartido verificado.'); }
export async function apiSaveAccount(account: Partial<Account>): Promise<Account> { return saveOwned('accounts', account as Account); }
export async function apiDeleteAccount(id: string) { return deleteOwned('accounts', id); }
export async function apiSaveCustomer(customer: Partial<Customer>): Promise<Customer> { return saveOwned('customers', customer as Customer); }
export async function apiDeleteCustomer(id: string) { return deleteOwned('customers', id); }
export async function apiSaveSale(sale: Partial<Sale>): Promise<Sale> { return saveOwned('sales', sale as Sale); }
export async function apiRenewSale(_saleId: string, _days = 30, _paymentMethod?: string) { throw new Error('Renovación requiere un contrato transaccional compartido y verificado.'); }
export async function apiDeleteSale(id: string) { return deleteOwned('sales', id); }
export async function apiSaveTemplate(_template: Partial<MessageTemplate>): Promise<MessageTemplate> { throw new Error('Plantillas no forman parte del contrato compartido verificado.'); }
export async function apiDeleteTemplate(_id: string) { throw new Error('Plantillas no forman parte del contrato compartido verificado.'); }
export async function apiGenerateTokens(_count = 1, _days = 30): Promise<SubscriptionToken[]> { throw new Error('La administración de tokens requiere un backend confiable; no se habilita en el cliente.'); }
export async function apiRestoreBackup(_jsonData: unknown) { throw new Error('La restauración requiere un procedimiento de migración revisado.'); }
export async function apiSaveSettings(_settings: { userId: string; currency?: string; currencySymbol?: string; theme?: string }) { throw new Error('Ajustes no forman parte del contrato compartido verificado.'); }
export async function apiSaveCustomService(_service: { userId: string; name: string; color?: string; badgeBg?: string; textColor?: string; iconName?: string; defaultProfiles?: number }) { throw new Error('Servicios personalizados no forman parte del contrato compartido verificado.'); }
export async function apiDeleteCustomService(_id: string) { throw new Error('Servicios personalizados no forman parte del contrato compartido verificado.'); }
export const firebaseUnavailableMessage = disabled;
