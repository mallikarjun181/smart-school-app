FROM node:22-alpine AS deps
WORKDIR /app
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma
RUN npm --prefix backend install

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma
COPY backend/src ./backend/src
COPY frontend ./frontend
RUN mkdir -p /app/backend/uploads && chown -R node:node /app
USER node
EXPOSE 5000
CMD ["sh","-c","cd /app/backend && npx prisma migrate deploy --schema prisma/schema.prisma && node prisma/seed.js && cd /app && node backend/src/server.js"]