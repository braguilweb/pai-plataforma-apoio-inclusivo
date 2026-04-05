import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth.router";
import { chatRouter } from "./routers/chat.router";
import { superAdminRouter } from "./routers/super-admin.router";
import { schoolsRouter } from "./routers/schools.router";
import { studentsRouter } from "./routers/students.router";
import { teachersRouter } from "./routers/teachers.router";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  chat: chatRouter,
  superAdmin: superAdminRouter,
  schools: schoolsRouter,
  students: studentsRouter,
  teachers: teachersRouter,

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});

export type AppRouter = typeof appRouter;
