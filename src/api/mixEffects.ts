import * as yup from "yup";
import { Context, Middleware } from "koa";
import { atem } from "./atem.js";
import { getAtemMEState, setAtemMEPreview, setAtemMEProgram } from "../device/atem/mixEffects.js";

export const SetMESchema = yup.object().shape({
  input: yup.number().required(),
});

export type SetMEBody = yup.InferType<typeof SetMESchema>;

export const setProgram: Middleware<any, Context & { request: { body: SetMEBody } }> = async (ctx) => {
  try {
    setAtemMEProgram(ctx.request.body.input);
  } catch (e) {
    return ctx.throw(500, { error: e });
  }

  ctx.body = { message: "ok" };
};

export const getProgram: Middleware = async (ctx) => {
  const ME = await getAtemMEState();
  if (!ME) return ctx.throw(500, { error: "no ME" });
  const { programInput } = ME;
  ctx.body = { programInput };
};

export const setPreview: Middleware<any, Context & { request: { body: SetMEBody } }> = async (ctx) => {
  try {
    await setAtemMEPreview(ctx.request.body.input);
    ctx.body = { message: "ok" };
  } catch (e) {
    ctx.throw(500, { error: e });
  }
};

export const getPreview = async (ctx: Context) => {
  const ME = await getAtemMEState();
  if (!ME) return ctx.throw(500, { error: "no ME" });
  const { previewInput } = ME;
  ctx.body = { previewInput };
};
