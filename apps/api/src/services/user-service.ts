import { db, eq, type NewUser, type User, users } from '@boris/database';
import { NotFoundError } from '../lib/errors.js';

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users);
}

export async function getUserById(id: string): Promise<User> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  if (result.length === 0) {
    throw new NotFoundError('User not found');
  }

  return result[0];
}

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}
