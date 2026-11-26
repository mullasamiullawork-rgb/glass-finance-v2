import { cpSync, mkdirSync, rmSync } from "node:fs";
rmSync("www", { recursive: true, force: true });
mkdirSync("www", { recursive: true });
cpSync("web", "www", { recursive: true });
console.log("Built www/ from web/");
