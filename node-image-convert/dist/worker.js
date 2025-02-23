import { promises as fs } from "node:fs";
import { optimizeImage, close,
// setLimit,
 } from "wasm-image-optimization/node-worker";
const formats = ["webp", "jpeg", "png", "avif"];
// setLimit(1);
const main = async () => {
    console.time("time");
    await fs.mkdir("./image_output", { recursive: true });
    const files = await fs.readdir("./images");
    const p = files.map(async (file) => {
        return fs.readFile(`./images/${file}`).then((image) => {
            const p = formats.map((format) => {
                return optimizeImage({
                    image,
                    quality: 100,
                    format,
                    width: 1000,
                }).then((encoded) => {
                    console.log(!!encoded, file, format, encoded && `${Math.floor(encoded.length / 1024).toLocaleString()}KB`);
                    if (encoded) {
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
    console.log("exit");
    console.timeEnd("time");
};
main();
