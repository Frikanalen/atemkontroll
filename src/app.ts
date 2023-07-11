import Koa, { Context } from "koa";
import logger from "koa-logger";
import Router from "@koa/router";
import { atem, connect } from "./device/atem/connection.js";
import { requireStaff } from "./middleware/requireStaff.js";
import { bodyParser } from "@koa/bodyparser";
import { AtemMixEffectsAPI } from "./api/AtemMixEffectsAPI.js";
import { AtemMixEffects } from "./device/atem/AtemMixEffects.js";
import { AtemAUX } from "./device/atem/AtemAUX.js";
import { AtemAUXAPI } from "./api/AtemAUXAPI.js";
import { ATEM_HOST } from "./config.js";

const app = new Koa();

app.use(bodyParser({ encoding: "json", onError: (err: Error, ctx: Context) => ctx.throw(422, "body parse error") }));

const router = new Router();

const checkHealth = async (ctx: Context) => {
  atem.state; // This will throw if we're not connected
  ctx.body = "OK";
};

// middlewares
app.use(logger());
app.use(requireStaff());

const mixEffectsApi = new AtemMixEffectsAPI(new AtemMixEffects(atem, 0));
// routes
router.get("/program", mixEffectsApi.getProgram);
router.put("/program", mixEffectsApi.setProgram);
router.get("/preview", mixEffectsApi.getPreview);
router.put("/preview", mixEffectsApi.setPreview);

// Currently only AUX 1 is supported (feeds the low-latency encoder on tx4)
const aux1Api = new AtemAUXAPI(new AtemAUX(atem, 0));
router.get("/aux/1", aux1Api.getAux);
router.put("/aux/1", aux1Api.setInput);

const aux2Api = new AtemAUXAPI(new AtemAUX(atem, 1));
router.get("/aux/2", aux2Api.getAux);
router.put("/aux/2", aux2Api.setInput);

const aux3Api = new AtemAUXAPI(new AtemAUX(atem, 2));
router.get("/aux/3", aux3Api.getAux);
router.put("/aux/3", aux3Api.setInput);

router.get("/_healthz", checkHealth);

app.use(router.routes());

if (!ATEM_HOST) {
  throw new Error("ATEM_HOST not set");
}
connect(ATEM_HOST).then(() => {
  app.listen(3000);
});
