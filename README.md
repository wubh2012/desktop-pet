# Desktop Pet

基于 Electron、Vite、TypeScript、Live2D 和 Three.js 的桌面电子宠物。

当前默认桌宠是 Live2D 官方 Sample Data 白猫 Tororo，并内置黑猫 Hijiki 可切换。Three.js 版本仍保留为备用渲染器，用于继续加载本地 `public/assets/pet.glb`。

## 功能

- 透明、无边框、置顶桌宠窗口。
- Live2D 白猫 Tororo / 黑猫 Hijiki：眨眼、呼吸、互动动作、默认看着鼠标。
- 托盘菜单提供完整控制：渲染器状态、显示/隐藏、切换模型、状态、互动、高级设置和退出。
- 宠物本体右键菜单只保留快速互动：摸摸它、逗它一下、轻轻碰它、卖个萌、打个招呼、精神一下、小小惊讶。
- 可爱提醒气泡：默认提供休息、起身活动和午饭提醒，并触发对应的短动作。
- 独立透明气泡窗口会跟随桌宠位置，贴近可见宠物区域并保持在屏幕工作区内。
- 调试窗口模式：显示普通窗口边框，允许用户调整窗口大小。
- 调试窗口调整后的 `x/y/width/height` 会保存，并同步到退出调试模式后的透明桌宠窗口。
- 窗口四边有隐形拖动区，小窗口下也更容易拖动。
- 本地 HTTP API，可由外部程序用语义化命令控制桌宠、触发动作或显示消息气泡。
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

## 构建与打包

```bash
npm run build
```

构建产物输出到 `out/`。`out/` 只是 Electron/Vite 的生产构建结果，不适合直接发给别人安装。

生成免安装目录包：

```bash
npm run dist:dir
```

生成 Windows x64 NSIS 安装包：

```bash
npm run dist:win
```

Windows 打包配置已在 `package.json` 中内置：

- `config.electron_builder_binaries_mirror` 指向 `https://npmmirror.com/mirrors/electron-builder-binaries/`，用于降低 electron-builder 辅助二进制从 GitHub 下载失败的概率。
- `build.win.signAndEditExecutable` 为 `false`，避免普通 Windows 终端解压旧版 `winCodeSign` 时因符号链接权限导致打包失败。

该配置优先保证本机可重复打包。若要做对外正式发布，并且需要完整的 Windows 可执行文件元信息、签名或更严格的安装包品牌信息，应重新启用并补齐对应的签名/资源编辑流程。

生成或更新 Windows 应用图标：

```powershell
npm run icon:ico
```

该命令默认读取 `scripts/app.png`，生成多尺寸 ICO 和托盘 PNG：

```text
build/icon.ico
build/tray-16.png
build/tray-32.png
```

如需指定其他源图片或输出目录：

```powershell
npm run icon:ico -- "G:\OneDrive\Pictures\pet.jpg" "build"
```

源图片可以是 Sharp 支持读取的常见格式，例如 PNG、JPG、WebP；推荐使用正方形、透明背景、至少 `512x512` 的图片。开发模式和打包后的运行时托盘图标会优先使用 `tray-32.png`，缺失时回退到内置图标。

安装包与打包产物输出到 `release/`，其中：

```text
release/win-unpacked/                 免安装运行目录
release/Desktop Pet Setup 0.1.0.exe   Windows 安装包
build/icon.ico                        Windows 应用与安装包图标
build/tray-16.png                     Windows 托盘 16px 图标
build/tray-32.png                     Windows 托盘 32px 图标
```

如果 Electron 二进制资源从 GitHub 下载失败，可以在当前 PowerShell 会话中设置镜像后再安装或打包：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm run dist:win
```

## 测试与类型检查

```bash
npm test
npm run typecheck
```

## 使用方式

- 启动后默认显示 Live2D 白猫桌宠。
- 运行一段时间后会根据提醒设置显示气泡：休息提醒、起身活动提醒、午饭提醒。
- 右键点击宠物本体可以打开快速互动菜单。
- 右键系统托盘图标可以打开完整菜单：
  - 当前渲染器加载状态
  - `显示宠物 / 隐藏宠物`
  - `白猫 Tororo / 黑猫 Hijiki`
  - `安静陪伴 / 活泼一点`
  - 摸摸它、逗它一下、轻轻碰它、卖个萌、打个招呼、精神一下、小小惊讶
  - `高级`：调试窗口模式、模型朝向调试
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
```

看着鼠标默认开启；如需通过外部命令重新开启：

```json
{ "type": "lookAtMouse", "enabled": true }
```

如需通过外部命令临时关闭：

```json
{ "type": "lookAtMouse", "enabled": false }
```

显示一条消息气泡：

```json
{ "type": "message", "text": "该休息一下啦", "durationSeconds": 8 }
```

显示消息气泡并同时触发一次互动：

```json
{ "type": "message", "text": "打个招呼吧", "action": "greet", "durationSeconds": 6 }
```

`message.text` 会去除首尾空白且不能为空；`durationSeconds` 可省略，提供时必须是正数秒。

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

窗口位置、尺寸、模型选择、模型朝向和提醒设置保存到 Electron 的 `userData` 目录。

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
  "modelYawRadians": 0,
  "petModelId": "tororo",
  "reminders": {
    "enabled": true,
    "restIntervalMinutes": 45,
    "standIntervalMinutes": 60,
    "minimumGapMinutes": 10,
    "bubbleDurationSeconds": 8,
    "lunchReminder": {
      "enabled": true,
      "start": "11:50",
      "end": "12:30"
    }
  }
}
```

删除这个文件后，窗口、模型选择、朝向和提醒设置会回到默认值。

## 资源

默认 Live2D 桌宠模板：

```text
public/live2d/core/live2dcubismcore.min.js
public/live2d/tororo/tororo.model3.json
public/live2d/tororo/tororo.moc3
public/live2d/tororo/tororo.2048/texture_00.png
public/live2d/tororo/motion/*.motion3.json
public/live2d/hijiki/hijiki.model3.json
public/live2d/hijiki/hijiki.moc3
public/live2d/hijiki/hijiki.2048/texture_00.png
public/live2d/hijiki/motion/*.motion3.json
```

Live2D 资源说明：

- Tororo 白猫与 Hijiki 黑猫来自 Live2D Cubism 官方 Sample Data。
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
  bubbleWindowBounds.ts 独立气泡窗口跟随桌宠的定位计算
  trayMenu.ts           托盘完整控制菜单模板
  trayIcon.ts           开发与打包环境的托盘图标路径解析
  petActionMenu.ts      宠物本体快速互动菜单模板
  petCommandServer.ts   本地 HTTP 命令服务
  rendererStatus.ts     托盘菜单里的渲染器状态文案归一化
  windowMode.ts         普通模式 / 调试模式窗口配置
  windowSettings.ts     窗口 bounds 读写与归一化

src/preload/
  index.ts              最小 preload bridge

src/shared/
  petActionMode.ts       语义化状态和一次性动作定义
  petCommand.ts          HTTP / IPC 外部命令校验
  petModel.ts            内置 Live2D 模型标识
  petReminderSettings.ts 提醒气泡配置与默认值

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
    reminders.ts              休息 / 起身 / 午饭提醒调度
    dragHandles.ts            透明窗口拖动区
    assetUrl.ts               renderer 静态资源路径
    modelCapabilities.ts      GLB 能力检测
    modelLayout.ts            GLB 模型缩放和居中计算
```

## 当前限制

- Tororo 的新增互动基于已有 motion 和程序组合，不是新制作的 Live2D 动作文件。
- 看着鼠标使用 Live2D focus 参数，不是 motion 文件。
- 提醒气泡目前使用本地计时和本地配置，不接入系统日历、勿扰模式或账号同步。
- Three.js 版本只做备用展示，互动效果会降级为整体模型变换。
- 当前 Windows 打包默认跳过可执行文件资源编辑和签名；正式发布前需要补齐发布级签名流程。
- Windows 是主要验收平台；macOS/Linux 后续需要单独适配透明窗口和置顶行为。

## 后续方向

- 接入更多 Live2D 模型，并完善模型管理与资源校验。
- 使用 Live2D Cubism Editor 制作新的 `.motion3.json` 自定义动作。
- 增加语音、对话、系统事件触发、可视化提醒设置和更丰富的外部 API。
- 完善安装包签名、Windows 可执行文件元信息和发布流程。
