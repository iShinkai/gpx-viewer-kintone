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
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** kintone REST API Client */
import { KintoneRestAPIClient } from '@kintone/rest-api-client'

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */

/**
 * 指定の ID を持つ要素に指定のパラメータで地図を描画する
 */
export const drawMap = ({ container, params }) => {
  const map = new maplibregl.Map({
    container,
    ...params,
  })

  return map
}

/**
 * コメント欄（サイドバー）を非表示にする
 */
export const hideSideBar = () => {
  if (location.href.includes('tab=')) {
    location.href = location.href.replace(
      /tab=comments|tab=history/,
      'tab=none',
    )
  } else {
    location.href = `${location.href}&tab=none`
  }
}

export const drawPolylineByFile = async ({ map, file }) => {
  // GPX ファイルを読み込み地点データに変換する
  const doc = await readGpxFile(file)
  const trackPoints = getTrackPoints(doc)

  // 地点データと記録日時データの配列を準備する
  const coordinates = []
  const timestamps = []

  // 地点データでループしデータを準備する
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

  // 地図のセンターをリストの先頭項目にする
  console.log(coordinates[0])
  map.setCenter(coordinates[0])
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
  console.log(xmlStr)

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
