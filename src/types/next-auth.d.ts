import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      employeeId?: number;
      employeeName?: string;
      isManager?: boolean;
      role?: string;
      msEmail?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId?: number;
    employeeName?: string;
    isManager?: boolean;
    role?: string;
    msEmail?: string;
    msId?: string;
  }
}
