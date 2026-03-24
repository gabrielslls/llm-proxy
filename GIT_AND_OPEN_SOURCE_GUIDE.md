# 🚀 个人开源项目发布与 Git 实战指南

如果你想让你的项目在 GitHub 上显得专业且易于维护，请参考以下这份实战 checklist。

---

## 1. 基础配置：Git 身份认证 (Identity)
在执行 `git commit` 时，Git 需要知道你的身份信息。这是**一次性配置**。

```bash
# 配置全局用户名和邮箱
git config --global user.name "gabrielslls"
git config --global user.email "你的邮箱地址"

# 验证配置是否生效
git config --list
```

## 2. 身份锁匠：SSH 密钥链 (Authentication)
使用 SSH 方式推送代码（`git@github.com...`），可以避免每次都输入账号密码或 Token。

- **生成密钥**：`ssh-keygen -t ed25519 -C "your_email@example.com"`
- **公钥位置**：`~/.ssh/id_ed25519.pub`（将其内容复制到 GitHub Settings -> SSH Keys 中）。
- **信任 Host**：第一次推送时，遇到 `Are you sure you want to continue connecting (yes/no/[fingerprint])?` 请务必输入 **`yes`** 并回车。

## 3. 标准三部曲：本地提交流程 (Workflow)
每次修改代码后，按照以下顺序操作：

```bash
# 1. 将所有变更添加到暂存区
git add .

# 2. 提交快照并附上清晰的消息 (遵循 Conventional Commits)
# 常用前缀: feat (新功能), fix (修Bug), docs (改文档), style (格式修改)
git commit -m "feat: initial release of llm-proxy with bilingual docs"

# 3. 推送到远程 GitHub 仓库
git push -u origin main
```

## 4. 远程操作：关联与切换 (Remotes)
如果你之前使用了 HTTPS 方式关联，但现在想用 SSH 方式：

```bash
# 查看当前远程地址
git remote -v

# 移除原有 origin（如果需要重设）
git remote remove origin

# 添加 SSH 方式的远程地址
git remote add origin git@github.com:gabrielslls/llm-proxy.git

# 或者直接修改现有 origin 的 URL
git remote set-url origin git@github.com:gabrielslls/llm-proxy.git
```

## 5. 开源项目标准三件套 (Essentials)
为了让项目看起来更专业且利于社区贡献，必须包含以下文件：

- **LICENSE**: 法律声明。对于该项目选择 **MIT**（极简授权）。
- **.gitignore**: 排除垃圾文件和敏感信息（如 `node_modules/`, `logs/`, `.env`）。
- **README_zh.md**: 独立的中文文档，方便国内用户快速上手。

## 6. ⚠️ 进阶注意事项 (Best Practices)

- **敏感信息防范**：绝对不要提交真实的 **API Token** 或私钥。养成使用环境变量的习惯（例如在代码中使用 `process.env.API_KEY`）。
- **规范提交信息**：使用清晰的消息对后续代码回溯非常有帮助。
- **版本发布管理 (Git Tag)**：
    ```bash
    git tag -a v1.0.0 -m "第一个稳定版本"
    git push origin --tags
    ```
- **先拉后推 (Pull before Push)**：如果你在异地电脑开发，记得先同步远程代码（`git pull`），防止在 push 时发生代码冲突（Conflicts）。
- **多端协作**：如果不小心在本地删除了代码但没 commit，可以使用 `git checkout -- <文件名>` 来还原单文件，或者 `git reset --hard` 回滚到上一个 commit。

---

*这份指南由你的 AI 助手协助生成，祝你的开源之路越走越宽！*
