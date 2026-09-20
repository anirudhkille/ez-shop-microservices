import { prisma } from "../config/prisma";
import { IUser } from "../types/auth.types";

export const findByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const createUser = async (data: Partial<IUser>) => {
  return await prisma.user.create({ data });
};

export const findById = async (id: string, select?: string) => {
  const query = prisma.user.findOne({ where: { id } });
  if (select) query.select(select);
  return await query;
};

export const findByIdAndUpdate = async (id: string, updates: IUser) => {
  return await prisma.user.update({ where: { id } }, { data: updates });
};

export const findAll = async (skip = 0, limit = 10, select?: string) => {
  const query = prisma.user.findMany({ take: limit, skip });
  if (select) query.select(select);
  return await query;
};

export const countDocuments = async () => {
  return await prisma.user.count();
};

export const deleteById = async (id: string) => {
  return await prisma.user.delete({ where: { id } });
};