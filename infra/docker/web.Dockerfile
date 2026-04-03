# ==============================================================================
# AYNIPOINT - DOCKERFILE WEB (NEXT.JS MONOREPO)
# ==============================================================================
FROM node:20-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /code

# En un monorepo (Turborepo/npm workspaces), el package.json raíz maneja todo
COPY package.json package-lock.json* ./

RUN npm ci

# El código de apps/ y packages/ se montan por volumen en el compose

USER node
EXPOSE 3000