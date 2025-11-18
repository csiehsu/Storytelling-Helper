import Location from "../models/location.model.js";

// 這裡儲存地圖的鄰接列表 (全域變數)
let graphCache = {};
// 儲存所有地點的顯示名稱，用於 UI 顯示
let locationNamesCache = {};
// 儲存任兩點最短路徑的快取
let shortestPathCache = {};
// 儲存地點事件標記快取 { 'TOWN': true, 'FOREST': false, ... }
let eventCache = {};

/**
 * 啟動時呼叫，從資料庫載入地圖數據並建立快取。
 */
export async function initializeMapCache() {
  console.log("[Cache] 正在初始化地圖數據...");

  try {
    const locations = await Location.find({}).lean();
    const newGraph = {};
    const newNames = {};
    const newEvents = {};

    locations.forEach((loc) => {
      const locationId = loc.locationId;

      // 建立圖結構 (鄰接列表)
      newGraph[locationId] = loc.connections.map((conn) => ({
        node: conn.targetLocationId,
        cost: conn.staminaCost,
      }));

      // 建立名稱對照表
      newNames[locationId] = loc.name;

      // 建立事件標記快取
      newEvents[locationId] = loc.hasEvent;
    });

    // 更新全域快取變數
    graphCache = newGraph;
    locationNamesCache = newNames;
    eventCache = newEvents;

    console.log(
      `[Cache] 地圖快取載入成功，共 ${
        Object.keys(graphCache).length
      } 個節點。開始預計算任兩點最短路徑...`
    );

    // 執行 Floyd-Warshall 計算
    const nodes = Object.keys(graphCache);
    const V = nodes.length;
    const idToIndex = nodes.reduce((map, id, index) => {
      map[id] = index;
      return map;
    }, {});

    // 初始化距離和路徑矩陣
    const dist = Array(V)
      .fill(0)
      .map(() => Array(V).fill(Infinity));
    //  next 矩陣：儲存從 i 到 j 的最短路徑中，i 之後的下一個節點的索引
    const next = Array(V)
      .fill(0)
      .map(() => Array(V).fill(null));

    // 填充初始值 (直接連線)
    nodes.forEach((u, i) => {
      dist[i][i] = 0; // 自己到自己的距離為 0

      graphCache[u].forEach((connection) => {
        const j = idToIndex[connection.node];
        if (j !== undefined) {
          dist[i][j] = connection.cost;
          next[i][j] = j; // 下一個節點就是 j (因為是直接連線)
        }
      });
    });

    // Floyd-Warshall 主迴圈
    for (let k = 0; k < V; k++) {
      for (let i = 0; i < V; i++) {
        for (let j = 0; j < V; j++) {
          if (
            dist[i][k] !== Infinity &&
            dist[k][j] !== Infinity &&
            dist[i][k] + dist[k][j] < dist[i][j]
          ) {
            dist[i][j] = dist[i][k] + dist[k][j];
            // 關鍵：如果通過 k 有更短的路徑，則更新 i 到 j 的下一個節點為 i 到 k 的下一個節點
            next[i][j] = next[i][k];
          }
        }
      }
    }

    // 轉換結果到 shortestPathCache
    const newPathCache = {};
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        const startId = nodes[i];
        const endId = nodes[j];
        const cost = dist[i][j];

        if (cost !== Infinity) {
          // 重建路徑
          const path = [];
          let currIndex = i; // 當前節點的索引

          // 只有當不是自己到自己時才需要重建路徑
          if (currIndex !== j) {
            // 使用 next 矩陣，從起點開始追蹤路徑
            while (currIndex !== j) {
              path.push(nodes[currIndex]); // 將當前節點 ID 加入路徑
              const nextIndex = next[currIndex][j];

              // 如果 nextIndex 是 null，表示無法到達 (雖然在 cost != Infinity 時不應該發生)
              if (nextIndex === null || nextIndex === undefined) break;

              currIndex = nextIndex; // 移動到下一個節點
            }
            path.push(endId); // 將終點加入路徑
          } else {
            path.push(startId); // 自己到自己
          }

          newPathCache[`${startId}_to_${endId}`] = {
            path: path, // path 是完整的節點 ID 陣列
            cost: cost,
          };
        }
      }
    }

    shortestPathCache = newPathCache;
    console.log(
      `[快取] 全地圖最短路徑預計算完成，共儲存 ${
        Object.keys(shortestPathCache).length
      } 條路徑。`
    );
  } catch (error) {
    console.error("[Cache] 初始化地圖快取失敗:", error);
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
 * 重新整理：更新地點的事件標記快取。
 */
export async function refreshEventCache() {
  console.log("[快取] 正在重新整理事件快取...");

  try {
    // 只查詢需要的欄位
    const locations = await Location.find(
      {},
      { locationId: 1, hasEvent: 1 }
    ).lean();
    const newEvents = {};

    locations.forEach((loc) => {
      newEvents[loc.locationId] = loc.hasEvent;
    });

    // 更新事件快取變數
    eventCache = newEvents;

    console.log("[快取] 事件快取已重新整理。");
  } catch (error) {
    console.error("[快取] 事件快取重新整理失敗:", error);
    throw error;
  }
}

/**
 *存取地圖的快取圖結構。
 */
export function getGraphCache() {
  return graphCache;
}

/**
 * 存取地點名稱的快取。
 */
export function getLocationNamesCache() {
  return locationNamesCache;
}

/**
 * 儲存任兩點最短路徑的快取
 */
export function getShortestPathFromCache(startId, endId) {
  return shortestPathCache[`${startId}_to_${endId}`] || null;
}

/**
 * 存取地點事件標記快取。
 */
export function hasEvent(locationId) {
  return eventCache[locationId] || false;
}
