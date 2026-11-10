/** Opens the database at server start so migrations run before the first request. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getCore } = await import("./core");
    getCore();
  }
}
