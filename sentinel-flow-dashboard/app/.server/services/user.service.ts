import type { User } from "@/generated/prisma/client";
import type { Role } from "../types/role";
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

export async function getUserByIdService(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
        where: {
            id: id
        },
    });
}