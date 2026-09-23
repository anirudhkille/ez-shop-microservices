import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import * as authRepository from "../repository/auth.repository";
import { env } from "../config/env.config";
import { asyncHandler } from "../utils/asyncHandler";

interface ITokenPayload extends JwtPayload {
  _id: string;
  role: "User" | "Admin";
}

const loadUser = async (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;

      return await authRepository.findById(decoded._id);
  } catch {
    return null;
  }
};

export const protect = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await loadUser(req);

    if (!user) {
       res
        .status(401)
        .json({ success: false, message: "Not authorized, no token" });
        return
    }

    req.user = user as unknown as Express.User;
    next();
  },
);

export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const user = await loadUser(req);
    if (user) req.user = user as unknown as Express.User;
    next();
  },
);
