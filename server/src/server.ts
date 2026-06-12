import { env } from "./config/env.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`LuoJia Link server listening on http://127.0.0.1:${env.port}/api`);
});
