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

/** kintone 関連関数 */
import { getAppRecordsByQuery, loadXmlFileToText } from './kintone'

/** 共通関数 */
import {
  dateToString,
  drawMap,
  createControlBox,
  createDropdown,
  drawCoordinatePolyline,
  drawMarkersByPhotos,
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

  // 地図マウントルートコンテナを取得する
  const rootContainer = kintone.app.record.getSpaceElement(GPX_VIEWER_CONTAINER)
  if (rootContainer) {
    // ルートコンテナにクラスを付けておく
    rootContainer.classList.add(`${MAP_CONTAINER}-detail`)

    // 描画対象データを準備する
    const { coordinates, timestamps, photos } = await prepareData(event.record)

    // 地図コンテンツ部を構築する
    await generateMapContent({
      coordinates,
      timestamps,
      photos,
      rootContainer,
      className: `${MAP_CONTAINER}-detail`,
    })
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
    // 地図マウントルートコンテナ要素
    const rootContainer = document.getElementById(GPX_VIEWER_CONTAINER)
    if (rootContainer) {
      // 現在のクエリでレコードを取得する
      const records = await getAppRecordsByQuery(kintone.app.getQuery())

      // 取得したレコードの最初の1件で描画する
      if (records.length) {
        // 描画対象データを準備する
        const { coordinates, timestamps, photos } = await prepareData(
          records[0],
        )

        // 地図コンテンツ部を構築する
        await generateMapContent({
          coordinates,
          timestamps,
          photos,
          rootContainer,
          className: `${MAP_CONTAINER}-index`,
        })

        // レコード選択リストを設置する
        createRecordSelectDropdown(records, rootContainer)
      } else {
        // レコードがなければ初期値で描画する
        const map = await drawMap({
          container: MAP_CONTAINER,
          params: {},
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
 * 描画対象データを準備する
 */
const prepareData = async (record) => {
  console.log('描画対象データを準備する')
  console.log(record)

  // 添付ファイルフィールドから GPX ファイルを抽出する
  const files = record['GPXファイル'].value
  const gpxFile = files.find((f) => f.name.endsWith('.gpx'))
  if (!gpxFile) return

  // GPX ファイルから緯度経度高度情報配列と記録日時配列を得る
  const xmlStr = await loadXmlFileToText(gpxFile)
  const { coordinates, timestamps } = await getCoordinatesAndTimestamps(xmlStr)

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
  }

  // 返却
  return { coordinates, timestamps, photos }
}

/**
 * 地図コンテンツ部を構築する
 */
const generateMapContent = async ({
  coordinates,
  timestamps,
  photos,
  rootContainer,
  className,
}) => {
  console.log('地図コンテンツ部を構築する')

  // コントロールボックスが既に作成済みならいったん削除する
  const curContorlBox = document.querySelector('.control-box')
  if (curContorlBox) curContorlBox.parentElement.removeChild(curContorlBox)

  // 最初の地図センター
  const firstCenter = coordinates[0]

  // 地図コンテナ
  const mapContainer = (() => {
    // 既存のコンテナがあればそれを返却する
    const curContainer = document.getElementById(MAP_CONTAINER)
    if (curContainer) return curContainer

    // なければ作成して返却する
    const newContainer = document.createElement('div')
    newContainer.id = MAP_CONTAINER
    newContainer.classList.add(MAP_CONTAINER, className)
    rootContainer.appendChild(newContainer)
    return newContainer
  })()

  // 初期値で地図を準備する
  const map = await drawMap({
    container: mapContainer.id,
    params: { center: firstCenter },
  })

  // GPX ファイルに基づく地点データをポリラインで地図に描画する
  await drawCoordinatePolyline({ map, coordinates, timestamps })

  // 地図の開始位置にドットを置く
  await pointDotOnMap({ map, coordinate: firstCenter })

  // 写真をマーカーとして地図に配置する
  if (photos.length) {
    await drawMarkersByPhotos({ map, files: photos })
  }

  // コントロールボックスを作成する
  createControlBox({
    map,
    container: rootContainer,
    mapContainer,
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
    // 地図マウントルートコンテナ要素
    const rootContainer = document.getElementById(GPX_VIEWER_CONTAINER)
    if (selectedRecord && rootContainer) {
      // 描画対象データを準備する
      const { coordinates, timestamps, photos } =
        await prepareData(selectedRecord)

      // 地図コンテンツ部を構築する
      await generateMapContent({
        coordinates,
        timestamps,
        photos,
        rootContainer,
        className: `${MAP_CONTAINER}-index`,
      })
    }
  })
}
