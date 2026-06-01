# PaPut MCP サーバー

[PaPut](https://paput.io) と連携する Model Context Protocol (MCP) サーバーです。
Claude、Codex、Cursor などの AI アシスタントから PaPut のメモ、ノート、アイデア、スキルシートを操作できます。

## 機能

### PaPut データ管理

- メモの作成、検索、取得、更新
- ノートの作成、検索、取得、更新
- アイデアの作成、一覧表示、更新、削除
- スキルシートの取得、基本情報更新、自己PR更新
- スキルシートのスキル/プロジェクト管理

### AI セッションの知見保存

- Claude/Codex のセッションログを検出
- AI が抽出した知見候補を pending に一時保存
- 既存 PaPut メモをローカルキャッシュへ同期
- fingerprint による重複登録の抑制
- pending 候補を確認してから PaPut に本保存
- 過去セッション由来の知見は、セッション更新日時を PaPut メモの作成日時として保存
- セッションのプロジェクト設定から `PAPUT_PROJECT_MATCH` を読み取り、pending 候補に PaPut プロジェクトを紐付け
- Claude/Codex 向け Skill とグローバルルールのセットアップ

## インストール

npx で直接実行できます。

```bash
npx -y paput-mcp
```

グローバルにインストールする場合:

```bash
npm install -g paput-mcp
```

## MCP 設定

API キーは PaPut の設定画面から取得できます。

```json
"paput": {
  "command": "npx",
  "args": ["-y", "paput-mcp"],
  "env": {
    "PAPUT_API_KEY": "あなたのAPIキー",
    "PAPUT_PROJECT_MATCH": "プロジェクト名の一部（オプション）"
  }
}
```

### 環境変数

- `PAPUT_API_KEY` - 必須。PaPut API キー
- `PAPUT_API_URL` - 任意。API URL。未指定時は `https://api.paput.io`
- `PAPUT_PROJECT_MATCH` - 任意。メモ作成/更新時に紐付けるプロジェクト名の一部
- `PAPUT_HOME` - 任意。PaPut ローカルデータの保存先。未指定時は `~/.paput`
- `PAPUT_CACHE_DIR` - 任意。知見保存用ローカルキャッシュだけ別の場所に置く場合に指定

`PAPUT_PROJECT_MATCH` を設定すると、メモ作成・更新時に、指定文字列を含むスキルシートプロジェクトが自動で紐付けられます。複数マッチした場合は最初のプロジェクトが使われます。

## AI 連携の初期設定

Claude/Codex で PaPut Skill とグローバルルールを使う場合は、次を実行します。

```bash
npx -y paput-mcp setup-ai
```

このコマンドは、実行時に変更内容を表示したうえで以下を行います。

- `~/.paput/skills` に PaPut Skill の正本を作成
- Claude が存在する場合、`~/.claude/skills` に symlink を作成
- Codex が存在する場合、`~/.agents/skills` に symlink を作成
- Claude/Codex のグローバルルールに PaPut 利用ルールを追記

オプション:

```bash
# グローバルルールを変更しない
npx -y paput-mcp setup-ai --no-rules

# PaPut 管理のリンクやルールを更新
npx -y paput-mcp setup-ai --force

# Claude または Codex だけ設定
npx -y paput-mcp setup-ai --claude-only
npx -y paput-mcp setup-ai --codex-only
```

生成される Skill:

- `paput-init` - 初回設定、既存メモ同期、未処理セッション確認
- `paput-sync` - 既存 PaPut メモをローカルキャッシュへ同期
- `paput-capture` - 現在の会話や指定テーマから知見候補を pending に保存
- `paput-save` - pending 候補を確認し、承認したものだけ PaPut に保存

## 知見保存ワークフロー

PaPut への保存は、意図しないメモ登録を避けるために 2 段階で行います。

```text
知見候補を抽出
  ↓
pending に保存
  ↓
確認後に PaPut へ本保存
```

通常は、`setup-ai` が追記するグローバルルールにより、AI が作業完了時や問題解決時に PaPut へ残す候補を自動で確認し、重複・機密・プロジェクト固有情報の混入がない候補を pending に追加します。追加後はタイトル、カテゴリ、候補 ID を簡潔に報告します。

重複の可能性、機密情報の混入、汎用性の低さ、判断に迷う内容がある場合だけ、pending 追加前に確認を求めます。

AI が候補提示を行わなかった場合は、`paput-capture` を使います。

```text
PaPut に残す知見候補を作って
```

pending 候補を PaPut に本保存する場合は、`paput-save` を使います。

```text
PaPut の保存候補を確認して
```

Claude では `/paput-save` のように Skill を呼び出せます。Codex では `$paput-save` または自然言語で利用します。

## 利用可能なツール

### メモ管理

- `paput_create_memo` - メモを作成
- `paput_search_memo` - メモを検索
- `paput_get_memo` - メモの詳細を取得
- `paput_update_memo` - メモを更新
- `paput_get_categories` - カテゴリー一覧を取得

### ノート管理

- `paput_create_note` - ノートを作成
- `paput_search_notes` - ノートを検索
- `paput_get_note` - ノートの詳細を取得
- `paput_update_note` - ノートを更新

### スキルシート管理

- `paput_get_skill_sheet` - スキルシートを取得
- `paput_update_skill_sheet_basic_info` - スキルシート基本情報を更新
- `paput_update_skill_sheet_self_pr` - スキルシート自己PRを更新
- `paput_set_skill_sheet_skills` - スキルシートのスキル一覧を指定した最終状態に置き換え
- `paput_upsert_skill_sheet_project` - スキルシートプロジェクトを追加または更新
- `paput_delete_skill_sheet_project` - スキルシートからプロジェクトを削除

### 知見保存・ローカルキャッシュ

- `paput_cache_status` - ローカルキャッシュ状態を取得
- `paput_sync_remote_memos` - 既存 PaPut メモをローカルキャッシュへ同期
- `paput_scan_sessions` - Claude/Codex のローカルセッションログを検出
- `paput_get_session_transcript` - セッション本文を取得
- `paput_add_knowledge_candidates` - AI が抽出した知見候補を pending に保存
- `paput_list_pending_candidates` - 未保存の知見候補を一覧表示
- `paput_save_pending_candidate` - pending 候補を PaPut メモとして保存
- `paput_discard_pending_candidate` - pending 候補を破棄

## ローカルデータ

PaPut MCP が作成するローカルデータは、デフォルトで `~/.paput` に保存されます。

```text
~/.paput/
  skills/  # Claude/Codex にリンクする Skill の正本
  cache/   # メモ同期、pending 候補、処理済みセッション情報
```
