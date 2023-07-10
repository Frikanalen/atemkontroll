import Koa, { Context } from "koa";
import logger from "koa-logger";
import bodyparser from "koa-bodyparser";
import Router from "@koa/router";
import { atem } from "./api/atem";
import * as yup from "yup";
import { validateBody } from "./middleware/validateBody.js";
import { getPreview, getProgram, SetMESchema, setPreview, setProgram } from "./api/mixEffects.js";

const app = new Koa();

app.use(bodyparser({ onerror: (err: Error, ctx: Context) => ctx.throw(422, "body parse error") }));

const router = new Router();

const getAux = async (ctx: Context) => {
  const aux = atem.state?.video.auxilliaries?.[ctx.params.id];
  if (!aux) return ctx.throw(500, { error: "no aux" });
  ctx.body = { aux };
};

const SetAuxSourceSchema = yup.object().shape({
  inputId: yup.number().required(),
});

export type SetAuxSourceBody = yup.InferType<typeof SetAuxSourceSchema>;

const setAuxSource = async (ctx: Context & { body: SetAuxSourceBody }) => {
  try {
    await atem.setAuxSource(ctx.params.auxId, ctx.body.inputId);
  } catch (e) {
    return ctx.throw(500, { error: e });
  }
};

// middlewares

app.use(logger());

router.get("/program", getProgram);
router.put("/program", validateBody(SetMESchema), setProgram);
router.get("/preview", getPreview);
router.put("/preview", validateBody(SetMESchema), setPreview);

router.get("/aux/:auxId", getAux);
router.put("/aux/:auxId", validateBody(SetAuxSourceSchema), setAuxSource);

app.use(router.routes());

app.listen(3000);
