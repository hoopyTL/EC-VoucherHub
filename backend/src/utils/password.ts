import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export const hashPassword = async (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS)
export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => bcrypt.compare(plain, hash)
export const createDummyPasswordHash = (): string => bcrypt.hashSync(randomBytes(32).toString('base64url'), SALT_ROUNDS)
