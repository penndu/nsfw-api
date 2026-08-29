import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import {NSFWJS} from 'nsfwjs';
import {Tensor3D} from '@tensorflow/tfjs';
import {model as config} from 'app/config/model';

tf.enableProdMode();

const CLASSIFY_CONCURRENCY = 3;

export class NsfwImageClassifier {
  #model?: NSFWJS;

  async classify(imageBuffer: Buffer) {
    const [model, image] = await Promise.all([
      this.#getModel(),
      tf.node.decodeImage(imageBuffer, 3),
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
