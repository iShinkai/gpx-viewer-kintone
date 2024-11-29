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

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */

/**
 * 指定のIDを持つ要素に指定のパラメータで地図を描画する
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
