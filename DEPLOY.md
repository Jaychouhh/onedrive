# OneDrive 直链解析 - Cloudflare Pages 部署指南

## 项目结构

```
onedrive/
├── index.html                  # 前端页面（纯静态）
├── functions/
│   ├── api/
│   │   └── shorten.js          # POST /api/shorten  创建短链
│   └── s/
│       └── [code].js           # GET /s/:code       短链跳转
└── DEPLOY.md                   # 本文件
```

## 路由说明

| 路径 | 功能 |
|------|------|
| `/` | OneDrive 直链解析网页 |
| `/api/shorten` | 创建短链（POST） |
| `/s/xxxxxx` | 短链跳转（GET，302 到真实地址） |

---

## 部署方式

Cloudflare Pages **上传资产（拖放）功能不支持 Functions**，必须使用以下两种方式之一：

### 方式一：Git 集成（推荐，最简单）

1. **创建 GitHub 仓库**，把项目代码 push 上去
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages**
3. **创建项目** → 连接 **GitHub**
4. 选择你的仓库，分支选 `main` 或 `master`
5. **构建设置**：
   - 框架预设：选 `None`
   - 构建命令：留空（不需要构建）
   - 构建输出目录：留空（根目录）
6. 点击**保存并部署**

### 方式二：Wrangler CLI（适合喜欢命令行的用户）

```bash
# 安装 Wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 进入项目目录
cd onedrive

# 部署（每次更新后运行）
wrangler pages deploy . --project-name=你的项目名称
```

---

## 关键步骤：绑定 KV Namespace

**短链功能依赖 Cloudflare KV 存储，必须手动绑定。**

1. 在 Cloudflare Dashboard → **Workers & Pages** → **KV**
2. **创建命名空间**，名称随意（例如 `onedrive-shortlinks`）
3. 进入你的 **Pages 项目** → **Settings** → **Functions**
4. 找到 **KV namespace bindings**
5. 点击 **Add binding**：
   - **Variable name**：`SHORT_URLS`（⚠️ 必须完全一致，代码里用的就是这个名）
   - **KV namespace**：选择你刚才创建的
6. 点击 **Save**
7. **重新部署一次项目**（如果不自动部署，在 Pages 项目里点 **Retry deployment**）

---

## 绑定自定义域名

1. Pages 项目 → **Custom domains**
2. **Set up a custom domain**
3. 输入你的二级域名，例如 `od.example.com`
4. Cloudflare 会自动配置 DNS 和 SSL 证书

---

## 使用流程

1. 打开网页 `https://你的域名/`
2. 粘贴 OneDrive / SharePoint 分享链接
3. 点击**解析直链**
4. 解析成功后，点击 **⚡ 生成短链**
5. 得到类似 `https://你的域名/s/a3Kp9z` 的短链接
6. 把短链发给其他人，点击后自动跳转到真实下载地址

---

## 注意事项

- **免费额度**：Cloudflare KV 每天 10 万次读取、1 千次写入，完全够用
- **短链有效期**：30 天，过期后自动清理
- **HTTPS 必需**：剪贴板读取、短链 API 都需要 HTTPS
- **CORS**：API 已配置允许跨域，同域名下无问题
- **文件大小**：本工具不托管文件，只做 URL 转换，不受大小限制
