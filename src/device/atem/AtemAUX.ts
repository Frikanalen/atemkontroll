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
    if (!state) throw new Error("ATEM state nullish; disconnected?");

    const aux = state.video.auxilliaries?.[this.auxId];
    if (typeof aux === "undefined") throw new Error(`AUX ${this.auxId} does not exist on ATEM`);

    return aux;
  }

  public async set(input: number) {
    await this.atem.setAuxSource(input, this.auxId);
  }
}
