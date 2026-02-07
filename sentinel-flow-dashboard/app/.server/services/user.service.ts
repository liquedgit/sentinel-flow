import type { User } from "@/generated/prisma/client";
import type { Role } from "../libs/enum";
import { prisma } from "../libs/prisma";


export async function createUserService(email: string, password: string, role: Role): Promise<User | null> {
    return await prisma.user.create({
        data: {
            email,
            password,
            role,
        }
    });
}

export async function getUserByEmailService(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
        where: {
            email: email
        },
    });
}