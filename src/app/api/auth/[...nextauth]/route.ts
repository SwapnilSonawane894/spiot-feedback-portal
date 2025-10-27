/* eslint-disable @typescript-eslint/no-explicit-any */
import "../../../../lib/env-config";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

// Create NextAuth handler and only export the HTTP methods (route handlers)
const handler = (NextAuth as any)(authOptions);
export { handler as GET, handler as POST };
