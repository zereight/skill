import ext from "./.pi/agent/extensions/antigravity/index.ts";
console.log(ext);
const pi = {
  registerProvider: (name, config) => console.log("Registered", name, config.models),
  log: { info: console.log, error: console.error, warn: console.warn }
};
ext(pi).catch(console.error);
