import React, { useState } from 'react';
import {
  Info,
  BookOpen,
  ShieldCheck,
  Award,
  Tv,
  Users,
  Receipt,
  Clock,
  Truck,
  MessageSquareCode,
  Ticket,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  HelpCircle,
} from 'lucide-react';

export const InfoView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manual' | 'about' | 'terms'>('manual');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/40 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-extrabold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" /> Ficha Técnica & Guía Oficial
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Información de la App y Manual de Usuario
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Conoce el funcionamiento detallado de StreamControl PRO, sus capacidades ilimitadas, términos legales y créditos formales de desarrollo.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl shrink-0 text-right md:text-left space-y-1">
            <p className="text-[11px] font-bold uppercase text-zinc-400">Desarrollo e Ingeniería</p>
            <p className="text-sm font-extrabold text-amber-400">La Clave Argentina & Tienda SSH</p>
            <p className="text-[11px] text-zinc-400 font-mono">Año 2026 • v2.0.0 Pro</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-6 border-t border-zinc-800/80">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'manual'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Manual de Usuario Operativo
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'about'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Info className="w-4 h-4" />
            Acerca de la Plataforma
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition ${
              activeTab === 'terms'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Términos & Legales
          </button>
        </div>
      </div>

      {/* TAB 1: MANUAL DE USUARIO */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-emerald-500/10 via-zinc-900 to-zinc-900 border border-emerald-500/20 p-5 rounded-2xl flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-white text-sm">Capacidad Ilimitada y Perfiles Individuales</h3>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                StreamControl PRO está diseñado para procesar <strong>ilimitada cantidad de clientes, proveedores y ventas</strong>. Además, cuenta con soporte nativo para fragmentar cuentas en <strong>pantallas/perfiles individuales con sus respectivos PINs</strong> o comercializar Cuentas Completas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">Módulo 1</span>
                  <h4 className="font-bold text-white text-sm">Gestión de Proveedores</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Registra a tus mayoristas o distribuidores de cuentas. Guarda sus números de WhatsApp, Telegram, correo y métodos de pago habituales. Al agregar una cuenta de streaming, podrás vincularla a su proveedor correspondiente para saber a quién reclamar garantías.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Módulo 2</span>
                  <h4 className="font-bold text-white text-sm">Carga de Cuentas y Pantallas</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ingresa tus cuentas compradas (Netflix, Disney+, Max, IPTV, etc.).
                <br />
                • <strong>Perfiles Individuales:</strong> El sistema genera automáticamente los perfiles (ej. Perfil 1, Perfil 2) asignando PINs individuales de 4 dígitos.
                <br />• <strong>Cuenta Completa:</strong> Si vendes la cuenta entera, activa la casilla de "Cuenta Completa".
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Módulo 3</span>
                  <h4 className="font-bold text-white text-sm">Directorio de Clientes</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Mantén ordenada tu cartera de clientes con sus nombres, teléfonos y notas. Al momento de realizar una venta o renovación, podrás seleccionar el cliente existente o crear uno nuevo al instante.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Módulo 4</span>
                  <h4 className="font-bold text-white text-sm">Registro de Ventas y Entrega</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Selecciona la pantalla disponible, asigna el cliente, fecha de inicio y fecha de vencimiento. El panel calculará la ganancia neta en tiempo real y generará la ficha de entrega formateada para copiar y enviar a WhatsApp.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">Módulo 5</span>
                  <h4 className="font-bold text-white text-sm">Control de Vencimientos y Avisos</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Filtra clientes con vencimientos próximos (3 días) o vencidos hoy. Con 1 solo clic en el botón de WhatsApp, se abrirá la conversación con el mensaje de cobranza o recordatorio listo para enviar.
              </p>
            </div>

            {/* Step 6 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <MessageSquareCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">Módulo 6</span>
                  <h4 className="font-bold text-white text-sm">Plantillas Personalizadas</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Personaliza los textos de bienvenida, recordatorio de vencimiento, cobranza y cambio de claves usando variables automáticas como <code className="text-amber-300 bg-zinc-950 px-1 rounded">{'{cliente}'}</code>, <code className="text-amber-300 bg-zinc-950 px-1 rounded">{'{servicio}'}</code>, <code className="text-amber-300 bg-zinc-950 px-1 rounded">{'{pin}'}</code>, etc.
              </p>
            </div>

            {/* Step 7 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-cyan-400 tracking-wider">Módulo 7</span>
                  <h4 className="font-bold text-white text-sm">Tokens y Días de Suscripción</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Canjea tus códigos de tokens oficiales para extender el tiempo de uso del panel por 30, 60 o 90 días. Incluye sistema antiloop y validación criptográfica de tokens.
              </p>
            </div>

            {/* Step 8 */}
            <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-zinc-700/30 text-zinc-200 border border-zinc-700/40">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">Módulo 8</span>
                  <h4 className="font-bold text-white text-sm">Ajustes, Temas y Respaldos JSON</h4>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Elige tu moneda local (ARS, USD, MXN, COP, CLP, etc.) y temas visuales. Exporta tu base de datos completa en formato JSON o restáurala en otro dispositivo al instante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACERCA DE LA PLATAFORMA */}
      {activeTab === 'about' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-indigo-600 p-0.5 shadow-xl shadow-red-500/20">
                <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                  <Tv className="w-8 h-8 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">StreamControl PRO 2026</h2>
                <p className="text-xs text-amber-400 font-semibold">
                  Desarrollado por La Clave Argentina & Tienda SSH
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              StreamControl PRO es la solución integral líder diseñada específicamente para revendedores, distribuidores y agencias digitales que gestionan suscripciones de servicios de streaming, IPTV y licencias digitales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                <p className="text-xs text-zinc-400 font-medium">Desarrolladores Oficiales</p>
                <p className="font-black text-white text-sm">La Clave Argentina & Tienda SSH</p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                <p className="text-xs text-zinc-400 font-medium">Versión de Build</p>
                <p className="font-black text-white text-sm">v2.0.0 (Edición 2026)</p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-1">
                <p className="text-xs text-zinc-400 font-medium">Estado del Sistema</p>
                <p className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Producción Activo
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6 space-y-2">
              <h3 className="font-bold text-white text-sm">Créditos de Propiedad Intelectual</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Este software y su arquitectura de interfaz son un <strong>producto desarrollado por La Clave Argentina y Tienda SSH en el año 2026</strong>. Quedan reservados todos los derechos de autor y propiedad intelectual.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TÉRMINOS & LEGALES */}
      {activeTab === 'terms' && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <ShieldCheck className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h2 className="text-xl font-black text-white">Términos, Condiciones y Políticas de Uso</h2>
              <p className="text-xs text-zinc-400">Documento Legal Regulatorio - Edición 2026</p>
            </div>
          </div>

          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">1. Titularidad y Derechos Reservados</h3>
              <p className="text-zinc-400">
                El presente desarrollo informático es propiedad intelectual de <strong>La Clave Argentina y Tienda SSH © 2026</strong>. Queda prohibida la reproducción parcial o total, ingeniería inversa, descompilación o comercialización del software sin la previa autorización por escrito de sus desarrolladores.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">2. Objeto de la Aplicación</h3>
              <p className="text-zinc-400">
                StreamControl PRO es un software exclusivamente de gestión administrativa, contable y logística para el control de inventarios privados de cuentas y agenda de clientes.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">3. Deslinde de Responsabilidad sobre Servicios Externos</h3>
              <p className="text-zinc-400">
                La plataforma no transmite, almacena ni hospeda contenidos de streaming, transmisiones televisivas o archivos multimedia. La procedencia, validez y términos de servicio de las cuentas ingresadas al sistema por el usuario son responsabilidad exclusiva del propio usuario y sus respectivos proveedores.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <h3 className="font-bold text-white text-sm">4. Privacidad y Seguridad</h3>
              <p className="text-zinc-400">
                Los datos almacenados son procesados bajo parámetros de aislamiento por usuario y guardados en almacenamiento persistente estructurado. Se recomienda al usuario realizar exportaciones de respaldo en formato JSON de forma periódica desde la sección de Ajustes.
              </p>
            </div>
          </div>

          <div className="text-center pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 font-medium">
            Producto desarrollado por <strong className="text-zinc-300">La Clave Argentina y Tienda SSH</strong> en el 2026. Reservados todos los derechos.
          </div>
        </div>
      )}
    </div>
  );
};
