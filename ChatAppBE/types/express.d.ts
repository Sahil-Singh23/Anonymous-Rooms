
import { User } from "../generated/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "email" | "name">;
    }
  }
}