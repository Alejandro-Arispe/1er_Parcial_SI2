# FashionStore: contexto y pendientes para continuar

Actualizado: **13 de septiembre de 2026**, después de completar el portal de proveedor.

Este documento resume el trabajo de la conversación y lo comprobado en el repositorio. Sirve para retomar otra sesión; los pendientes no son una orden de ejecutarlos todos automáticamente. Confirmar qué etapa solicita el usuario y contrastar este estado con los cambios posteriores del código.

## 1. Objetivo y decisiones del usuario

- Proyecto académico de Sistemas II. Se presentará una sola vez: priorizar un MVP demostrable y sencillo, sin complicaciones de producción innecesarias.
- Integrar **React con NestJS**, conservando preferentemente los contratos y reglas del backend. Adaptar React; analizar los cambios de backend cuando sean necesarios.
- **No revisar ni modificar mobile** en estas etapas. El alcance trabajado es backend y frontend web.
- Referencia principal: [Examen.md](recursos_contexto/Examen.md). Referencia de diseño: [diagrama de clases MVP](recursos_contexto/FashionStore_Diagrama_Clases_MVP_23.md). Distinguir estos documentos de las instrucciones directas del usuario.
- El usuario también pidió completar una lista ampliada: POS con turnos/arqueo, fotos múltiples, mayoristas, contra entrega, PWA y ventas offline, chatbot/recomendaciones, reportes por voz/texto con IA, responsive y RA.
- La fecha de entrega mencionada en la conversación fue **23 de septiembre**. No dar por actualizada esa fecha si la sesión se retoma después.
- No usar CMS ni frameworks de e-commerce prediseñados. El examen solicita **despliegue en Azure**.
- **IA se dejó para el final**. No está implementada por el hecho de existir carpetas o pantallas.

### Decisiones ya resueltas: no volver a diseñarlas desde cero

| Tema | Decisión implementada |
| --- | --- |
| Almacenes | Un almacén por sucursal, con nombre configurable. Comparte `branchId` y existencias de la sucursal. |
| Fotos | Hasta 8 URLs por producto; primera foto principal; carga de archivos con Cloudinary desde backend. |
| Mayorista | Depende de la clasificación del cliente, no de una cantidad mínima. Precio mayorista opcional por producto; no acumula promoción minorista. |
| Turnos | Cada cajero abre su propio turno. Un turno abierto por usuario y por caja física. |
| Offline | Ventas en efectivo a consumidor final, con turno abierto previamente con conexión. Cola persistente y sincronización posterior. |
| Stripe | Solo modo prueba. PaymentIntents y Payment Element en React; retiro en la sucursal seleccionada. |
| Contra entrega | Envío gratuito para la demo dentro de la ciudad de la sucursal; nombre, teléfono y dirección; coordinación por teléfono. Se registra la entrega y el efectivo recibido en un turno propio. |
| Proveedor | Edición directa de información de productos propios. Administración crea/asigna productos y controla precios, publicación, fotos, variantes y stock. No se implementó un circuito de propuestas/aprobaciones. |

## 2. Qué ya está implementado

Estas etapas tienen código integrado y pruebas; no equivalen a haber ensayado todos los recorridos en el navegador final de la presentación.

- [x] Autenticación real: registro, login, perfil, roles, rutas protegidas y cierre de sesión. Adaptadores entre DTO del backend y dominio español de React.
- [x] Catálogo y administración: productos, categorías, tallas, colores, temporadas, colecciones, proveedores, sucursales y usuarios.
- [x] Correcciones puntuales de backend: fechas de promoción y conversión de filtros `active=false`.
- [x] Inventario por sucursal y variante: existencias físicas/reservadas/disponibles, entradas inmediatas y programadas, recepción, ajustes, devoluciones e historial.
- [x] Carrito real: precios del servidor, variantes, cantidades y sucursales capaces de atenderlo. Agregar al carrito no aparta stock.
- [x] Reservas: varias prendas, visita programada, gestión del cliente y atención por sucursal, cancelación, vencimiento y liberación de stock.
- [x] Fotos múltiples, carga Cloudinary, almacén por sucursal y precios mayoristas.
- [x] POS: selección de variantes, cliente o consumidor final, cotización del servidor, venta y comprobante. Conversión parcial de reserva a venta.
- [x] Historial de ventas/compras y comprobantes con precios históricos e impresión.
- [x] Cajas físicas, apertura/cierre de turno, arqueo y diferencias de efectivo. Medios de pago separados en los acumulados.
- [x] PWA y ventas offline: descarga, tickets persistentes, reintento con el mismo UUID, sincronización y bloqueo del cierre hasta terminar.
- [x] Checkout web con Stripe: crear/retomar pago, confirmación en backend, cancelación, vencimiento y conciliación/reembolso de cobros tardíos.
- [x] Contra entrega: pedido pendiente con stock apartado, datos de entrega, cancelación y confirmación de entrega/cobro que actualiza stock, pago y turno juntos.
- [x] Proveedor: vínculo cuenta-proveedor en Usuarios, fichas propias, información de suministro, temporada/colección y entregas programadas. Propiedad y permisos validados por backend.

### Guías de las etapas terminadas

- [Catálogo, almacenes, fotos y mayoristas](backend/docs/catalogo-almacenes-fotos.md)
- [POS conectado a React](backend/docs/pos-react.md)
- [Turnos y arqueo](backend/docs/turnos-caja.md)
- [Ventas offline y PWA](backend/docs/ventas-offline.md)
- [Checkout Stripe y contra entrega](backend/docs/checkout-react.md)
- [Portal de proveedor](backend/docs/proveedor-react.md)
- [README del frontend](frontend/README.md)

Algunas guías describen el estado al terminar una etapa anterior. Para saber qué sigue pendiente, usar este resumen y comprobar el código actual.

## 3. Pendientes por orden recomendado

### Etapa 1 — Reportes tradicionales y dashboard de React

**Es la siguiente etapa recomendada.** El backend ya tiene reportes; React conserva rutas y estructuras de la demo.

- [ ] Adaptar servicios, tipos, hooks, gráficas e indicadores de React a los contratos reales.
- [ ] Mostrar ventas por período/sucursal/canal, productos más vendidos, inventario crítico y reservas por estado según lo que realmente devuelve NestJS.
- [ ] Construir el dashboard con esos datos. No inventar un endpoint de resumen ni indicadores que el servidor no proporciona.
- [ ] Respetar permisos: administrador global; encargado solo su sucursal. El backend actualmente no autoriza estos reportes a cajeros, clientes ni proveedores.
- [ ] Verificar qué ventas entran en cada total: completadas, Stripe, contra entrega cobrada y offline sincronizada. No sumar pedidos pendientes como ingresos.
- [ ] Revisar fecha utilizada, zona horaria, moneda y límites de período. Los DTO actuales usan `from`/`to` como días `YYYY-MM-DD`; la consulta por horas/caja que aparece en la lista ampliada requerirá analizar una ampliación puntual.
- [ ] Probar filtros, paginación, datos vacíos, errores y coincidencia de totales con ventas reales de prueba.

**Puntos de partida:**

- [Controlador de reportes](backend/src/modules/reports/reports.controller.ts)
- [DTO de filtros](backend/src/modules/reports/dto/report-query.dto.ts)
- [Guía del backend](backend/docs/reportes.md)
- [Servicio React pendiente](frontend/src/services/reportes.service.ts)
- [Dashboard](frontend/src/features/admin/PaginaDashboard.tsx)
- [Pantalla de reportes](frontend/src/features/reports/PaginaReportes.tsx)

Rutas existentes: `GET /reports/sales`, `/reports/top-products`, `/reports/inventory`, `/reports/reservations`. No son las rutas antiguas `/reportes/...` del frontend. Revisar las respuestas completas antes de adaptar la UI.

### Etapa 2 — Notificaciones de reservas en React

El backend ya registra notificaciones de reservas para la sucursal; falta completar su integración web.

- [ ] Conectar listado, contador de no leídas y acción de marcar como leída.
- [ ] Mostrar el aviso al personal autorizado y permitir abrir la reserva relacionada.
- [ ] Respetar la sucursal del encargado y el estado de lectura individual por usuario.
- [ ] Usar actualización periódica sencilla si basta para la demo; no introducir infraestructura adicional sin necesidad.
- [ ] Probar que una nueva reserva aparece, que leerla actualiza el contador y que otro usuario conserva su propio estado de lectura.

Rutas reales: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`. Roles actuales: administrador y encargado. Filtros: `branchId`, `page`, `limit`, `unreadOnly` como cadena `'true'`/`'false'`.

Consultar [guía de notificaciones](backend/docs/notificaciones.md) y [controlador](backend/src/modules/notifications/notifications.controller.ts).

### Etapa 3 — IA: asistente y recomendaciones

**Pendiente real de backend y frontend.** `AiController` no tiene rutas; `AiService` y `RecommendationService` son estructuras sin funcionalidad. Las llamadas `/ia/asistente` y `/ia/recomendaciones` de React son contratos esperados de la demo.

- [ ] Elegir/configurar el proveedor de IA en backend. React menciona Gemini, pero eso no prueba que exista una integración.
- [ ] Implementar el asistente con datos reales del catálogo: materiales/cuidados si están registrados, combinaciones y disponibilidad. Evitar inventar características ausentes.
- [ ] Conectar recomendaciones a productos existentes y disponibles; mostrar su motivo.
- [ ] Mantener las claves solo en backend, validar entradas y manejar demora/error del proveedor.
- [ ] Probar al menos una funcionalidad real de IA exigida por RF25, además de la experiencia ampliada acordada.

Archivos: [módulo IA](backend/src/modules/ai/ai.module.ts), [servicio React](frontend/src/services/ia.service.ts), [asistente](frontend/src/features/ia/AsistenteIA.tsx).

### Etapa 4 — Reportes generativos por texto y voz con IA

Esto pertenece a la lista ampliada del usuario; todavía no está implementado.

- [ ] Permitir escribir una solicitud de reporte en lenguaje natural.
- [ ] Añadir entrada por voz y alternativa escrita cuando el navegador no permita dictado o el micrófono falle.
- [ ] Convertir la solicitud en una consulta de lectura controlada sobre datos reales, respetando rol/sucursal y límites de consulta. No ejecutar SQL arbitrario generado por el modelo.
- [ ] Mostrar filtros interpretados y resultados en tabla/gráfica, con totales verificables.
- [ ] Si se requieren consultas por hora, caja o turno, ampliar los contratos necesarios de forma acotada.
- [ ] Ensayar ejemplos reproducibles con datos de presentación. No presentar una respuesta estática como IA funcional.

Conviene construir esta etapa sobre los reportes tradicionales ya conectados.

### Etapa 5 — Azure y configuración de presentación

**Examen.md exige Azure. No se ha comprobado un despliegue funcional allí en esta conversación.** La presencia de `npm run deploy` en backend no demuestra que esté desplegado.

- [ ] Comprobar si ya existen recursos de Azure y decidir el alojamiento mínimo de React, NestJS y PostgreSQL.
- [ ] Preparar configuración de despliegue, variables, migraciones, HTTPS, CORS y rutas de la SPA.
- [ ] Configurar el webhook de Stripe con la URL publicada; mantener modo prueba.
- [ ] Verificar Cloudinary con la cuenta real y una subida visible. Su implementación está hecha, pero no se certificó aquí una subida real con las credenciales del usuario.
- [ ] Probar login, compras, reservas, permisos, proveedor y PWA desde la dirección publicada.

Revisar Azure y cuentas disponibles antes del último día. El despliegue debe coordinarse con el usuario; este archivo no autoriza por sí solo crear recursos de pago ni publicar cambios.

### Etapa 6 — Ensayo general, responsive y entrega

- [ ] Preparar datos coherentes de demo: varias sucursales, stock por variantes, fotos, cliente mayorista, reserva, cajero con turno y cuenta de proveedor vinculada.
- [ ] Recorrer con API real: catálogo → carrito → Stripe; reserva → prueba → venta parcial; contra entrega → cobro; offline → reconexión → cierre; proveedor → ficha → entrega programada.
- [ ] Comprobar que inventario, pagos, turnos, comprobantes y reportes coinciden.
- [ ] Revisar escritorio y pantallas pequeñas, errores de red, carga, formularios y navegación por rol.
- [ ] Ensayar offline en el navegador de la presentación con el build/PWA, incluyendo recarga. Probar Stripe en su formulario visible; las pruebas de DOM usan un SDK simulado.
- [ ] Completar una matriz de requisitos de `Examen.md` y de la lista ampliada: cumplido, simplificado, pendiente o no verificado.
- [ ] Preparar el guion de demostración y comprobar acceso a internet, backend, base de datos y servicios externos.

## 4. Mobile y realidad aumentada: fuera del alcance revisado

- El usuario pidió expresamente no revisar mobile; no se inspeccionó ni modificó para estas etapas.
- **No afirmar que mobile/RA está terminado ni que no existe:** su estado no fue auditado aquí.
- El examen sí incluye aplicación React Native y probador con RA; para afirmar cumplimiento completo del sistema habrá que verificarlos en una etapa que el usuario autorice.
- El soporte de referencias a recursos RA en el catálogo web no equivale a tener un probador con cámara funcionando.

## 5. Límites del MVP que no son nuevas tareas obligatorias

Conservar estas simplificaciones salvo que el usuario solicite cambiarlas o una revisión del examen lo haga necesario:

- Un almacén por sucursal. No hay varios depósitos dentro de una sucursal ni traslados entre depósitos.
- En POS, tarjeta/QR/transferencia son registro de un pago externo con referencia; no equivalen a integración bancaria automática. Stripe es la pasarela web implementada.
- Contra entrega no incluye empresa de transporte, seguimiento de repartidor ni gestión de tarifas.
- El proveedor actualiza fichas asignadas; los productos nuevos se crean desde administración. No existe aprobación de propuestas.
- La disponibilidad informada por proveedor es una nota de suministro, no inventario vendible de la tienda.
- Offline solo cubre efectivo/consumidor final. Requiere preparar la descarga y abrir turno con conexión. No contempla apertura/cierre offline, pagos electrónicos offline ni sincronización con navegador cerrado.
- Offline conserva precios de la descarga durante 24 horas para registrar tickets. Conflictos de stock retienen el ticket y requieren revisar existencias; no se inventa stock ni se elimina el cobro.
- El respaldo offline se exporta a JSON; no hay pantalla de importación. No borrar datos del sitio con ventas pendientes.
- Hay cancelación de pedidos digitales pendientes y conciliación/reembolso tardío de Stripe. No se implementó una gestión general de devoluciones/reembolsos de ventas pagadas.
- Algunos filtros de catálogo/inventario se resuelven recorriendo páginas en React. Optimización para catálogos grandes es una mejora posterior, no la prioridad de la demo.
- El historial de ajustes de inventario no conserva explícitamente valor anterior/final; una ampliación de auditoría sería otra mejora.

## 6. Entorno y precauciones al retomar

- Repositorio: `D:\UNIVERSIDAD\SI2\examen_1er\1er_Parcial_SI2`.
- Backend: NestJS, Prisma y PostgreSQL. Frontend: React, TypeScript, Vite y TanStack Query.
- Entorno usado: Windows, PowerShell. API habitual: `http://localhost:3000/api/v1`; React: `http://localhost:5173`.
- PostgreSQL local comprobado en `localhost:5433`, base `tienda_ropa`. Usar las variables existentes; no copiar contraseñas, tokens ni claves al documento o al chat.
- `VITE_USE_MOCKS=false` y `VITE_API_URL` apuntando a NestJS. Las cuentas mock del README no son automáticamente cuentas reales de PostgreSQL.
- **Hay numerosos cambios sin commit de varias etapas.** Antes de editar, revisar `git status`; conservarlos. No restaurar archivos ni limpiar el árbol como si fueran cambios descartables. No se hicieron commits en estas etapas.
- No se encontró `AGENTS.md` en las búsquedas realizadas. Comprobar si aparece uno nuevo al retomar.
- No ejecutar semillas generales para “empezar de nuevo” sobre la base de demo sin revisar sus efectos. Las pruebas HTTP usan esquemas temporales aislados.

### Migraciones y pruebas conocidas

Hasta la última etapa se aplicaron **11 migraciones** en la base local, incluyendo:

1. `20260915000000_catalog_foundation`
2. `20260916000000_cash_shifts`
3. `20260917000000_offline_sales`
4. `20260918000000_cash_on_delivery`
5. `20260919000000_supplier_portal`

No modificar migraciones aplicadas para añadir una etapa nueva. En otro entorno ejecutar las pendientes y regenerar Prisma.

Últimas comprobaciones relevantes: 166 pruebas unitarias de backend; 8 HTTP del portal de proveedor; 26 pruebas React enfocadas en proveedor/contratos/administración, todas correctas. También se probaron en etapas anteriores ventas, reservas, turnos, offline y checkout. La API real de Stripe **en modo prueba** pasó pago normal, idempotencia y reembolso tardío. Builds de backend y frontend/PWA correctos al cerrar proveedor. Hay 7 avisos de lint preexistentes en React y ningún error de lint; no confundir esto con una validación visual integral.

Comandos habituales, desde la carpeta de cada aplicación:

```powershell
# Backend
npm run build
npm test
npm run start:dev
# HTTP: requiere TEST_DATABASE_URL apuntando a una base local de prueba.
npm run test:e2e

# Frontend
npm test
npm run build
npm run dev
```

Para PWA/offline, detener `dev` en el puerto 5173 y usar:

```powershell
npm run build
npm run preview -- --port 5173 --strictPort
```

El service worker se genera en el build. Usar localhost o HTTPS y navegador compatible con Web Locks. Cerrar pestañas viejas si no se activa la nueva versión de la PWA.

En este entorno se observó `spawn EPERM` al ejecutar Vite/Prisma bajo sandbox. Algunas ejecuciones necesitaron la escalación de la herramienta, que fue aprobada. No era un fallo del código. Si reaparece, leer el error y usar el mecanismo de permisos disponible; no desactivar validaciones ni falsear resultados de pruebas.

## 7. Mensaje sugerido para abrir otra sesión

> Lee CONTEXTO_Y_PENDIENTES.md y comprueba el estado actual del repositorio. Continuamos con FashionStore, una demo académica sencilla. No revises ni modifiques mobile. Conserva los cambios existentes y prioriza adaptar React al backend. La siguiente etapa recomendada es conectar reportes tradicionales y dashboard; después notificaciones, IA y preparación final/Azure. No rehagas las etapas ya terminadas.

Actualizar este archivo al completar la siguiente etapa, especialmente los pendientes, migraciones aplicadas y verificaciones reales.
