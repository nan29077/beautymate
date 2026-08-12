import type { DefaultSession } from "next-auth";

type AppRole = "SUPER_ADMIN" | "CONSULTANT" | "CUSTOMER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      sellerSlug: string | null;
      mustResetPassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AppRole;
    sellerSlug: string | null;
    mustResetPassword: boolean;
  }
}
