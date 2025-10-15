declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      id?: string;
      role?: "ADMIN" | "HOD" | "STUDENT";
    };
  }

  interface User {
    id?: string;
    role?: "ADMIN" | "HOD" | "STUDENT";
    hashedPassword?: string | null;
  }
}
