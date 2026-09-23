# Despliegue en Azure

Guía para publicar FashionStore con las mismas imágenes Docker que se usan en local. Los comandos crean recursos con costo: revísalos antes de ejecutarlos y elimina el grupo de recursos al terminar la presentación.

## Arquitectura

| Pieza | Servicio de Azure | Imagen / detalle |
|---|---|---|
| Registro de imágenes | Azure Container Registry (Basic) | `fashionstore-api`, `fashionstore-web` |
| API NestJS | Azure Container Apps | `backend/Dockerfile`, puerto 3000 |
| Web React (PWA) | Azure Container Apps | `frontend/Dockerfile`, nginx en el puerto 8080 |
| Base de datos | Azure Database for PostgreSQL – Flexible Server (B1ms) | PostgreSQL 17, SSL obligatorio |
| IA | Gemini API | `AI_PROVIDER=gemini`; la clave va como secreto |

El navegador solo conoce la URL de la web. nginx reenvía `/api/*` a la API, así que no hay CORS entre ambos y el service worker nunca cachea la API. La API también tiene ingreso externo para la app móvil y el webhook de Stripe.

**IA local:** Ollama no se despliega en Azure para la demo, porque un modelo en CPU es lento y costoso en Container Apps. En local se usa `docker compose --profile ia-local up -d` con `AI_PROVIDER=ollama`. Si más adelante se quiere un modelo propio en Azure, basta con apuntar `OLLAMA_BASE_URL` a ese servicio. No hay que cambiar código.

## 1. Variables del script (PowerShell)

```powershell
$RG = 'rg-fashionstore'
$LOC = 'eastus2'
$ACR = 'fashionstoreacr' + (Get-Random -Maximum 9999)   # nombre global unico
$PG = 'fashionstore-pg-' + (Get-Random -Maximum 9999)
$ENVNAME = 'fashionstore-env'
az login
az group create -n $RG -l $LOC
az extension add --name containerapp --upgrade
```

## 2. Registro e imágenes

```powershell
az acr create -g $RG -n $ACR --sku Basic --admin-enabled true
az acr build -r $ACR -t fashionstore-api:1 ./backend
az acr build -r $ACR -t fashionstore-web:1 ./frontend
```

`VITE_API_URL` queda en `/api/v1` (valor por defecto del Dockerfile). No hace falta reconstruir la web cuando cambia la URL de la API.

## 3. PostgreSQL

```powershell
az postgres flexible-server create -g $RG -n $PG -l $LOC --tier Burstable --sku-name Standard_B1ms `
  --version 17 --storage-size 32 --admin-user fsadmin --admin-password '<CLAVE_SEGURA>' --public-access 0.0.0.0
az postgres flexible-server db create -g $RG -s $PG -d tienda_ropa
```

`--public-access 0.0.0.0` permite conexiones desde servicios de Azure. La cadena de conexión debe llevar SSL:

```text
postgresql://fsadmin:<CLAVE_URL_ENCODED>@<PG>.postgres.database.azure.com:5432/tienda_ropa?schema=public&sslmode=require
```

## 4. Container Apps

```powershell
az containerapp env create -g $RG -n $ENVNAME -l $LOC
$ACR_PWD = az acr credential show -n $ACR --query 'passwords[0].value' -o tsv

az containerapp create -g $RG -n fashionstore-api --environment $ENVNAME `
  --image "$ACR.azurecr.io/fashionstore-api:1" --registry-server "$ACR.azurecr.io" `
  --registry-username $ACR --registry-password $ACR_PWD `
  --target-port 3000 --ingress external --min-replicas 1 --max-replicas 1 --cpu 0.5 --memory 1Gi `
  --secrets database-url='<DATABASE_URL>' jwt-secret='<JWT_64_HEX>' gemini-key='<GEMINI_API_KEY>' `
  --env-vars NODE_ENV=production RUN_MIGRATIONS=true DATABASE_URL=secretref:database-url `
    JWT_SECRET=secretref:jwt-secret AI_PROVIDER=gemini GEMINI_API_KEY=secretref:gemini-key `
    GEMINI_MODEL=gemini-3.6-flash GEMINI_IMAGE_MODEL=gemini-3.1-flash-image RESERVATION_TIME_ZONE=America/La_Paz SALES_CURRENCY=BOB
```

- `--min-replicas 1`: los procesos de vencimiento de reservas y checkouts corren dentro de la API. Además, una sola réplica mantiene coherente el límite de solicitudes de IA, que se guarda en memoria.
- Stripe y Cloudinary: agregar las tres variables de cada uno como secretos, igual que en `backend/.env`. Usa solo claves de prueba de Stripe.

```powershell
$API = az containerapp show -g $RG -n fashionstore-api --query properties.configuration.ingress.fqdn -o tsv

az containerapp create -g $RG -n fashionstore-web --environment $ENVNAME `
  --image "$ACR.azurecr.io/fashionstore-web:1" --registry-server "$ACR.azurecr.io" `
  --registry-username $ACR --registry-password $ACR_PWD `
  --target-port 8080 --ingress external --min-replicas 1 --max-replicas 1 --cpu 0.25 --memory 0.5Gi `
  --env-vars "API_UPSTREAM=https://$API"

$WEB = az containerapp show -g $RG -n fashionstore-web --query properties.configuration.ingress.fqdn -o tsv
az containerapp update -g $RG -n fashionstore-api --set-env-vars "CORS_ORIGINS=https://$WEB"
```

## 5. Datos de demostración

La carga DEMO se niega con `NODE_ENV=production`. Por eso se ejecuta una sola vez, forzando desarrollo solo para ese comando:

```powershell
az containerapp exec -g $RG -n fashionstore-api --command "sh -c 'NODE_ENV=development SEED_ADMIN_EMAIL=admin@fashionstore.com SEED_ADMIN_PASSWORD=<CLAVE> SEED_DEMO_PASSWORD=<CLAVE> npx tsx prisma/seed-demo.ts'"
```

## 6. Stripe (modo prueba)

Webhook en el panel de Stripe: `https://<WEB>/api/v1/payments/stripe/webhook`. nginx conserva el cuerpo sin modificar, así que la firma sigue siendo válida.

## 7. Verificación

1. `https://<WEB>`: catálogo, login, carrito y checkout de prueba.
2. `https://<WEB>/api/v1/ai/status` debe mostrar `configured: true`.
3. Panel de administración: dashboard, reportes y reportes con IA. Con la sesión de encargado debe aparecer la campana de notificaciones.
4. PWA: instalar desde el navegador; Azure ya sirve HTTPS.
5. App móvil: usar `https://<API>/api/v1` como URL base.

## Actualizar y limpiar

```powershell
az acr build -r $ACR -t fashionstore-api:2 ./backend
az containerapp update -g $RG -n fashionstore-api --image "$ACR.azurecr.io/fashionstore-api:2"
# Al terminar la presentacion:
az group delete -n $RG --yes
```
