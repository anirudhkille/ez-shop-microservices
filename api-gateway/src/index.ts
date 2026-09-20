import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { logger } from "./config/logger";
import { corsOptions } from "./config/corsOptions";
import { shouldCompress } from "./config/compression";
import { env } from "./config/env.config";

const app = express();

app.use(helmet());
app.use(compression({ filter: shouldCompress, level: 6 }));
app.use(cors(corsOptions));
app.use(pinoHttp({ logger }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const services = [
  { path: "/api/auth", target: env.AUTH_SERVICE_URL },
  { path: "/api/products", target: env.PRODUCT_SERVICE_URL },
  { path: "/api/cart", target: env.CART_SERVICE_URL },
  { path: "/api/orders", target: env.ORDER_SERVICE_URL },
  { path: "/api/payments", target: env.PAYMENT_SERVICE_URL },
];

for (const { path, target } of services) {
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: path, // keeps the full original path
      xfwd: true, // adds X-Forwarded-* headers
      proxyTimeout: 10_000,
      timeout: 10_000,
      on: {
        error: (err, _req, res) => {
          logger.error({ err, target }, "Proxy error");
          if ("writeHead" in res && !res.headersSent) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                success: false,
                message: "Service unavailable",
              }),
            );
          }
        },
      },
    }),
  );
}

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(env.PORT, () =>
  logger.info(`API Gateway running on port ${env.PORT}`),
);
