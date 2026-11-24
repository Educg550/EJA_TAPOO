FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Servidor de desenvolvimento com recarga automática (usado por compose.dev.yaml).
FROM deps AS dev
EXPOSE 3000
CMD ["npm", "start"]

FROM deps AS build
COPY public ./public
COPY src ./src
ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
