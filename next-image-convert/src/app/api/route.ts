import { optimizeImage } from "wasm-image-optimization";
import { NextResponse } from "next/server";

export async function GET() {
  const image = await fetch(
    "https://raw.githubusercontent.com/SoraKumo001/cloudflare-ogp/refs/heads/master/sample/image.jpg"
  ).then((v) => v.arrayBuffer());
  const result = await optimizeImage({ image });
  return new NextResponse(result, {
    headers: {
      "Content-Type": "image/avif",
    },
  });
}

export const runtime = "edge";
