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

const videoSuffix = [".mp4", ".avi", ".mpg",".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v", ".3gp", ".3g2", ".m2ts", ".ts", ".mts", ".m2v", ".m4p", ".m4b", ".m4r", ".f4v", ".f4p", ".f4a", ".f4b"];
const imgSuffix = [".jpg", ".gif", ".jpeg", ".png"];

app.get("/list", (req, res) => {
  const sub = req.query.sub || "./b";
  // 使用 dot:true 选项来允许匹配带小数点的路径
  let list = glob.sync([sub + "/*", "!**.torrent"], {
    objectMode: true,
    onlyFiles: false,
    stats: true,
    dot: true  // 启用匹配以点开头的文件和目录
  });
  list = list
    .map((item) => {
      const suffix = path.extname(item.path);
      const isFolder = item.dirent.isDirectory();
      return {
        name: item.name,
        path: item.path,
        suffix,
        time: item.stats.mtime,
        timeStr: dayjs(item.stats.mtime).format("MM-DD HH:mm"),
        type: isFolder
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
        if (err) return resolve();
        if (!data?.format) return resolve();
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

app.post('/clear', (req, res) => {
  console.log('clear call', req.body.path);
  // 实现一段逻辑，检查当前目录下所有文件夹，如果文件夹内为空，则删除该文件夹
  // 检查当前目录下所有文件夹
  const dir = req.body.path || './b';
  const list = glob.sync([dir + "/*", "!**.torrent"], {
    objectMode: true,
    onlyFiles: false,
    stats: true,
  });

  // 遍历所有文件夹
  const folders = list.filter(item => item.dirent.isDirectory());
  
  // 检查每个文件夹是否为空并删除空文件夹
  folders.forEach(folder => {
    const folderContents = glob.sync(folder.path + "/*", {
      objectMode: true,
      onlyFiles: false,
    });
    
    if (folderContents.length === 0 || (folderContents.length === 1 && folderContents[0].name.endsWith('.torrent'))) {
      // 文件夹为空，删除它
      console.log(`删除文件夹: ${folder.path}`);
      rimraf.rimraf(folder.path)
        .catch(err => {
          console.log(`删除文件夹失败: ${folder.path}`, err);
        });
    }
    // 检查是否只有一个子文件夹
    const subFolders = folderContents.filter(item => path.parse(item.path).ext !== '.torrent');

    if (subFolders.length === 1) {
      const subFolder = subFolders[0];
      // 确保是文件夹
      if (subFolder.dirent && subFolder.dirent.isDirectory()) {
        console.log(`移动子文件夹内容: ${subFolder.path} -> ${path.dirname(folder.path)}`);
        // 获取子文件夹中的所有内容
        const subContents = glob.sync(subFolder.path + "/**/*", {
          objectMode: true,
        });
        
        // 移动每个文件到父级目录
        subContents.forEach(content => {
          const relativePath = path.relative(subFolder.path, content.path);
          const newPath = path.join(path.dirname(folder.path), relativePath);
          try {
            // 确保目标目录存在
            const targetDir = path.dirname(newPath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            fs.renameSync(content.path, newPath);
          } catch (err) {
            console.log(`移动文件失败: ${content.path}`, err);
          }
        });

        // 删除原文件夹
        rimraf.rimraf(folder.path)
          .catch(err => {
            console.log(`删除文件夹失败: ${folder.path}`, err);
          });
      }
    }
  });
  res.json({ message: '清理完成' });
})

export const start = () => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });  
}

start();

// require('child_process').spawn('')