import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { env } from "../config/env.config";
import * as authService from "../services/auth.service";
import { sendSuccess, sendMessage } from "../utils/response";
import { refreshCookieOptions } from "../utils/cookies";

export const signUp = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.signUp(email, password);
  sendMessage(res, result.message, 200);
});

export const verifySignupOTP = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp } = req.body;
    const result = await authService.verifySignupOTP(email, otp);

    res
      .cookie("refreshToken", result.refreshToken, refreshCookieOptions())
      .status(201)
      .json({
        success: true,
        message: "Account verified successfully",
        data: result.user,
        token: result.accessToken,
      });
  },
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  res
    .cookie("refreshToken", result.refreshToken, refreshCookieOptions())
    .status(200)
    .json({
      success: true,
      message: "Login successful",
      data: result.user,
      token: result.accessToken,
    });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    sendMessage(res, result.message);
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    const result = await authService.resetPassword(email, otp, newPassword);
    sendMessage(res, result.message);
  },
);

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.getProfile(req.user!.id);
  sendSuccess(res, result.user);
});

export const updatePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.updatePassword(
      req.user!.id,
      currentPassword,
      newPassword,
    );
    sendMessage(res, result.message);
  },
);

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await authService.updateProfile(req.user!.id, req.body);
    sendSuccess(res, result.user);
  },
);

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    const result = await authService.refreshToken(token);

    res
      .cookie("refreshToken", result.refreshToken, refreshCookieOptions())
      .status(200)
      .json({
        success: true,
        token: result.accessToken,
      });
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  const result = await authService.logout(token);

  res.clearCookie("refreshToken", refreshCookieOptions());
  sendMessage(res, result.message);
});

export const getAllUsers = asyncHandler(
  async (_req: Request, res: Response) => {
    const result = await authService.getAllUsers();
    sendSuccess(res, result.users);
  },
);

export const getUserById = asyncHandler(async ( req: Request<{ id: string }>, res: Response) => {
  const result = await authService.getUserById(req.params.id);
  sendSuccess(res, result.user);
});

export const deleteUserById = asyncHandler(
  async ( req: Request<{ id: string }>, res: Response) => {
    const result = await authService.deleteUserById(req.params.id);
    sendMessage(res, result.message);
  },
);

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const googleUser = req.user as unknown as {
    email?: string;
    name?: string;
    googleId: string;
    avatar?: string;
  };

  const result = await authService.googleLogin(googleUser);

  const frontendURL = env.CLIENT_URL;
  const redirectURL = `${frontendURL}/auth/google-callback?token=${encodeURIComponent(result.accessToken)}&name=${encodeURIComponent(result.user.name || "")}&email=${encodeURIComponent(result.user.email || "")}`;

  return res
    .cookie("refreshToken", result.refreshToken, refreshCookieOptions())
    .redirect(redirectURL);
});