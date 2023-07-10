// Middleware to validate the request body as conforming to a Yup schema.
// If the request body is invalid, it will throw a 400 error.
// If the request body is valid, it will set ctx.body to the validated body.
import * as yup from "yup";
import { Middleware } from "koa";

export const validateBody =
  (schema: yup.Schema<any>): Middleware =>
  async (ctx, next) => {
    try {
      ctx.body = await schema.validate(ctx.body);
      await next();
    } catch (e) {
      if (e instanceof yup.ValidationError) ctx.throw(400, { error: e.message });
    }
  };
