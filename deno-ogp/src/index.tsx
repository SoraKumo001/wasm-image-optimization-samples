/** @jsxImportSource npm:react */
// deno-lint-ignore-file no-unversioned-import no-import-prefix
import { createOGP } from "./createOGP.ts";
import { optimizeImage } from "npm:wasm-image-optimization";

const convertImage = async (url: string | null) => {
  const response = url ? await fetch(url) : undefined;
  if (response) {
    const contentType = response.headers.get("Content-Type");
    const imageBuffer = await response.arrayBuffer();
    if (contentType?.startsWith("image/")) {
      if (["image/png", "image/jpeg"].includes(contentType)) {
        return [contentType, imageBuffer as ArrayBuffer] as const;
      }
      const image = await optimizeImage({ image: imageBuffer, format: "png" });
      if (image) {
        return ["image/png", image] as const;
      }
    }
  }
  return [];
};

Deno.serve(async (request) => {
  const url = new URL(request.url);
  if (url.pathname !== "/") {
    return new Response(null, { status: 404 });
  }

  const name = url.searchParams.get("name") ?? "Name";
  const title = url.searchParams.get("title") ?? "Title";
  const image = url.searchParams.get("image");

  const isDev =
    Deno.env.get("DENO_ENV") === "development" || url.hostname === "localhost";
  const cache = await caches.open("ogp");
  const cacheKey = new Request(url.toString());

  if (!isDev) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  const [imageType, imageBuffer] = await convertImage(image);

  const ogpNode = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "16px 24px",
        overflow: "hidden",
        fontFamily: "NotoSansJP",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          border: "solid 16px #0044FF",
          borderRadius: "24px",
          boxSizing: "border-box",
          background: "linear-gradient(to bottom right, #ffffff, #d3eef9)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flex: 1,
            position: "relative",
          }}
        >
          {image && (
            <img
              style={{
                borderRadius: "100%",
                padding: "24px",
                opacity: 0.4,
              }}
              width={480}
              height={480}
              src={
                imageBuffer
                  ? `data:${imageType};base64,${btoa(
                      Array.from(new Uint8Array(imageBuffer))
                        .map((v) => String.fromCharCode(v))
                        .join(""),
                    )}`
                  : undefined
              }
              alt=""
            />
          )}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <h1
              style={{
                fontSize: 64,
                fontWeight: 700,
                padding: "0 42px",
                wordBreak: "break-all",
                lineClamp: 4,
                lineHeight: "90px",
                color: "#222",
                textShadow:
                  "2px 2px 0px #eee, -2px -2px 0px #eee, 2px -2px 0px #eee, -2px 2px 0px #eee",
              }}
            >
              {title}
            </h1>
          </div>
        </div>
        <div
          style={{
            width: "100%",
            justifyContent: "flex-end",
            fontSize: 48,
            padding: "0 32px 32px 0",
            color: "#CC3344",
          }}
        >
          {name}
        </div>
      </div>
    </div>
  );
  const png = await createOGP(ogpNode, {
    cache: isDev ? undefined : cache,
    scale: 0.7,
    width: 1200,
    height: 630,
    fonts: [
      ["LINE Seed JP", 700],
      "Noto Sans",
      "Noto Sans Math",
      "Noto Sans Symbols",
      // 'Noto Sans Symbols 2',
      // "Noto Sans JP",
      // 'Noto Sans KR',
      // 'Noto Sans SC',
      // 'Noto Sans TC',
      // 'Noto Sans HK',
      // 'Noto Sans Thai',
      // 'Noto Sans Bengali',
      // 'Noto Sans Arabic',
      // 'Noto Sans Tamil',
      // 'Noto Sans Malayalam',
      // 'Noto Sans Hebrew',
      // 'Noto Sans Telugu',
      // 'Noto Sans Devanagari',
      // 'Noto Sans Kannada',
    ],
    emojis: [
      {
        url: "https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/",
      },
      {
        url: "https://openmoji.org/data/color/svg/",
      },
    ],
  });
  const response = new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": isDev
        ? "no-cache"
        : "public, max-age=31536000, immutable",
      date: new Date().toUTCString(),
    },
  });
  if (!isDev) {
    await cache.put(cacheKey, response.clone());
  }
  return response;
});
