import { getGraphCache } from "./mapCache.js";

/**
 * 使用 Dijkstra 演算法計算最短路徑和最小體力消耗。
 * @param {string} startLocationId - 起點的地點 ID (Slug)
 * @param {string} endLocationId - 終點的地點 ID (Slug)
 * @returns {object|null} - { path: [Array of Location IDs], totalCost: Number } 或 null
 */
export async function findShortestPath(startLocationId, endLocationId) {
  if (startLocationId === endLocationId) {
    return { path: [startLocationId], totalCost: 0 };
  }

  // 1. 從 cache 中讀取圖結構
  const graph = getGraphCache();

  if (!graph || Object.keys(graph).length === 0) {
    throw new Error("地圖緩存尚未初始化或為空。");
  }

  // 檢查起點和終點是否存在於圖中
  if (!graph[startLocationId] || !graph[endLocationId]) {
    // 如果地點不存在於圖中，則無法計算
    return null;
  }

  // 2. 初始化 Dijkstra 變數
  const distances = {}; // 儲存從起點到每個節點的最小消耗
  const paths = {}; // 儲存到達每個節點的前一個節點
  const unvisited = new Set(Object.keys(graph)); // 未訪問的節點集合

  Object.keys(graph).forEach((node) => {
    distances[node] = Infinity;
    paths[node] = null;
  });
  distances[startLocationId] = 0; // 起點到自己的距離為 0

  // 3. 執行 Dijkstra 主迴圈
  while (unvisited.size > 0) {
    // 找到未訪問節點中距離最小的節點 (通常用 Priority Queue，這裡用簡單遍歷)
    let minDistance = Infinity;
    let closestNode = null;

    unvisited.forEach((node) => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        closestNode = node;
      }
    });

    if (closestNode === null) break; // 無法到達其他節點
    unvisited.delete(closestNode);

    // 如果找到終點，結束迴圈
    if (closestNode === endLocationId) break;

    // 遍歷鄰居節點
    if (graph[closestNode]) {
      graph[closestNode].forEach((neighbor) => {
        const newDistance = distances[closestNode] + neighbor.cost;

        // 鬆弛操作 (Relaxation)：如果找到一條更短的路徑
        if (newDistance < distances[neighbor.node]) {
          distances[neighbor.node] = newDistance;
          paths[neighbor.node] = closestNode;
        }
      });
    }
  }

  // 4. 重建路徑
  if (distances[endLocationId] === Infinity) {
    return null; // 無法到達
  }

  const path = [];
  let current = endLocationId;
  while (current) {
    path.unshift(current); // 將節點加到路徑的開頭
    current = paths[current];
  }

  return {
    path: path,
    totalCost: distances[endLocationId],
  };
}

/**
 * 設定兩個地點之間的對稱（雙向）體力消耗。
 * 這是您應該使用的主要工具函式。
 * @param {string} locAId - 地點 A 的 ID
 * @param {string} locBId - 地點 B 的 ID
 * @param {number} cost - 雙向的體力消耗值
 */
export async function setSymmetricalConnectionCost(locAId, locBId, cost) {
  if (locAId === locBId) {
    throw new Error("無法建立地點與自身的連線。");
  }

  try {
    console.log(
      `--- 開始設置對稱連線：${locAId} <-> ${locBId}，消耗：${cost} ---`
    );

    // 1. 更新 A -> B
    await setSingleConnection(locAId, locBId, cost);

    // 2. 更新 B -> A (保證對稱性)
    await setSingleConnection(locBId, locAId, cost);

    // 3. 重新載入記憶體緩存
    await initializeMapCache();

    console.log("地圖連線設置成功並重新載入。");
  } catch (error) {
    console.error("設置連線時發生錯誤:", error);
    throw error;
  }
}
