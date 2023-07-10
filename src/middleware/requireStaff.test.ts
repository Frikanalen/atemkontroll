import Koa from "koa";
import request from "supertest";

import { requireStaff } from "./requireStaff.js";
import { getProfile } from "../fkapi/getProfile.js";

jest.mock("../fkapi/getProfile.js", () => {
  return {
    getProfile: jest.fn(),
  };
});

jest.mock("./requireStaff.js", () => {
  return {
    requireStaff: jest.fn(() => jest.requireActual("./requireStaff.ts").requireStaff()),
  };
});

jest.mock("../log.js", () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe("requireStaff", () => {
  const app = new Koa();
  app.use(requireStaff());
  app.use((ctx) => (ctx.body = "success"));

  beforeEach(() => {
    (getProfile as jest.Mock).mockClear();
  });

  it("throws a 403 if the user is not staff", async () => {
    const mockData = { isStaff: false, email: "test@test.com" };
    (getProfile as jest.Mock).mockResolvedValue(mockData);

    const response = await request(app.callback())
      .get("/")
      .set("Cookie", ["csrftoken=testcsrftoken", "sessionid=testsessionid"]);

    expect(response.status).toBe(403);
  });

  it("continues to the next middleware if the user is staff", async () => {
    const mockData = { isStaff: true, email: "test@test.com" };
    (getProfile as jest.Mock).mockResolvedValue(mockData);

    const response = await request(app.callback())
      .get("/")
      .set("Cookie", ["csrftoken=testcsrftoken", "sessionid=testsessionid"]);

    expect(response.status).toBe(200);
    expect(response.text).toBe("success");
  });

  it("throws a 500 if there is an error getting the profile", async () => {
    (getProfile as jest.Mock).mockRejectedValue(new Error("Error getting profile"));

    const response = await request(app.callback())
      .get("/")
      .set("Cookie", ["csrftoken=testcsrftoken", "sessionid=testsessionid"]);

    expect(response.status).toBe(500);
  });
});
