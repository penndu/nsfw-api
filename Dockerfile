FROM node:22-slim

RUN apt-get update && apt-get install -y python3 build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY yarn.lock package.json ./

# --ignore-engines: nsfwjs@4.4.0 declares engines.node as exact "22.13.0"
# (instead of "^22.13.0"); tfjs-node@4.22.0 is officially tested on Node 22.
RUN npm_config_build_from_source=true yarn install --prod --ignore-engines

COPY src ./src
COPY tsconfig.json ./

ARG modelType=default

COPY ./models/$modelType ./model

RUN yarn build

EXPOSE 3000

ENTRYPOINT ["yarn", "start"]
