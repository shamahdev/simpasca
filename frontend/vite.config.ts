import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";
import { defineConfig } from "vite";
import vinext from "vinext";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    vinext({
      cache: {
        data: kvDataAdapter(),
      },
    }),
    ...(command === "build"
      ? [cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } })]
      : []),
  ],
}));
