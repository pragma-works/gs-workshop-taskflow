import { User } from '@prisma/client'

export interface IUserRepository {
  findById(id: number): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: { email: string; password: string; name: string }): Promise<User>
}
