# Stream Flow Pro — API para agentes

La cuenta administradora emite claves desde **Tokens y Suscripción → Acceso de agentes por API**. El cliente tiene que haberse registrado antes. Cada clave pertenece a una cuenta secundaria concreta; no se autentica con ni revela la contraseña del cliente en Stream Flow Pro.

## Seguridad y alcance

- Copiá la clave al emitirla: se muestra una sola vez; el servidor conserva únicamente su SHA-256. Las claves caducan (1–365 días) y el administrador puede revocarlas al instante.
- La clave queda ligada al usuario cliente indicado y no puede leer ni modificar datos de otro usuario. Una cuenta no administradora no puede emitir claves ni generar tokens de suscripción.
- El agente sí puede leer las credenciales de los servicios de streaming guardadas en los registros de cuenta asignados y gestionar los datos de esa cuenta. **No recibe la contraseña de inicio de sesión del cliente, sesiones, datos de administración ni claves/tokens de suscripción.**
- El acceso requiere que la cuenta cliente no esté bloqueada por vencimiento. Guardá la clave en el gestor de secretos del agente y nunca en código público, prompts compartidos o logs.

## Autenticación

En cada solicitud incluí `Authorization: Bearer <CLAVE_API>` y `Content-Type: application/json` cuando mandes JSON. Base URL de producción:

`https://stream-flow-api.tiendasshoficial.workers.dev`

## Endpoints

- `GET /api/agent/v1/data` — inventario completo de esa cuenta (incluye contraseñas de los servicios), clientes, proveedores, ventas, plantillas y ajustes.
- `GET|POST /api/agent/v1/providers` y `GET|PUT|DELETE /api/agent/v1/providers/{id}`
- `GET|POST /api/agent/v1/accounts` y `GET|PUT|DELETE /api/agent/v1/accounts/{id}`
- `GET|POST /api/agent/v1/customers` y `GET|PUT|DELETE /api/agent/v1/customers/{id}`
- `GET|POST /api/agent/v1/sales` y `GET|PUT|DELETE /api/agent/v1/sales/{id}`; `POST /api/agent/v1/sales/{id}/renew` renueva una venta según las reglas del panel.
- `GET|POST /api/agent/v1/templates` y `GET|PUT|DELETE /api/agent/v1/templates/{id}`
- `GET|POST /api/agent/v1/custom-services` y `GET|PUT|DELETE /api/agent/v1/custom-services/{id}`

El cuerpo de creación/edición sigue el modelo de datos de la aplicación. El backend fuerza el `userId` de la cuenta vinculada y aplica las validaciones/reservas de inventario de ventas.

## Ejemplo de lectura

```sh
curl 'https://stream-flow-api.tiendasshoficial.workers.dev/api/agent/v1/data' \
  -H 'Authorization: Bearer <CLAVE_API>'
```

El endpoint administrativo de emisión/revocación usa una sesión de la administradora y no está disponible para claves de agente.
