import { promises as fs } from "node:fs";
import {
  optimizeImage,
  close,
  setLimit,
} from "wasm-image-optimization/node-worker";

const formats = ["webp", "jpeg", "png", "avif"] as const;

setLimit(4); // set worker limit

const main = async () => {
  const title = "Multi thread";
  console.time(title);
  await fs.mkdir("./image_output", { recursive: true });
  const files = await fs.readdir("./images");
  const p = files.map(async (file) => {
    return fs.readFile(`./images/${file}`).then((image) => {
      console.log(
        `${file} ${Math.floor(image.length / 1024).toLocaleString()}KB`
      );
      const p = formats.map((format) => {
        const label = `[${file}] -> [${format}]`;
        console.time(label);
        return optimizeImage({
          image,
          quality: 100,
          format,
          width: 512,
        }).then((encoded) => {
          if (encoded) {
            console.timeLog(
              label,
              `${Math.floor(encoded.length / 1024).toLocaleString()}KB`
            );
            const fileName = file.split(".")[0];
            fs.writeFile(`image_output/${fileName}.${format}`, encoded);
          }
        });
      });
      return Promise.all(p);
    });
  });
  await Promise.all(p);
  close(); // close worker
  console.timeEnd(title);
};
main();
