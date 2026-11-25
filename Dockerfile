# The whole talk in one image: the Whisper chat server, which also serves the built presentation.
#
#   docker compose up -d --build        the talk, built, on http://localhost:5173
#
# The `dev` stage is the same code with hot reload; see docker-compose.dev.yml.

FROM node:22-slim AS source
WORKDIR /app

# Dependencies first, so editing a scene does not reinstall them.
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY presentation/package.json presentation/
RUN npm ci

COPY tsconfig.base.json ./
COPY shared shared
COPY server server
COPY presentation presentation

# The database lives outside the code, in a volume, and the server does not run as root.
RUN mkdir /data && chown node:node /data
ENV WHISPER_DB=/data/db.json
EXPOSE 5173


FROM source AS dev
ENV VITE_HOST=0.0.0.0 VITE_CACHE_DIR=/tmp/vite
# Vite writes a temporary file beside its config when it starts.
RUN chown node:node /app/presentation
USER node
CMD ["npm", "run", "dev"]


FROM source AS talk
RUN npm run build
ENV NODE_ENV=production PORT=5173
USER node
CMD ["npm", "run", "start"]
