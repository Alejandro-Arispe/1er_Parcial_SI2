# Instalar el backend y poblar PostgreSQL

Esta guía permite preparar el proyecto en otro equipo desde el repositorio.
El esquema actual ya permite cargar usuarios, catálogo, inventario, reservas,
carritos, ventas y pagos de demostración. No es necesario terminar IA o RA para
usar los módulos implementados.

## 1. Requisitos y archivos que se deben compartir

Entorno usado para verificar esta guía: **Node.js 24, npm y PostgreSQL 17**.
También necesitas Git, o una copia completa del proyecto.

Compartir el código del backend, `package.json`, `package-lock.json`,
`prisma/schema.prisma`, **todas** las carpetas `prisma/migrations`,
`prisma/seed*.ts`, `prisma/seeds`, configuración y `.env.example`.
Si utilizas Git, asegúrate de incluir los archivos nuevos al subir tus cambios.
La otra persona instala las dependencias y genera el cliente Prisma localmente.

Cada equipo crea su propio `.env`. No compartir `.env`, contraseñas reales,
claves de Stripe, `node_modules` ni el directorio compilado `dist`.

Clona el repositorio o copia el proyecto y entra a su carpeta `backend`.
Todos los comandos siguientes se ejecutan desde esa carpeta.

## 2. Crear la base

Con PostgreSQL iniciado, crea una base vacía llamada `tienda_ropa`. Puedes hacerlo
en pgAdmin con **Databases → Create → Database**, o desde una terminal que tenga
las herramientas PostgreSQL en PATH:

```powershell
createdb -h localhost -p 5432 -U postgres tienda_ropa
```

Si la base ya existe, omite este paso. Los seeds no borran tablas ni requieren
reiniciar una base que ya tiene datos.

## 3. Configurar el entorno

En PowerShell, copiar el ejemplo únicamente si todavía no existe `.env`:

```powershell
if (-not (Test-Path -LiteralPath .env)) {
  Copy-Item -LiteralPath .env.example -Destination .env
}
```

Editar al menos estas variables:

```dotenv
NODE_ENV=development
DATABASE_URL=postgresql://postgres:TU_PASSWORD_POSTGRES@localhost:5432/tienda_ropa?schema=public
JWT_SECRET=TU_SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
SEED_ADMIN_EMAIL=admin@fashionstore.test
SEED_ADMIN_PASSWORD=TU_PASSWORD_ADMIN
SEED_DEMO_PASSWORD=TU_PASSWORD_DEMO
```

Sustituir los valores de ejemplo. Las contraseñas de seed deben tener al menos
8 caracteres y no superar 72 bytes UTF-8. Los caracteres especiales del usuario
o contraseña de PostgreSQL deben codificarse para una URL si corresponde.

Para generar un secreto JWT aleatorio:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Stripe es opcional para instalar, poblar la base y consultar reportes. Para dejarlo
deshabilitado, mantener vacías **las tres** variables `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET` y `STRIPE_PUBLISHABLE_KEY`. Para usarlo, configurar las tres
con los datos de prueba de ese equipo/cuenta y seguir la [guía de Stripe](./pagos-stripe.md).
El seed no hace solicitudes ni cargos en Stripe aunque esas claves existan.

## 4. Instalar y aplicar el esquema

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
```

`npm ci` usa las versiones de `package-lock.json`. La generación también se ejecuta
durante la instalación; el comando explícito permite repetirla si fuera necesario.
`prisma:migrate:deploy` aplica las migraciones del repositorio y conserva las ya
aplicadas. Para recibir el proyecto de otra persona no hace falta crear una
migración nueva ni ejecutar `migrate reset` o `db push`.

El esquema actual contiene cinco migraciones; Reportes consulta las tablas
existentes y no añade otra migración.

## 5. Elegir qué datos cargar

### Opción A: datos mínimos

```powershell
npm run prisma:seed
```

Crea cinco roles, el administrador configurado, una sucursal central, los datos
de catálogo de una Camisa Oxford y dos variantes con existencias iniciales.
Es adecuado para cargar después los productos y operaciones propios.

El seed base conserva contraseñas, nombres y existencias de registros que ya
existen. Si `SEED_ADMIN_EMAIL` pertenece a alguien sin rol administrador, se detiene
para no convertir una cuenta de cliente en administrador.

### Opción B: demostración completa, recomendada para probar

```powershell
npm run prisma:seed:demo
```

**Incluye automáticamente la carga base**; no necesitas ejecutar antes la opción A.
Sobre una base vacía deja:

| Datos | Resultado |
|---|---|
| Roles | 5 |
| Usuarios | 1 administrador, 3 encargados, 3 cajeros y 4 clientes |
| Sucursales | Central base y 3 sucursales `DEMO - ...` |
| Productos | Camisa Oxford base y 12 prendas DEMO |
| Variantes por sucursal | 218 registros de inventario en total |
| Ventas | 30 completadas: 18 presenciales, 6 WEB y 6 MOBILE |
| Otros pedidos | 1 pendiente, 1 cancelado y 1 cancelado con pago reembolsado |
| Reservas | 7, una por cada estado |
| Carritos | 4 activos y 15 convertidos conservados como historial |
| Entradas pendientes | 3, una por sucursal DEMO |

Incluye descuentos, stock agotado y bajo, movimientos de entrada, venta, retención
y liberación. Las ventas históricas abarcan los últimos 30 días de la fecha de
referencia y están expresadas en **BOB**. Los pagos electrónicos son ficticios,
con referencias `DEMO:...`; no contienen identificadores de transacciones Stripe.
Las imágenes son enlaces de marcador de posición y requieren conexión para verse.

Por defecto la referencia es el día de la primera ejecución en Bolivia. Para una
demostración con fecha fija, configurar **antes de la primera carga**:

```dotenv
SEED_DEMO_DATE=2026-09-12
```

El comando muestra `referenceDate` y `created: true` cuando carga el conjunto.
Para esa fecha de ejemplo, consultar ventas desde `2026-08-14` hasta `2026-09-12`.
Las reservas activas tienen cita al día siguiente de la referencia; ampliar el
reporte de reservas para incluirlas. El checkout pendiente vence 15 minutos después
de cargarlo. Al iniciar el backend, los procesos automáticos actualizan los
vencimientos; por eso los estados y cantidades reservadas pueden cambiar después.

## 6. Cuentas de demostración

| Cuenta | Rol / sucursal | Contraseña |
|---|---|---|
| Valor de `SEED_ADMIN_EMAIL` | Administrador global | `SEED_ADMIN_PASSWORD` |
| `encargado1@demo.fashionstore.test` | Encargado de La Paz | `SEED_DEMO_PASSWORD` |
| `encargado2@demo.fashionstore.test` | Encargado de Cochabamba | `SEED_DEMO_PASSWORD` |
| `encargado3@demo.fashionstore.test` | Encargado de Santa Cruz | `SEED_DEMO_PASSWORD` |
| `cajero1@demo.fashionstore.test` | Cajero de La Paz | `SEED_DEMO_PASSWORD` |
| `cajero2@demo.fashionstore.test` | Cajero de Cochabamba | `SEED_DEMO_PASSWORD` |
| `cajero3@demo.fashionstore.test` | Cajero de Santa Cruz | `SEED_DEMO_PASSWORD` |
| `cliente1@demo.fashionstore.test` a `cliente4@demo.fashionstore.test` | Clientes | `SEED_DEMO_PASSWORD` |

Son direcciones ficticias, no se envían correos. Si una cuenta ya existía o se
cambió después su contraseña, se conserva la contraseña existente: modificar el
`.env` y repetir el seed **no restablece contraseñas**.

## 7. Iniciar y comprobar

```powershell
npm run build
npm run start:dev
```

API: `http://localhost:3000/api/v1`.
Iniciar sesión con `POST /auth/login`, cuerpo:

```json
{ "email": "admin@fashionstore.test", "password": "TU_PASSWORD_ADMIN" }
```

Usar el token `data.accessToken` como `Authorization: Bearer TOKEN` para consultar:

```text
GET /api/v1/reports/sales
GET /api/v1/reports/top-products
GET /api/v1/reports/inventory?lowStockOnly=true
GET /api/v1/reports/reservations
```

Los encargados solo ven su sucursal. Clientes y cajeros no acceden a Reportes.
Los IDs dependen de cada base: obtenerlos de la API; no asumir que las sucursales
o productos DEMO tienen los mismos IDs en todos los equipos.

## 8. Repetición, conservación y actualizaciones

El seed DEMO usa una transacción para su conjunto y un bloqueo para ejecuciones
concurrentes. Si se interrumpe, ese conjunto se revierte; la carga base puede haber
quedado completada. Se puede repetir el mismo comando.

Al encontrar la carga completa, devuelve `created: false` y no duplica ventas,
reservas, usuarios ni movimientos. Tampoco repone stock consumido, reabre carritos
o cambia contraseñas. La fecha original de los registros se conserva aunque cambie
`SEED_DEMO_DATE`; el `referenceDate` impreso en una repetición es el solicitado para
esa ejecución, no una modificación del historial.

No es un comando de reparación ni de reinicio. Si se borraron partes de los datos
DEMO manualmente, revisar la base o usar otra base de demostración vacía. Si existen
sucursales `DEMO - ...` sin el marcador de carga completa, se detiene para evitar
mezclar conjuntos. Tampoco debe cambiarse `SEED_ADMIN_EMAIL` para intentar duplicar
la misma demostración. La carga DEMO se rechaza con `NODE_ENV=production`.

Después de recibir cambios del repositorio:

```powershell
npm ci
npm run prisma:migrate:deploy
npm run build
```

Los seeds anteriores por módulo (`prisma:seed:reservations`, `prisma:seed:cart`,
`prisma:seed:sales`) siguen disponibles para ejemplos individuales. **No son
necesarios** para la carga completa descrita aquí.

## Problemas frecuentes

- **No conecta a PostgreSQL:** verificar servicio iniciado, puerto, base, usuario
  y contraseña de `DATABASE_URL`.
- **Falta una tabla o columna:** ejecutar las migraciones del repositorio antes
  del seed o del servidor.
- **Falta `SEED_DEMO_PASSWORD`:** añadirla al `.env`; un `.env` anterior no se
  actualiza automáticamente al recibir `.env.example` nuevo.
- **Falló `npm ci` durante la generación:** comprobar que `.env` y `DATABASE_URL`
  estén configurados y usar la versión Node verificada.
- **Reportes vacíos:** revisar fechas, rol/sucursal y que se cargó el seed DEMO.
  Solo las ventas `COMPLETED` entran en los ingresos.
- **Error de historial de migraciones en una base creada manualmente:** no usar
  un reset como solución automática. Para una instalación nueva, elegir una base
  vacía y aplicar todas las migraciones; si hay datos propios, revisar la diferencia.

Más detalles: [Reportes](./reportes.md), [Ventas](./ventas-checkout.md) y
[Pagos/Stripe](./pagos-stripe.md).
