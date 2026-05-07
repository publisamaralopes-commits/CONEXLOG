import { Router, type IRouter } from "express";
import { LoadOrder } from "../models/loadOrder";

const router: IRouter = Router();

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Pendente", loading: "Carregando",
    in_transit: "Em Trânsito", delivered: "Entregue", cancelled: "Cancelado",
  };
  return map[s] || s;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    pending: "#f59e0b", loading: "#3b82f6",
    in_transit: "#8b5cf6", delivered: "#10b981", cancelled: "#ef4444",
  };
  return map[s] || "#64748b";
}

function esc(s: unknown) {
  return String(s ?? "—")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d: unknown) {
  if (!d) return "—";
  return new Date(String(d)).toLocaleDateString("pt-BR");
}

router.get("/oc/:orderNumber", async (req, res) => {
  try {
    const order = await LoadOrder.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OC não encontrada</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f1f5f9;margin:0">
<div style="text-align:center"><div style="font-size:64px">📋</div><h2 style="color:#334155">Ordem não encontrada</h2><p style="color:#64748b">${esc(req.params.orderNumber)}</p></div>
</body></html>`);
      return;
    }

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = req.headers.host || "localhost";
    const pageUrl = `${proto}://${host}/api/oc/${esc(order.orderNumber)}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}&bgcolor=ffffff&color=1e3a5f`;
    const cnhImg = order.driver?.cnhImage
      ? `<img src="${order.driver.cnhImage}" style="max-width:160px;max-height:100px;border-radius:6px;border:1px solid #e2e8f0;object-fit:contain" alt="CNH">`
      : '<span style="color:#94a3b8;font-size:.85rem">Não informada</span>';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OC ${esc(order.orderNumber)} — TRANSPANORAMA</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}
.header{background:linear-gradient(135deg,#0f2744 0%,#1e4976 100%);color:#fff;padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.header-brand{display:flex;align-items:center;gap:14px}
.header-icon{width:48px;height:48px;background:#2563eb;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.header-name{font-size:1.3rem;font-weight:800;letter-spacing:.04em}
.header-sub{font-size:.8rem;opacity:.7;margin-top:2px}
.oc-num{font-size:1.1rem;font-weight:700;background:rgba(255,255,255,.15);padding:6px 16px;border-radius:8px;letter-spacing:.05em}
.status-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:20px;font-size:.85rem;font-weight:700;color:#fff}
.container{max-width:860px;margin:0 auto;padding:24px 16px}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden}
.card-head{background:#eff6ff;padding:12px 20px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#1d4ed8;border-bottom:1px solid #dbeafe}
.card-body{padding:0}
.info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0}
.info-cell{padding:14px 20px;border-bottom:1px solid #f1f5f9;border-right:1px solid #f1f5f9}
.info-cell:last-child{border-right:none}
.info-label{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px}
.info-value{font-size:.92rem;font-weight:600;color:#1e293b}
.qr-section{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;padding:20px;border-top:1px solid #f1f5f9}
.qr-label{font-size:.75rem;color:#64748b;text-align:center}
.qr-url{font-size:.7rem;color:#3b82f6;word-break:break-all;text-align:center;max-width:220px}
.footer{text-align:center;color:#94a3b8;font-size:.75rem;padding:20px;margin-top:8px}
@media(max-width:600px){.header{flex-direction:column;align-items:flex-start}.info-grid{grid-template-columns:1fr 1fr}}
@media print{body{background:#fff}.header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="header">
  <div class="header-brand">
    <div class="header-icon">🚛</div>
    <div>
      <div class="header-name">TRANSPANORAMA</div>
      <div class="header-sub">Ordem de Carregamento</div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
    <div class="oc-num">${esc(order.orderNumber)}</div>
    <div class="status-pill" style="background:${statusColor(order.status)}">${statusLabel(order.status)}</div>
  </div>
</div>

<div class="container">
  <div class="card">
    <div class="card-head">Dados do Motorista</div>
    <div class="card-body">
      <div class="info-grid">
        <div class="info-cell"><div class="info-label">Nome</div><div class="info-value">${esc(order.driver?.name)}</div></div>
        <div class="info-cell"><div class="info-label">CPF</div><div class="info-value">${esc(order.driver?.cpf)}</div></div>
        <div class="info-cell"><div class="info-label">Telefone</div><div class="info-value">${esc(order.driver?.phone)}</div></div>
        <div class="info-cell"><div class="info-label">Nº CNH</div><div class="info-value">${esc(order.driver?.cnhNumber)}</div></div>
        <div class="info-cell"><div class="info-label">Validade CNH</div><div class="info-value">${esc(order.driver?.cnhExpiry)}</div></div>
        <div class="info-cell"><div class="info-label">Foto CNH</div><div class="info-value">${cnhImg}</div></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">Dados do Veículo</div>
    <div class="card-body">
      <div class="info-grid">
        <div class="info-cell"><div class="info-label">Placa</div><div class="info-value">${esc(order.vehicle?.plate)}</div></div>
        <div class="info-cell"><div class="info-label">Tipo</div><div class="info-value">${esc(order.vehicle?.type)}</div></div>
        <div class="info-cell"><div class="info-label">Modelo</div><div class="info-value">${esc(order.vehicle?.model)}</div></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-head">Dados da Carga</div>
    <div class="card-body">
      <div class="info-grid">
        <div class="info-cell" style="grid-column:1/-1"><div class="info-label">Descrição</div><div class="info-value">${esc(order.cargo?.description)}</div></div>
        <div class="info-cell"><div class="info-label">Origem</div><div class="info-value">${esc(order.cargo?.origin)}</div></div>
        <div class="info-cell"><div class="info-label">Destino</div><div class="info-value">${esc(order.cargo?.destination)}</div></div>
        <div class="info-cell"><div class="info-label">Peso</div><div class="info-value">${esc(order.cargo?.weight)} kg</div></div>
        <div class="info-cell"><div class="info-label">Volume</div><div class="info-value">${esc(order.cargo?.volume) || "—"} m³</div></div>
        ${order.cargo?.notes ? `<div class="info-cell" style="grid-column:1/-1"><div class="info-label">Observações</div><div class="info-value">${esc(order.cargo.notes)}</div></div>` : ""}
      </div>
    </div>
  </div>

  <div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:20px 24px">
    <div>
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px">Emitida em</div>
      <div style="font-size:.95rem;font-weight:600">${fmtDate(order.createdAt)}</div>
    </div>
    <div class="qr-section" style="padding:0;border:none">
      <img src="${qrSrc}" alt="QR Code" style="border:1px solid #e2e8f0;border-radius:8px;padding:6px;background:#fff" width="130" height="130">
      <div class="qr-label">Escaneie para ver esta OC</div>
      <div class="qr-url">${pageUrl}</div>
    </div>
  </div>
</div>

<div class="footer">TRANSPANORAMA Logística &amp; Transporte • Documento gerado automaticamente em ${new Date().toLocaleDateString("pt-BR")}</div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    req.log.error(err, "Failed to render OC page");
    res.status(500).send("Erro interno");
  }
});

export default router;
