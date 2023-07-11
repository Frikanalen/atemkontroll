import { getProfile } from "./getProfile.js";
import axios from "axios";

jest.mock("axios");

const mockAxios = axios as jest.Mocked<typeof axios>;

const fkSession = "test-session";

describe("getV2Session", () => {
  it("returns the validated response if the validation is successful", async () => {
    const mockResponse = {
      data: {
        authenticated: true,
        user: {
          id: 1,
          email: "test@example.com",
          permissions: ["ATEM_CONTROL"],
        },
      },
    };
    mockAxios.get.mockResolvedValue(mockResponse);
    const session = await getProfile(fkSession);
    expect(session).toEqual(mockResponse.data);
  });

  it("throws an error if the validation fails", async () => {
    mockAxios.get.mockResolvedValue({ data: { wrong: "data" } });
    await expect(getProfile(fkSession)).rejects.toThrowError("Validation failed");
  });
});
