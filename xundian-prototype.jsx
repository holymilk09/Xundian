import { useState, useEffect, useRef } from "react";

const translations = {
  en: {
    appName: "XúnDiàn",
    tagline: "Smart Field Retail Execution",
    login: "Sign In",
    email: "Email or Phone",
    password: "Password",
    company: "Company Code",
    forgotPassword: "Forgot Password?",
    welcome: "Welcome back",
    todayRoute: "Today's Route",
    stores: "Stores",
    visited: "Visited",
    pending: "Pending",
    overdue: "Overdue",
    discovered: "New Found",
    startRoute: "Start Route",
    optimizeRoute: "Optimize Route",
    nearbyStores: "Nearby Stores",
    searchRadius: "Search Radius",
    checkIn: "Check In",
    takePhoto: "Take Shelf Photo",
    addNotes: "Add Notes",
    stockStatus: "Stock Status",
    inStock: "In Stock",
    lowStock: "Low Stock",
    outOfStock: "Out of Stock",
    addedProduct: "Added Product",
    storeTier: "Store Tier",
    lastVisit: "Last Visit",
    nextVisit: "Next Revisit",
    daysAgo: "days ago",
    daysUntil: "days until",
    storeProfile: "Store Profile",
    visitHistory: "Visit History",
    photos: "Photos",
    notes: "Notes",
    aiAnalysis: "AI Shelf Analysis",
    shelfShare: "Share of Shelf",
    facings: "Facings",
    competitors: "Competitors Detected",
    outOfStockAlert: "Out-of-Stock Alert",
    revisitReminders: "Revisit Reminders",
    dueToday: "Due Today",
    overdueDays: "Overdue",
    dashboard: "Dashboard",
    map: "Map",
    visits: "Visits",
    alerts: "Alerts",
    profile: "Profile",
    dailySummary: "Daily Summary",
    coverage: "Coverage",
    territory: "Territory",
    performance: "Performance",
    visitTarget: "Visit Target",
    completed: "Completed",
    discoveryRate: "Discovery Rate",
    avgTimePerVisit: "Avg Time/Visit",
    mgrDashboard: "Manager Dashboard",
    liveFieldMap: "Live Field Map",
    repTracking: "Rep Tracking",
    teamPerformance: "Team Performance",
    coverageGaps: "Coverage Gaps",
    aiInsights: "AI Insights",
    photosProcessed: "Photos Processed",
    alertsGenerated: "Alerts Generated",
    avgShareOfShelf: "Avg Share of Shelf",
    companySetup: "Company Setup",
    employees: "Employees",
    products: "Product Catalog",
    territories: "Territories",
    settings: "Settings",
    lang: "Language",
    switchLang: "中文",
    logout: "Sign Out",
    scheduleVisit: "Schedule Visit",
    min: "min",
    km: "km",
    reps: "reps",
    active: "active",
    online: "online",
    totalStores: "Total Stores",
    visitedThisWeek: "Visited This Week",
    oosAlerts: "OOS Alerts",
    topPerformer: "Top Performer",
    storeType: "Store Type",
    supermarket: "Supermarket",
    convenience: "Convenience",
    smallShop: "Small Shop",
    inventoryPrediction: "Inventory Prediction",
    predictedStockout: "Predicted Stockout",
    confidence: "Confidence",
    recommended: "Recommended Action",
    restockIn: "Restock within",
    days: "days",
    auditMode: "Audit Mode",
    randomCheck: "Random Spot Check",
    assignAudit: "Assign Audit",
    verifyVisit: "Verify Visit",
  },
  zh: {
    appName: "巡店",
    tagline: "智能终端巡检系统",
    login: "登录",
    email: "邮箱或手机号",
    password: "密码",
    company: "企业代码",
    forgotPassword: "忘记密码？",
    welcome: "欢迎回来",
    todayRoute: "今日路线",
    stores: "门店",
    visited: "已巡检",
    pending: "待巡检",
    overdue: "已逾期",
    discovered: "新发现",
    startRoute: "开始巡检",
    optimizeRoute: "路线优化",
    nearbyStores: "附近门店",
    searchRadius: "搜索范围",
    checkIn: "签到打卡",
    takePhoto: "拍摄货架",
    addNotes: "添加备注",
    stockStatus: "库存状态",
    inStock: "有货",
    lowStock: "库存低",
    outOfStock: "缺货",
    addedProduct: "已上架",
    storeTier: "门店等级",
    lastVisit: "上次巡检",
    nextVisit: "下次巡检",
    daysAgo: "天前",
    daysUntil: "天后",
    storeProfile: "门店档案",
    visitHistory: "巡检记录",
    photos: "照片",
    notes: "备注",
    aiAnalysis: "AI货架分析",
    shelfShare: "货架占比",
    facings: "陈列面数",
    competitors: "发现竞品",
    outOfStockAlert: "缺货预警",
    revisitReminders: "复访提醒",
    dueToday: "今日到期",
    overdueDays: "已逾期",
    dashboard: "工作台",
    map: "地图",
    visits: "巡检",
    alerts: "预警",
    profile: "我的",
    dailySummary: "今日概况",
    coverage: "覆盖率",
    territory: "辖区",
    performance: "绩效",
    visitTarget: "巡检目标",
    completed: "已完成",
    discoveryRate: "拓店率",
    avgTimePerVisit: "平均耗时",
    mgrDashboard: "管理后台",
    liveFieldMap: "实时追踪",
    repTracking: "人员定位",
    teamPerformance: "团队绩效",
    coverageGaps: "覆盖盲区",
    aiInsights: "AI洞察",
    photosProcessed: "处理照片",
    alertsGenerated: "生成预警",
    avgShareOfShelf: "平均货架占比",
    companySetup: "企业设置",
    employees: "员工管理",
    products: "产品目录",
    territories: "辖区管理",
    settings: "设置",
    lang: "语言",
    switchLang: "English",
    logout: "退出登录",
    scheduleVisit: "预约巡检",
    min: "分钟",
    km: "公里",
    reps: "业务员",
    active: "在线",
    online: "在线",
    totalStores: "门店总数",
    visitedThisWeek: "本周已巡检",
    oosAlerts: "缺货预警",
    topPerformer: "最佳业务员",
    storeType: "门店类型",
    supermarket: "超市",
    convenience: "便利店",
    smallShop: "小店",
    inventoryPrediction: "库存预测",
    predictedStockout: "预测缺货",
    confidence: "置信度",
    recommended: "建议操作",
    restockIn: "建议补货",
    days: "天内",
    auditMode: "审核模式",
    randomCheck: "随机抽查",
    assignAudit: "指派审核",
    verifyVisit: "验证巡检",
  },
};

// Mock data
const mockStores = [
  { id: 1, name: { en: "Yonghui Supermarket", zh: "永辉超市" }, tier: "A", type: "supermarket", status: "visited", lat: 31.2304, lng: 121.4737, stockStatus: "inStock", lastVisit: 2, nextVisit: 5, sos: 34, facings: 8 },
  { id: 2, name: { en: "FamilyMart #2891", zh: "全家便利店#2891" }, tier: "B", type: "convenience", status: "pending", lat: 31.2334, lng: 121.4697, stockStatus: "lowStock", lastVisit: 8, nextVisit: 0, sos: 22, facings: 3 },
  { id: 3, name: { en: "Uncle Wang's Shop", zh: "老王小卖部" }, tier: "C", type: "smallShop", status: "overdue", lat: 31.2284, lng: 121.4777, stockStatus: "outOfStock", lastVisit: 25, nextVisit: -4, sos: 0, facings: 0 },
  { id: 4, name: { en: "Carrefour Central", zh: "家乐福中心店" }, tier: "A", type: "supermarket", status: "pending", lat: 31.2354, lng: 121.4817, stockStatus: "inStock", lastVisit: 3, nextVisit: 4, sos: 41, facings: 12 },
  { id: 5, name: { en: "Lawson Nanjing Rd", zh: "罗森南京路店" }, tier: "B", type: "convenience", status: "visited", lat: 31.2314, lng: 121.4757, stockStatus: "inStock", lastVisit: 1, nextVisit: 9, sos: 28, facings: 4 },
  { id: 6, name: { en: "Auntie Li Grocery", zh: "李阿姨杂货店" }, tier: "C", type: "smallShop", status: "discovered", lat: 31.2274, lng: 121.4717, stockStatus: "outOfStock", lastVisit: null, nextVisit: null, sos: 0, facings: 0 },
];

const mockReps = [
  { id: 1, name: { en: "Zhang Wei", zh: "张伟" }, territory: { en: "Pudong District A", zh: "浦东A区" }, visits: 14, target: 18, coverage: 78, online: true },
  { id: 2, name: { en: "Li Na", zh: "李娜" }, territory: { en: "Pudong District B", zh: "浦东B区" }, visits: 17, target: 18, coverage: 92, online: true },
  { id: 3, name: { en: "Wang Jun", zh: "王军" }, territory: { en: "Puxi District A", zh: "浦西A区" }, visits: 11, target: 18, coverage: 64, online: false },
  { id: 4, name: { en: "Chen Mei", zh: "陈梅" }, territory: { en: "Puxi District B", zh: "浦西B区" }, visits: 16, target: 18, coverage: 85, online: true },
];

const tierColors = { A: "#DC2626", B: "#F59E0B", C: "#6B7280" };
const statusColors = { visited: "#10B981", pending: "#3B82F6", overdue: "#EF4444", discovered: "#8B5CF6" };

function App() {
  const [lang, setLang] = useState("en");
  const [screen, setScreen] = useState("login");
  const [role, setRole] = useState("rep"); // rep or manager
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedStore, setSelectedStore] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [searchRadius, setSearchRadius] = useState(2);
  const [showMgrView, setShowMgrView] = useState(false);
  
  const t = translations[lang];

  const toggleLang = () => setLang(lang === "en" ? "zh" : "en");

  // Login screen
  if (screen === "login") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #0F172A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'SF Pro Display', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        
        {/* Floating orb */}
        <div style={{
          position: "absolute", top: "-20%", right: "-10%", width: "500px", height: "500px",
          borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />

        <div style={{ position: "absolute", top: 20, right: 24 }}>
          <button onClick={toggleLang} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
            color: "#94A3B8", padding: "6px 16px", borderRadius: 8, cursor: "pointer",
            fontSize: 13, fontWeight: 500, backdropFilter: "blur(10px)",
          }}>{t.switchLang}</button>
        </div>

        <div style={{
          width: 380, padding: "48px 36px", borderRadius: 20,
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
              fontSize: 28, color: "white",
            }}>巡</div>
            <h1 style={{ color: "white", fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>
              {t.appName}
            </h1>
            <p style={{ color: "#64748B", fontSize: 14, margin: "6px 0 0", fontWeight: 400 }}>
              {t.tagline}
            </p>
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <input placeholder={t.company} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "white", fontSize: 15, outline: "none",
            }} />
            <input placeholder={t.email} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "white", fontSize: 15, outline: "none",
            }} />
            <input type="password" placeholder={t.password} style={{
              padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "white", fontSize: 15, outline: "none",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", margin: "12px 0 24px", alignItems: "center" }}>
            <span style={{ color: "#3B82F6", fontSize: 13, cursor: "pointer" }}>{t.forgotPassword}</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setScreen("main"); setRole("rep"); }} style={{
              flex: 1, padding: "14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
            }}>🏃 {lang === "en" ? "Rep Login" : "业务员登录"}</button>
            <button onClick={() => { setScreen("main"); setRole("manager"); setActiveTab("mgrDashboard"); }} style={{
              flex: 1, padding: "14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)", color: "#94A3B8",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>👔 {lang === "en" ? "Manager" : "管理员"}</button>
          </div>
        </div>
      </div>
    );
  }

  // Store Detail Modal
  const StoreDetail = ({ store }) => (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }} onClick={() => { setSelectedStore(null); setShowCheckIn(false); setShowAI(false); }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto",
        background: "#0F172A", borderRadius: "20px 20px 0 0",
        border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px",
          background: "linear-gradient(180deg, rgba(59,130,246,0.15), transparent)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{
                  background: tierColors[store.tier], color: "white", padding: "2px 10px",
                  borderRadius: 6, fontSize: 12, fontWeight: 700,
                }}>{store.tier}</span>
                <span style={{
                  background: statusColors[store.status] + "22", color: statusColors[store.status],
                  padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                }}>{t[store.status]}</span>
              </div>
              <h3 style={{ color: "white", fontSize: 20, fontWeight: 700, margin: 0 }}>
                {store.name[lang]}
              </h3>
              <p style={{ color: "#64748B", fontSize: 13, margin: "4px 0 0" }}>
                {t[store.type]} · ID #{String(store.id).padStart(5, "0")}
              </p>
            </div>
            <button onClick={() => setSelectedStore(null)} style={{
              background: "rgba(255,255,255,0.1)", border: "none", color: "#94A3B8",
              width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
            }}>✕</button>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ padding: "0 24px 16px", display: "flex", gap: 10 }}>
          {[
            { label: t.shelfShare, value: `${store.sos}%`, color: store.sos > 25 ? "#10B981" : "#EF4444" },
            { label: t.facings, value: store.facings, color: "#3B82F6" },
            { label: t.lastVisit, value: store.lastVisit ? `${store.lastVisit}${lang === "en" ? "d" : "天"}` : "—", color: "#F59E0B" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "14px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              textAlign: "center",
            }}>
              <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {role === "rep" && (
          <div style={{ padding: "0 24px 16px", display: "flex", gap: 10 }}>
            <button onClick={() => setShowCheckIn(true)} style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #10B981, #059669)", color: "white",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>📍 {t.checkIn}</button>
            <button style={{
              flex: 1, padding: "12px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>📷 {t.takePhoto}</button>
          </div>
        )}

        {/* Check-in Confirmation */}
        {showCheckIn && (
          <div style={{
            margin: "0 24px 16px", padding: 20, borderRadius: 16,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <div style={{ color: "#10B981", fontSize: 16, fontWeight: 700 }}>
                  {lang === "en" ? "Checked In!" : "签到成功！"}
                </div>
                <div style={{ color: "#64748B", fontSize: 12 }}>
                  2026-02-09 14:23 · GPS {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                </div>
              </div>
            </div>
            {/* Stock status selector */}
            <div style={{ marginTop: 12 }}>
              <div style={{ color: "#94A3B8", fontSize: 12, marginBottom: 8, fontWeight: 600 }}>{t.stockStatus}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["inStock", "lowStock", "outOfStock", "addedProduct"].map(s => (
                  <button key={s} style={{
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: s === "inStock" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.1)",
                    background: s === "inStock" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                    color: s === "inStock" ? "#10B981" : "#94A3B8", cursor: "pointer",
                  }}>{t[s]}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        <div style={{ padding: "0 24px 16px" }}>
          <button onClick={() => setShowAI(!showAI)} style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, cursor: "pointer",
            background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))",
            border: "1px solid rgba(139,92,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ color: "#A78BFA", fontSize: 14, fontWeight: 600 }}>
              🤖 {t.aiAnalysis}
            </span>
            <span style={{ color: "#64748B", fontSize: 18 }}>{showAI ? "▾" : "▸"}</span>
          </button>
          
          {showAI && (
            <div style={{
              marginTop: 12, padding: 16, borderRadius: 12,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {/* Simulated AI output */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#94A3B8", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                  {t.shelfShare}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${store.sos}%`, height: "100%", borderRadius: 4,
                      background: store.sos > 25 ? "linear-gradient(90deg, #10B981, #34D399)" : "linear-gradient(90deg, #EF4444, #F87171)",
                    }} />
                  </div>
                  <span style={{ color: "white", fontSize: 16, fontWeight: 700, minWidth: 45 }}>{store.sos}%</span>
                </div>
              </div>

              {/* Product breakdown */}
              <div style={{ fontSize: 13 }}>
                {[
                  { name: lang === "en" ? "Haitian Soy Sauce (Light)" : "海天酱油(生抽)", count: Math.max(store.facings - 2, 0), status: "good" },
                  { name: lang === "en" ? "Haitian Soy Sauce (Dark)" : "海天酱油(老抽)", count: Math.min(store.facings, 2), status: "ok" },
                  { name: lang === "en" ? "Haitian Oyster Sauce" : "海天蚝油", count: 0, status: "oos" },
                ].map((p, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <span style={{ color: "#CBD5E1" }}>{p.name}</span>
                    <span style={{
                      color: p.status === "good" ? "#10B981" : p.status === "ok" ? "#F59E0B" : "#EF4444",
                      fontWeight: 600,
                    }}>
                      {p.count > 0 ? `${p.count} ${t.facings}` : t.outOfStock}
                    </span>
                  </div>
                ))}
              </div>

              {/* Competitors */}
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.06)" }}>
                <div style={{ color: "#F87171", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {t.competitors}
                </div>
                <div style={{ color: "#94A3B8", fontSize: 12 }}>
                  {lang === "en" ? "Lee Kum Kee (4 facings) · Chu Bang (3 facings) · Xin He (2 facings)" : "李锦记(4面) · 厨邦(3面) · 欣和(2面)"}
                </div>
              </div>

              {/* Inventory Prediction */}
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(59,130,246,0.06)" }}>
                <div style={{ color: "#60A5FA", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  📊 {t.inventoryPrediction}
                </div>
                <div style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.6 }}>
                  {lang === "en"
                    ? `Based on depletion rate: Oyster Sauce predicted stockout in ~3 days (87% confidence). Recommend revisit within 2 days.`
                    : `根据消耗速率：蚝油预计3天内缺货（87%置信度）。建议2天内复访。`}
                </div>
              </div>

              <div style={{ color: "#475569", fontSize: 11, marginTop: 10, textAlign: "right" }}>
                {lang === "en" ? "Analyzed by Qwen2.5-VL · 0.87 confidence" : "Qwen2.5-VL分析 · 置信度0.87"}
              </div>
            </div>
          )}
        </div>

        {/* Visit Timeline */}
        <div style={{ padding: "0 24px 24px" }}>
          <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            {t.visitHistory}
          </div>
          {[
            { date: "2026-02-07", status: "inStock", note: lang === "en" ? "All products stocked, good placement" : "产品齐全，摆放良好" },
            { date: "2026-01-28", status: "lowStock", note: lang === "en" ? "Oyster sauce running low, 2 bottles left" : "蚝油库存低，剩2瓶" },
            { date: "2026-01-18", status: "addedProduct", note: lang === "en" ? "Added dark soy sauce to shelf" : "已上架老抽" },
          ].map((v, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, marginBottom: 12,
              padding: "12px", borderRadius: 10,
              background: "rgba(255,255,255,0.02)",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0,
                background: v.status === "inStock" ? "#10B981" : v.status === "lowStock" ? "#F59E0B" : "#8B5CF6",
              }} />
              <div>
                <div style={{ color: "#64748B", fontSize: 11 }}>{v.date}</div>
                <div style={{ color: "#CBD5E1", fontSize: 13, marginTop: 2 }}>{v.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Manager Dashboard
  const ManagerDashboard = () => (
    <div style={{ padding: "0 16px 100px" }}>
      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { label: t.totalStores, value: "2,847", icon: "🏪", color: "#3B82F6", delta: "+12" },
          { label: t.visitedThisWeek, value: "1,204", icon: "✅", color: "#10B981", delta: "42%" },
          { label: t.oosAlerts, value: "38", icon: "⚠️", color: "#EF4444", delta: "-5" },
          { label: t.topPerformer, value: lang === "en" ? "Li Na" : "李娜", icon: "🏆", color: "#F59E0B", delta: "92%" },
        ].map((kpi, i) => (
          <div key={i} style={{
            padding: "16px 14px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 20 }}>{kpi.icon}</span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                background: kpi.color + "15", color: kpi.color,
              }}>{kpi.delta}</span>
            </div>
            <div style={{ color: "white", fontSize: 22, fontWeight: 700, marginTop: 8 }}>{kpi.value}</div>
            <div style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <div style={{
        padding: 18, borderRadius: 14, marginBottom: 20,
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))",
        border: "1px solid rgba(139,92,246,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <span style={{ color: "#A78BFA", fontSize: 15, fontWeight: 700 }}>{t.aiInsights}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          {[
            { label: t.photosProcessed, value: "187" },
            { label: t.alertsGenerated, value: "12" },
            { label: t.avgShareOfShelf, value: "31%" },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center",
              background: "rgba(255,255,255,0.05)",
            }}>
              <div style={{ color: "white", fontSize: 18, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "#7C8DB5", fontSize: 10, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{
          padding: 10, borderRadius: 8, background: "rgba(239,68,68,0.08)",
          color: "#F87171", fontSize: 12, lineHeight: 1.5,
        }}>
          ⚠️ {lang === "en"
            ? "4 stores in Pudong District B show oyster sauce OOS. Predicted stockout spreading. Recommend priority revisits."
            : "浦东B区4家门店蚝油缺货，预测缺货蔓延中。建议优先复访。"}
        </div>
      </div>

      {/* Team Performance */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          {t.teamPerformance}
        </div>
        {mockReps.map(rep => (
          <div key={rep.id} style={{
            padding: "14px 16px", borderRadius: 12, marginBottom: 8,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${rep.online ? "#3B82F6" : "#475569"}, ${rep.online ? "#2563EB" : "#334155"})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 14, fontWeight: 700, position: "relative",
            }}>
              {rep.name[lang].charAt(0)}
              {rep.online && <div style={{
                position: "absolute", bottom: -2, right: -2, width: 10, height: 10,
                borderRadius: 5, background: "#10B981", border: "2px solid #0F172A",
              }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{rep.name[lang]}</span>
                <span style={{ color: "#64748B", fontSize: 12 }}>{rep.visits}/{rep.target}</span>
              </div>
              <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>{rep.territory[lang]}</div>
              <div style={{
                marginTop: 6, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden",
              }}>
                <div style={{
                  width: `${rep.coverage}%`, height: "100%", borderRadius: 2,
                  background: rep.coverage > 80 ? "#10B981" : rep.coverage > 60 ? "#F59E0B" : "#EF4444",
                }} />
              </div>
              <div style={{ color: "#475569", fontSize: 10, marginTop: 3 }}>{t.coverage}: {rep.coverage}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Audit Mode */}
      <div style={{
        padding: 16, borderRadius: 14,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ color: "white", fontSize: 15, fontWeight: 700 }}>{t.auditMode}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.08)", color: "#FBBF24", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>🎲 {t.randomCheck}</button>
          <button style={{
            flex: 1, padding: 12, borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)",
            background: "rgba(59,130,246,0.08)", color: "#60A5FA", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>📋 {t.assignAudit}</button>
        </div>
        <p style={{ color: "#64748B", fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
          {lang === "en"
            ? "Random spot checks verify rep accuracy. Select reps and stores for surprise revisit audits with photo comparison."
            : "随机抽查验证业务员准确性。选择业务员和门店进行突击复访审核，对比照片记录。"}
        </p>
      </div>
    </div>
  );

  // Rep Dashboard
  const RepDashboard = () => (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { label: t.visited, value: "8", color: "#10B981" },
          { label: t.pending, value: "6", color: "#3B82F6" },
          { label: t.overdue, value: "2", color: "#EF4444" },
          { label: t.discovered, value: "1", color: "#8B5CF6" },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, padding: "14px 8px", borderRadius: 12, textAlign: "center",
            background: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}22`,
          }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: "#64748B", fontSize: 10, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Route Card */}
      <div style={{
        padding: 18, borderRadius: 16, marginBottom: 20,
        background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(16,185,129,0.08))",
        border: "1px solid rgba(59,130,246,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>🗺️ {t.todayRoute}</span>
          <span style={{ color: "#60A5FA", fontSize: 13 }}>14 {t.stores} · 12.4 {t.km}</span>
        </div>
        <button style={{
          width: "100%", padding: 14, borderRadius: 12, border: "none",
          background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "white",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
        }}>🚀 {t.startRoute}</button>
        <div style={{
          display: "flex", justifyContent: "center", gap: 16, marginTop: 12,
        }}>
          <span style={{ color: "#64748B", fontSize: 12 }}>⏱ ~3.5h</span>
          <span style={{ color: "#64748B", fontSize: 12 }}>📍 {lang === "en" ? "Pudong A" : "浦东A区"}</span>
          <span style={{ color: "#64748B", fontSize: 12 }}>🔄 {t.optimizeRoute}</span>
        </div>
      </div>

      {/* Nearby Search */}
      <div style={{
        padding: 16, borderRadius: 14, marginBottom: 20,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{t.nearbyStores}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#64748B", fontSize: 12 }}>{t.searchRadius}:</span>
            {[1, 2, 5].map(r => (
              <button key={r} onClick={() => setSearchRadius(r)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                background: searchRadius === r ? "#3B82F6" : "rgba(255,255,255,0.05)",
                color: searchRadius === r ? "white" : "#64748B",
                border: searchRadius === r ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}>{r}{t.km}</button>
            ))}
          </div>
        </div>
        <div style={{ color: "#94A3B8", fontSize: 12 }}>
          {lang === "en" ? `Found 23 unvisited stores within ${searchRadius}km` : `${searchRadius}公里内发现23家未巡检门店`}
        </div>
      </div>

      {/* Revisit Reminders */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#94A3B8", fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          {t.revisitReminders}
        </div>
      </div>

      {/* Store List */}
      {mockStores.map(store => (
        <div key={store.id} onClick={() => setSelectedStore(store)} style={{
          padding: "14px 16px", borderRadius: 12, marginBottom: 8, cursor: "pointer",
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", gap: 12,
          transition: "all 0.15s ease",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${statusColors[store.status]}15`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            {store.type === "supermarket" ? "🏬" : store.type === "convenience" ? "🏪" : "🏠"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{store.name[lang]}</span>
              <span style={{
                background: tierColors[store.tier] + "22", color: tierColors[store.tier],
                padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
              }}>{store.tier}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ color: statusColors[store.status], fontSize: 12, fontWeight: 500 }}>
                {t[store.status]}
              </span>
              <span style={{ color: "#475569", fontSize: 11 }}>
                {store.lastVisit !== null ? `${store.lastVisit} ${t.daysAgo}` : "—"}
              </span>
            </div>
          </div>
          <div style={{ color: "#334155", fontSize: 18 }}>›</div>
        </div>
      ))}
    </div>
  );

  // Main Layout
  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F172A",
      fontFamily: "'SF Pro Display', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
      maxWidth: 420,
      margin: "0 auto",
      position: "relative",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 16px 12px",
        background: "rgba(15,23,42,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 14, fontWeight: 700,
              }}>巡</div>
              <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>{t.appName}</span>
            </div>
            <p style={{ color: "#64748B", fontSize: 12, margin: "2px 0 0 36px" }}>
              {t.welcome}, {role === "rep" ? (lang === "en" ? "Zhang Wei" : "张伟") : (lang === "en" ? "Manager Chen" : "陈经理")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={toggleLang} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#94A3B8", padding: "5px 12px", borderRadius: 8, cursor: "pointer",
              fontSize: 12, fontWeight: 500,
            }}>{t.switchLang}</button>
            {role === "rep" && (
              <button onClick={() => { setRole("manager"); setActiveTab("mgrDashboard"); }} style={{
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                color: "#A78BFA", padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 12, fontWeight: 500,
              }}>👔</button>
            )}
            {role === "manager" && (
              <button onClick={() => { setRole("rep"); setActiveTab("dashboard"); }} style={{
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                color: "#34D399", padding: "5px 12px", borderRadius: 8, cursor: "pointer",
                fontSize: 12, fontWeight: 500,
              }}>🏃</button>
            )}
            <button onClick={() => setScreen("login")} style={{
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#F87171", padding: "5px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12,
            }}>⏻</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ paddingTop: 16 }}>
        {role === "manager" ? <ManagerDashboard /> : <RepDashboard />}
      </div>

      {/* Store Detail Modal */}
      {selectedStore && <StoreDetail store={selectedStore} />}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 420, padding: "8px 16px 12px",
        background: "rgba(15,23,42,0.95)", backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", justifyContent: "space-around",
      }}>
        {(role === "rep" 
          ? [
              { id: "dashboard", icon: "📊", label: t.dashboard },
              { id: "map", icon: "🗺️", label: t.map },
              { id: "visits", icon: "📋", label: t.visits },
              { id: "alerts", icon: "🔔", label: t.alerts },
              { id: "profile", icon: "👤", label: t.profile },
            ]
          : [
              { id: "mgrDashboard", icon: "📊", label: t.dashboard },
              { id: "liveMap", icon: "🗺️", label: t.liveFieldMap },
              { id: "employees", icon: "👥", label: t.employees },
              { id: "aiInsights", icon: "🤖", label: t.aiInsights },
              { id: "settings", icon: "⚙️", label: t.settings },
            ]
        ).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            padding: "4px 8px",
          }}>
            <span style={{ fontSize: 20, opacity: activeTab === tab.id ? 1 : 0.4 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: activeTab === tab.id ? "#3B82F6" : "#475569",
            }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
