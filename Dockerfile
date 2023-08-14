FROM node:10.24.1-alpine
LABEL maintainer="Dwolla Engineering <dev+webhook-provisioner@dwolla.com>"

ENV ENVIRONMENT local
WORKDIR /usr/src/app
COPY . .
EXPOSE 8009

CMD node server.js
