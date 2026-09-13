# React (Vite + PWA) servido por nginx; /api se reenvia a NestJS en el mismo origen.
FROM node:24-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Ruta relativa: el navegador llama al mismo dominio y nginx la reenvia a la API.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_USE_MOCKS=false
RUN npm run build

FROM nginx:1.27-alpine
# URL interna de la API; en Azure, la direccion de la Container App del backend.
ENV API_UPSTREAM=http://backend:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
