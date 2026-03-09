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

FROM nginx:alpine as production

WORKDIR /app

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install Node.js for running preview server (Railway deployment)
RUN apk add --no-cache nodejs npm

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy source for preview server
COPY --from=build /app/dist ./dist
COPY vite.config.ts ./

# Railway provides PORT environment variable
ENV PORT=3000
EXPOSE $PORT

# Use Vite preview server for Railway (supports dynamic PORT)
CMD ["sh", "-c", "npm run preview -- --host 0.0.0.0 --port ${PORT:-3000}"]
