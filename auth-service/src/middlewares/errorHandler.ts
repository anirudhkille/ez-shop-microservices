import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { AppError } from "../utils/appError";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  logger.error(err.stack ?? err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};
