import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.config";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken";
import { generateOtp } from "../utils/generateOtp";
import { sendEmail } from "../utils/sendEmail";
import { resetPasswordTemplate } from "../templates/resetEmailTemplate";
import { verifyEmailTemplate } from "../templates/verifyEmailTemplate";
import { AppError } from "../utils/appError";
import * as authRepository from "../repository/auth.repository";
import * as sessionRepository from "../repository/session.repository";
import { IUser } from "../types/auth.types";
import { comparePassword, hashPassword } from "../utils/bcrypt";

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const saveRefreshSession = async (userId: string, refreshToken: string) => {
  await sessionRepository.update(`refresh:${userId}`, {
    value: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
};

export const signUp = async (email: string, password: string) => {
  const userExists = await authRepository.findByEmail(email);
  if (userExists) {
    throw new AppError("Email already registered", 409);
  }

  const otp = generateOtp();
  const hashedPassword=hashPassword(password)
  await sessionRepository.create({
    key: `signup:${email}`,
    value: JSON.stringify({ email, password:hashedPassword, otp }),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  await sendEmail({
    to: email,
    subject: "Verify Your Email",
    html: verifyEmailTemplate(email, otp),
  });

  return { message: "OTP sent to email" };
};

export const verifySignupOTP = async (email: string, otp: string) => {
  const key = `signup:${email}`;
  const session = await sessionRepository.findOne(key);

  if (!session) {
    throw new AppError("OTP expired", 400);
  }

  const data = JSON.parse(session.value) as {
    email: string;
    otp: string;
    password: string;
  };

  if (data.otp !== otp) {
    throw new AppError("Invalid OTP", 400);
  }

  const newUser = await authRepository.createUser({
    email: data.email,
    password: data.password,
    isEmailVerified: true,
  });

  await sessionRepository.deleteOne(key);

  const accessToken = generateAccessToken({
    _id: String(newUser.id),
    role: newUser.role,
  });
  const refreshToken = generateRefreshToken({
    _id: String(newUser.id),
    role: newUser.role,
  });

  await saveRefreshSession(String(newUser.id), refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
    },
  };
};

export const login = async (email: string, password: string) => {
  const user = await authRepository.findByEmail(email);

    if (!user || !user.password) {
    throw new AppError("Invalid credentials", 401);
  }

   const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }


  const accessToken = generateAccessToken({
    _id: String(user.id),
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    _id: String(user.id),
    role: user.role,
  });

  await saveRefreshSession(String(user.id), refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const forgotPassword = async (email: string) => {
  const user = await authRepository.findByEmail(email);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  const otp = generateOtp();

  await sessionRepository.create({
    key: `reset:${email}`,
    value: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  await sendEmail({
    to: email,
    subject: "Reset Password - EZ Shop",
    html: resetPasswordTemplate(user.name || "User", otp),
  });

  return { message: "Reset OTP sent" };
};

export const resetPassword = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const key = `reset:${email}`;
  const session = await sessionRepository.findOne(key);

  if (!session || session.value !== otp) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const user = await authRepository.findByEmail(email);

  if (!user) {
    throw new AppError("User not found", 404);
  }

   const hashedPassword=await hashPassword((newPassword))
  await authRepository.update(user.id, { password: hashedPassword });
  await sessionRepository.deleteOne(key);

  return { message: "Password reset successful" };
};

export const getProfile = async (userId: string) => {
  const user = await authRepository.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { user };
};

export const updatePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await authRepository.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.password) {
    throw new AppError("Cannot change password for OAuth accounts", 400);
  }

  const isMatch = comparePassword(currentPassword,user.password);
  if (!isMatch) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.password = newPassword;
  await authRepository.update(userId, { password: newPassword });

  return { message: "Password updated successfully" };
};

type ProfileUpdateInput = Partial<Pick<IUser, "name" | "phone" | "avatar">>;

export const updateProfile = async (
  userId: string,
  updates: ProfileUpdateInput,
) => {
  const allowedFields = ["name", "phone", "avatar"] as const;
  const sanitized: ProfileUpdateInput = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) sanitized[field] = updates[field];
  }

  const user = await authRepository.findByIdAndUpdate(userId, sanitized);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { user };
};

export const refreshToken = async (token: string) => {
  if (!token) {
    throw new AppError("No refresh token", 401);
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid refresh token", 403);
  }

  const key = `refresh:${decoded._id}`;
  const session = await sessionRepository.findOne(key);

  if (!session || session.value !== token) {
    throw new AppError("Refresh token mismatch", 403);
  }

  const newRefreshToken = generateRefreshToken(
    decoded as unknown as { _id: string; role: string },
  );
  const newAccessToken = generateAccessToken(
    decoded as unknown as { _id: string; role: string },
  );

  await sessionRepository.update(key, {
    value: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

export const logout = async (token: string) => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  await sessionRepository.deleteOne(`refresh:${decoded._id}`);

  return { message: "Logged out successfully" };
};

export const getAllUsers = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    authRepository.findAll(skip, limit),
    authRepository.countDocuments(),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUserById = async (id: string) => {
  const user = await authRepository.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { user };
};

export const deleteUserById = async (id: string) => {
  const user = await authRepository.deleteById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return { message: "User deleted successfully" };
};

export const googleLogin = async (googleUser: {
  email?: string;
  name?: string;
  googleId: string;
  avatar?: string;
}) => {
  if (!googleUser || !googleUser.email) {
    throw new AppError("Invalid Google user data", 400);
  }

  let user = await authRepository.findByEmail(googleUser.email);

  if (!user) {
    user = await authRepository.createUser({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
      avatar: googleUser.avatar,
    });
  }

  const accessToken = generateAccessToken({
    _id: String(user.id),
    role: user.role,
  });
  const refreshToken = generateRefreshToken({
    _id: String(user.id),
    role: user.role,
  });

  await saveRefreshSession(String(user.id), refreshToken);

  return { accessToken, refreshToken, user };
};
