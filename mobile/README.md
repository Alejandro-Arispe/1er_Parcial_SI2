# FashionStore - Aplicacion movil

Aplicacion movil de FashionStore (MVP academico, Sistemas de Informacion II).
React Native + Expo + TypeScript. Esta orientada al **cliente**: catalogo,
carrito, compra, reservas para probar en tienda, historial, asistente de IA y
probador virtual.

El backend NestJS lo desarrolla otro integrante del equipo. El proyecto ya esta
preparado para conectarse a el sin reescribir pantallas.

La app no es un panel administrativo: la gestion de catalogo, inventario,
caja y reportes vive en el frontend web.

## Puesta en marcha

```bash
npm install
npm start
```

Se abre Metro con un codigo QR. Para probar en un telefono:

1. instalar **Expo Go** desde la tienda de aplicaciones;
2. estar en la misma red Wi-Fi que la computadora;
3. escanear el codigo QR.

Con un emulador Android configurado: `npm run android`.

### Vista previa en la computadora

```bash
npm run web
```

Abre la app en `http://localhost:8081` para recorrer las pantallas sin
telefono. Sirve para revisar catalogo, carrito, checkout, reservas e historial.

**No reemplaza la prueba en el telefono:** el probador virtual depende de la
camara y del visor de RA del sistema, y guardar en la galeria solo existe en el
dispositivo. Esas tres cosas se prueban con Expo Go.

| Script | Que hace |
|---|---|
| `npm start` | Servidor de desarrollo (Metro) |
| `npm run android` | Abre la app en un emulador o dispositivo Android |
| `npm run ios` | Abre la app en un simulador iOS (requiere macOS) |
| `npm run web` | Vista previa en el navegador de la computadora |
| `npm run lint` | Analisis estatico (oxlint, igual que la web) |
| `npm run typecheck` | Verificacion de tipos |
| `npm run doctor` | Revisa dependencias y configuracion de Expo |

## Variables de entorno

Copiar `.env.example` a `.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCKS=true
```

`EXPO_PUBLIC_USE_MOCKS=false` hace que todas las peticiones salgan hacia
`EXPO_PUBLIC_API_URL` por axios. No hay que tocar nada mas.

> Un telefono real no llega a `localhost` de la computadora: al conectar el
> backend hay que usar la IP de la maquina en la red, por ejemplo
> `http://192.168.0.12:3000/api`.

## Cuenta de prueba (mock)

| Rol | Correo | Contrasena |
|---|---|---|
| Cliente | cliente@fashionstore.bo | cliente123 |

La pantalla de acceso la carga con un toque mientras los mocks esten activos.
Son los mismos usuarios que usa el frontend web.

## Arquitectura

```
Pantalla (features/*)
  -> hooks/*          estado remoto con TanStack Query
    -> services/*     contrato estable por dominio
      -> api/http.ts  adaptador unico (axios | mock)
        -> mocks/     backend simulado temporal
```

Reglas que sostienen el proyecto:

- Ninguna pantalla llama a `fetch`/`axios` directamente.
- Las rutas del backend viven solo en `src/api/endpoints.ts`.
- Los errores se normalizan a `ErrorApi` con mensajes en lenguaje humano.
- Cada pantalla importante contempla los cuatro estados: cargando, vacio, error
  y con datos.

### Estructura

```
src/
  api/          adaptador HTTP, mapa de endpoints y almacenamiento local
  components/   piezas de UI reutilizables (boton, campo, estados, chips, hoja)
  context/      sesion y avisos
  features/     un modulo por area funcional
    ar/ auth/ cart/ catalog/ checkout/ history/ ia/ product/
    profile/ reservations/
  hooks/        hooks de datos y claves de cache
  lib/          reglas de dominio, formato y validacion
  mocks/        backend simulado temporal
  navigation/   tabs, stack y tipos de rutas
  services/     servicios por dominio (lo unico que cambia al conectar NestJS)
  theme/        tokens de diseno
  types/        modelo de dominio (23 clases) y tipos de transporte
```

### Navegacion

```
Tabs: Inicio | Catalogo | Carrito | Reservas | Perfil
  Catalogo -> Producto -> Probador virtual
                       -> Nueva reserva -> Detalle de reserva
  Carrito  -> Checkout -> Resultado -> Mis compras -> Detalle de compra
  Perfil   -> Mis compras / Mis reservas / Asistente
  Acceso y Asistente se abren como modales
```

El catalogo es publico. Las pantallas que necesitan sesion no se ocultan:
muestran un estado que invita a entrar y vuelven a lo que el cliente estaba
haciendo. **La proteccion de pantallas es experiencia de usuario, no seguridad:
el backend es la autoridad final de autorizacion.**

## Modelo de dominio

`src/types/domain.ts` refleja las 23 clases del diagrama UML con los mismos
nombres de campo (`id_producto`, `cantidad_fisica`, etc.) y es identico al del
frontend web, de modo que la respuesta de NestJS se consuma sin capa de mapeo.

Reglas implementadas en `src/lib/domain.ts`:

- `stock_disponible = cantidad_fisica - cantidad_reservada`
- El inventario se identifica por **sucursal + producto + talla + color**
- Precio con promocion vigente (`descuento_pct`, `promo_inicio`, `promo_fin`);
  no existe una entidad `Promocion`, tal como define el MVP.

En el detalle de producto esto se traduce en algo entendible: las tallas y los
colores sin stock aparecen tachados o apagados, la disponibilidad se muestra
por sucursal y la cantidad nunca supera lo que queda.

Las ventas creadas desde la app usan el canal `MOVIL`.

## Probador virtual (realidad aumentada)

Es la funcionalidad con mas decisiones tecnicas detras, asi que conviene ser
preciso sobre **que hace y que no hace**.

### Alternativas evaluadas

| Opcion | Por que se descarto / eligio |
|---|---|
| ViroReact (ARKit/ARCore nativo) | Requiere build nativo propio, no corre en Expo Go y es pesado para los equipos modestos del equipo. Descartada. |
| three.js sobre expo-gl | Suma un motor 3D completo al bundle y sigue sin resolver el seguimiento del cuerpo. Descartada. |
| Deteccion de pose (MediaPipe / TensorFlow) | Es lo unico que daria un "probador" real sobre el cuerpo, pero el costo de CPU deja inutilizable un telefono modesto y no funciona en Expo Go. Descartada, y no se finge. |
| Camara + superposicion ajustable | Funciona en cualquier telefono, sin dependencias pesadas. **Elegida** como modo principal. |
| `<model-viewer>` en WebView | Delega en Scene Viewer (ARCore) y AR Quick Look (iOS): 3D en todos lados y RA nativa donde el sistema la soporta. **Elegida** para el `RecursoRA`. |

### Lo que quedo implementado

**Modo Camara** (`src/features/ar/ProbadorCamara.tsx`), disponible para
cualquier prenda:

- abre la camara (frontal o trasera) con `expo-camera`;
- superpone la imagen de la prenda;
- se arrastra con un dedo y se escala pellizcando (PanResponder + Animated, sin
  librerias de gestos adicionales);
- tres niveles de opacidad;
- toma la foto y arma la composicion final, que se puede guardar en la galeria.

La captura ocurre en dos tiempos a proposito: primero la foto de la camara y
despues la composicion foto + prenda sobre vistas normales. Capturar la vista
previa de la camara directamente devuelve un cuadro negro en varios telefonos
Android.

**Modo Modelo 3D** (`src/features/ar/VisorModelo3D.tsx`), solo cuando el
producto tiene un `RecursoRA` activo en formato GLB/GLTF/USDZ:

- visor 3D girable dentro de un WebView;
- boton "Ver en tu espacio" que abre el visor de RA del sistema operativo
  (ARCore en Android, AR Quick Look en iOS) cuando el equipo lo soporta.

**Limitacion declarada:** el modo Camara superpone la prenda, **no detecta el
cuerpo ni sigue el movimiento**; el modo Modelo coloca la prenda en el espacio,
no sobre la persona. La aplicacion lo dice en pantalla en lugar de aparentar un
seguimiento que no existe.

El motor de RA no se convirtio en una entidad del dominio: la app solo consume
`RecursoRA` (tipo, url, formato, activo), tal como define el diagrama.

## IA

El asistente de estilo y las recomendaciones consumen `/ia/asistente` y
`/ia/recomendaciones`.

**La llamada a Gemini debe vivir en NestJS.** Una aplicacion movil se distribuye
como APK y cualquier clave incrustada en ella se puede extraer, asi que la app
nunca maneja la API key:

```
Movil -> NestJS -> Gemini API
```

Mientras el backend no exista, `src/mocks/rutas/ia.ts` responde con la misma
forma (`{ respuesta, productos_sugeridos }`) usando una heuristica local sobre
el catalogo y el stock. Al conectar NestJS no cambia ni la pantalla ni el
servicio.

## Rendimiento

La aplicacion tiene que seguir siendo usable en telefonos modestos:

- listas virtualizadas (`FlatList`) con paginacion de 10 productos y scroll
  infinito; nada de traer el catalogo completo;
- `expo-image` con cache en memoria y disco, y reciclado dentro de las listas;
- tarjetas de producto memoizadas;
- las mutaciones del carrito escriben el resultado en la cache en lugar de
  volver a pedir la lista;
- las entidades de apoyo (categorias, tallas, colores, sucursales) se cachean
  por media hora;
- la disponibilidad de un producto se pide una vez y el selector filtra en
  memoria, en lugar de consultar en cada toque;
- sin librerias de animacion ni de gestos: se usan `Animated` y `PanResponder`
  del propio React Native;
- sin fuentes descargables: se usan las familias del sistema.

## Mocks temporales

`src/mocks/` simula el backend con las mismas rutas que expondra NestJS y una
latencia artificial para que se vean los estados de carga. Los datos son los
mismos que usa la web (12 productos, 3 sucursales, 5 categorias) y se conservan
en `AsyncStorage` para que una demostracion no pierda el carrito ni las reservas
al reiniciar la app.

Dos detalles del mock, equivalentes a los placeholders de imagen de la web:

- las imagenes vienen de `picsum.photos`;
- el `RecursoRA` apunta a un modelo 3D publico de demostracion, para que el
  visor y la RA se puedan probar de verdad.

Ambos se reemplazan con los datos reales del backend.

### Para conectar el backend real

1. `EXPO_PUBLIC_USE_MOCKS=false` y `EXPO_PUBLIC_API_URL` apuntando a NestJS.
2. Ajustar `src/api/endpoints.ts` si alguna ruta difiere del contrato real.
3. Ajustar la forma de la respuesta en `src/services/*` solo si cambia.
4. Borrar `src/mocks/` y la rama de mocks en `src/api/http.ts`.

## Endpoints que espera la aplicacion

| Modulo | Endpoints |
|---|---|
| Acceso | `POST /auth/login`, `POST /auth/registro`, `GET /auth/perfil`, `POST /auth/logout` |
| Catalogo | `GET /productos`, `GET /productos/:id`, `GET /productos/:id/recursos-ra`, `GET /categorias`, `GET /tallas`, `GET /colores`, `GET /sucursales` |
| Disponibilidad | `GET /inventario/disponibilidad?id_producto&id_talla&id_color&id_sucursal` |
| Carrito | `GET /carrito`, `POST /carrito/items`, `PATCH /carrito/items/:id`, `DELETE /carrito/items/:id`, `DELETE /carrito` |
| Reservas | `GET /reservas`, `GET /reservas/:id`, `POST /reservas`, `POST /reservas/:id/cancelar` |
| Compras | `GET /ventas`, `GET /ventas/:id`, `POST /ventas` |
| IA | `POST /ia/asistente`, `GET /ia/recomendaciones` |

El listado completo, con la forma esperada de cada respuesta, esta documentado
en los comentarios de `src/services/*`.

## Estado actual

- Verificado: `npm run typecheck`, `npm run lint` y `npm run doctor` pasan, y el
  bundle de Android compila sin errores.
- Verificado en la vista previa web: inicio, catalogo con filtros, detalle con
  seleccion de talla/color, disponibilidad por sucursal y el aviso de sesion al
  intentar usar el carrito.
- Pendiente de prueba en dispositivo: camara, guardado en galeria y visor de RA
  dependen de hardware real y no se pueden validar desde el navegador.
