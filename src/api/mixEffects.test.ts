import { Context } from "koa";
import { setProgram, getProgram, setPreview, getPreview } from "./mixEffects.js";
import * as device from "../device/atem/mixEffects.js";

function mockContext<T>(body: T): Context & { request: { body: T } } {
  return {
    request: { body } as unknown as Context["request"],
    response: { body: {} } as unknown as Context["response"],
    throw: jest.fn(),
  } as unknown as Context & { request: { body: T } };
}

// mock out atem ME functions
jest.mock("../device/atem/mixEffects.js", () => ({
  setAtemMEPreview: jest.fn(),
  setAtemMEProgram: jest.fn(),
  getAtemMEState: jest.fn(),
}));

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  jest.clearAllMocks();
});

test("setProgram should call changeProgramInput with input value and set response body", async () => {
  const ctx = mockContext({ input: 5 });
  await setProgram(ctx, jest.fn());
  expect(device.setAtemMEProgram).toHaveBeenCalledWith(5);
  expect(ctx.body).toEqual({ message: "ok" });
});

test("getProgram should set body to the program input from the video mixEffects", async () => {
  const ctx = mockContext({});

  (device.getAtemMEState as jest.Mock).mockResolvedValue({
    programInput: 10,
    previewInput: 0,
  });

  await getProgram(ctx, jest.fn());
  expect(ctx.body).toEqual({ programInput: 10 });
});

test("setPreview should call changePreviewInput with input value", async () => {
  const ctx = mockContext({ input: 5 });
  await setPreview(ctx, jest.fn());
  expect(device.setAtemMEPreview).toHaveBeenCalledWith(5);
});

test("getPreview should set body to the preview input from the video mixEffects", async () => {
  (device.getAtemMEState as jest.Mock).mockResolvedValue({
    programInput: 0,
    previewInput: 10,
  });

  const ctx = mockContext({});
  await getPreview(ctx);
  expect(ctx.body).toEqual({ previewInput: 10 });
});
