import { env } from "./config/env.config";
import { logger } from "./config/logger";

import express from "express";
import helmet from "helmet";
import session from "express-session";
import cookieParser from "cookie-parser";
import passport from "./config/passport";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.route"

const app = express();

app.use(helmet());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  res.send("Api is running");
});

app.use("/api/auth", authRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    const port = env.PORT;
    app.listen(port, () => {
      logger.info(`Server Listening @ ${port}`);
    });
  } catch (error) {
    logger.error(error, "Failed to start server");
    process.exit(1);
  }
};

startServer();
