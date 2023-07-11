import axios from "axios";
import { FK_API } from "../config.js";

interface authenticationCookies {
  csrftoken?: string;
  sessionid?: string;
}

export type AuthenticationResponse = {
  isStaff: boolean;
  email: string;
};

// Get profile from FK API, returning email and staff status.
export const getProfile = async ({ csrftoken, sessionid }: authenticationCookies): Promise<AuthenticationResponse> => {
  if (!(csrftoken && sessionid)) throw new Error("Refusing to authenticate without authorization headers");

  const response = await axios.get(`${FK_API}/user`, {
    headers: { cookie: `csrftoken=${csrftoken}; sessionid=${sessionid}` },
  });

  return response.data;
};
