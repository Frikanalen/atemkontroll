import request from "supertest";
import Koa, { Context } from "koa";
import Router from "koa-router";
import { AtemMixEffectsAPI } from "./AtemMixEffectsAPI.js";
import { bodyParser } from "@koa/bodyparser";
import { AtemMixEffects } from "../device/atem/__mocks__/AtemMixEffects.js";
import { atem } from "../device/atem/connection.js";

jest.mock("../device/atem/AtemMixEffects");

describe("mixEffects API", () => {
  let app: Koa;
  let router;
  let api: AtemMixEffectsAPI;
  let me: AtemMixEffects;

  beforeEach(() => {
    app = new Koa();
    app.use(
      bodyParser({ encoding: "json", onError: (err: Error, ctx: Context) => ctx.throw(422, "body parse error") }),
    );
    router = new Router();
    me = new AtemMixEffects(atem, 0);
    api = new AtemMixEffectsAPI(me);
    router.put("/program", api.setProgram);
    router.get("/program", api.getProgram);
    router.put("/preview", api.setPreview);
    router.get("/preview", api.getPreview);
    app.use(router.routes()).use(router.allowedMethods());
  });

  test("setProgramInput returns 422 for invalid JSON", async () => {
    const spy = jest.spyOn(me, "setProgramInput");

    const res = await request(app.callback()).put("/program").type("json").send("invalid JSON");

    expect(res.status).toBe(422);
    expect(spy).not.toHaveBeenCalled();
  });

  test("setProgramInput returns 400 for malformed request", async () => {
    const spy = jest.spyOn(me, "setProgramInput");

    // Assuming input is a required field in the request, sending a request without it should be considered malformed
    const res = await request(app.callback()).put("/program").send({});

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  test("setProgramInput", async () => {
    const spy = jest.spyOn(me, "setProgramInput");
    const res = await request(app.callback()).put("/program").send({ input: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "ok" });
    expect(spy).toHaveBeenCalledWith(1);
  });

  test("getProgramInput", async () => {
    const spy = jest.spyOn(me, "getProgramInput");

    const res = await request(app.callback()).get("/program");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ programInput: 1 });
    expect(spy).toHaveBeenCalled();
  });

  test("setPreviewInput", async () => {
    const spy = jest.spyOn(me, "setPreviewInput");

    const res = await request(app.callback()).put("/preview").send({ input: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "ok" });
    expect(spy).toHaveBeenCalledWith(1);
  });

  test("getPreviewInput", async () => {
    const spy = jest.spyOn(me, "getPreviewInput");

    const res = await request(app.callback()).get("/preview");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ previewInput: 1 });
    expect(spy).toHaveBeenCalled();
  });
});
