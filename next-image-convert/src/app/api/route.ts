import { optimizeImage } from "wasm-image-optimization/next-back";
import fs from "fs";
export async function GET() {
  const image = await fetch(
    "https://raw.githubusercontent.com/SoraKumo001/cloudflare-ogp/refs/heads/master/sample/image.jpg"
  ).then((v) => v.arrayBuffer());
  const result = await optimizeImage({ image });

  return new Response(result, {
    headers: {
      "content-type": "image/avif",
    },
  });
}
