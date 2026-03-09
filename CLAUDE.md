# Insulation Optimizer - 断熱最適化システム

住宅の断熱性能（UA値・ηAC値）を計算し、目標等級に対する最適な断熱仕様を提案するWebアプリケーション。

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **DB:** Turso (libSQL) via Prisma 7 (`@prisma/adapter-libsql`)
- **Auth:** NextAuth v4 (Credentials provider, JWT strategy)
- **Style:** Tailwind CSS v4 + shadcn/ui
- **Deploy:** Vercel

## Getting Started

```bash
npm install
npx prisma generate      # Prisma Client生成
npx prisma db push        # スキーマ反映（ローカルSQLite）
npx tsx prisma/seed.ts    # シードデータ投入
npm run dev
```

ログイン: `admin@demo.com` / `password123`

## Project Structure

```
src/
  app/
    (app)/           # 認証後の画面（dashboard, projects, admin）
    (auth)/          # ログイン画面
    api/
      auth/          # NextAuth
      v1/
        projects/    # プロジェクトCRUD + 外皮/開口部/基礎/計算/最適化/結果/比較
        admin/       # 断熱材/窓/ドア/ユーザー管理
        stats/       # ダッシュボード統計
  lib/
    calc/            # 計算エンジン（constants, ua-calculator, eta-calculator, optimizer）
    auth.ts          # NextAuth設定
    auth-helpers.ts  # requireAuth, requireRole
    api-response.ts  # successResponse, errorResponse, handleApiError
    prisma.ts        # Prisma Client（Turso対応）
    validations/     # Zodスキーマ
  types/             # 型定義・定数
  components/        # shadcn/ui + 共通コンポーネント
prisma/
  schema.prisma      # DBスキーマ
  seed.ts            # シードデータ
```

## Key Conventions

- **API pattern:** `requireAuth()` / `requireRole("admin")` → try-catch → `successResponse` / `errorResponse` / `handleApiError`
- **Params (Next.js 16):** `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params;`
- **Prisma JSON fields:** `InsulationMaterial.applicableParts`, `thicknessOptions`, `unitPricePerM2` are stored as JSON strings, parsed on read
- **Soft delete:** Projects use `isDeleted` flag; master data uses `isActive` flag
- **Organization scope:** All queries filter by `session.user.organizationId`

## Calculation Engine

- `ua-calculator.ts`: UA値計算（面積比率法、表面熱伝達抵抗、温度差係数）
- `eta-calculator.ts`: ηAC/ηAH計算（方位係数、取得日射量補正）
- `optimizer.ts`: 貪欲法 + 局所探索による断熱仕様最適化
- `constants.ts`: 省エネ基準の全定数テーブル（8地域対応）

## Environment Variables

```
DATABASE_URL=file:./prisma/dev.db          # ローカル開発
TURSO_DATABASE_URL=libsql://...            # 本番（Turso）
TURSO_AUTH_TOKEN=...                       # 本番（Turso）
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Build & Deploy

```bash
npm run build          # ビルド確認
~/.local/bin/vercel    # Vercelデプロイ
```
