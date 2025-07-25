# Build static homepage
FROM node:20 AS build
WORKDIR /app
COPY ui/homepage/package.json ui/homepage/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY ui/homepage .
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
