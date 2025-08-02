type Hook = (reason?: string) => void | Promise<void>;

let onStartHooks: Hook[] = [];
let onReadyHooks: Hook[] = [];
let onShutdownHooks: Hook[] = [];

async function runHooks(hooks: Hook[], label: string, reason?: string) {
  for (const hook of hooks) {
    try {
      await hook(reason);
    } catch (err) {
      console.error(`⚠️ [${label}] Hook failed:`, err);
    }
  }
}

export async function onAppStart(msg?: string) {
  if (msg) console.log(msg);
  await runHooks(onStartHooks, "onAppStart");
}

export async function onAppReady(msg?: string) {
  if (msg) console.log(msg);
  await runHooks(onReadyHooks, "onAppReady");
}

export async function onAppShutdown(reason?: string) {
  console.log("🔌 Shutdown triggered:", reason);
  await runHooks(onShutdownHooks, "onAppShutdown", reason);
}

// Register hooks
export function registerOnStartHook(hook: Hook) {
  onStartHooks.push(hook);
}

export function registerOnReadyHook(hook: Hook) {
  onReadyHooks.push(hook);
}

export function registerOnShutdownHook(hook: Hook) {
  onShutdownHooks.push(hook);
}
