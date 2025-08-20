# --- Etapa 1: El Constructor (Builder) ---
# Usamos una imagen oficial de Node.js para construir la aplicación.
# 'alpine' es una versión ligera de Linux que hace la imagen más pequeña.
FROM node:18-alpine AS builder

# Establecemos el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copiamos los archivos de dependencias y las instalamos.
# Esto se hace primero para aprovechar el cache de Docker si no cambian.
COPY package.json package-lock.json ./
RUN npm install

# Copiamos el resto del código fuente de la PWA.
COPY . .

# Ejecutamos el comando para construir la versión de producción.
# Esto creará una carpeta 'build' con los archivos estáticos.
RUN npm run build

# --- Etapa 2: El Servidor Final (Production) ---
# Usamos una imagen oficial y muy ligera de Nginx.
FROM nginx:1.25-alpine

# Copiamos la configuración personalizada de Nginx que crearemos en el siguiente paso.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos ÚNICAMENTE los archivos de producción construidos en la etapa anterior
# desde la carpeta /app/build del constructor a la carpeta web raíz de Nginx.
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponemos el puerto 80, que es el puerto por defecto de Nginx.
EXPOSE 80

# El comando por defecto de la imagen de Nginx ya se encarga de iniciar el servidor.
# Este comando asegura que Nginx corra en primer plano, lo cual es necesario para Docker.
CMD ["nginx", "-g", "daemon off;"]