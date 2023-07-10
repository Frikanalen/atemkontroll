import { getLogger } from "../../log.js";
import { atem } from "./connection.js";

const log = getLogger();

export const getAtemMEState = async (meIdx: number = 0) => {
  const ME = atem.state?.video.mixEffects?.[meIdx];

  if (!ME) {
    log.warn("Requested ME state but no ME found");
    return undefined;
  }

  const { programInput, previewInput } = ME;

  return {
    programInput,
    previewInput,
  };
};

export const setAtemMEPreview = async (previewInput: number, meIdx?: number) => {
  await atem.changePreviewInput(previewInput, meIdx);
};

export const setAtemMEProgram = async (programInput: number, meIdx?: number) => {
  await atem.changeProgramInput(programInput, meIdx);
};
