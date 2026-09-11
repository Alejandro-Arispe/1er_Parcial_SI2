# FashionStore - Frontend Web

Aplicacion web de FashionStore (MVP academico, Sistemas de Informacion II).
React + TypeScript + Vite. Cubre la tienda para clientes y los paneles internos
de administracion, sucursal, caja y proveedor.

El backend NestJS lo desarrolla otro integrante del equipo: este proyecto ya
esta preparado para conectarse a el sin reescribir componentes.

## Puesta en marcha

```bash
npm install
npm run dev
```

Scripts disponibles:

| Script | Que hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Verificacion de tipos + build de produccion |
| `npm run preview` | Sirve el build generado |
| `npm run lint` | Analisis estatico (oxlint) |

## Variables de entorno

Copiar `.env.example` a `.env`:

```
VITE_API_URL=http://localhost:3000/api
VITE_USE_MOCKS=true
```

`VITE_USE_MOCKS=false` hace que todas las peticiones salgan hacia `VITE_API_URL`
por axios. No hay que tocar nada mas.

## Cuentas de prueba (mock)

| Rol | Correo | Contrasena |
|---|---|---|
| Administrador | admin@fashionstore.bo | admin123 |
| Encargado de sucursal | encargado@fashionstore.bo | encargado123 |
| Cajero | cajero@fashionstore.bo | cajero123 |
| Cliente | cliente@fashionstore.bo | cliente123 |
| Proveedor | proveedor@fashionstore.bo | proveedor123 |

La pantalla de login permite cargarlas con un clic.

## Arquitectura

```
UI (features/*)
  -> hooks/*          estado remoto con TanStack Query
    -> services/*     contrato estable por dominio
      -> api/http.ts  adaptador unico (axios | mock)
        -> mocks/     datos temporales en memoria
```

Reglas que sostienen el proyecto:

- Ningun componente llama a `fetch`/`axios` directamente.
- Las rutas del backend viven solo en `src/api/endpoints.ts`.
- Los errores se normalizan a `ErrorApi` con mensajes en lenguaje humano
  (nunca se muestra un `AxiosError` al usuario).
- Cada vista contempla los cuatro estados: cargando, vacio, error y con datos.

### Estructura

```
src/
  api/          adaptador HTTP y mapa de endpoints
  components/   piezas de UI reutilizables (estados, modal, badges, paginacion)
  context/      sesion (AuthContext) y notificaciones (ToastContext)
  features/     un modulo por area funcional
    admin/ auth/ cart/ catalog/ checkout/ ia/ inventory/
    pos/ reports/ reservations/ sales/ supplier/
  hooks/        hooks de datos + claves de cache
  layouts/      shell de tienda y shell de panel interno
  lib/          reglas de dominio, formato y validacion
  mocks/        backend simulado temporal
  routes/       guards, navegacion lateral y permisos por area
  services/     servicios por dominio (lo unico que cambia al conectar NestJS)
  styles/       tokens de diseno y hojas de estilo
  types/        modelo de dominio (23 clases) y tipos de transporte
```

## Modelo de dominio

`src/types/domain.ts` refleja las 23 clases del diagrama UML con los mismos
nombres de campo (`id_producto`, `cantidad_fisica`, etc.), de modo que la
respuesta de NestJS se pueda consumir sin capa de mapeo.

Reglas de negocio implementadas en `src/lib/domain.ts`:

- `stock_disponible = cantidad_fisica - cantidad_reservada`
- El inventario se identifica por **sucursal + producto + talla + color**
- Precio con promocion vigente (`descuento_pct`, `promo_inicio`, `promo_fin`);
  no existe una entidad `Promocion`, tal como define el MVP.

## Roles y rutas

| Area | Rutas | Roles |
|---|---|---|
| Tienda | `/`, `/catalogo`, `/producto/:id`, `/reservas/nueva` | publico |
| Cliente | `/carrito`, `/checkout`, `/mis-compras`, `/mis-reservas` | CLIENTE |
| Administracion | `/admin/...` | ADMINISTRADOR |
| Sucursal | `/sucursal/...` | ENCARGADO_SUCURSAL |
| Caja | `/caja`, `/caja/ventas` | CAJERO |
| Proveedor | `/proveedor/...` | PROVEEDOR |

Los permisos por area estan centralizados en `src/routes/permisos.ts` y los usan
tanto los guards del router como la redireccion posterior al login.

> La proteccion de rutas es experiencia de usuario, no seguridad: **el backend es
> la autoridad final de autorizacion** y debe validar cada peticion.

## Mocks temporales

`src/mocks/` simula el backend: resuelve las mismas rutas que expondra NestJS,
con latencia artificial para que se vean los estados de carga. Los datos son
minimos (12 productos, 3 sucursales, 6 usuarios, 8 ventas) y se conservan en
`sessionStorage` para que una demostracion no se pierda al recargar.

Para conectar el backend real:

1. `VITE_USE_MOCKS=false` y `VITE_API_URL` apuntando a NestJS.
2. Ajustar `src/api/endpoints.ts` si alguna ruta difiere del contrato real.
3. Ajustar la forma de la respuesta en `src/services/*` solo si cambia.
4. Borrar `src/mocks/` y la rama de mocks en `src/api/http.ts`.

## IA y realidad aumentada

- El asistente de estilo y las recomendaciones consumen `/ia/asistente` y
  `/ia/recomendaciones`. La llamada a Gemini debe vivir en NestJS: **la API key
  nunca se coloca en el frontend**.
- La realidad aumentada es responsabilidad de la app movil. La web solo indica
  que una prenda tiene recurso RA disponible.

## Notas

- Las imagenes del catalogo mock usan un servicio publico de placeholders
  (`picsum.photos`); al cargar productos reales se reemplaza `imagen_url`.
  Si no hay conexion, cada tarjeta muestra una silueta de respaldo.
- La interfaz es responsive (escritorio, laptop, tablet y pantallas pequenas),
  pero no pretende sustituir a la aplicacion movil.
