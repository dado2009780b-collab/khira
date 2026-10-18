import { spawn } from "node:child_process";

const processes = [];
let stopping = false;

function start(name, args) {
  const isWindows = process.platform === "win32";
  const child = spawn(
    isWindows ? (process.env.ComSpec ?? "cmd.exe") : "pnpm",
    isWindows ? ["/d", "/s", "/c", `pnpm ${args.join(" ")}`] : args,
    {
      cwd: process.cwd(),
      stdio: "inherit",
    },
  );

  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${name} stopped (${signal ?? code ?? "unknown"}).`);
      stopAll(code ?? 1);
    }
  });

  processes.push(child);
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of processes) child.kill();
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stopAll());
process.on("SIGTERM", () => stopAll());

start("API", ["--filter", "@workspace/api-server", "run", "dev"]);
start("website", ["--filter", "@workspace/islamic-book-bundle", "run", "dev"]);
