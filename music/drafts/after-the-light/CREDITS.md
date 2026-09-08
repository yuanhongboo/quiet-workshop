# 光落在窗台 · 署名与来源

曲谱为本次创作的原创钢琴小品。参考方向是安静、抒情、略带怀念的电影钢琴氛围；未引用指定电影曲目的旋律或录音。该试听稿已获用户确认；0.4.2将同一MP3原样接入为默认背景音乐。初始试听记录保留在delivery.json，集成记录见INTEGRATION.md。

钢琴音色来自 **Salamander Grand Piano V3**，作者 **Alexander Holm**，钢琴为 Yamaha C5，采样许可为 **Creative Commons Attribution 3.0 Unported**。本次选取实际需要的音高和力度层，并进行重采样、移调、踏板包络、力度混合、空间声与母带处理。原作者不因此被视为认可本作品。

- [采样库项目](https://github.com/sfzinstruments/SalamanderGrandPiano)
- [音色介绍与署名](https://sfzinstruments.github.io/pianos/salamander/)
- [CC BY 3.0 许可](https://creativecommons.org/licenses/by/3.0/)
- 固定来源版本与逐文件散列：`sample-provenance.json`
- 完整采样许可：`SAMPLES-LICENSE.txt`

谱面与演奏参数分别记录在 `score.mjs` / `score.json` 和 `render.py`；MIDI保留了旋律、踏板与速度变化，方便继续编配。

## 重新渲染

需要 Node.js、Python + NumPy、ffmpeg；首次下载采样还需 GitHub CLI 和 curl。运行目录为本文件所在目录：

```sh
node --input-type=module -e "import score from './score.mjs'; import {writeFileSync} from 'node:fs'; writeFileSync('score.json', JSON.stringify(score,null,2));"
python3 fetch-samples.py
python3 render.py
ffmpeg -hide_banner -nostats -i performance-raw.wav -af loudnorm=I=-20:TP=-2:LRA=12:print_format=json -f null - 2> loudness-analysis.txt
python3 master.py
```

采样缓存在项目 `music/.cache/`；不会进入游戏构建或被发布脚本自动上传。完整试听录音和当前游戏内轻量程序合成音乐是两种不同交付，后续接入需另行处理音频资源打包。
