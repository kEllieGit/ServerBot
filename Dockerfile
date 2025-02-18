FROM node:lts

WORKDIR /bot

COPY . /bot

RUN npm install

RUN npm run build

RUN node_modules/.bin/prisma generate --schema ./prisma/schema.prisma

# @todo: ports?

CMD ["npm", "run", "start"]