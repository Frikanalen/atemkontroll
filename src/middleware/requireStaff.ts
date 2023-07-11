import { getLogger } from "../log.js";
import { Middleware } from "koa";
import { V2AuthenticatedSession, V2UnauthenticatedSession, getProfile } from "../fkapi/getProfile.js";

const logger = getLogger();

export const requireStaff = (): Middleware => async (ctx, next) => {
  const fkSession = ctx.cookies.get("fk-session");

  if (!fkSession) {
    logger.warn(`No session ID, refusing`);
    ctx.throw(401, "No session ID");
    return;
  }

  let profile: V2AuthenticatedSession | V2UnauthenticatedSession = { authenticated: false };

  try {
    profile = await getProfile(fkSession);
  } catch (err) {
    ctx.throw(500, "Error getting profile");
    return;
  }

  if (!profile.authenticated) {
    logger.warn(`Session ID not authenticated, refusing`);
    ctx.throw(401, "Session ID not authenticated");
    return;
  }

  const authenticatedProfile = profile as V2AuthenticatedSession;

  const { permissions, email } = authenticatedProfile.user;

  if (!permissions?.includes("ATEM_CONTROL")) {
    logger.warn(`User ${email} is not staff, refusing`);
    ctx.throw(403, "User must be staff");
    return;
  }

  logger.info(`Authenticated request for ${email}`);
  return next();
};
