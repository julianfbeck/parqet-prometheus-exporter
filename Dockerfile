FROM node:16-alpine
RUN apk add --no-cache  chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.9/main

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY index.js ./

CMD [ "node", "index.js" ]
