FROM docker.darvagcloud.com/library/node:22-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_REGISTRY=https://package-mirror.liara.ir/repository/npm/

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

# وابستگی‌های وب‌سرور SSR (hono) در src-ssr جدا نصب می‌شوند.
COPY src-ssr/package.json src-ssr/package-lock.json ./src-ssr/
RUN cd src-ssr && npm ci --ignore-scripts --no-audit --no-fund

COPY . .
# آدرس API در مرورگر نسبی است (/api روی همین دامنه، HTTPRoute به پنل می‌فرستد)؛
# سمت سرور از API_INTERNAL_URL در زمان اجرا خوانده می‌شود — build_arg لازم نیست.
RUN npx quasar prepare && npx quasar build -m ssr

WORKDIR /app/dist/ssr
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund


FROM docker.darvagcloud.com/library/node:22-alpine

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist/ssr ./

ENV NODE_ENV=production \
    PORT=3000

USER node

EXPOSE 3000

CMD ["node", "index.js"]
