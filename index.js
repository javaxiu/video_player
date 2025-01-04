import express from 'express';
import cors from 'cors';
import glob from 'fast-glob';
import path from 'path';
import dayjs from 'dayjs';

const app = express();
const port = 3000;
app.use(cors());

// app.use(express.static(path.join(__dirname)));

const videoSuffix = ['.mp4', '.avi', '.mpg'];
const imgSuffix = ['.jpg', '.gif', '.jpeg', '.png'];

// const __dirname = process.cwd();

// 根路由，返回展示文件列表的HTML页面
app.get('/list', (req, res) => {
    const sub = req.query.sub || './b';
    let list = glob.sync([sub + '/*', '!**.torrent'], { objectMode: true, onlyFiles: false, stats: true });
    list = list
        .map(item => {
            const suffix = path.extname(item.path);
            return {
                name: item.name,
                path: item.path,
                stats: item.stats,
                suffix,
                stats: item.stats,
                time: item.stats.mtime,
                timeStr: dayjs(item.stats.mtime).format('MM-DD HH:mm'),
                type: !suffix ? 'folder' : (videoSuffix.includes(suffix.toLowerCase()) ? 'video' : (
                    imgSuffix.includes(suffix.toLowerCase()) ? 'img' : 'unknown'
                )),
            };
        })
        .sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') {
                return -1;
            }
            if (a.type!== 'folder' && b.type === 'folder') {
                return 1;
            }
            return b.time - a.time;
        });
    console.log(list.length, sub);
    res.json(list);
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});