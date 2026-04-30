# Live2D 白猫与 HTTP API

## 运行素材

当前 `feature/live2d-cat` 分支默认显示 Live2D 官方 Sample Data 里的 Tororo 白猫，同时保留 Three.js 代码路径。需要临时回退 Three.js 时，可让 renderer URL 带上 `?renderer=three`。

Live2D 本地运行素材位置：

```text
public/live2d/core/live2dcubismcore.min.js
public/live2d/tororo/tororo.model3.json
```

这些 Live2D 官方样例素材当前只作为本地开发资源使用，并通过本地 git exclude 忽略。正式打包分发前，需要确认 Live2D Free Material License Agreement 和 Sample Data Terms。

## HTTP API

启动后会监听本机地址：

```text
http://127.0.0.1:17321
```

触发 Tororo 动作：

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:17321/pet/command -ContentType 'application/json' -Body '{"type":"motion","name":"01"}'
```

切换模式：

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:17321/pet/command -ContentType 'application/json' -Body '{"type":"mode","mode":"idle"}'
```

开启看向鼠标：

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:17321/pet/command -ContentType 'application/json' -Body '{"type":"lookAtMouse","enabled":true}'
```
