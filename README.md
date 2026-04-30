# Desktop Pet

基于 Electron、Vite、TypeScript 和 Three.js 的 3D 桌面电子宠物 MVP。

当前版本使用本地 `public/assets/pet.glb` 模型，在透明置顶窗口中渲染一个 3D 宠物。模型目前是静态 GLB，没有骨骼、内置动画或 morph target，所以第一版只做整体待机浮动和点击反馈，不做手臂、腿、表情等局部动作。

## 功能

- 透明、无边框、置顶桌宠窗口。
- Three.js 加载本地 GLB 模型。
- 默认待机动画，不自动左右移动。
- 点击模型时触发短暂弹跳反馈。
- 系统托盘图标与右键菜单。
- 调试窗口模式：显示普通窗口边框，允许用户调整窗口大小。
- 调试窗口调整后的 `x/y/width/height` 会保存，并同步到退出调试模式后的透明桌宠窗口。

## 技术栈

- Electron
- Vite / electron-vite
- TypeScript
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

- 桌宠启动后默认显示透明置顶窗口。
- 点击宠物会触发弹跳反馈。
- 右键点击宠物本体可以直接打开动作菜单；右键透明空白区域不会弹菜单。
- 右键系统托盘图标可以打开菜单：
  - `显示宠物 / 隐藏宠物`
  - `动作`：切换 `待机` 或 `行走`，也可以触发 `跳一下`、`转一圈`，或开启 `看向鼠标`
  - `调试窗口模式`
  - `退出`
- 打开 `调试窗口模式` 后，可以像普通窗口一样调整大小。
- 退出调试模式后，透明桌宠窗口会沿用刚才调试窗口的大小和位置。

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
  }
}
```

删除这个文件后，窗口会回到默认尺寸。

## 资源

主模型文件：

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
  index.ts              Electron 主进程、窗口和托盘
  windowMode.ts         普通模式 / 调试模式窗口配置
  windowSettings.ts     窗口 bounds 读写与归一化

src/preload/
  index.ts              最小 preload bridge

src/renderer/
  index.html            Renderer HTML 入口
  src/main.ts           Three.js 场景、GLB 加载、点击检测
  src/styles.css        透明窗口和画布样式
  src/pet/
    PetController.ts    程序化宠物状态机
    assetUrl.ts         renderer 静态资源路径
    modelCapabilities.ts GLB 能力检测
    modelLayout.ts      模型缩放和居中计算
```

## 当前限制

- 当前 GLB 没有 `animations`、`skins`、`morph targets`，所以不能自然控制手臂、腿、表情或嘴型。
- 第一版不做聊天、语音、养成数值、开机自启、自动更新。
- Windows 是主要验收平台；macOS/Linux 后续需要单独适配窗口行为。

## 后续方向

- 接入带骨骼和动画 clips 的 GLB，使用 Three.js `AnimationMixer` 播放真实动作。
- 如果模型支持 morph target，增加表情控制。
- 增加托盘设置项，例如重置窗口尺寸、切换待机/行走。
- 接入打包工具生成安装包。
