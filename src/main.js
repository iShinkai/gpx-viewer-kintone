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

/** MapLibre GL JS */
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** 共通関数 */
import { drawMap, hideSideBar } from './functions'

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
kintone.events.on('app.record.detail.show', (event) => {
  console.log('レコード詳細表示時処理')
  console.log(event)

  // 地図マウントコンテナを取得し、クラスを付けておく
  const mapContainer = kintone.app.record.getSpaceElement(MAP_CONTAINER)
  mapContainer.classList.add(MAP_CONTAINER)

  // 初期値で地図を描画する
  const map = drawMap({
    container: mapContainer.id,
    params: MAP_PARAMS,
  })

  // コメント欄（サイドバー）を閉じておく
  hideSideBar()

  // 返却
  return event
})

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */
