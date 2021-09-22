FROM node:16-alpine3.11
RUN  apk --no-cache upgrade && apk add --no-cache chromium

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY index.js ./

CMD [ "node", "index.js" ]
