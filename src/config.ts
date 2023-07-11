// The ATEM video mixer's multiviewer output is looped back in on input 10.
export const MULTI_VIEWER_INPUT = 10;

export const FK_API = process.env["FK_API"];

if (!FK_API && process.env["NODE_ENV"] === "production") {
  throw new Error("FK_API environment variable not set");
}

export const ATEM_HOST = process.env["ATEM_HOST"];

if (!ATEM_HOST && process.env["NODE_ENV"] === "production") {
  throw new Error("ATEM_HOST environment variable not set");
}
