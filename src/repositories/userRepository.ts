import prisma from "../db";

export const userRepository = {
  async createUser(data: any) {
    return prisma.user.create({ data });
  },
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
};
