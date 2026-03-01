
import bcrypt from "bcrypt"
import { createUserService, getUserByEmailService } from "./user.service";
import type { User } from "@/generated/prisma/client";
import type { Role } from "~/lib/types/role";

export async function registerUserService(email: string, password: string, role: Role): Promise<User | null> {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUserService(email, passwordHash, role);
    return user;
}

export async function loginService(email: string, password: string): Promise<User | null> {
    const user = await getUserByEmailService(email);
    if (!user) {
        return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return null;
    }
    return user;
}