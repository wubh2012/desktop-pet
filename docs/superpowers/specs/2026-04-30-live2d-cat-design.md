# Live2D 白猫桌宠设计

## 目标

在 `feature/live2d-cat` 分支中保留现有 Three.js 桌宠，同时新增 Tororo 白猫 Live2D 渲染方案。第一版不做摄像头、麦克风或完整 VTuber 输入链路，只支持菜单和本地 HTTP API 触发动作。

## 资源

开发素材使用 Live2D 官方 Sample Data 的 Tororo & Hijiki，其中第一版默认使用 Tororo 白猫。模型本地运行路径为 `public/live2d/tororo/tororo.model3.json`。官方样例资源先不提交到 git，后续如需随应用分发，必须补充授权说明并确认符合 Live2D Free Material License Agreement 与 Sample Data Terms。

## 架构

主进程继续负责窗口、托盘、IPC 和本地服务。renderer 增加可切换渲染模式，默认 Live2D，保留 Three.js 代码作为后备。动作控制通过共享命令类型进入主进程，再由主进程转发到 renderer。

## 外部通讯

第一版提供仅监听 `127.0.0.1` 的 HTTP API：

```http
POST /pet/command
Content-Type: application/json
```

支持命令：

```json
{ "type": "mode", "mode": "idle" }
{ "type": "mode", "mode": "walk" }
{ "type": "motion", "name": "01" }
{ "type": "lookAtMouse", "enabled": true }
```

非法 JSON、未知命令、字段缺失返回 400。端口默认固定为 `17321`，如果端口占用则 API 服务启动失败但桌宠窗口仍继续运行，并在主进程日志中输出错误。

## 第一版边界

不实现 WebSocket，不实现摄像头跟踪，不实现麦克风口型同步，不把 Live2D 官方样例素材提交进仓库。
