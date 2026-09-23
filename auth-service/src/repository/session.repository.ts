import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export const create = async (data: Prisma.SessionCreateInput) => {
  return await prisma.session.create({
    data,
  });
};

export const findOne = async (key: string) => {
  return await prisma.session.findUnique({
    where: {
      key
    },
  });
};

 export const deleteOne=async(key:string)=>{


 return await prisma.session.delete({where:{key} });
 }

 export const update=async(key:string,data:Prisma.SessionUpdateInput)=>{

return await prisma.session.update({
    where: { key },
    data,
  });
    }