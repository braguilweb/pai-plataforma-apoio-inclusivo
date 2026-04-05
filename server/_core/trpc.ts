import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

const requireAdminSchool = t.middleware(async ({ ctx, next }) => {
  if (
    !ctx.user ||
    (ctx.user.role !== "admin_school" && ctx.user.role !== "super_admin")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminSchoolProcedure = t.procedure.use(requireAdminSchool);

const requireTeacher = t.middleware(async ({ ctx, next }) => {
  if (
    !ctx.user ||
    (ctx.user.role !== "teacher" &&
      ctx.user.role !== "admin_school" &&
      ctx.user.role !== "super_admin")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const teacherProcedure = t.procedure.use(requireTeacher);

const requireStudent = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "student") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const studentProcedure = t.procedure.use(requireStudent);

const requireSuperAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const adminProcedure = t.procedure.use(requireSuperAdmin);

// Alias para super admin
export const superAdminProcedure = adminProcedure;