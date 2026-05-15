/** Medição simples no servidor (logs apenas em desenvolvimento, ou quando DASHBOARD_SERVER_TIMING=1). */
const enabled =
  process.env.NODE_ENV !== "production" || process.env.DASHBOARD_SERVER_TIMING === "1";

export async function timeServerAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!enabled) {
    return fn();
  }

  console.time(label);
  try {
    return await fn();
  } finally {
    console.timeEnd(label);
  }
}
