# 卓球選手用具データベース

世界・日本のトップ卓球選手が使用するラケット・ラバーを検索できるデータベースサイト。

## 技術スタック

| カテゴリ | 使用技術 |
|--------|---------|
| フレームワーク | Next.js 16 (App Router) |
| データベース | Supabase (PostgreSQL) |
| スタイリング | Tailwind CSS v4 |
| デプロイ | Vercel |
| データ収集 | GitHub Actions（週次スクレイピング） |

## ローカル開発

### 1. リポジトリをクローン

```bash
git clone <repo-url>
cd tabletennis-db
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて Supabase の値を入力してください（後述）。

### 4. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

## 環境変数

`.env.local.example` を参考に `.env.local` を作成してください。

| 変数名 | 説明 | 公開区分 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL | 公開可 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | 公開可 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー | **秘密** |
| `NEXT_PUBLIC_SITE_URL` | デプロイ先 URL（サーバー側 API 呼び出し用） | 公開可 |

> **重要**: `SUPABASE_SERVICE_ROLE_KEY` は管理者権限のある秘密キーです。絶対にコードにハードコードしないでください。

## Supabase セットアップ

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成
2. SQL Editor を開き `supabase/migrations/001_initial_schema.sql` を実行
3. Project Settings > API から以下を取得：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## デプロイ（Vercel）

1. このリポジトリを GitHub に push
2. [vercel.com](https://vercel.com) で「Add New Project」→ リポジトリをインポート
3. **Environment Variables** に以下を設定：

   | 変数名 | 値 |
   |--------|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service_role key |
   | `NEXT_PUBLIC_SITE_URL` | デプロイ後に発行される URL（例: `https://your-app.vercel.app`）|

4. 「Deploy」ボタンを押す
5. 初回デプロイ完了後、発行された URL を `NEXT_PUBLIC_SITE_URL` に設定して再デプロイ

## GitHub Actions（週次スクレイピング）

毎週日曜 03:00 JST に自動でデータを収集します。  
GitHub リポジトリの **Settings > Secrets and variables > Actions** で以下を登録してください：

| シークレット名 | 設定する値 |
|--------------|-----------|
| `SUPABASE_URL` | Supabase の Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service_role key |

## 主なコマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド確認
npm run lint         # Lint チェック
npm run scrape       # 手動でスクレイピング実行
npm run check-db     # DB 整合性チェック
```
