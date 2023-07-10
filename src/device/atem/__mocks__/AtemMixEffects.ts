export class AtemMixEffects {
  idx: number;
  atem: any;
  constructor(atem: any, idx: number) {
    this.atem = atem;
    this.idx = idx;
  }
  public get_ME() {
    return { programInput: 0, previewInput: 0 };
  }
  public getProgramInput = () => this.get_ME().programInput;
  public getPreviewInput = () => this.get_ME().previewInput;
  public setProgramInput = async (input: number) => {
    this.get_ME().programInput = input;
    return Promise.resolve();
  };
  public setPreviewInput = async (input: number) => {
    this.get_ME().previewInput = input;
    return Promise.resolve();
  };
}
