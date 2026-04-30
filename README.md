# Desktop Pet

基于 Electron、Vite、TypeScript、Live2D 和 Three.js 的桌面电子宠物。

当前默认桌宠是 Live2D 官方 Sample Data 白猫 Tororo。Three.js 版本仍保留为备用渲染器，用于继续加载本地 `public/assets/pet.glb`。

## 功能

- 透明、无边框、置顶桌宠窗口。
- Live2D 白猫 Tororo：眨眼、呼吸、互动动作、看着鼠标。
- 托盘菜单和宠物右键菜单。
- `小猫互动` 菜单：
  - `状态`：安静陪伴、活泼一点
  - `互动`：逗它一下、摸摸它、轻轻碰它、小小惊讶、卖个萌
  - `小剧场`：打个招呼、精神一下、求关注
  - 看着鼠标
- 调试窗口模式：显示普通窗口边框，允许用户调整窗口大小。
- 调试窗口调整后的 `x/y/width/height` 会保存，并同步到退出调试模式后的透明桌宠窗口。
- 窗口四边有隐形拖动区，小窗口下也更容易拖动。
- 本地 HTTP API，可由外部程序用语义化命令控制桌宠。
- Three.js GLB 渲染器保留，可通过 `?renderer=three` 使用。

## 技术栈

- Electron
- Vite / electron-vite
- TypeScript
- PixiJS
- pixi-live2d-display
- Live2D Cubism Core
- Three.js
- Vitest

## 安装

```bash
npm install
```

如果 Electron 二进制下载失败，可以临时使用镜像：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

## 开发运行

```bash
npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `out/`。当前项目还没有接入安装包打包工具。

## 测试与类型检查

```bash
npm test
npm run typecheck
```

## 使用方式

- 启动后默认显示 Live2D 白猫桌宠。
- 右键点击宠物本体可以打开 `小猫互动` 菜单。
- 右键系统托盘图标可以打开完整菜单：
  - `显示宠物 / 隐藏宠物`
  - `调试窗口模式`
  - `小猫互动`
  - `退出`
- 拖动窗口时优先拖窗口四边缘，避免和点击宠物互动冲突。
- 打开 `调试窗口模式` 后，可以像普通窗口一样调整大小。
- 退出调试模式后，透明桌宠窗口会沿用刚才调试窗口的大小和位置。

## HTTP API

应用启动后会尝试监听：

```text
http://127.0.0.1:17321
```

控制端点：

```text
POST /pet/command
Content-Type: application/json
```

切换状态：

```json
{ "type": "mode", "mode": "idle" }
```

```json
{ "type": "mode", "mode": "active" }
```

触发一次互动：

```json
{ "type": "action", "action": "tease" }
```

可用 `action`：

```text
tease      逗它一下
pet        摸摸它
poke       轻轻碰它
surprise   小小惊讶
cute       卖个萌
greet      打个招呼
cheer      精神一下
attention  求关注
```

看着鼠标：

```json
{ "type": "lookAtMouse", "enabled": true }
```

关闭看着鼠标：

```json
{ "type": "lookAtMouse", "enabled": false }
```

示例：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://127.0.0.1:17321/pet/command `
  -ContentType 'application/json' `
  -Body '{"type":"action","action":"greet"}'
```

对外 API 使用语义化命令，不暴露 Live2D 原始 motion 编号。

## 配置文件

窗口位置和尺寸保存到 Electron 的 `userData` 目录。

开发版直接用 Electron 运行时，Windows 上通常是：

```text
%APPDATA%\Electron\desktop-pet-settings.json
```

当前保存结构示例：

```json
{
  "debugWindowBounds": {
    "x": 838,
    "y": 450,
    "width": 223,
    "height": 183
  },
  "modelYawRadians": 0
}
```

删除这个文件后，窗口会回到默认尺寸。

## 资源

默认 Live2D 桌宠模板：

```text
public/live2d/core/live2dcubismcore.min.js
public/live2d/tororo/tororo.model3.json
public/live2d/tororo/tororo.moc3
public/live2d/tororo/tororo.2048/texture_00.png
public/live2d/tororo/motion/*.motion3.json
```

Live2D 资源说明：

- Tororo 白猫来自 Live2D Cubism 官方 Sample Data。
- This content uses sample data owned and copyrighted by Live2D Inc. The sample data are utilized in accordance with terms and conditions set by Live2D Inc. This content itself is created at the author’s sole discretion.
- 使用、发布或再分发前请阅读 Live2D 的相关条款：
  - https://www.live2d.com/en/learn/sample/model-terms/
  - https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html
  - https://www.live2d.com/en/sdk/download/web/

Three.js 备用 GLB：

```text
public/assets/pet.glb
```

根目录的 `pet.glb` 被 `.gitignore` 忽略，避免和运行资源重复提交。

如果新的 GLB 出现“有贴图图片但显示成白模”的情况，可以尝试修复材质元数据：

```bash
node scripts/fix-glb-materials.mjs public/assets/pet.glb public/assets/pet.glb
```

这个脚本只修 GLB 的 JSON 材质绑定，不修改几何、贴图二进制内容、动画或骨骼。

## 代码结构

```text
src/main/
  index.ts              Electron 主进程、窗口、托盘和 HTTP API
  petActionMenu.ts      小猫互动菜单模板
  petCommandServer.ts   本地 HTTP 命令服务
  windowMode.ts         普通模式 / 调试模式窗口配置
  windowSettings.ts     窗口 bounds 读写与归一化

src/preload/
  index.ts              最小 preload bridge

src/renderer/
  index.html            Renderer HTML 入口
  src/main.ts           渲染器入口，选择 Live2D 或 Three.js
  src/styles.css        透明窗口、画布和拖动区样式
  src/live2d/
    Live2DPetRenderer.ts      Live2D 白猫渲染和互动执行
    live2dActionSequence.ts   语义化动作组合
    live2dLayout.ts           Live2D 缩放和布局
    live2dMotionMap.ts        Tororo motion 映射
    live2dViewport.ts         Live2D 画布尺寸
  src/pet/
    PetController.ts          Three.js 备用程序化状态机
    dragHandles.ts            透明窗口拖动区
    assetUrl.ts               renderer 静态资源路径
    modelCapabilities.ts      GLB 能力检测
    modelLayout.ts            GLB 模型缩放和居中计算
```

## 当前限制

- Tororo 的新增互动基于已有 motion 和程序组合，不是新制作的 Live2D 动作文件。
- 看着鼠标使用 Live2D focus 参数，不是 motion 文件。
- Three.js 版本只做备用展示，互动效果会降级为整体模型变换。
- Windows 是主要验收平台；macOS/Linux 后续需要单独适配透明窗口和置顶行为。

## 后续方向

- 接入更多 Live2D 模型，并做模型切换。
- 使用 Live2D Cubism Editor 制作新的 `.motion3.json` 自定义动作。
- 增加语音、对话、系统事件触发和更丰富的外部 API。
- 接入打包工具生成安装包。
