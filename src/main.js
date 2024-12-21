/**
 * ============================================================
 *     GPV Viewer kintone 版 アプリカスタマイズ
 * ============================================================
 */

/**
 * - - - - - - - - - - - - - - - - - - - -
 * インポート
 * - - - - - - - - - - - - - - - - - - - -
 */

/** kintone 関連関数 */
import {
  getAppRecordsByQuery,
  loadXmlFileToText,
  loadImageFileToBlob,
  hideSideBar,
} from './kintone'

/** 共通関数 */
import {
  dateToString,
  constructMapContent,
  createDropdown,
  getCoordinatesAndTimestamps,
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
      // ルートコンテナにクラスを付けておく
      rootContainer.classList.add(`${GPX_VIEWER_CONTAINER}-index`)

      // ローダーを差し込む
      showHideLoader(rootContainer, true)

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
        await generateMapContent({
          coordinates: [],
          timestamps: [],
          photos: [],
          rootContainer,
          className: `${MAP_CONTAINER}-index`,
        })
      }

      // ローダーを落とす
      showHideLoader(rootContainer, false)
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
          ...row.value['画像ファイル'].value[0],
          comment: row.value['画像コメント'].value || '',
        })
      }
    })

    // 画像をダウンロードして blob を確保する
    for (const photo of photos) {
      const blob = await loadImageFileToBlob(photo)
      photo.blob = blob
    }
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

  // 地図コンテンツ部を構築する
  const map = await constructMapContent({
    mapContainer,
    coordinates,
    timestamps,
    photos,
  })
  console.log(map)
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
      // ローダーを差し込む
      showHideLoader(rootContainer, true)

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

      // ローダーを落とす
      showHideLoader(rootContainer, false)
    }
  })
}

/**
 * ローダーを表示・非表示する
 */
const showHideLoader = (rootContainer, isLoading) => {
  if (isLoading) {
    const loader = document.createElement('div')
    loader.classList.add('loader')
    rootContainer.appendChild(loader)
  } else {
    const loader = rootContainer.querySelector('.loader')
    if (loader) {
      rootContainer.removeChild(loader)
    }
  }
}
