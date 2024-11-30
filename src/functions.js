/**
 * ============================================================
 *     gpx-viewer 共通関数群
 * ============================================================
 */

/**
 * - - - - - - - - - - - - - - - - - - - -
 * インポート
 * - - - - - - - - - - - - - - - - - - - -
 */

/** MapLibre GL JS */
import { Map, Marker, Popup } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** EXIF.js */
import EXIF from 'exif-js'

/** kintone REST API Client */
import { KintoneRestAPIClient } from '@kintone/rest-api-client'

/** kintone UI Components */
import { ReadOnlyTable } from 'kintone-ui-component'

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */

/**
 * 指定の ID を持つ要素に指定のパラメータで地図を描画する
 */
export const drawMap = async ({ container, params }) => {
  const map = new Map({
    container,
    ...params,
  })
  await sleep(1000)
  return map
}

/**
 * 座標配列と日時配列を受け取り地図上にポリラインを描画する
 */
export const drawCoordinatePolyline = async ({
  map,
  coordinates,
  timestamps,
}) => {
  console.log('座標配列と日時配列を受け取り地図上にポリラインを描画する')
  // 地図にポリラインで描画する
  const line = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates,
        },
        properties: {
          timestamps,
        },
      },
    ],
  }

  map.addSource('line', {
    type: 'geojson',
    data: line,
  })

  map.addLayer({
    id: 'line-layer',
    type: 'line',
    source: 'line',
    layout: {
      'line-cap': 'round',
      'line-join': 'round',
    },
    paint: {
      'line-color': '#0000FF',
      'line-width': 7,
    },
  })
}

/**
 * GPX ファイルを読み込む
 */
export const readGpxFile = async (file) => {
  console.log('GPXファイルを読み込む')

  // kintone REST API Client でファイルを取得する
  const client = new KintoneRestAPIClient()
  const arrayBuffer = await client.file.downloadFile({
    fileKey: file.fileKey,
  })

  // テキストをデコードする
  const textDecoder = new TextDecoder()
  const xmlStr = textDecoder.decode(arrayBuffer)

  // パースする
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'application/xml')
  console.log(doc)

  // 返却
  return doc
}

/**
 * GPX ドキュメントオブジェクトから trkpt を読み取り JSON オブジェクトに変換して返却する
 */
export const getTrackPoints = (doc) => {
  console.log(
    'GPX ドキュメントオブジェクトから trkpt を読み取り JSON オブジェクトに変換して返却する',
  )

  // trkpt 要素を抽出する
  const trkpts = doc.querySelectorAll('trkpt[lat][lon]')
  console.log(trkpts)

  // JSON オブジェクトに変換する
  const trackPoints = Array.from(trkpts).map((trkpt) => {
    // 緯度経度
    const obj = {
      lat: Number(trkpt.attributes.lat.value),
      lon: Number(trkpt.attributes.lon.value),
    }

    // 標高
    const ele = trkpt.querySelector('ele')
    if (ele) {
      obj.ele = Number(ele.innerHTML)
    }

    // 記録日時
    const time = trkpt.querySelector('time')
    if (time) {
      obj.time = new Date(time.innerHTML)
    }

    return obj
  })
  console.log(trackPoints)

  // 返却
  return trackPoints
}

/**
 * GPX ファイルを読み込み緯度経度高度情報配列と記録日時配列を得る
 * @param {*} file
 * @returns
 */
export const getCoordinatesAndTimestamps = async (file) => {
  // GPX ファイルを読み込み地点データに変換する
  const doc = await readGpxFile(file)
  const trackPoints = getTrackPoints(doc)

  // 地点データと記録日時データの配列を準備する
  const coordinates = []
  const timestamps = []

  // 地点データでループし配列に積み込むする
  trackPoints.forEach((trkpt, idx) => {
    // 経度・緯度・高度
    if (trkpt.lat && trkpt.lon) {
      const data = [trkpt.lon, trkpt.lat]
      if (trkpt.ele) {
        data.push(trkpt.ele)
      }
      coordinates.push(data)

      // 記録日時
      if (trkpt.time) {
        timestamps[idx] = trkpt.time
      }
    }
  })

  return {
    coordinates,
    timestamps,
  }
}

/**
 * 写真画像を受け取り地図上にマーカーで描画する
 * 写真画像はポップアップ内に表示する
 */
export const drawMarkersByPhotos = async ({ map, files }) => {
  // 画像ファイルを読み取る
  const images = []
  for (const fileInfo of files) {
    images.push({
      ...(await readImageFile(fileInfo.file)),
      comment: fileInfo.comment,
    })
  }

  // 地図上にマーカーを配置する
  images.forEach((image) => {
    // ポップアップの内容物
    const popupBody = document.createElement('div')

    // ボディ部
    popupBody.classList.add('popup-body')

    // -- 画像部
    const img = document.createElement('img')
    img.classList.add('popup-body-image')
    img.src = image.blobUrl
    popupBody.appendChild(img)

    // -- 説明部
    const desc = document.createElement('div')
    desc.classList.add('popup-body-desc')

    // ---- コメント
    const comment = document.createElement('div')
    comment.classList.add('popup-body-desc-comment')
    comment.innerHTML = image.comment
    desc.appendChild(comment)

    // ---- 撮影日時
    const timestamp = document.createElement('div')
    timestamp.classList.add('popup-body-desc-timestamp')
    timestamp.innerHTML = image.timestamp
      ? image.timestamp.toLocaleString()
      : ''
    desc.appendChild(timestamp)

    popupBody.appendChild(desc)

    // ポップアップ
    const popup = new Popup({ className: 'popup' })
      .setMaxWidth('400px')
      .setDOMContent(popupBody)

    // マーカー
    const marker = new Marker()
      .setLngLat([image.coordinate.lon, image.coordinate.lat])
      .setPopup(popup)
      .addTo(map)
  })
}

/**
 * 画像ファイルを読み込む
 */
const readImageFile = async (file) => {
  // kintone REST API Client でファイルを取得する
  const client = new KintoneRestAPIClient()
  const arrayBuffer = await client.file.downloadFile({
    fileKey: file.fileKey,
  })
  const blob = new Blob([arrayBuffer])

  // Blob URL（表示用データURL）
  const blobUrl = window.URL.createObjectURL(blob)

  // File オブジェクト
  const fileObj = new File([blob], file.name, { type: blob.type })

  // Exif データを読み取る
  const exif = await getExifData(fileObj)

  // Exif データから緯度経度高度情報を得る
  const coordinate = exifToLatLonAlt(exif)

  // Exif データから撮影日時を得る
  const timestamp = exifToTimestamp(exif)

  // 各種情報をまとめて返却する
  return {
    ...file,
    blobUrl,
    coordinate,
    timestamp,
  }
}

/**
 * File オブジェクトから Exif データを得る
 */
const getExifData = async (fileObj) => {
  return new Promise((resolve, reject) => {
    try {
      EXIF.getData(fileObj, function () {
        const allMetaData = EXIF.getAllTags(this)
        resolve(allMetaData)
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * Exif データから緯度・経度・高度の情報を取得する
 */
const exifToLatLonAlt = (exif) => {
  return {
    lat:
      exif.GPSLatitude[0] +
      exif.GPSLatitude[1] / 60 +
      exif.GPSLatitude[2] / 3600,
    lon:
      exif.GPSLongitude[0] +
      exif.GPSLongitude[1] / 60 +
      exif.GPSLongitude[2] / 3600,
    alt: Number(exif.GPSAltitude),
  }
}

/**
 * Exif データからタイムスタンプ（撮影日時）の情報を取得する
 */
const exifToTimestamp = (exif) => {
  // DateTimeOriginal の値（`YYYY:MM:DD HH:mm:SS`形式）
  const dateTimeOriginal =
    exif.DateTimeOriginal || exif.DateTimeDigitized || exif.DateTime || ''
  const pattern =
    /^([0-9]+)[:/]([0-9]+)[:/]([0-9]+)[T ]([0-9]+):([0-9]+):([0-9]+)/
  const matched = dateTimeOriginal.match(new RegExp(pattern))

  if (matched.length) {
    const dateTimeText = `${matched[1]}/${matched[2]}/${matched[3]} ${matched[4]}:${matched[5]}:${matched[6]}`
    return new Date(dateTimeText)
  }
  return null
}

/**
 * 受け取った座標データ配列と日時データ配列でリストを作成する
 */
export const createPointListElem = ({
  map,
  container,
  coordinates,
  timestamps,
}) => {
  // ボックス全体
  const box = document.createElement('div')
  box.classList.add('point-list-box')

  // 表示するデータを正規化する
  const data = coordinates.map((coordinate, index) => {
    return {
      index: index + 1,
      lon: coordinate[0].toFixed(6),
      lat: coordinate[1].toFixed(6),
      alt: coordinate[2].toFixed(1),
      timestamp: timestamps[index].toLocaleTimeString(),
    }
  })

  // テーブルを作成する（KUC ReadOnlyTable）
  const table = new ReadOnlyTable({
    columns: [
      { title: '', field: 'index' },
      { title: '緯度', field: 'lat' },
      { title: '経度', field: 'lon' },
      { title: '標高', field: 'alt' },
      { title: '日時', field: 'timestamp' },
    ],
    data,
    className: 'point-list-table',
    pagination: false,
  })
  box.appendChild(table)

  // ステップ数
  const stepElem = document.createElement('div')
  stepElem.classList.add('point-list-steps')
  stepElem.innerHTML = `total: ${coordinates.length} steps`
  box.appendChild(stepElem)

  // コンテナに追加する
  container.appendChild(box)

  // テーブルにイベントを設置する
  table.addEventListener('click', (event) => {
    // クリックされた行を特定する
    const row = event.target.closest('tr')
    if (row && row.parentNode.tagName === 'TBODY') {
      Array.from(row.parentNode.children).forEach((tr) =>
        tr.classList.remove('selected-row'),
      )
      row.classList.add('selected-row')
      const rowIndex = Array.from(row.parentNode.children).indexOf(row)
      moveToCoordinate(map, coordinates[rowIndex])
    }
  })
}

/**
 * 指定の緯度経度（[経度, 緯度]）に地図のセンターを移動する
 */
const moveToCoordinate = (map, coordinate) => {
  console.log('指定の緯度経度（[経度, 緯度]）に地図のセンターを移動する')
  console.log(coordinate)
  map.setCenter(coordinate)
  console.log(map)
  const point = map.getSource('points')
  if (point) {
    console.log(point)
    point.setData({
      type: 'Point',
      coordinates: coordinate,
    })
  }
}

/**
 * 地図上にドットを配置する
 * https://maplibre.org/maplibre-gl-js/docs/examples/add-image-animated/
 */
export const pointDotOnMap = async ({ map, coordinate, size = 128 }) => {
  return new Promise((resolve) => {
    console.log('地図上にドットを配置する', size, coordinate)
    const pulsingDot = {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),

      // get rendering context for the map canvas when layer is added to the map
      onAdd() {
        const canvas = document.createElement('canvas')
        canvas.width = this.width
        canvas.height = this.height
        this.context = canvas.getContext('2d')
      },

      // called once before every frame where the icon will be used
      render() {
        const duration = 1000
        const t = (performance.now() % duration) / duration

        const radius = (size / 2) * 0.3
        const outerRadius = (size / 2) * 0.7 * t + radius
        const context = this.context

        // draw outer circle
        context.clearRect(0, 0, this.width, this.height)
        context.beginPath()
        context.arc(
          this.width / 2,
          this.height / 2,
          outerRadius,
          0,
          Math.PI * 2,
        )
        context.fillStyle = `rgba(255, 200, 200,${1 - t})`
        context.fill()

        // draw inner circle
        context.beginPath()
        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2)
        context.fillStyle = 'rgba(255, 100, 100, 1)'
        context.strokeStyle = 'white'
        context.lineWidth = 2 + 4 * (1 - t)
        context.fill()
        context.stroke()

        // update this image's data with data from the canvas
        this.data = context.getImageData(0, 0, this.width, this.height).data

        // continuously repaint the map, resulting in the smooth animation of the dot
        map.triggerRepaint()

        // return `true` to let the map know that the image was updated
        return true
      },
    }

    map.addImage('pulsing-dot', pulsingDot, { pixelRatio: 2 })
    map.addSource('points', {
      type: 'geojson',
      data: {
        type: 'Point',
        coordinates: coordinate,
      },
    })
    map.addLayer({
      id: 'points',
      type: 'symbol',
      source: 'points',
      layout: {
        'icon-image': 'pulsing-dot',
        'icon-anchor': 'center',
      },
    })

    resolve()
  })
}

/**
 * 指定ミリ秒スリープする
 */
const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec))
