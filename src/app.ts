import Koa, { Context } from "koa";
import logger from "koa-logger";
import Router from "@koa/router";
import { atem } from "./device/atem/connection.js";
import { requireStaff } from "./middleware/requireStaff.js";
import { bodyParser } from "@koa/bodyparser";
import { AtemMixEffectsAPI } from "./api/AtemMixEffectsAPI.js";
import { AtemMixEffects } from "./device/atem/AtemMixEffects.js";
import { AtemAUX } from "./device/atem/aux.js";
import { AtemAUXAPI } from "./api/AtemAUXAPI.js";

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

const auxApi = new AtemAUXAPI(new AtemAUX(atem, 2));

router.get("/aux/2", auxApi.getAux);
router.put("/aux/2", auxApi.setInput);

router.get("/", getRoot);
app.use(router.routes());

const run = async () => {
  await atem.connect("10.3.2.1");
  app.listen(3000);
};

(async () => {
  await run();
})();
