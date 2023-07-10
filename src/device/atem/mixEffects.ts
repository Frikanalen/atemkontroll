import { getLogger } from "../../log.js";
import { atem } from "../../api/atem.js";

const log = getLogger();

export const getAtemMEState = async (meIdx: number = 0) => {
  const ME = atem.state?.video.mixEffects?.[meIdx];

  if (!ME) {
    log.warn("Requested ME state but no ME found");
    return undefined;
  }

  return {
    programInput: ME.programInput,
    previewInput: ME.previewInput,
  };
};

export const setAtemMEPreview = async (previewInput: number, meIdx: number = 0) => {
  await atem.changePreviewInput(previewInput);
};

export const setAtemMEProgram = async (programInput: number, meIdx: number = 0) => {
  await atem.changeProgramInput(programInput);
};
