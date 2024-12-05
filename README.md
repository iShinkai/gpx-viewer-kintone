# gpx-viewer

kintone の添付ファイルフィールドに追加した gpx ファイルを読み込み MapLibre で描画するカスタマイズです。

Qiita の記事は以下を参照してください。
[kintone × MapLibre で旅の想い出を可視化する](https://qiita.com/iShinkai/items/f20edc14c5689df8e0cd)

## インストールとセットアップ

volta と corepack、pnpm を使用しています。
以下のコマンドでインストールを行います。

```bash
volta install node@22.11.0
volta install corepack
corepack enable
corepack enable pnpm
pnpm install
```

次に、ローカルビルドを参照するための環境を作ります。
ローカルビルドは Vite のローカルサーバでホストするわけではなく、 VS Code の拡張機能である [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) を利用します。
HTTPS でのリクエストが必須となるので、Live Server で HTTPS リクエストができるよう証明書の作成が必要です。

```bash
openssl req -x509 -newkey rsa:4096 -sha256 -nodes -keyout ./vscode_live_server.key.pem -out ./vscode_live_server.cert.pem
```

諸々訊かれますが `Common Name` だけ `localhost` などの値、あとは全て空エンターで構いません。
作成した `vscode_live_server.key.pem`、`vscode_live_server.cert.pem` を Live Server で参照するよう `.vscode/settings.json` に記述します。

```json
{
  "liveServer.settings.https": {
    "enable": true,
    "cert": "/path/to/vscode_live_server.cert.pem",
    "key": "/path/to/vscode_live_server.key.pem",
    "passphrase": ""
  },
  "liveServer.settings.root": "/dist",
  "liveServer.settings.port": 5511
}
```

`liveServer.settings.https` の `cert` と `key` のパスはフルパスである必要があります（`/path/to` は然るべき内容に書き換えてください）。
また `liveServer.settings.port` は好きなポートで良いと思います。
デフォルトだと `5500` です。

## 開発について

`src` 以下にソースコードが配置されています。
エントリポイントは `main.js` です。

## ビルドについて

### 開発ビルド

console 出力が残る開発・デバッグ用のビルドです。
以下のコマンドで実行します。

```bash
pnpm devel
```

`dist/development/` 以下に作成された `bundle.js` ファイルを kintone アプリに適用してください。

### ウォッチモード

LiveServer でウォッチするためのモードです。
以下のコマンドで実行します。

```bash
pnpm watch
```

コマンド実行後、コードが修正されるたびにビルドが実行されます。
上述通りウォッチには LiveServer を使用しますので、事前に証明書の作成や `.vscode/settings.json` の記述など適切な設定を行ってください。
kintone アプリの JavaScript カスタマイズに URL で `https://127.0.0.1:__PORT_NUMBER__/development/bundle.js` として適用できます。
`__PORT_NUMBER__` の箇所は `.vscode/settings.json` で `liveServer.settings.port` に指定したポート番号です。
例えば `https://127.0.0.1:5511/development/bundle.js` のような形になります。

### リリースビルド

本番環境適用のためのビルドです。
とは言え開発ビルドとの違いは console が残るかどうかだけです。
以下のコマンドで実行します。

```bash
pnpm build
```

`dist/production/` 以下に作成された `bundle.js` ファイルを kintone アプリに適用してください。

## アプリテンプレートについて

`app-template/GPX_Viewer.zip` ファイルは kintone に適用できるアプリテンプレートです。
リリースビルド済みのカスタマイズファイルが適用済みですので、このテンプレートからアプリを作成すればすぐに利用できます。
お手持ちの GPX ファイルや写真画像ファイルをレコードに追加して試してみてください。

## スタンドアロン版

kintone でなく Web サーバ等でホストできるスタンドアロン版もあります。
データ取得部分以外の機能は kintone のものと同じです。

[GPX Viewe スタンドアロン版（リポジトリ）](https://github.com/iShinkai/gpx-viewer-standalone)
[GPX Viewe スタンドアロン版（GitHub Pages）](https://ishinkai.github.io/gpx-viewer-standalone/dist/)

## ライセンス

MIT ライセンスです。
[LICENSE](LICENSE) を参照してください。
