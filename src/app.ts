import Koa, { Context } from "koa";
import logger from "koa-logger";
import bodyparser from "koa-bodyparser";
import Router from "@koa/router";
import { validateBody } from "./middleware/validateBody.js";
import { getPreview, getProgram, SetMESchema, setPreview, setProgram } from "./api/mixEffects.js";
import { getAux, setAuxSource, SetAuxSourceSchema } from "./api/aux.js";
import { atem } from "./device/atem/connection.js";
import { requireStaff } from "./middleware/requireStaff.js";

const app = new Koa();

app.use(bodyparser({ onerror: (err: Error, ctx: Context) => ctx.throw(422, "body parse error") }));

const router = new Router();

// middlewares
app.use(logger());
app.use(requireStaff());

const getRoot = async (ctx: Context) => {
  ctx.body = "Hello World";
};

// routes
router.get("/program", getProgram);
router.put("/program", validateBody(SetMESchema), setProgram);
router.get("/preview", getPreview);
router.put("/preview", validateBody(SetMESchema), setPreview);
router.get("/aux/:auxId", getAux);
router.put("/aux/:auxId", validateBody(SetAuxSourceSchema), setAuxSource);
router.get("/", getRoot);
app.use(router.routes());

const run = async () => {
  await atem.connect("10.3.2.1");
  app.listen(3000);
};

(async () => {
  await run();
})();
