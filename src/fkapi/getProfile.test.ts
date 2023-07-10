import { getProfile } from "./getProfile.js";
import { FK_API_URL } from "../config.js";
import axios from "axios";
const mockAxios = axios as jest.Mocked<typeof axios>;
jest.mock("axios");

describe("getProfile", () => {
  it("throws an error if csrftoken or sessionid are not provided", async () => {
    await expect(getProfile({})).rejects.toThrow("Refusing to authenticate without authorization headers");
  });

  it("makes a request to the correct URL with the correct headers", async () => {
    const mockData = { isStaff: true, email: "test@test.com" };
    mockAxios.get.mockResolvedValue({ data: mockData });

    await getProfile({ csrftoken: "testcsrftoken", sessionid: "testsessionid" });

    expect(mockAxios.get).toHaveBeenCalledWith(`${FK_API_URL}/user`, {
      headers: { cookie: "csrftoken=testcsrftoken; sessionid=testsessionid" },
    });
  });
});
