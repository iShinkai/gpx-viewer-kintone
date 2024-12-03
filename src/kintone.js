/**
 * ============================================================
 *     gpx-viewer kintone関連関数群
 * ============================================================
 */

/**
 * - - - - - - - - - - - - - - - - - - - -
 * インポート
 * - - - - - - - - - - - - - - - - - - - -
 */

/** kintone REST API Client */
import { KintoneRestAPIClient } from '@kintone/rest-api-client'

/**
 * - - - - - - - - - - - - - - - - - - - -
 * 関数
 * - - - - - - - - - - - - - - - - - - - -
 */

/**
 * 指定のクエリに基づきアプリのレコードを一括取得して返却する
 */
export const getAppRecordsByQuery = async (query) => {
  console.log('指定のクエリに基づきアプリのレコードを一括取得して返却する')
  console.log(query)

  // kintone REST API Client
  const client = new KintoneRestAPIClient()

  // 取得パラメータを準備する
  const params = {
    app: kintone.app.getId(),
  }
  if (query.includes('order by ')) {
    params.condition = query.substring(0, query.indexOf('order by '))
    params.orderBy = query.substring(query.indexOf('order by ') + 9)
  } else {
    params.condition = query
  }
  console.log(params)

  // 指定のパラメータでレコードを一括取得する
  const records = await client.record.getAllRecords(params)
  console.log(records)

  // 返却
  return records
}

/**
 * ファイルをダウンロードしバッファを返却する
 */
export const downloadFile = async (file) => {
  // kintone REST API Client でファイルを取得する
  const client = new KintoneRestAPIClient()
  const arrayBuffer = await client.file.downloadFile({
    fileKey: file.fileKey,
  })

  // 返却
  return arrayBuffer
}

/**
 * XMLファイルを取得し文字列で返却する
 */
export const loadXmlFileToText = async (file) => {
  const arrayBuffer = await downloadFile(file)
  const textDecoder = new TextDecoder()
  const xmlStr = textDecoder.decode(arrayBuffer)

  // 返却
  return xmlStr
}

/**
 * 画像ファイルを取得し Blob で返却する
 */
export const loadImageFileToBlob = async (file) => {
  const arrayBuffer = await downloadFile(file)
  const blob = new Blob([arrayBuffer])

  // 返却
  return blob
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
