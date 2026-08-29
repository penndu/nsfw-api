import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import {NSFWJS} from 'nsfwjs';
import {Tensor3D} from '@tensorflow/tfjs';
import sharp from 'sharp';
import decodeIco from 'decode-ico';
import {model as config} from 'app/config/model';

tf.enableProdMode();

const CLASSIFY_CONCURRENCY = 3;

export class NsfwImageClassifier {
  #model?: NSFWJS;

  async classify(imageBuffer: Buffer) {
    const [model, image] = await Promise.all([
      this.#getModel(),
      this.#decodeAny(imageBuffer),
    ]);

    const predictions = await model.classify(image as Tensor3D);

    image.dispose();

    return this.#transformData(predictions);
  }

  async classifyMany(imagesBuffers: Buffer[]) {
    const tasks = imagesBuffers.map(buffer => () => this.classify(buffer));
    return this.#runWithLimit(tasks, CLASSIFY_CONCURRENCY);
  }

  async #getModel(): Promise<NSFWJS> {
    if (!this.#model) {
      this.#model = await nsfwjs.load('file://model/', {size: config.size});
    }

    return this.#model;
  }

  // tfjs-node natively supports PNG/JPEG/GIF/BMP only. For WebP / HEIC /
  // AVIF / TIFF etc. we fall back to sharp. ICO is special — sharp does
  // not decode ICO, so we use decode-ico first (which returns frames whose
  // .data is itself an embedded PNG/BMP), then re-pipe the frame through
  // sharp for the raw RGB pixel view.
  async #decodeAny(buffer: Buffer): Promise<Tensor3D> {
    let format: string | undefined;

    try {
      format = (await sharp(buffer).metadata()).format as string;
    } catch {
      // sharp throws on formats it cannot identify — assume ICO and try.
      return await this.#decodeIco(buffer);
    }

    if (format === 'png' || format === 'jpeg' || format === 'gif' || format === 'bmp') {
      // expandAnimations=false so GIF also collapses to a 3D tensor (first frame).
      return (await tf.node.decodeImage(buffer, 3, 'int32', false)) as Tensor3D;
    }

    const {data, info} = await sharp(buffer)
      .removeAlpha()
      .raw()
      .toBuffer({resolveWithObject: true});

    return tf.tensor3d(data, [info.height, info.width, 3], 'int32');
  }

  async #decodeIco(buffer: Buffer): Promise<Tensor3D> {
    const frames = decodeIco(buffer);
    const frame = frames[0];
    const {data, info} = await sharp(frame.data)
      .removeAlpha()
      .raw()
      .toBuffer({resolveWithObject: true});
    return tf.tensor3d(data, [info.height, info.width, 3], 'int32');
  }

  #transformData(data: { className: string; probability: number }[]): Record<string, number> {
    const result: Record<string, number> = {};

    for (const item of data) {
      result[item.className.toLowerCase()] = item.probability;
    }

    return result;
  }

  async #runWithLimit<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
    if (tasks.length === 0) return [];

    const results: T[] = new Array(tasks.length);
    let cursor = 0;

    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= tasks.length) return;
        results[i] = await tasks[i]();
      }
    };

    const workerCount = Math.min(concurrency, tasks.length);
    await Promise.all(Array.from({length: workerCount}, () => worker()));

    return results;
  }
}
