# GeoVis Mobile 开发规则

> 请在此文件中记录项目的开发约束和规范，便于团队协作和 AI 辅助开发时保持一致。
此规则适用于Web端geoVis项目（路径：F:\系统默认\桌面\Geo_Project\geoVis）的移动端H5页面的开发。
---

## 技术栈约束

- 框架：Vue 3（Composition API + `<script setup>`）
- UI 组件库：Vant 4（禁止引入 Element Plus）
- 构建工具：Vite 5
- 状态管理：Pinia 2
- 路由：vue-router 4
- 地图：暂无限制（H5 浏览器环境，非小程序）
- 可视化：D3.js 7
- 语言：TypeScript
- 后端代理：Flask（127.0.0.1:5000）

---

## 布局与交互约束

- 核心交互：用户点选地图上的邮政网点散点，调整网格范围与网格大小，生成网格。点击网格，展示网格内的主体数据以及POI数据。
- 移动端布局结构：顶部操作栏 → 地图 → 底部
- 顶部操作栏：数据筛选（同网页端的根据经营主体的成立日期进行筛选） + 城市选择 + 网格范围滑块 + 网格大小设置 + 清除按钮
- 地图：主体可视区域，占比60%~70%
- 底部：分为以下两部分。可点击切换展示不同数据。点击单个数据项进行对应详情页面。底部可上滑缩小地图空间，扩大数据展示空间
    - 市场经营主体数据展示
    - 商业兴趣点数据展示
- 最小触控区域：44×44px
- 禁止依赖 hover 交互，全部使用 tap
- 双指缩放地图，单指拖动
- 适配 iOS Safe Area（刘海屏、底部横条）

---

## 移动端特性

- 精简网页端功能，核心是数据展示、统计
- 剔除网页端地图的热力图与聚合点层，仅保留邮政网点的散点层
- 剔除雷达图及权重滑块
- 数据展示：适配移动端风格，以卡片形式展示单条数据，点击可下钻展示详情

---

## 共享代码约束

- Pinia stores（5 个）：从桌面项目 `geoVis/src/store/` 复制，保持同步
- 工具函数（3 个）：从桌面项目 `geoVis/src/utils/` 复制
- 行业 SVG 图标（14 个）：从桌面项目 `geoVis/src/assets/` 复制
- grids.json（55 MB）：禁止直接引用，必须通过 API 按需加载

---

## 性能约束

- 首屏包体积：< 200 KB（gzipped，不含 Leaflet/D3）
- 禁止全量导入图标库，按需引入或使用 SVG
- 大列表使用虚拟滚动
- D3 叠加层限制同时渲染元素数量 ≤ 500

---

## API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/data?source=` | GET | POI 数据 |
| `/api/cal_score` | POST | 网格商业评分 |
| `/api/getPOIDetail` | POST | POI 行业详情 |
| `/api/getIndustry` | POST | 行业树 |
| `/api/getIndustryDetail` | POST | 行业明细表 |
| `/allBank.csv` | GET | 种子数据 |
| `/offline-tiles/{z}/{x}/{y}.png` | GET | 离线地图瓦片 |

---

## 团队分工

### 分支策略

| 分支 | 负责人 | 职责 |
|------|--------|------|
| `ZYJ` | keen-ccc | 地图交互层 |
| `YG` | 队友 | 数据展示层 |
| `main` | — | 合并后的稳定代码 |

### 核心交互链路与职责边界

```
用户点击邮政网点 → 调网格参数 → 生成网格 → 点击网格 → 展示数据
└────── ZYJ ──────┘                  └─────────── YG ───────────┘
     (地图交互层)                           (数据展示层)
```

### ZYJ 分支 — 地图交互层

负责用户操作入口，所有地图上的交互逻辑。

| 文件 | 任务 | 关键 Store |
|------|------|------------|
| `MobileMap.vue` | Leaflet 地图初始化、D3 邮政网点散点层、D3 网格生成与点击交互、GCJ-02 坐标转换 | 写入 `netSelector`、`gridSelector` |
| `TopActionBar.vue` | 城市级联选择器、数据筛选（成立日期+主体类型）、网格范围滑块、网格大小设置、清除网格按钮 | 写入 `netSelector`、`entityFilter` |
| `MainLayout.vue` | 布局完善，provide mapRef 供子组件访问 | — |

### YG 分支 — 数据展示层

负责数据展示出口，监听网格选中变化后加载和渲染数据。

| 文件 | 任务 | 关键 Store |
|------|------|------------|
| `BottomPanel.vue` | 可拖拽展开的底部面板 + 2 个 Tab 切换（市场主体 / 商业POI） | — |
| `EntityDataList.vue` | 监听 `gridSelector` 变化 → 调用 `/api/getIndustry`、`/api/getIndustryDetail` → 卡片列表展示实体数据 → 点击下钻详情 | 读取 `gridSelector`、`entityFilter` |
| `PoiDataList.vue` | 监听 `gridSelector` 变化 → 调用 `/api/getPOIDetail` → 卡片列表展示 POI 数据 → 点击下钻详情 | 读取 `gridSelector`、写入 `poiDetail` |

### Store 接口约定（两分支之间的契约）

| Store | ZYJ 写入 | YG 读取 | 说明 |
|-------|:--:|:--:|------|
| `netSelector` | 网点、范围、网格大小 | — | 用户选中的邮政网点及参数 |
| `gridSelector` | 网格选中/取消、边界坐标 | 监听网格变化触发 API 请求 | **核心连接点** |
| `entityFilter` | 成立日期范围、主体类型 | 筛选参数传给 API | 数据筛选条件 |
| `poiDetail` | — | POI 行业数据 | 存储 API 返回的 POI 数据 |
| `pathSelector` | 高亮路径 ID | — | 雷达图联动（移动端暂不做） |

### 开发顺序建议

1. **ZYJ 先完成**：MobileMap 散点层 + 网格生成 + TopActionBar 控件 → 保证网格可点选
2. **YG 基于此开发**：监听 gridSelector 变化 → 拉取数据 → 卡片展示

