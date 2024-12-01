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
import {
  drawMap,
  getCoordinatesAndTimestamps,
  drawCoordinatePolyline,
  drawMarkersByPhotos,
  createControlBox,
  pointDotOnMap,
} from './functions'

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

/** 表示位置コントロールボタンの配列 */
const POS_CONTROL_BUTTONS = [
  { id: 'first', label: '|◀' },
  { id: 'prev', label: '◀◀' },
  { id: 'play', label: '▶' },
  { id: 'stop', label: '||' },
  { id: 'next', label: '▶▶' },
  { id: 'last', label: '▶|' },
]

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

  // コメント欄（サイドバー）を閉じておく
  hideSideBar()

  // （kintone標準）メニューヘッダのスタイルを修正する
  document.querySelector('.gaia-argoui-app-show-menu').style.zIndex = 2

  // 地図マウントコンテナを取得し、クラスを付けておく
  const mapContainer = kintone.app.record.getSpaceElement(MAP_CONTAINER)
  mapContainer.classList.add(`${MAP_CONTAINER}-detail`)

  // 地図コンテンツ部を構築する
  await generateMapContent(event, mapContainer)

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

/**
 * コメント欄（サイドバー）を非表示にする
 */
const hideSideBar = () => {
  if (location.href.includes('tab=')) {
    location.href = location.href.replace(
      /tab=comments|tab=history/,
      'tab=none',
    )
  } else {
    location.href = `${location.href}&tab=none`
  }
}

/**
 * 地図コンテンツ部を構築する
 */
const generateMapContent = async (event, mapContainer) => {
  // 添付ファイルフィールドから GPX ファイルを抽出する
  const files = event.record['GPXファイル'].value
  const gpxFile = files.find((f) => f.name.endsWith('.gpx'))

  // GPX ファイルから緯度経度高度情報配列と記録日時配列を得る
  const { coordinates, timestamps } = await getCoordinatesAndTimestamps(gpxFile)

  // 最初の地図センター
  const firstCenter = coordinates[0]

  // 初期値で地図を準備する
  const map = await drawMap({
    container: mapContainer.id,
    params: { ...MAP_PARAMS, center: firstCenter },
  })

  // GPX ファイルに基づく地点データをポリラインで地図に描画する
  await drawCoordinatePolyline({ map, coordinates, timestamps })

  // 地図の開始位置にドットを置く
  await pointDotOnMap({ map, coordinate: firstCenter })

  // 写真テーブルから JGP 画像を取得する
  // テーブルの個々の行には画像は1ファイルの想定
  const photos = event.record['画像ファイルテーブル'].value.map((row) => {
    if (
      row.value['画像ファイル'].value &&
      row.value['画像ファイル'].value.length &&
      row.value['画像ファイル'].value[0].contentType === 'image/jpeg'
    ) {
      return {
        file: row.value['画像ファイル'].value[0],
        comment: row.value['画像コメント'].value || '',
      }
    }
  })
  console.log(photos)

  // 写真をマーカーとして地図に配置する
  await drawMarkersByPhotos({ map, files: photos })

  // コントロールボックスを作成する
  createControlBox({
    map,
    container: mapContainer,
    buttons: POS_CONTROL_BUTTONS,
    coordinates,
    timestamps,
  })

  return event
}
