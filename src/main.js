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
  dateToString,
  drawMap,
  createControlBox,
  createDropdown,
  drawCoordinatePolyline,
  drawMarkersByPhotos,
  getAppRecordsByQuery,
  getCoordinatesAndTimestamps,
  pointDotOnMap,
} from './functions'

/** スタイル */
import './style.scss'

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 定数
 * - - - - - - - - - - - - - - - - - - - -
 */

/** 地図コンテナのID */
const GPX_VIEWER_CONTAINER = 'gpx_viewer'

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
  document.querySelector('.gaia-argoui-app-show-menu').style.zIndex = 3

  // 地図マウントコンテナを取得する
  const viewerContainer =
    kintone.app.record.getSpaceElement(GPX_VIEWER_CONTAINER)
  if (viewerContainer) {
    // コンテナにクラスを付けておく
    viewerContainer.classList.add(`${MAP_CONTAINER}-detail`)

    // 地図コンテンツ部を構築する
    await generateMapContent(
      event.record,
      viewerContainer,
      `${MAP_CONTAINER}-detail`,
    )
  }

  // 返却
  return event
})

/**
 * レコード一覧表示時処理
 */
kintone.events.on('app.record.index.show', async (event) => {
  console.log('レコード一覧表示時処理')
  console.log(event)

  // カスタマイズビューでかつマウントターゲットがある場合
  if (event.viewType === 'custom') {
    // マウントターゲット要素
    const viewrContainer = document.getElementById(GPX_VIEWER_CONTAINER)
    if (viewrContainer) {
      // 現在のクエリでレコードを取得する
      const records = await getAppRecordsByQuery(kintone.app.getQuery())

      // 取得したレコードで描画する
      if (records.length) {
        // 地図コンテンツ部を構築する
        await generateMapContent(
          records[0],
          viewrContainer,
          `${MAP_CONTAINER}-index`,
        )

        // レコード選択リストを設置する
        createRecordSelectDropdown(records, viewrContainer)
      } else {
        // レコードがなければ初期値で描画する
        const map = await drawMap({
          container: MAP_CONTAINER,
          params: MAP_PARAMS,
        })
      }
    }
  }

  // 返却
  return event
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
const generateMapContent = async (record, viewerContainer, className) => {
  console.log('地図コンテンツ部を構築する')
  console.log(record)

  // コントロールボックスが既に作成済みならいったん削除する
  const currentBox = document.querySelector('.control-box')
  if (currentBox) currentBox.parentElement.removeChild(currentBox)

  // 添付ファイルフィールドから GPX ファイルを抽出する
  const files = record['GPXファイル'].value
  const gpxFile = files.find((f) => f.name.endsWith('.gpx'))
  if (!gpxFile) return

  // GPX ファイルから緯度経度高度情報配列と記録日時配列を得る
  const { coordinates, timestamps } = await getCoordinatesAndTimestamps(gpxFile)

  // 最初の地図センター
  const firstCenter = coordinates[0]

  // 地図コンテナ
  const mapContainer = (() => {
    // 既存のコンテナがあればそれを返却する
    const container = document.getElementById(MAP_CONTAINER)
    if (container) return container

    // なければ作成して返却する
    const newContainer = document.createElement('div')
    newContainer.id = MAP_CONTAINER
    newContainer.classList.add(className)
    viewerContainer.appendChild(newContainer)
    return newContainer
  })()

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
  const photos = []
  if (record['画像ファイルテーブル'].value.length) {
    record['画像ファイルテーブル'].value.forEach((row) => {
      if (
        row.value['画像ファイル'].value &&
        row.value['画像ファイル'].value.length &&
        row.value['画像ファイル'].value[0].contentType === 'image/jpeg'
      ) {
        photos.push({
          file: row.value['画像ファイル'].value[0],
          comment: row.value['画像コメント'].value || '',
        })
      }
    })
    console.log(photos)

    // 写真をマーカーとして地図に配置する
    if (photos.length) {
      await drawMarkersByPhotos({ map, files: photos })
    }
  }

  // コントロールボックスを作成する
  createControlBox({
    map,
    container: viewerContainer,
    buttons: POS_CONTROL_BUTTONS,
    coordinates,
    timestamps,
  })
}

/**
 * レコード選択ドロップダウンリストを設置する
 */
const createRecordSelectDropdown = (records, container) => {
  // ドロップダウンの項目を作成する
  const data = records.map((record) => {
    const date = record['日付'].value || ''
    return {
      label: `${record['タイトル'].value}${date ? ` [${dateToString(new Date(date), 'date')}]` : ''}`,
      value: record.$id.value,
    }
  })

  // ドロップダウンを作成する
  const dropdown = createDropdown({
    data,
    container,
    className: 'record-select',
  })

  // イベントを設置する
  dropdown.addEventListener('change', async (event) => {
    console.log('ドロップダウンリストを選択')
    console.log(event.detail.value)
    const selectedRecord = records.find(
      (r) => r.$id.value === event.detail.value,
    )
    if (selectedRecord) {
      await generateMapContent(
        selectedRecord,
        container,
        `${MAP_CONTAINER}-detail`,
      )
    }
  })
}
