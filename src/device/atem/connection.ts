import { Atem } from "atem-connection";
import { AudioMixOption } from "atem-connection/dist/enums";
import { MULTI_VIEWER_INPUT } from "../../config.js";
import { getLogger } from "../../log.js";

const log = getLogger();

export const atem = new Atem();

/**
 * Apply initial state to the ATEM mixer.
 *
 * @param atem - ATEM mixer instance.
 */
const applyInitialConfiguration = async (atem: Atem) => {
  await atem.setMultiViewerWindowSource(1, 0, 2);
  await atem.setMultiViewerWindowSource(2, 0, 3);
  await atem.setMultiViewerWindowSource(3, 0, 4);
  await atem.setMultiViewerWindowSource(4, 0, 5);
  await atem.setMultiViewerWindowSource(5, 0, 6);

  try {
    const afv = AudioMixOption.AudioFollowVideo;
    await atem.setClassicAudioMixerInputProps(1, { mixOption: afv });
    await atem.setClassicAudioMixerInputProps(2, { mixOption: afv });
    await atem.setClassicAudioMixerInputProps(3, { mixOption: afv });
    await atem.setClassicAudioMixerInputProps(4, { mixOption: afv });
    await atem.setClassicAudioMixerInputProps(5, { mixOption: afv });
  } catch (e) {
    console.log("got exception while setting audio mixer input props");
    console.log(e);
  }
  await atem.setAuxSource(MULTI_VIEWER_INPUT, 2);
};

export const connect = (hostName: string) =>
  new Promise<void>(async (resolve, reject) => {
    log.info(`Connecting to ATEM mixer at ${hostName}...`);

    atem.on("error", log.error);

    atem.on("stateChanged", (state, _pathToChange) => {
      log.info(state); // catch the ATEM state.
    });

    atem.on("connected", async () => {
      log.info("Connected to ATEM");
      await applyInitialConfiguration(atem);
      resolve();
    });

    atem.on("disconnected", () => {
      log.info("Disconnected from ATEM");
    });

    try {
      await atem.connect(hostName);
    } catch (e) {
      log.error(`Failed to connect to ATEM: ${e}`);
      reject();
    }
  });
