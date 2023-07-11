FROM node:18-bookworm AS deps

WORKDIR /app

COPY yarn.lock package.json tsconfig.json ./
RUN yarn install --quiet --dev


FROM node:18-bookworm AS builder

WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY . .

RUN yarn build

FROM node:18-bookworm

WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY --from=builder /app/dist dist
COPY yarn.lock package.json tsconfig.json ./

EXPOSE 3000

CMD ["yarn", "start"]