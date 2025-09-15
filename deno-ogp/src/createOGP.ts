import initYoga from "yoga-wasm-web";
import satori, { init } from "satori";
import { optimizeImage } from "wasm-image-optimization";
import type { JSX } from "react/jsx-runtime";

const importModule = (name: string) => {
  return fetch(new URL(`../../node_modules/${name}`, import.meta.url))
    .then((r) => r.arrayBuffer())
    .catch(() =>
      fetch(new URL(`../node_modules/${name}`, import.meta.url)).then((r) =>
        r.arrayBuffer()
      )
    );
};

let isInitialized = false;
const initializeSatori = async () => {
  if (isInitialized) return;
  isInitialized = true;
  const yogaWasm = await importModule("yoga-wasm-web/dist/yoga.wasm");
  init(await initYoga(yogaWasm));
};

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontStyle = "normal" | "italic";
type FontSrc = {
  data: ArrayBuffer | string;
  name: string;
  weight?: Weight;
  style?: FontStyle;
  lang?: string;
};
type Font = Omit<FontSrc, "data"> & { data: ArrayBuffer };

const downloadFont = async (fontName: string) => {
  return await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURI(fontName)}`
  )
    .then((res) => res.text())
    .then(
      (css) =>
        css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)?.[1]
    )
    .then((url) => {
      return url !== undefined
        ? fetch(url).then((v) =>
            v.status === 200 ? v.arrayBuffer() : undefined
          )
        : undefined;
    });
};

const getFonts = async (fontList: string[], cache: Cache): Promise<Font[]> => {
  const fonts: Font[] = [];
  for (const fontName of fontList) {
    const cacheKey = `http://font/${encodeURI(fontName)}`;

    const response = await cache.match(cacheKey);
    if (response) {
      fonts.push({
        name: fontName,
        data: await response.arrayBuffer(),
        weight: 400,
        style: "normal",
      });
    } else {
      const data = await downloadFont(fontName);
      if (data) {
        cache.put(cacheKey, new Response(data));
        fonts.push({ name: fontName, data, weight: 400, style: "normal" });
      }
    }
  }
  return fonts.flatMap((v): Font[] => (v ? [v] : []));
};

const createLoadAdditionalAsset = ({
  cache,
  emojis,
}: {
  cache: Cache;
  emojis: {
    url: string;
    upper?: boolean;
  }[];
}) => {
  const getEmojiSVG = async (code: string) => {
    for (const { url, upper } of emojis) {
      const emojiURL = `${url}${
        upper === false ? code.toLocaleLowerCase() : code.toUpperCase()
      }.svg`;

      let response = await cache.match(emojiURL);
      if (!response) {
        response = await fetch(emojiURL);
        if (response.status === 200) {
          await cache.put(emojiURL, response.clone());
        }
      }
      if (response.status === 200) {
        return await response.text();
      }
    }
    return undefined;
  };

  const loadEmoji = (segment: string): Promise<string | undefined> => {
    const codes = Array.from(segment).map((char) => char.codePointAt(0)!);
    const isZero = codes.includes(0x200d);
    const code = codes
      .filter((code) => isZero || code !== 0xfe0f)
      .map((v) => v.toString(16))
      .join("-");
    return getEmojiSVG(code);
  };

  const loadAdditionalAsset = async (code: string, segment: string) => {
    if (code === "emoji") {
      const svg = await loadEmoji(segment);
      if (!svg) return segment;
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
    return [];
  };

  return loadAdditionalAsset;
};

export const createOGP = async (
  element: JSX.Element,
  {
    fonts,
    emojis,
    cache,
    width,
    height,
    scale = 1,
  }: {
    cache: Cache;
    fonts: string[];
    emojis?: {
      url: string;
      upper?: boolean;
    }[];
    width: number;
    height?: number;
    scale?: number;
  }
) => {
  await initializeSatori();
  const fontList = await getFonts(fonts, cache);
  const svg = await satori(element, {
    width,
    height,
    fonts: fontList,
    loadAdditionalAsset: emojis
      ? createLoadAdditionalAsset({ cache, emojis })
      : undefined,
  });
  return await optimizeImage({
    image: svg as never,
    width: width * scale,
    height: height ? height * scale : undefined,
    format: "png",
  });
};
