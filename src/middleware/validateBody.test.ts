import * as yup from "yup";
import { Context } from "koa";
import { validateBody } from "./validateBody.js";

// Mocking the next middleware
const nextMiddleware = jest.fn();

// Clear mock calls before each test
beforeEach(() => {
  nextMiddleware.mockClear();
});

test("validateBody should throw an error with status 400 when the body does not match the schema", async () => {
  const schema = yup.object({
    name: yup.number().required(),
  });

  const ctx = {
    body: { name: "asdf" }, // invalid body that doesn't conform to schema
    throw: jest.fn(),
  };

  await validateBody(schema)(ctx as unknown as Context, nextMiddleware);
  console.log(ctx.body);

  expect(ctx.throw).toHaveBeenCalledWith(400, {
    error: 'name must be a `number` type, but the final value was: `NaN` (cast from the value `"asdf"`).',
  });
});

test("validateBody should validate and set the request body when it matches the schema", async () => {
  const schema = yup.object({
    name: yup.string().required(),
  });

  const ctx: Partial<Context> = {
    body: { name: "John" }, // valid body that conforms to schema
    throw: jest.fn() as unknown as Context["throw"],
  };

  await validateBody(schema)(ctx as Context, nextMiddleware);

  expect(ctx.body).toEqual({ name: "John" });
  expect(nextMiddleware).toHaveBeenCalled();
});
