// Fixture: triggers an unhandled rejection on invoke to test the M7 exit behaviour.
"use strict";
const readline = require("node:readline");

process.on("unhandledRejection", (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write("[pasty-bridge] Unhandled rejection: " + msg + "\n");
  process.exit(1);
});

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on("line", (line) => {
  if (!line) return;
  try {
    const frame = JSON.parse(line);
    if (frame.method === "runtime.invokeRenderer") {
      // Fire-and-forget rejected promise — not awaited, so it becomes an unhandledRejection.
      Promise.reject(new Error("simulated unhandled rejection"));
    }
  } catch (_) {}
});
