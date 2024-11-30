/**
 * ============================================================
 *     gpx-viewer アプリカスタマイズ
 * ============================================================
 */

/**
 * - - - - - - - - - - - - - - - - - - - -
 * インポート
 * - - - - - - - - - - - - - - - - - - - -
 */

/** 共通関数 */
import { drawMap, hideSideBar, drawPolylineByFile } from './functions'

/** スタイル */
import './style.scss'

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 定数
 * - - - - - - - - - - - - - - - - - - - -
 */

/** 地図コンテナのスペースフィールド */
const MAP_CONTAINER = 'map_container'

/** 地図パラメータ初期値 */
const MAP_PARAMS = {
  style: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: 'osm-layer',
        type: 'raster',
        source: 'osm',
      },
    ],
    sky: {},
  },
  center: [139.6917, 35.6895],
  zoom: 10,
}

/**
 * - - - - - - - - - - - - - - - - - - - -
 * kintone イベントハンドラ
 * - - - - - - - - - - - - - - - - - - - -
 */

/**
 * レコード詳細表示時処理
 */
kintone.events.on('app.record.detail.show', async (event) => {
  console.log('レコード詳細表示時処理')
  console.log(event)

  // 地図マウントコンテナを取得し、クラスを付けておく
  const mapContainer = kintone.app.record.getSpaceElement(MAP_CONTAINER)
  mapContainer.classList.add(`${MAP_CONTAINER}-detail`)

  // 初期値で地図を準備する
  const map = drawMap({
    container: mapContainer.id,
    params: MAP_PARAMS,
  })

  // コメント欄（サイドバー）を閉じておく
  hideSideBar()

  // 添付ファイルフィールドから GPX ファイルを抽出する
  const files = event.record['GPXファイル'].value
  const gpxFile = files.find((f) => f.name.endsWith('.gpx'))

  // GPX ファイルに基づく地点データをポリラインで地図に描画する
  await drawPolylineByFile({ map, file: gpxFile })

  // 返却
  return event
})

/**
 * レコード一覧表示時処理
 */
kintone.events.on('app.record.index.show', (event) => {
  console.log('レコード一覧表示時処理')
  console.log(event)

  // カスタマイズビューでかつマウントターゲットがある場合
  if (event.viewType === 'custom') {
    // マウントターゲット要素
    const mapContainer = document.getElementById(MAP_CONTAINER)
    if (mapContainer) {
      // クラスを付けておく
      mapContainer.classList.add(`${MAP_CONTAINER}-index`)

      // 初期値で地図を準備する
      const map = drawMap({
        container: MAP_CONTAINER,
        params: MAP_PARAMS,
      })
    }
  }
})

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */
