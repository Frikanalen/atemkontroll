import { Atem } from "atem-connection";

export class AtemAUX {
  private atem: Atem;
  public readonly auxId: number;

  constructor(atem: Atem, auxId: number) {
    this.atem = atem;
    this.auxId = auxId;
  }

  public async get() {
    const state = this.atem.state;
    if (!state) {
      throw new Error("ATEM state nullish; disconnected?");
    }

    const auxes = state.video.auxilliaries;

    if (typeof auxes?.[this.auxId] === "undefined") {
      throw new Error(`AUX ${this.auxId} does not exist on ATEM`);
    }

    return auxes[this.auxId];
  }

  public async set(input: number) {
    await this.atem.setAuxSource(input);
  }
}
