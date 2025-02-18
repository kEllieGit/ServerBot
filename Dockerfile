FROM node:lts

WORKDIR /bot

COPY . /bot

RUN npm install

RUN npm run build

# @todo: ports?

CMD ["node", "dist/index.js"]