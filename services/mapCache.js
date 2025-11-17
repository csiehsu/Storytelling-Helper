import Location from "../models/location.model.js";

// 這裡儲存地圖的鄰接列表 (全域變數)
// {node: locationId, cost: staminaCost}
let graphCache = {};
// 儲存所有地點的顯示名稱，用於 UI 顯示
// {locationId: name}
let locationNamesCache = {};

/**
 * 啟動時呼叫，從資料庫載入地圖數據並建立快取。
 */
export async function initializeMapCache() {
  console.log("[Cache] 正在初始化地圖數據...");

  try {
    const locations = await Location.find({}).lean();
    const newGraph = {};
    const newNames = {};

    locations.forEach((loc) => {
      const locationId = loc.locationId;

      // 建立圖結構 (鄰接列表)
      newGraph[locationId] = loc.connections.map((conn) => ({
        node: conn.targetLocationId,
        cost: conn.staminaCost,
      }));

      // 建立名稱對照表
      newNames[locationId] = loc.name;
    });

    // 更新全域快取變數
    graphCache = newGraph;
    locationNamesCache = newNames;

    console.log(
      `[Cache] 地圖快取載入成功，共 ${Object.keys(graphCache).length} 個節點。`
    );
  } catch (error) {
    console.error("[Cache] 初始化地圖快取失敗:", error);
    // 如果連線中斷，應用程序可能無法啟動
    throw error;
  }
}

/**
 * 從快取中查找兩個地點之間的直接連線成本。
 * @param {string} sourceId - 起點 ID
 * @param {string} targetId - 終點 ID
 * @returns {number|null} - 體力消耗值，如果沒有直接連線則返回 null
 */
export function getConnectionCostFromCache(sourceId, targetId) {
  const graph = graphCache; // 獲取快取的圖結構

  // 檢查起點是否存在於圖中
  const connections = graph[sourceId];
  if (!connections) {
    return null; // 起點不存在
  }

  // 在 connections 陣列中尋找目標地點
  const connection = connections.find((conn) => conn.node === targetId);

  if (connection) {
    return connection.cost; // 返回 cost
  } else {
    return null; // 沒有直接連線
  }
}

/**
 * 獲取地圖的快取圖結構。
 */
export function getGraphCache() {
  return graphCache;
}

/**
 * 獲取地點名稱的快取。
 */
export function getLocationNamesCache() {
  return locationNamesCache;
}
