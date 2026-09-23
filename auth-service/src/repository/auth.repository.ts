import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const findByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const createUser = async (data: Prisma.UserCreateInput) => {
  return await prisma.user.create({ data });
};

export const findById = async (id: string, select?: Prisma.UserSelect) => {
  return prisma.user.findUnique({ where: { id },...(select&&{select}) });
};

export const findByIdAndUpdate = async (
  id: string,
  updates: Prisma.UserUpdateInput,
) => {
  return await prisma.user.update({ where: { id }, data: updates });
};

export const findAll = (skip = 0, limit = 10, select?: Prisma.UserSelect) => {
  return prisma.user.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    ...(select && { select }),
  });
};

export const countDocuments = async () => {
  return await prisma.user.count();
};

export const deleteById = async (id: string) => {
  return await prisma.user.delete({ where: { id } });
};

export const update=async(id:string,data:Prisma.UserUpdateInput)=>{
  return await prisma.user.update({where:{id},data})
}