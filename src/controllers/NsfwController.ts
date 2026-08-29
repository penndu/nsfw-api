import {Controller, Post} from 'simple-ts-express-decorators';
import multer, {memoryStorage} from 'multer';
import {Request, RequestHandler, Response} from 'express';
import {NsfwImageClassifier} from 'app/NsfwImageClassifier';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per image

const upload = multer({
  storage: memoryStorage(),
  limits: {fileSize: MAX_FILE_SIZE},
});

// Workaround: @types/multer@2 nests @types/express@4, which clashes with
// the project's @types/express@5 (Request.param removed in v5). The middleware
// is runtime-compatible — we just align the type with our express version.
const uploadSingle = upload.single('image') as unknown as RequestHandler;
const uploadMany = upload.array('images', 10) as unknown as RequestHandler;

@Controller()
export class NsfwController {
  classifier: NsfwImageClassifier;

  constructor() {
    this.classifier = new NsfwImageClassifier();
  }

  @Post('/classify', uploadSingle)
  async classify(request: Request, response: Response) {
    if (!request.file) {
      return response
        .status(400)
        .json({error: 'Specify image'});
    }

    try {
      const data = await this.classifier.classify(request.file.buffer);
      return response.json(data);
    } catch (error) {
      return response
        .status(400)
        .json({error: 'Unsupported or corrupt image'});
    }
  }

  @Post('/classify-many', uploadMany)
  async classifyMany(request: Request, response: Response) {
    const files = request.files as Express.Multer.File[] | undefined;

    if (!files || !files.length) {
      return response
        .status(400)
        .json({error: 'Specify images'});
    }

    try {
      const buffers = files.map(file => file.buffer);
      const data = await this.classifier.classifyMany(buffers);
      return response.json(data);
    } catch (error) {
      return response
        .status(400)
        .json({error: 'Unsupported or corrupt image'});
    }
  }
}
