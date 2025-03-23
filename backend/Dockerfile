# backend/Dockerfile
FROM node:18

# Arbeitsverzeichnis im Container
WORKDIR /app

# Abhängigkeitsdateien kopieren und installieren
COPY package*.json ./
RUN npm install

# Quellcode kopieren
COPY . .

# Verzeichnisse für Datei-Uploads erstellen
RUN mkdir -p public/uploads/characters

# Port freigeben
EXPOSE 5000

# Startbefehl
CMD ["node", "app.js"]