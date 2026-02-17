# 定期支出管理アプリ

JSONファイルを起動時に選択して使う、ローカル完結型のWebアプリです。

## 主な機能
- 月額換算・年額換算の合計表示
- カテゴリタブ / タグでの分類表示
- サービス名・提供元で検索
- 登録 / 編集 / 削除モーダル
- 請求サイクル: `月額` / `年額` / `2年`
- 保存（日時付き別名ダウンロード）
- 登録更新日は `updatedAt` を自動更新

## 項目名（置き換え）
CSVの列名を次の管理項目に統一しています。
- `サービス名` -> `serviceName`
- `提供元` -> `providerName`
- `ID` -> `accountIdentifier`（契約ID / 会員ID）
- `支払方法` -> `paymentMethod`
- `参考`/`退会方法` -> `notes`
- `確認日` -> `updatedAt`（アプリ上では自動更新）
- 請求周期 -> `billingCycle`（`monthly`/`yearly`/`biyearly`）
- サイクル金額 -> `amountPerCycle`
- 換算額 -> `monthlyCost` / `yearlyCost`

## 使い方
1. `index.html` をブラウザで開く。
2. 起動オーバーレイでJSONを選択して開始（または新規作成）。
3. 編集後は `保存` を実行（`subscYYYY-MM-DD-HH-mm.json` 形式）。

## 初期データ
指定CSV（ベース/娯楽/生命保険・医療保険/投資）から、解約・退会・停止済みを除外して生成済みです。
- `/Users/gue1971/MyWorks/ファイナンス/サブスクマネジャー/subscription-manager/data/subscriptions-from-csv.json`

## JSONフォーマット
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-02-16T00:00:00.000Z",
  "subscriptions": [
    {
      "id": "uuid",
      "serviceName": "ChatGPT",
      "providerName": "OpenAI",
      "category": "娯楽",
      "tags": ["娯楽", "AI"],
      "billingCycle": "monthly",
      "amountPerCycle": 3200,
      "monthlyCost": 3200,
      "yearlyCost": 38400,
      "accountIdentifier": "example@example.com",
      "paymentMethod": "オリコカード",
      "notes": "",
      "createdAt": "2026-02-16T00:00:00.000Z",
      "updatedAt": "2026-02-16T00:00:00.000Z"
    }
  ]
}
```
