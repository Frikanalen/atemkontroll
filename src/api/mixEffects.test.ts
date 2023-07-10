import request from "supertest";
import Koa from "koa";
import Router from "koa-router";
import { AtemMixEffectsAPI } from "./mixEffects.js";
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
    app.use(bodyParser());
    router = new Router();
    me = new AtemMixEffects(atem, 0);
    api = new AtemMixEffectsAPI(me);
    router.put("/program", api.setProgram);
    router.get("/program", api.getProgram);
    router.put("/preview", api.setPreview);
    router.get("/preview", api.getPreview);
    app.use(router.routes()).use(router.allowedMethods());
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
    expect(res.body).toEqual({ programInput: 0 });
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
    expect(res.body).toEqual({ previewInput: 0 });
    expect(spy).toHaveBeenCalled();
  });
});
