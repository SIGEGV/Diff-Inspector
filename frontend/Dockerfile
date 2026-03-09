FROM node:20-alpine as development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine as production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including vite for preview server)
RUN npm install

# Copy built files and source
COPY --from=build /app/dist ./dist
COPY vite.config.ts ./
COPY index.html ./

# Railway provides PORT environment variable
ENV PORT=3000
EXPOSE $PORT

# Use Vite preview server for Railway (supports dynamic PORT)
CMD ["sh", "-c", "npx vite preview --host 0.0.0.0 --port ${PORT:-3000}"]
