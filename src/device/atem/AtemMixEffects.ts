import { getLogger } from "../../log.js";
import { Atem } from "atem-connection";
import { MixEffect } from "atem-connection/dist/state/video/index.js";

const log = getLogger();

export class AtemMixEffects {
  readonly idx: number;
  atem: Atem;
  constructor(atem: Atem, idx: number) {
    log.debug(`Constructing AtemMixEffects #${idx}`);
    this.atem = atem;
    this.idx = idx;
  }
  public get_ME(): Pick<MixEffect, "programInput" | "previewInput"> {
    const state = this.atem.state;

    if (!state) {
      throw new Error("ATEM state nullish; disconnected?");
    }

    const ME = state.video.mixEffects?.[this.idx];

    if (!ME) {
      throw new Error(`M/E ${this.idx} does not exist on ATEM`);
    }

    return ME;
  }
  public getProgramInput = () => this.get_ME().programInput;
  public getPreviewInput = () => this.get_ME().previewInput;

  public setProgramInput = (input: number) => this.atem.changeProgramInput(input, this.idx);
  public setPreviewInput = (input: number) => this.atem.changePreviewInput(input, this.idx);
}
