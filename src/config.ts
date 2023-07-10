// The ATEM video mixer's multiviewer output is looped back in on input 10.
export const MULTI_VIEWER_INPUT = 10;
export const FK_API_URL = process.env["FK_API"];

if (!FK_API_URL && process.env["NODE_ENV"] === "production") {
  throw new Error("FK_API environment variable not set");
}
