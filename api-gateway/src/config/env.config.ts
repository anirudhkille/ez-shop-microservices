import "dotenv/config";

import { z } from "zod";

import { logger } from "./logger";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  RATE_LIMIT_WINDOW_MS: z.coerce.number(),
  RATE_LIMIT_MAX: z.coerce.number(),
  CLIENT_URL: z.url(),
  ADMIN_URL: z.url(),
  AUTH_SERVICE_URL: z.url(),
  PRODUCT_SERVICE_URL: z.url(),
  CART_SERVICE_URL: z.url(),
  ORDER_SERVICE_URL: z.url(),
  PAYMENT_SERVICE_URL: z.url(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  logger.error("Invalid environment variables");

  result.error.issues.forEach((issue) => {
    logger.error(`${issue.path.join(", ")}: ${issue.message}`);
  });

  process.exit(1);
}

export const env = result.data;
