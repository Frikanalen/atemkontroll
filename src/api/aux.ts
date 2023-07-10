import { Context } from "koa";
import { AtemAUX } from "../device/atem/aux.js";
import { atem } from "../device/atem/connection.js";
import * as yup from "yup";

export const getAux = async (ctx: Context) => {
  const { auxId } = ctx.params;
  // Temporary hack until we create the aux class in an Atem class
  const aux = new AtemAUX(atem, auxId);
  const inputId = await aux.get();
  ctx.body = { auxId, inputId };
};
export const SetAuxSourceSchema = yup.object().shape({
  inputId: yup.number().required(),
});
export type SetAuxSourceBody = yup.InferType<typeof SetAuxSourceSchema>;
export const setAuxSource = async (ctx: Context & { body: SetAuxSourceBody }) => {
  try {
    // Temporary hack until we create the aux class in an Atem class
    const aux = new AtemAUX(atem, ctx.params.auxId);
    await aux.set(ctx.body.inputId);
  } catch (e) {
    return ctx.throw(500, { error: e });
  }
};