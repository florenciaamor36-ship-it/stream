import { CustomService, PlatformConfig, PlatformType, Sale, SaleStatus } from '../types';

export const PLATFORMS: Record<string, PlatformConfig> = {
  Netflix: {
    name: 'Netflix' as PlatformType,
    color: '#E50914',
    badgeBg: 'bg-red-500/10 border-red-500/30 text-red-500',
    textColor: 'text-red-500',
    iconName: 'Tv',
    defaultProfiles: 5,
  },
  'Disney+': {
    name: 'Disney+' as PlatformType,
    color: '#113CCF',
    badgeBg: 'bg-blue-600/10 border-blue-500/30 text-blue-400',
    textColor: 'text-blue-400',
    iconName: 'Sparkles',
    defaultProfiles: 4,
  },
  Max: {
    name: 'Max' as PlatformType,
    color: '#002BE7',
    badgeBg: 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400',
    textColor: 'text-indigo-400',
    iconName: 'Film',
    defaultProfiles: 3,
  },
  'Prime Video': {
    name: 'Prime Video' as PlatformType,
    color: '#00A8E1',
    badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    textColor: 'text-cyan-400',
    iconName: 'PlaySquare',
    defaultProfiles: 3,
  },
  Spotify: {
    name: 'Spotify' as PlatformType,
    color: '#1DB954',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    textColor: 'text-emerald-400',
    iconName: 'Music',
    defaultProfiles: 6,
  },
  'YouTube Premium': {
    name: 'YouTube Premium' as PlatformType,
    color: '#FF0000',
    badgeBg: 'bg-rose-600/10 border-rose-500/30 text-rose-500',
    textColor: 'text-rose-500',
    iconName: 'Video',
    defaultProfiles: 5,
  },
  Crunchyroll: {
    name: 'Crunchyroll' as PlatformType,
    color: '#F47521',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    textColor: 'text-amber-500',
    iconName: 'Smile',
    defaultProfiles: 4,
  },
  'Paramount+': {
    name: 'Paramount+' as PlatformType,
    color: '#0064FF',
    badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
    textColor: 'text-sky-400',
    iconName: 'Star',
    defaultProfiles: 3,
  },
  'Apple TV+': {
    name: 'Apple TV+' as PlatformType,
    color: '#A2AAAD',
    badgeBg: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-300',
    textColor: 'text-zinc-300',
    iconName: 'Apple',
    defaultProfiles: 5,
  },
  'IPTV / Magis': {
    name: 'IPTV / Magis' as PlatformType,
    color: '#8B5CF6',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    textColor: 'text-purple-400',
    iconName: 'Radio',
    defaultProfiles: 3,
  },
  'Canva Pro': {
    name: 'Canva Pro' as PlatformType,
    color: '#00C4CC',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    textColor: 'text-teal-400',
    iconName: 'LayoutGrid',
    defaultProfiles: 5,
  },
  Otro: {
    name: 'Otro' as PlatformType,
    color: '#6B7280',
    badgeBg: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    textColor: 'text-gray-400',
    iconName: 'Grid',
    defaultProfiles: 4,
  },
};

export function getPlatformConfig(platformName: string, customServices: CustomService[] = []): PlatformConfig {
  if (PLATFORMS[platformName]) {
    return PLATFORMS[platformName];
  }

  const custom = customServices.find((cs) => cs.name.toLowerCase() === platformName.toLowerCase());
  if (custom) {
    return {
      name: custom.name as PlatformType,
      color: custom.color || '#6366F1',
      badgeBg: custom.badgeBg || 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      textColor: custom.textColor || 'text-indigo-400',
      iconName: custom.iconName || 'Tv',
      defaultProfiles: custom.defaultProfiles || 4,
    };
  }

  return {
    name: (platformName || 'Otro') as PlatformType,
    color: '#6B7280',
    badgeBg: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    textColor: 'text-gray-400',
    iconName: 'Grid',
    defaultProfiles: 4,
  };
}

export function formatMoney(amount: number, currencyCode: string = 'USD', currencySymbol?: string): string {
  const num = amount || 0;
  const currencyLocales: Record<string, { locale: string; currency: string; symbol?: string }> = {
    USD: { locale: 'en-US', currency: 'USD', symbol: '$' },
    ARS: { locale: 'es-AR', currency: 'ARS', symbol: '$' },
    MXN: { locale: 'es-MX', currency: 'MXN', symbol: '$' },
    EUR: { locale: 'es-ES', currency: 'EUR', symbol: '€' },
    COP: { locale: 'es-CO', currency: 'COP', symbol: '$' },
    PEN: { locale: 'es-PE', currency: 'PEN', symbol: 'S/' },
    CLP: { locale: 'es-CL', currency: 'CLP', symbol: '$' },
    BRL: { locale: 'pt-BR', currency: 'BRL', symbol: 'R$' },
    DOP: { locale: 'es-DO', currency: 'DOP', symbol: 'RD$' },
    VES: { locale: 'es-VE', currency: 'VES', symbol: 'Bs.' },
    GTQ: { locale: 'es-GT', currency: 'GTQ', symbol: 'Q' },
    HNL: { locale: 'es-HN', currency: 'HNL', symbol: 'L' },
    CRC: { locale: 'es-CR', currency: 'CRC', symbol: '₡' },
  };

  const codeUpper = (currencyCode || 'USD').toUpperCase();
  const conf = currencyLocales[codeUpper];

  if (conf) {
    try {
      return new Intl.NumberFormat(conf.locale, {
        style: 'currency',
        currency: conf.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      // Ignore fallback
    }
  }

  const sym = currencySymbol || '$';
  return `${sym}${num.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${codeUpper}`;
}

export function getDaysRemaining(endDateStr: string, referenceNow?: string | Date): number {
  if (!endDateStr) return 0;
  const now = referenceNow ? new Date(referenceNow) : new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(endDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function calculateSaleStatus(endDateStr: string, currentStatus?: SaleStatus): SaleStatus {
  if (currentStatus === 'cancelled') return 'cancelled';
  const days = getDaysRemaining(endDateStr);
  if (days < 0) return 'expired';
  if (days <= 3) return 'expiring_soon';
  return 'active';
}

export function interpolateTemplate(
  template: string,
  data: {
    cliente?: string;
    servicio?: string;
    email_cuenta?: string;
    password?: string;
    perfil?: string;
    pin?: string;
    fecha_vencimiento?: string;
    dias_restantes?: number | string;
    precio?: number | string;
    metodo_pago?: string;
    contacto_soporte?: string;
  }
): string {
  let result = template;
  const replacements: Record<string, string> = {
    '{cliente}': data.cliente || '',
    '{servicio}': data.servicio || '',
    '{email_cuenta}': data.email_cuenta || '',
    '{password}': data.password || '',
    '{perfil}': data.perfil || 'Perfil General',
    '{pin}': data.pin || 'Sin PIN',
    '{fecha_vencimiento}': data.fecha_vencimiento ? formatDateSpanish(data.fecha_vencimiento) : '',
    '{dias_restantes}': String(data.dias_restantes ?? ''),
    '{precio}': typeof data.precio === 'number' ? formatMoney(data.precio) : data.precio || '',
    '{metodo_pago}': data.metodo_pago || '',
    '{contacto_soporte}': data.contacto_soporte || '',
  };

  Object.entries(replacements).forEach(([key, val]) => {
    result = result.replaceAll(key, val);
  });

  return result;
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

export function createWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

export function generateTokenCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `STRM-30D-${part1}-${part2}`;
}
