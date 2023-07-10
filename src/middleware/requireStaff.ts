import { getLogger } from "../log.js";
import { Middleware } from "koa";
import { AuthenticationResponse, getProfile } from "../fkapi/getProfile.js";

const logger = getLogger();

export const requireStaff = (): Middleware => async (ctx, next) => {
  const csrftoken = ctx.cookies.get("csrftoken");
  const sessionid = ctx.cookies.get("sessionid");

  let profile: AuthenticationResponse | null = null;

  try {
    profile = await getProfile({ csrftoken, sessionid });
  } catch (err) {
    ctx.throw(500, "Error getting profile");
    return;
  }

  const { isStaff, email } = profile;

  if (!isStaff) {
    logger.warn(`User ${email} is not staff, refusing`);
    ctx.throw(403, "User must be staff");
    return;
  }

  logger.info(`Authenticated request for ${email}`);
  return next();
};
