import axios from "axios";
import { FK_API_URL } from "./config.js";
import { getLogger } from "./log.js";

const logger = getLogger();

interface authenticationCookies {
  csrftoken?: string;
  sessionid?: string;
}

type AuthenticationResponse = {
  data: {
    isStaff: boolean;
    email: string;
  };
};

export const getProfile = async ({ csrftoken, sessionid }: authenticationCookies): Promise<AuthenticationResponse> => {
  if (!(csrftoken && sessionid)) {
    throw new Error("Refusing to authenticate without authorization headers");
  }

  return axios.get(`${FK_API_URL}/user`, { headers: { cookie: `csrftoken=${csrftoken}; sessionid=${sessionid}` } });
};

export const checkIfStaff = async (requestCookies: authenticationCookies) => {
  try {
    const profile = await getProfile(requestCookies);

    const { isStaff, email } = profile.data;

    if (isStaff) {
      logger.info(`Authenticated request for ${email}`);
      return true;
    } else {
      logger.warn(`User ${email} is not staff, refusing`);
      return false;
    }
  } catch (err) {
    logger.error(`Error getting profile: ${err}`);
    return false;
  }
};
