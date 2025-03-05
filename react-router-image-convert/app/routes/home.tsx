import { useEffect, useMemo, useRef, useState, type FC } from "react";
import {
  type OptimizeResult,
  optimizeImageExt,
  setLimit,
  waitReady,
  launchWorker,
} from "wasm-image-optimization/web-worker";

setLimit(8); // Web Worker limit
launchWorker(); // Prepare Worker in advance.

const classNames = (...classNames: (string | undefined | false)[]) =>
  classNames.reduce(
    (a, b, index) => a + (b ? (index ? " " : "") + b : ""),
    ""
  ) as string | undefined;

const Time = () => {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setTime((v) => v + 1), 100);
    return () => clearInterval(handle);
  }, []);
  return (
    <div>
      {time} ← Test that the UI is working without being blocked during
      conversion.
    </div>
  );
};

const ImageInput: FC<{ onFiles: (files: File[]) => void }> = ({ onFiles }) => {
  const refInput = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  return (
    <>
      <div
        className={classNames(
          "w-64 h-32 border-dashed border flex justify-center items-center cursor-pointer select-none m-2 rounded-4xl p-4",
          focus && "outline outline-blue-400"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDoubleClick={() => {
          refInput.current?.click();
        }}
        onClick={() => {
          refInput.current?.focus();
        }}
        onDrop={(e) => {
          onFiles(Array.from(e.dataTransfer.files));
          e.preventDefault();
        }}
      >
        Drop here, copy and paste or double-click to select the file.
      </div>
      <input
        ref={refInput}
        className="absolute size-0"
        type="file"
        multiple
        accept=".jpg,.png,.gif,.svg,.avif,.webp"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onPaste={(e) => {
          e.preventDefault();
          onFiles(Array.from(e.clipboardData.files));
        }}
        onChange={(e) => {
          e.preventDefault();
          if (e.currentTarget.files) onFiles(Array.from(e.currentTarget.files));
        }}
      />
    </>
  );
};

const formats = ["none", "webp", "jpeg", "png", "avif"] as const;
const AsyncImage: FC<{
  file: File;
  format: (typeof formats)[number];
  quality: number;
  speed: number;
  size: [number, number];
}> = ({ file, format, quality, size, speed }) => {
  const [time, setTime] = useState<number>();
  const [image, setImage] = useState<OptimizeResult | null | undefined>(null);
  useEffect(() => {
    const convert = async () => {
      setImage(null);
      await waitReady();
      const t = performance.now();
      const image = await optimizeImageExt({
        image: await file.arrayBuffer(),
        format,
        quality,
        speed,
        width: size[0] || undefined,
        height: size[1] || undefined,
      });
      setTime(performance.now() - t);
      setImage(image);
    };
    convert();
  }, [file]);
  const src = useMemo(
    () =>
      image &&
      URL.createObjectURL(
        new Blob([image.data], {
          type: format === "none" ? file.type : `image/${format}`,
        })
      ),
    [image]
  );
  const filename =
    format === "none" ? file.name : file.name.replace(/\.\w+$/, `.${format}`);
  return (
    <div className="border border-gray-300 rounded-4 overflow-hidden relative w-64 h-64 grid">
      {image === undefined && <div>Error</div>}
      {src && image && (
        <>
          <a download={filename} href={src}>
            <img
              className="flex-1 object-contain block overflow-hidden"
              src={src}
            />
          </a>
          <div className="bg-white/80 w-full z-10 text-right p-0 absolute bottom-0 font-bold">
            <div>{filename}</div>
            <div>{time?.toLocaleString()}ms</div>
            <div>
              {format !== "none" ? "Optimize" : "Original"}:{" "}
              {image.width.toLocaleString()}x{image.height.toLocaleString()} -{" "}
              {Math.ceil(image.data.length / 1024).toLocaleString()}KB
            </div>
          </div>
        </>
      )}
      {image === null && (
        <div className="m-auto animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent" />
      )}
    </div>
  );
};

const Page = () => {
  const [images, setImages] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [speed, setSpeed] = useState(6);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const [limitWorker, setLimitWorker] = useState(10);
  const [formatList, setFormatList] =
    useState<ReadonlyArray<(typeof formats)[number]>>(formats);
  return (
    <div className="p-4">
      <div>
        <a
          className="text-blue-600 hover:underline"
          href="https://github.com/SoraKumo001/wasm-image-optimization-samples/tree/master/react-router-image-convert"
        >
          Source code
        </a>
      </div>
      Timer indicating that front-end processing has not stopped.
      <Time />
      <ImageInput onFiles={setImages} />
      <label className="flex gap-2 items-center">
        <input
          type="number"
          className="border border-gray-300 rounded-4 p-1"
          value={size[0]}
          onChange={(e) =>
            setSize((v) => [Math.max(0, Number(e.target.value)), v[1]])
          }
        />
        Width(0:Original)
      </label>
      <label className="flex gap-2 items-center">
        <input
          type="number"
          className="border border-gray-300 rounded-4 p-1"
          value={size[1]}
          onChange={(e) =>
            setSize((v) => [v[0], Math.max(0, Number(e.target.value))])
          }
        />
        Height(0:Original)
      </label>
      <label className="flex gap-2 items-center">
        <input
          type="number"
          className="border border-gray-300 rounded-4 p-1"
          value={speed}
          onChange={(e) =>
            setSpeed(Math.min(10, Math.max(0, Number(e.target.value))))
          }
        />
        Speed(0-10,Slower-Faster): Avif
      </label>
      <label className="flex gap-2 items-center">
        <input
          type="number"
          className="border border-gray-300 rounded-4 p-1"
          value={quality}
          onChange={(e) =>
            setQuality(Math.min(100, Math.max(0, Number(e.target.value))))
          }
        />
        Quality(0-100): Avif, Jpeg, WebP
      </label>
      <label className="flex gap-2 items-center">
        <input
          type="number"
          className="border border-gray-300 rounded-4 p-1"
          value={limitWorker}
          onChange={(e) => {
            const limit = Math.max(1, Number(e.target.value));
            setLimit(limit);
            setLimitWorker(limit);
          }}
        />
        Web Workers(1-)
      </label>
      <div className="flex gap-2">
        {formats.map((format) => (
          <label key={format} className="flex gap-1 ">
            <input
              type="checkbox"
              checked={formatList.includes(format)}
              onChange={(e) => {
                const checked = e.currentTarget.checked;
                if (checked) setFormatList((v) => [...v, format]);
                else setFormatList((v) => v.filter((f) => f !== format));
              }}
            />
            {format}
          </label>
        ))}
      </div>
      <hr className="m-4" />
      <div className="flex flex-wrap gap-4">
        {images.flatMap((file, index) => (
          <div key={index} className="flex flex-wrap gap-4">
            {formats
              .filter((f) => formatList.includes(f))
              .map((format) => (
                <AsyncImage
                  key={format}
                  file={file}
                  format={format}
                  quality={quality}
                  speed={speed}
                  size={size}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Page;
