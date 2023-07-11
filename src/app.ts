import Koa, { Context } from "koa";
import logger from "koa-logger";
import Router from "@koa/router";
import { validateBody } from "./middleware/validateBody.js";
import { getAux, setAuxSource, SetAuxSourceSchema } from "./api/aux.js";
import { atem } from "./device/atem/connection.js";
import { requireStaff } from "./middleware/requireStaff.js";
import { bodyParser } from "@koa/bodyparser";
import { AtemMixEffectsAPI } from "./api/AtemMixEffectsAPI.js";
import { AtemMixEffects } from "./device/atem/AtemMixEffects.js";

const app = new Koa();

app.use(bodyParser({ encoding: "json", onError: (err: Error, ctx: Context) => ctx.throw(422, "body parse error") }));

const router = new Router();

// middlewares
app.use(logger());
app.use(requireStaff());

const getRoot = async (ctx: Context) => {
  ctx.body = "Hello World";
};
const mixEffectsApi = new AtemMixEffectsAPI(new AtemMixEffects(atem, 0));
// routes
router.get("/program", mixEffectsApi.getProgram);
router.put("/program", mixEffectsApi.setProgram);
router.get("/preview", mixEffectsApi.getPreview);
router.put("/preview", mixEffectsApi.setPreview);
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
