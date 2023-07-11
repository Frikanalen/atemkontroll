import { Atem } from "atem-connection";

export class AtemMixEffects {
  readonly idx: number;
  atem: Atem;

  MEState = {
    programInput: 1,
    previewInput: 1,
  };

  constructor(atem: any, idx: number) {
    this.idx = idx;
    this.atem = atem;
  }
  public get_ME = () => this.MEState;

  public getProgramInput = () => this.get_ME().programInput;
  public getPreviewInput = () => this.get_ME().previewInput;
  public setProgramInput = async (input: number) => {
    this.MEState.programInput = input;
    return Promise.resolve();
  };
  public setPreviewInput = async (input: number) => {
    this.MEState.previewInput = input;
    return Promise.resolve();
  };
}
