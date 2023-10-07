import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import { prisma } from "../lib/prisma";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, //25mb
    },
  });

  app.post("/videos", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: "Missing file input." });
    }

    const { filename, file } = data;

    const ext = path.extname(filename);

    if (ext !== ".mp3") {
      return reply
        .status(400)
        .send({ error: "Invalid input type, please upload a MP3." });
    }

    const fileBaseName = path.basename(filename, ext);

    const fileUploadName = `${fileBaseName}-${randomUUID()}${ext}`;

    const uploadDesination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    await pump(file, fs.createWriteStream(uploadDesination));

    const video = await prisma.video.create({
      data: {
        name: filename,
        path: uploadDesination,
      },
    });

    return {
      video,
    };
  });
}
