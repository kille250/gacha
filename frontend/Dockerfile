# frontend/Dockerfile
FROM node:18 as build

# Arbeitsverzeichnis festlegen
WORKDIR /app

# Abhängigkeiten kopieren und installieren
COPY package*.json ./
RUN npm install

# Quellcode kopieren
COPY . .

# Produktions-Build erstellen
RUN npm run build

# Zweite Phase: Verwendung von nginx zum Bereitstellen der statischen Dateien
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html

# Nginx-Konfiguration für React Router
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Port freigeben
EXPOSE 80

# Nginx starten
CMD ["nginx", "-g", "daemon off;"]