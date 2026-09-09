import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { hasLeaderDelegatedPermission, type LeaderDelegatedPermission } from "@shared/leader-permissions";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const requirePasswordChangeComplete = t.middleware(async opts => {
  const { ctx, next } = opts;
  const user = ctx.user;
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  if (user.loginMethod === "local" && user.mustChangePassword) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Vui lòng đổi mật khẩu tạm trước khi sử dụng hệ thống" });
  }
  return next({ ctx: { ...ctx, user } });
});

export const passwordChangeProcedure = t.procedure.use(requireUser);
export const protectedProcedure = t.procedure.use(requireUser).use(requirePasswordChangeComplete);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export function delegatedAdminProcedure(permission: LeaderDelegatedPermission) {
  return protectedProcedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;
      const user = ctx.user;
      if (!user || (user.role !== "admin" && !(user.role === "leader" && hasLeaderDelegatedPermission(user.adminPermissions, permission)))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tài khoản chưa được Admin cấp quyền thực hiện thao tác này" });
      }
      return next({ ctx: { ...ctx, user } });
    }),
  );
}
