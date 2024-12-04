const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// 用于递归扫描指定目录下的所有.mp4文件，返回文件路径数组
function scanMp4Files(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    items.forEach(item => {
        const filePath = path.join(dir, item);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            files.push(...scanMp4Files(filePath));
        } else if (path.extname(filePath) === '.mp4') {
            files.push(filePath);
        }
    });
    return files;
}

app.use(express.static(path.join(__dirname)));


// 根路由，返回展示文件列表的HTML页面
app.get('/list', (req, res) => {
    const mp4Files = scanMp4Files('.'); // 当前目录
    res.json(mp4Files);
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});