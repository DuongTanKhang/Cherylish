"use client";

import type { ReactNode } from "react";
import type { AdminProduct } from "./products-workspace";

type DashboardOrder = {
  id: string;
  customer: string;
  product: string;
  total: number;
  status: string;
  date: string;
  time: string;
};

export type DashboardReport = {
  revenue: number;
  orderCount: number;
  customerCount: number;
  productCount?: number;
  newCustomers: number;
  productsSold: number;
  averageOrderValue: number;
  timeline: Array<{ date: string; revenue: number; orders: number }>;
  categories: Array<{ name: string; revenue: number }>;
  products: Array<{ product: string; sku: string; image: string; sold: number; revenue: number; category: string }>;
  payments: Array<{ method: string; amount: number }>;
  salesChannels: Array<{ channel: string; revenue: number; orders: number }>;
  promotionPerformance: Array<{ name: string; code: string; orders: number; discount: number }>;
  topOrders: Array<{ code: string; customer: string; total: number; placedAt: string }>;
};

type Props = {
  products: AdminProduct[];
  orders: DashboardOrder[];
  customerCount: number;
  report: DashboardReport | null;
  reportLoading: boolean;
  reportError: boolean;
  onOpen: (view: "products" | "orders") => void;
  onSelectOrder: (id: string) => void;
};

const money = (value: number | string) => `${new Intl.NumberFormat("vi-VN").format(Number(value) || 0)} ₫`;
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

function Status({ value }: { value: string }) {
  const tone = /Đã xuất bản|Đang hoạt động|Đang diễn ra|Hoạt động|Còn hàng/i.test(value)
    ? "green"
    : /Bản nháp|Đã lên lịch|Tạm ẩn|Sắp diễn ra|Sắp hết/i.test(value)
      ? "amber"
      : /Đã gỡ bài|Đã kết thúc|Hết hàng|Tạm dừng/i.test(value)
        ? "red"
        : "blue";
  return <span className={`status-pill ${tone}`}>{value || "—"}</span>;
}

function ImageThumb({ src, alt }: { src?: string; alt: string }) {
  return <span className="dashboard-thumb"><span aria-hidden="true">◇</span>{src && <img src={src} alt={alt} loading="lazy" onError={(event) => event.currentTarget.remove()} />}</span>;
}

export default function DashboardWorkspace({ products, orders, customerCount, report, reportLoading, reportError, onOpen, onSelectOrder }: Props) {
  const recentProducts = products.slice(0, 5);
  const recentOrders = orders.slice(0, 5);
  const timeline = report?.timeline || [];
  const chartWidth = 640;
  const chartHeight = 180;
  const chartPadding = 12;
  const maxRevenue = Math.max(...timeline.map((point) => Number(point.revenue) || 0), 1);
  const chartPoints = timeline.map((point, index) => ({
    x: chartPadding + (timeline.length <= 1 ? 0 : index * (chartWidth - chartPadding * 2) / (timeline.length - 1)),
    y: chartHeight - chartPadding - (Number(point.revenue) || 0) / maxRevenue * (chartHeight - chartPadding * 2),
  }));
  const chartLine = chartPoints.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const chartArea = chartPoints.length ? `${chartLine} L${chartPoints[chartPoints.length - 1].x},${chartHeight - chartPadding} L${chartPoints[0].x},${chartHeight - chartPadding} Z` : "";
  const metrics = [
    { label: "Doanh thu · 30 ngày", value: report ? money(report.revenue) : "—", icon: "coins", tone: "amber" },
    { label: "Đơn hàng · 30 ngày", value: report ? report.orderCount : "—", icon: "cart", tone: "green" },
    { label: "Khách hàng · toàn hệ thống", value: report?.customerCount ?? customerCount, icon: "person", tone: "purple" },
    { label: "Sản phẩm · toàn hệ thống", value: report?.productCount ?? products.length, icon: "cube", tone: "blue" },
  ];

  return <>
    <section className="dashboard-primary" aria-label="Chỉ số và hoạt động kinh doanh">
      <article className="panel dashboard-metrics-panel">
        <div className="panel-heading"><h2>Chỉ số cửa hàng</h2></div>
        <div className="dashboard-metrics">
          {metrics.map((metric, index) => <div className="dashboard-metric" key={metric.label}>
            <span className={`kpi-icon ${metric.tone}`} aria-hidden="true"><IconGlyph name={metric.icon}/></span>
            <div className="dashboard-metric-copy"><span className="kpi-label">{metric.label}</span><strong className="kpi-value">{reportError && !report ? "—" : metric.value}</strong></div>
          </div>)}
        </div>
        {reportError && <p className="dashboard-inline-error" role="status">Không thể tải một số chỉ số báo cáo.</p>}
      </article>

      <article className="panel dashboard-activity-panel">
        <div className="panel-heading"><div><h2>Hoạt động kinh doanh</h2><small>Doanh thu theo ngày · 30 ngày gần nhất</small></div></div>
        {reportLoading ? <div className="dashboard-empty" role="status">Đang tải báo cáo…</div> : reportError && !report ? <div className="dashboard-empty dashboard-error-state" role="alert"><span aria-hidden="true">ⓘ</span><strong>Không thể tải dữ liệu doanh thu</strong><small>Thử tải lại trang hoặc kiểm tra kết nối quản trị.</small></div> : timeline.length ? <>
          <div className="dashboard-report-summary"><span>Đã bán <strong>{report?.productsSold ?? 0}</strong> sản phẩm</span><span>Giá trị đơn trung bình <strong>{money(report?.averageOrderValue ?? 0)}</strong></span></div>
          <div className="chart-wrap dashboard-chart-wrap">
            <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Biểu đồ doanh thu theo ngày trong 30 ngày gần nhất" preserveAspectRatio="none">
              <defs><linearGradient id="dashboardChartWash" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#960d2d" stopOpacity=".18"/><stop offset="100%" stopColor="#960d2d" stopOpacity=".015"/></linearGradient></defs>
              <g className="chart-grid"><line x1="0" y1="24" x2={chartWidth} y2="24"/><line x1="0" y1="88" x2={chartWidth} y2="88"/><line x1="0" y1="152" x2={chartWidth} y2="152"/></g>
              {chartArea && <path d={chartArea} fill="url(#dashboardChartWash)"/>}
              {chartLine && <path d={chartLine} className="chart-line"/>}
              {chartPoints.map((point, index) => <circle key={`${timeline[index].date}-${index}`} className="chart-dot" cx={point.x} cy={point.y} r="4"/>)}
            </svg>
          </div>
          <div className="dashboard-chart-dates"><span>{dateLabel(timeline[0].date)}</span><span>{dateLabel(timeline[timeline.length - 1].date)}</span></div>
        </> : <div className="dashboard-empty dashboard-no-data"><span className="dashboard-empty-icon" aria-hidden="true">⌁</span><strong>Chưa có dữ liệu doanh thu</strong><small>Chưa có đơn hàng trong 30 ngày gần nhất.</small></div>}
      </article>
    </section>

    <section className="dashboard-secondary" aria-label="Dữ liệu gần đây">
      <article className="panel dashboard-orders-panel">
        <div className="panel-heading"><h2>Đơn hàng gần đây</h2><button className="panel-link" onClick={() => onOpen("orders")}>Mở đơn hàng →</button></div>
        <div className="page-table-wrap"><table className="orders-table dashboard-orders-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thời gian</th></tr></thead><tbody>
          {recentOrders.length ? recentOrders.map((order) => <tr key={order.id} className="dashboard-order-clickable" tabIndex={0} aria-label={`Xem hóa đơn ${order.id}`} onClick={() => onSelectOrder(order.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectOrder(order.id); } }}><td className="order-id">{order.id}</td><td>{order.customer || "Khách lẻ"}</td><td className="dashboard-order-product" title={order.product}>{order.product || "—"}</td><td className="amount">{money(order.total)}</td><td><Status value={order.status}/></td><td>{order.date} {order.time}</td></tr>) : <tr><td className="table-empty" colSpan={6}><span aria-hidden="true">▱</span> Chưa có đơn hàng.</td></tr>}
        </tbody></table></div>
      </article>

      <article className="panel mini-panel dashboard-list-panel">
        <div className="panel-heading"><div><h2>Sản phẩm mới cập nhật</h2><small>Hiển thị {recentProducts.length} / {products.length}</small></div><button className="panel-link" onClick={() => onOpen("products")}>Mở danh sách →</button></div>
        <div className="dashboard-list">{recentProducts.length ? recentProducts.map((product) => <div className="dashboard-list-item" key={product.apiId || product.id}>
          <ImageThumb src={product.image} alt={product.name}/><div className="dashboard-list-copy"><strong title={product.name}>{product.name}</strong><small>{product.id} · {product.category || product.productType || "Chưa phân loại"}</small><span className="dashboard-list-meta"><Status value={product.status}/><span>Tồn {product.stock}</span></span></div><div className="dashboard-list-value"><strong>{money(product.price)}</strong></div>
        </div>) : <div className="dashboard-empty dashboard-no-data"><span className="dashboard-empty-icon" aria-hidden="true">◇</span><strong>Chưa có sản phẩm</strong></div>}</div>
      </article>
    </section>
  </>;
}

function IconGlyph({ name }: { name: string }) {
  const shapes: Record<string, ReactNode> = {
    coins: <><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 11v5c0 1.7 3.6 3 8 3 1.6 0 3.1-.2 4.4-.5M20 11v4"/><circle cx="19" cy="19" r="3"/></>,
    cart: <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    cube: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{shapes[name] || shapes.cube}</svg>;
}
