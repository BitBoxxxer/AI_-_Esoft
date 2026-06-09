import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** ID пользователя из БД */
      id: string;
    } & DefaultSession["user"];
  }
}