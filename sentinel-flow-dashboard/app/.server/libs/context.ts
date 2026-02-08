import type { User } from "@/generated/prisma/client";
import { createContext } from "react-router";

export const userContext = createContext<string | null>(null);
