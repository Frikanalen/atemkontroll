import { Context, Middleware } from "koa";
import { AtemAUX } from "../device/atem/AtemAUX.js";
import * as yup from "yup";

export const SetAuxSourceSchema = yup.object().shape({
  inputId: yup.number().required(),
});

export class AtemAUXAPI {
  private aux: AtemAUX;

  constructor(aux: AtemAUX) {
    this.aux = aux;
  }

  getAux: Middleware = async (ctx: Context) => {
    const inputId = await this.aux.get();
    ctx.body = { auxId: this.aux.auxId, inputId };
  };

  setInput: Middleware = async (ctx: Context) => {
    let inputId: number;
    try {
      inputId = (await SetAuxSourceSchema.validate(ctx.request.body)).inputId;
    } catch (e) {
      return ctx.throw(400, { error: e });
    }

    try {
      await this.aux.set(inputId);
      ctx.body = { auxId: this.aux.auxId, inputId };
    } catch (e) {
      return ctx.throw(500, { error: e });
    }
  };
}
