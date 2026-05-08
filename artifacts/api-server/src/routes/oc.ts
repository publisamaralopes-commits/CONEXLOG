import { Router, type IRouter } from "express";
import { LoadOrder } from "../models/loadOrder";

const router: IRouter = Router();

const COMPANY = {
  name: "TRANSPANORAMA TRANSPORTES S.A.",
  cnpj: "01.937.440/0012-95",
  ie: "107040840",
  address: "V EX JULIO BORGES DE SOUZA",
  bairro: "N. S. DA SAÚDE",
  cidade: "ITUMBIARA - GO",
  cep: "75.520-375",
  tel: "(44) 3261-0000",
  logo: "https://www.transpanorama.com.br/wp-content/uploads/2020/10/logo-transpanorama.png",
};

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "#f59e0b" },
  loading: { label: "Carregando", color: "#3b82f6" },
  in_transit: { label: "Em Trânsito", color: "#8b5cf6" },
  delivered: { label: "Entregue", color: "#10b981" },
  cancelled: { label: "Cancelado", color: "#ef4444" },
};

function esc(s: unknown) {
  return String(s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function row(label: string, value: unknown) {
  return `<tr><td class="lbl">${label}</td><td class="val">${esc(value)}</td></tr>`;
}

router.get("/oc/:orderNumber", async (req, res) => {
  try {
    const order = await LoadOrder.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OC não encontrada</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#080e1e;margin:0;color:#fff}
.box{text-align:center}.icon{font-size:64px}.msg{font-size:1.2rem;color:#60a5fa;margin-top:12px}</style></head>
<body><div class="box"><div class="icon">📋</div><div class="msg">Ordem ${esc(req.params.orderNumber)} não encontrada</div></div></body></html>`);
      return;
    }

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = req.headers.host || "localhost";
    const pageUrl = `${proto}://${host}/api/oc/${esc(order.orderNumber)}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}&bgcolor=0a1628&color=60a5fa`;
    const st = statusMap[order.status] || { label: order.status, color: "#64748b" };
    const tipoMap: Record<string, string> = { graneleiro: "Graneleiro", cacamba: "Caçamba" };
    const cnhImg = order.driver?.cnhImage
      ? `<img src="${order.driver.cnhImage}" style="max-width:200px;max-height:120px;border-radius:8px;border:1px solid rgba(96,165,250,.3);object-fit:contain" alt="CNH">`
      : `<span style="color:#475569">Não informada</span>`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OC ${esc(order.orderNumber)} — TRANSPANORAMA</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080e1e;color:#e2e8f0;min-height:100vh}
.header{background:linear-gradient(135deg,#0d1829 0%,#0f2040 100%);border-bottom:2px solid rgba(96,165,250,.2);padding:20px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.header-left{display:flex;align-items:center;gap:16px}
.logo{height:52px;object-fit:contain;filter:brightness(1.1)}
.brand{font-family:'Poppins',sans-serif}
.brand-name{font-size:1.1rem;font-weight:700;color:#fff}
.brand-cnpj{font-size:.7rem;color:#60a5fa;margin-top:2px}
.brand-addr{font-size:.7rem;color:#94a3b8;margin-top:1px}
.oc-block{text-align:right}
.oc-num{font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:800;color:#f97316;letter-spacing:.06em}
.oc-label{font-size:.65rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em}
.status-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:20px;font-size:.8rem;font-weight:700;color:#fff;margin-top:6px;border:1px solid transparent}
.container{max-width:860px;margin:0 auto;padding:24px 16px}
.section-card{background:#0d1829;border:1px solid rgba(59,130,246,.15);border-radius:12px;margin-bottom:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.4)}
.section-head{background:rgba(30,58,138,.3);padding:10px 20px;font-family:'Poppins',sans-serif;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#60a5fa;border-bottom:1px solid rgba(59,130,246,.15)}
table.info{width:100%;border-collapse:collapse;font-size:.85rem}
table.info td{padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.04)}
table.info td.lbl{width:35%;font-weight:600;color:#94a3b8;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}
table.info td.val{color:#f1f5f9;font-weight:500}
table.info tr:last-child td{border-bottom:none}
.bottom-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;padding:20px 24px;background:#0d1829;border:1px solid rgba(59,130,246,.15);border-radius:12px}
.qr-block{text-align:center}
.qr-block img{border:1px solid rgba(96,165,250,.2);border-radius:8px;padding:6px;background:#0a1628}
.qr-label{font-size:.68rem;color:#60a5fa;margin-top:6px;font-weight:600}
.qr-url{font-size:.65rem;color:#475569;word-break:break-all;max-width:180px}
.footer{text-align:center;color:#334155;font-size:.72rem;padding:20px;margin-top:8px}
.conex-tag{color:#f97316;font-weight:700}
@media(max-width:600px){.header{flex-direction:column;align-items:flex-start}.oc-block{text-align:left}}
@media print{body{background:#fff!important}*{color:#000!important}.section-card{border:1px solid #ddd!important;background:#fff!important}.section-head{background:#f0f4ff!important;color:#1d4ed8!important}}
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <img src="${COMPANY.logo}" class="logo" alt="TRANSPANORAMA" onerror="this.style.display='none'">
    <div class="brand">
      <div class="brand-name">${COMPANY.name}</div>
      <div class="brand-cnpj">CNPJ: ${COMPANY.cnpj} &nbsp;|&nbsp; I.E.: ${COMPANY.ie}</div>
      <div class="brand-addr">${COMPANY.address}, ${COMPANY.bairro} — ${COMPANY.cidade} | CEP ${COMPANY.cep} | Tel: ${COMPANY.tel}</div>
    </div>
  </div>
  <div class="oc-block">
    <div class="oc-label">Ordem de Carregamento</div>
    <div class="oc-num">${esc(order.orderNumber)}</div>
    <div><span class="status-pill" style="background:${st.color}22;border-color:${st.color}44;color:${st.color}">${st.label}</span></div>
  </div>
</div>

<div class="container">
  <div class="section-card">
    <div class="section-head">Dados do Motorista</div>
    <table class="info">
      ${row("Nome", order.driver?.nome)}
      ${row("CPF", order.driver?.cpf)}
      ${row("Nº CNH", order.driver?.cnhNumber)}
      <tr><td class="lbl">Foto CNH</td><td class="val">${cnhImg}</td></tr>
    </table>
  </div>

  <div class="section-card">
    <div class="section-head">Dados do Veículo</div>
    <table class="info">
      ${row("Placa Cavalo", order.vehicle?.placaCavalo)}
      ${row("Carreta 1", order.vehicle?.carreta1)}
      ${row("Carreta 2", order.vehicle?.carreta2)}
      ${row("Carreta 3", order.vehicle?.carreta3)}
      ${row("Tipo de Veículo", tipoMap[order.vehicle?.tipoVeiculo] || order.vehicle?.tipoVeiculo)}
    </table>
  </div>

  <div class="section-card">
    <div class="section-head">Dados da Carga</div>
    <table class="info">
      ${row("Produto", order.cargo?.produto)}
      ${row("Peso", order.cargo?.peso)}
      ${row("Cliente", order.cargo?.cliente)}
      ${row("Remetente", order.cargo?.remetente)}
      ${row("Origem", order.cargo?.origem)}
      ${row("Destinatário", order.cargo?.destinatario)}
      ${row("Destino", order.cargo?.destino)}
    </table>
  </div>

  <div class="bottom-row">
    <div>
      <div style="font-size:.7rem;color:#475569;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Emitida em</div>
      <div style="font-size:1rem;font-weight:600;color:#f1f5f9">${new Date(order.createdAt).toLocaleDateString("pt-BR")}</div>
      <div style="font-size:.78rem;color:#475569;margin-top:4px">CONEX — Comunicação Integrada</div>
    </div>
    <div class="qr-block">
      <img src="${qrSrc}" alt="QR Code" width="130" height="130">
      <div class="qr-label">Escaneie para verificar</div>
      <div class="qr-url">${pageUrl}</div>
    </div>
  </div>
</div>

<div class="footer">
  <span class="conex-tag">CONEX</span> — Comunicação Integrada &nbsp;|&nbsp; ${COMPANY.name} &nbsp;|&nbsp;
  Documento gerado em ${new Date().toLocaleDateString("pt-BR")}
</div>
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
