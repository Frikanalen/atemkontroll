import axios from "axios";
import * as yup from "yup";
import { FK_API } from "../config.js";
import { getLogger } from "../log";

const log = getLogger();

const V2AuthenticatedSessionSchema = yup.object().shape({
  authenticated: yup.boolean().oneOf([true]),
  user: yup.object().shape({
    id: yup.number(),
    email: yup.string(),
    permissions: yup.array().of(yup.string()),
  }),
});

export type V2AuthenticatedSession = yup.InferType<typeof V2AuthenticatedSessionSchema>;

const V2UnauthenticatedSession = yup.object().shape({ authenticated: yup.boolean().oneOf([false]).required() });

export type V2UnauthenticatedSession = yup.InferType<typeof V2UnauthenticatedSession>;

export const getProfile = async (fkSession: string): Promise<V2AuthenticatedSession | V2UnauthenticatedSession> => {
  const res = await axios.get(`${FK_API}/auth/user?withRoles=true`, {
    headers: {
      cookie: `fk-session=${fkSession}`,
    },
  });
  try {
    if (res.data.authenticated === true) {
      log.info(`Authenticated API V2 request for "${res.data.user.email}"`);
      return await V2AuthenticatedSessionSchema.validate(res.data);
    } else {
      log.info(`Unauthenticated API V2 request`);
      return await V2UnauthenticatedSession.validate(res.data);
    }
  } catch (e) {
    throw new Error(`Validation failed: ${e}`);
  }
};
