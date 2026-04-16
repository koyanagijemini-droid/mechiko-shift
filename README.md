# めちこのシフト 🌈

夫婦でシフトを共有できるウェブアプリです。

## セットアップ手順

### 1. Firebase の設定

1. https://console.firebase.google.com でプロジェクトを作成
2. 「Realtime Database」を有効化（テストモードで開始）
3. プロジェクトの設定 → ウェブアプリを登録 → firebaseConfig をコピー
4. `src/firebase.js` を開いて `YOUR_***` の部分を実際の値に差し替える

### 2. ローカルで動作確認

```bash
npm install
npm start
```

### 3. Vercel にデプロイ

1. このフォルダを GitHub にプッシュ
2. https://vercel.com で GitHub リポジトリをインポート
3. Deploy ボタンを押すだけ！

## 機能

- 📝 シフト登録（月間カレンダー）
- ⚙️ 勤務体系のカスタマイズ
- 📋 今日のシフト＋天気確認
- 🚗 出勤方法の選択
- 💌 月間カレンダーの共有
- ☁️ Firebase によるリアルタイム同期（夫婦で共有可能）
