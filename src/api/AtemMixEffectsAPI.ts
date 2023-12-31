import * as yup from "yup";
import { Middleware } from "koa";
import { AtemMixEffects } from "../device/atem/AtemMixEffects.js";

export const SetMESchema = yup.object().shape({
  inputId: yup.number().required(),
});

export class AtemMixEffectsAPI {
  private ME: AtemMixEffects;

  constructor(ME: AtemMixEffects) {
    this.ME = ME;
  }

  setProgram: Middleware = async (ctx) => {
    let inputId: number;
    try {
      inputId = (await SetMESchema.validate(ctx.request.body)).inputId;
    } catch (e) {
      return ctx.throw(400, { error: e });
    }

    try {
      await this.ME.setProgramInput(inputId);
    } catch (e) {
      return ctx.throw(500, { error: e });
    }

    ctx.body = { message: "ok" };
  };

  getProgram: Middleware = async (ctx) => {
    ctx.body = { programInput: this.ME.getProgramInput() };
  };

  setPreview: Middleware = async (ctx) => {
    let inputId: number;
    try {
      inputId = (await SetMESchema.validate(ctx.request.body)).inputId;
    } catch (e) {
      return ctx.throw(400, { error: e });
    }

    try {
      await this.ME.setPreviewInput(inputId);
    } catch (e) {
      return ctx.throw(500, { error: e });
    }

    ctx.body = { message: "ok" };
  };

  getPreview: Middleware = async (ctx) => {
    ctx.body = { previewInput: this.ME.getPreviewInput() };
  };
}
