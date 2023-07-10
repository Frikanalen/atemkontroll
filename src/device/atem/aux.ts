import { Atem } from "atem-connection";

export class AtemAUX {
  private atem: Atem;
  private readonly idx: number;

  constructor(atem: Atem, idx: number) {
    this.atem = atem;
    this.idx = idx;
  }

  public async get() {
    const state = this.atem.state;
    if (!state) {
      throw new Error("ATEM state nullish; disconnected?");
    }

    const auxes = state.video.auxilliaries;

    if (typeof auxes?.[this.idx] === "undefined") {
      throw new Error(`AUX ${this.idx} does not exist on ATEM`);
    }

    return auxes[this.idx];
  }

  public async set(input: number) {
    await this.atem.setAuxSource(input);
  }
}
