# Build admin panel static site
FROM node:20 AS build
WORKDIR /app
COPY ui/panel/package*.json ./
RUN npm ci
COPY ui/panel .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
