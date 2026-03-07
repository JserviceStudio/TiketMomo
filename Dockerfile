# ============================================================
# Étape 1 : Installer les dépendances (couche cachée séparément)
# ============================================================
FROM node:20-alpine AS deps

# Dépendances système pour les modules natifs (ex: bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copier UNIQUEMENT les manifestes pour profiter du cache Docker :
# si package.json ne change pas, npm ci ne sera pas réexécuté.
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# ============================================================
# Étape 2 : Image de production finale (légère)
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Sécurité : exécuter l'app en tant qu'utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copier les dépendances installées depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source (le .dockerignore filtre le reste)
COPY . .

# Changer le propriétaire des fichiers vers l'utilisateur non-root
RUN chown -R appuser:appgroup /app

USER appuser

# Le port exposé doit correspondre à PORT dans votre .env
EXPOSE 3000

# Health check : vérifie que l'API répond bien
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Commande de lancement en mode production
CMD ["node", "src/server.js"]
