import { Router, type IRouter } from "express";
import { LoadOrder } from "../models/loadOrder";

const router: IRouter = Router();

const COMPANY = {
  name: "TRANSPANORAMA TRANSPORTES S.A.",
  cnpj: "01.937.440/0012-95",
  ie: "107040840",
  address: "V EX JULIO BORGES DE SOUZA, N. S. DA SAÚDE",
  cidade: "ITUMBIARA - GO",
  cep: "75.520-375",
  tel: "(44) 3261-0000",
  logo: "https://www.transpanorama.com.br/wp-content/uploads/2020/10/logo-transpanorama.png",
};

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: "Pendente",    color: "#f59e0b", bg: "#f59e0b22" },
  loading:    { label: "Carregando",  color: "#3b82f6", bg: "#3b82f622" },
  in_transit: { label: "Em Trânsito", color: "#8b5cf6", bg: "#8b5cf622" },
  delivered:  { label: "Entregue",    color: "#10b981", bg: "#10b98122" },
  cancelled:  { label: "Cancelado",   color: "#ef4444", bg: "#ef444422" },
};

const tipoMap: Record<string, string> = { graneleiro: "Graneleiro", cacamba: "Caçamba" };

function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function row(label: string, value: unknown, span = false) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return `<tr><td class="lbl">${label}</td><td class="val"${span ? ' colspan="3"' : ""}>${esc(v)}</td></tr>`;
}

router.get("/oc/:orderNumber", async (req, res) => {
  const autoPrint = req.query.print === "1";

  try {
    const order = await LoadOrder.findOne({ orderNumber: req.params.orderNumber });
    if (!order) {
      res.status(404).send(`<!DOCTYPE html><html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OC não encontrada — CONEX</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#080e1e;color:#e2e8f0}
.box{text-align:center;padding:40px}.icon{font-size:72px;margin-bottom:20px}.t{font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:700;color:#60a5fa}
.s{color:#475569;margin-top:8px;font-size:.9rem}.n{color:#f97316;font-weight:700}</style></head>
<body><div class="box"><div class="icon">📋</div><div class="t">Ordem não encontrada</div>
<div class="s">A OC <span class="n">${esc(req.params.orderNumber)}</span> não existe ou foi excluída.</div></div></body></html>`);
      return;
    }

    const proto = (req.headers["x-forwarded-proto"] as string) || "https";
    const host = req.headers.host || "localhost";
    const pageUrl = `${proto}://${host}/api/oc/${esc(order.orderNumber)}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pageUrl)}&bgcolor=ffffff&color=0f172a&margin=6`;
    const st = statusMap[order.status] || { label: order.status, color: "#64748b", bg: "#64748b22" };

    const cnhImg = order.driver?.cnhImage
      ? `<img src="${order.driver.cnhImage}" style="max-width:220px;max-height:130px;border-radius:8px;border:1px solid rgba(96,165,250,.3);object-fit:contain" alt="CNH">`
      : `<span style="color:#64748b;font-style:italic">Não informada</span>`;

    const vehicleRows = [
      row("Placa Cavalo", order.vehicle?.placaCavalo),
      row("Tipo de Veículo", tipoMap[order.vehicle?.tipoVeiculo ?? ""] || order.vehicle?.tipoVeiculo),
      ...(order.vehicle?.carreta1 ? [row("Carreta 1", order.vehicle.carreta1)] : []),
      ...(order.vehicle?.carreta2 ? [row("Carreta 2", order.vehicle.carreta2)] : []),
      ...(order.vehicle?.carreta3 ? [row("Carreta 3", order.vehicle.carreta3)] : []),
    ].join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OC ${esc(order.orderNumber)} — TRANSPANORAMA</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080e1e;color:#e2e8f0;min-height:100vh;padding-bottom:80px}

/* ── HEADER ── */
.header{background:linear-gradient(135deg,#0a1628 0%,#0f2040 100%);border-bottom:2px solid rgba(96,165,250,.25);padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px}
.header-left{display:flex;align-items:center;gap:16px}
.logo{height:48px;object-fit:contain;filter:brightness(1.05)}
.brand-name{font-family:'Poppins',sans-serif;font-size:1rem;font-weight:700;color:#f1f5f9}
.brand-sub{font-size:.68rem;color:#60a5fa;margin-top:2px}
.brand-addr{font-size:.66rem;color:#64748b;margin-top:1px}
.oc-badge{text-align:right}
.oc-num{font-family:'Poppins',sans-serif;font-size:1.5rem;font-weight:800;color:#f97316;letter-spacing:.05em}
.oc-label{font-size:.62rem;color:#64748b;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:.78rem;font-weight:700;border:1px solid transparent;margin-top:6px}

/* ── LAYOUT ── */
.container{max-width:900px;margin:0 auto;padding:20px 16px}
.card{background:#0d1829;border:1px solid rgba(59,130,246,.15);border-radius:12px;margin-bottom:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.4)}
.card-head{background:rgba(30,58,138,.3);padding:9px 20px;font-family:'Poppins',sans-serif;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#60a5fa;border-bottom:1px solid rgba(59,130,246,.12);display:flex;align-items:center;gap:8px}
table.info{width:100%;border-collapse:collapse}
table.info td{padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem}
table.info td.lbl{width:36%;font-weight:600;color:#94a3b8;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
table.info td.val{color:#f1f5f9;font-weight:500;word-break:break-word}
table.info tr:last-child td{border-bottom:none}

/* ── BOTTOM ROW ── */
.bottom-row{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:20px 24px;background:#0d1829;border:1px solid rgba(59,130,246,.15);border-radius:12px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:4px}
.sig-line{border-top:1px solid rgba(255,255,255,.15);padding-top:6px;text-align:center;font-size:.7rem;color:#475569;text-transform:uppercase;letter-spacing:.04em}
.qr-block{text-align:center;flex-shrink:0}
.qr-block img{border:4px solid #1e3a5f;border-radius:10px;background:#fff;padding:4px}
.qr-label{font-size:.68rem;color:#60a5fa;margin-top:8px;font-weight:600}
.qr-url{font-size:.6rem;color:#334155;word-break:break-all;max-width:180px;margin:0 auto;margin-top:3px}

/* ── ACTION BAR ── */
.action-bar{position:fixed;bottom:0;left:0;right:0;background:rgba(4,8,15,.95);border-top:1px solid rgba(96,165,250,.2);padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;backdrop-filter:blur(12px);z-index:100}
.action-bar .info-txt{font-size:.78rem;color:#475569}
.action-bar .info-txt strong{color:#f97316}
.btn-print{background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:9px;padding:10px 24px;font-family:'Poppins',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all .2s;box-shadow:0 2px 16px rgba(249,115,22,.3)}
.btn-print:hover{transform:translateY(-1px);box-shadow:0 4px 24px rgba(249,115,22,.4)}
.btn-share{background:rgba(56,189,248,.1);color:#38bdf8;border:1px solid rgba(56,189,248,.25);border-radius:9px;padding:10px 18px;font-family:'Poppins',sans-serif;font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s}
.btn-share:hover{background:rgba(56,189,248,.18)}
.conex-badge{font-size:.72rem;color:#1e3a5f;font-family:'Poppins',sans-serif;font-weight:600;letter-spacing:.04em}
.conex-badge span{color:#f97316}

/* ── FOOTER ── */
.footer{text-align:center;color:#1e3a5f;font-size:.7rem;padding:16px;margin-top:6px}

/* ── RESPONSIVE ── */
@media(max-width:640px){
  .header{flex-direction:column;align-items:flex-start}
  .oc-badge{text-align:left}
  .bottom-row{grid-template-columns:1fr}
  .qr-block{display:flex;flex-direction:column;align-items:center}
  .signatures{grid-template-columns:1fr}
  table.info td{padding:8px 14px}
}

/* ── PRINT ── */
@media print{
  body{background:#fff!important;color:#000!important;padding-bottom:0}
  .header{background:#f0f4ff!important;border-bottom:2px solid #f97316!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .brand-name,.oc-num{color:#0f172a!important}
  .brand-sub{color:#1d4ed8!important}
  .card{border:1px solid #ddd!important;background:#fff!important;box-shadow:none!important}
  .card-head{background:#eff6ff!important;color:#1d4ed8!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  table.info td.lbl{color:#64748b!important}
  table.info td.val{color:#0f172a!important}
  .bottom-row{background:#fff!important;border:1px solid #ddd!important}
  .sig-line{border-top:1px solid #999!important;color:#64748b!important}
  .qr-url{color:#64748b!important}
  .action-bar,.footer{display:none!important}
  .status-pill{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .qr-block img{border-color:#ddd!important;background:#fff!important}
}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <img src="${COMPANY.logo}" class="logo" alt="TRANSPANORAMA" onerror="this.style.display='none'">
    <div>
      <div class="brand-name">${COMPANY.name}</div>
      <div class="brand-sub">CNPJ: ${COMPANY.cnpj} &nbsp;·&nbsp; I.E.: ${COMPANY.ie}</div>
      <div class="brand-addr">${COMPANY.address} — ${COMPANY.cidade} &nbsp;·&nbsp; CEP ${COMPANY.cep} &nbsp;·&nbsp; Tel: ${COMPANY.tel}</div>
    </div>
  </div>
  <div class="oc-badge">
    <div class="oc-label">Ordem de Carregamento</div>
    <div class="oc-num">${esc(order.orderNumber)}</div>
    <div><span class="status-pill" style="background:${st.bg};border-color:${st.color}44;color:${st.color}">${st.label}</span></div>
  </div>
</div>

<div class="container">

  <div class="card">
    <div class="card-head">🧑‍✈️ &nbsp;Dados do Motorista</div>
    <table class="info">
      ${row("Nome completo", order.driver?.nome)}
      ${row("CPF", order.driver?.cpf)}
      ${row("Nº CNH", order.driver?.cnhNumber)}
      <tr><td class="lbl">Foto CNH</td><td class="val">${cnhImg}</td></tr>
    </table>
  </div>

  <div class="card">
    <div class="card-head">🚛 &nbsp;Dados do Veículo</div>
    <table class="info">${vehicleRows}</table>
  </div>

  <div class="card">
    <div class="card-head">📦 &nbsp;Dados da Carga</div>
    <table class="info">
      ${row("Produto", order.cargo?.produto)}
      ${row("Peso total", order.cargo?.peso)}
      ${row("Cliente", order.cargo?.cliente)}
      ${row("Remetente", order.cargo?.remetente)}
      ${row("Origem", order.cargo?.origem)}
      ${row("Destinatário", order.cargo?.destinatario)}
      ${row("Destino", order.cargo?.destino)}
    </table>
  </div>

  <div class="bottom-row">
    <div>
      <div class="signatures">
        <div class="sig-line">Assinatura do Motorista</div>
        <div class="sig-line">Responsável / Expedição</div>
      </div>
      <div style="margin-top:16px;font-size:.72rem;color:#334155">
        Emitida em ${new Date(order.createdAt).toLocaleDateString("pt-BR")} &nbsp;·&nbsp;
        <span class="conex-badge"><span>CONEX</span> — Comunicação Integrada</span>
      </div>
    </div>
    <div class="qr-block">
      <img src="${qrSrc}" alt="QR Code" width="140" height="140">
      <div class="qr-label">Escaneie para verificar</div>
      <div class="qr-url">${pageUrl}</div>
    </div>
  </div>

</div>

<div class="footer">
  ${COMPANY.name} &nbsp;·&nbsp; CNPJ ${COMPANY.cnpj} &nbsp;·&nbsp; Documento gerado em ${new Date().toLocaleDateString("pt-BR")}
</div>

<div class="action-bar">
  <div class="info-txt">OC <strong>${esc(order.orderNumber)}</strong> — ${st.label}</div>
  <div style="display:flex;gap:10px;align-items:center">
    <button class="btn-share" onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href).then(()=>this.textContent='✅ Copiado!').catch(()=>0);this.textContent='✅ Copiado!';setTimeout(()=>this.textContent='🔗 Copiar link',2000)">🔗 Copiar link</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  </div>
</div>

${autoPrint ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},800);});<\/script>` : ""}

</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(html);
  } catch (err) {
    req.log.error(err, "Failed to render OC page");
    res.status(500).send("Erro interno ao gerar OC");
  }
});

export default router;
