import express from "express";
import cors from "cors";
import glob from "fast-glob";
import path from "path";
import dayjs from "dayjs";
import ffmpeg from "fluent-ffmpeg";
import * as rimraf from 'rimraf';

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const videoSuffix = [".mp4", ".avi", ".mpg",".mkv"];
const imgSuffix = [".jpg", ".gif", ".jpeg", ".png"];

app.get("/list", (req, res) => {
  const sub = req.query.sub || "./b";
  let list = glob.sync([sub + "/*", "!**.torrent"], {
    objectMode: true,
    onlyFiles: false,
    stats: true,
  });
  list = list
    .map((item) => {
      const suffix = path.extname(item.path);
      return {
        name: item.name,
        path: item.path,
        suffix,
        time: item.stats.mtime,
        timeStr: dayjs(item.stats.mtime).format("MM-DD HH:mm"),
        type: !suffix
          ? "folder"
          : videoSuffix.includes(suffix.toLowerCase())
          ? "video"
          : imgSuffix.includes(suffix.toLowerCase())
          ? "img"
          : "unknown",
      };
    })
    .sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") {
        return -1;
      }
      if (a.type !== "folder" && b.type === "folder") {
        return 1;
      }
      return b.time - a.time;
    });
  res.json(list);
});

const AsyncPool = class {
  constructor(size) {
    this.tasks = [];
    this.size = size;
    this.running = 0;
  }
  add(task) {
    this.tasks.push(task);
    this.processNextTask();
  }
  processNextTask() {
    if (this.tasks.length === 0 || this.running >= this.size) return;
    const task = this.tasks.shift();
    this.running++;
    task().finally(() => {
      this.running--;
      this.processNextTask();
    });
  }
}
const queue = new AsyncPool(4);

app.get("/thumbnail", (req, res) => {
  const split = 100;
  const { v: videoPath, f: forward = Math.random() * split} = req.query;
  res.set("Content-Type", "image/jpeg");
  queue.add(() => {
    return new Promise((resolve) => {
      ffmpeg(videoPath).ffprobe(function(err, data) {
        const { duration: totalSeconds } = data.format;
        const seekTime = Number((totalSeconds * Math.min(1, forward / split) - 1).toFixed(4));
        ffmpeg(videoPath)
          .format('image2pipe')
          .frames(1)
          .seekInput(seekTime)
          .on('error', () => resolve())
          .on('end', () => resolve())
          .pipe(res, { end: true });
      });
    })
  });
});

app.post('/drop', (req, res) => {
  console.log(req.body.path);
  if (!req.body.path) return;
  // res.json('1');
  console.log(req.body.path);
  if (req.body.path) {
    rimraf.rimraf(req.body.path).catch((e) => {
      console.log(e)
    }).finally(() => {
      res.json('success');
    });
  }
});

export const start = () => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });  
}

start();

// require('child_process').spawn('')