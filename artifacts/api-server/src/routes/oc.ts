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

function row(label: string, value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return `<tr><td class="lbl">${label}</td><td class="val">${esc(v)}</td></tr>`;
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
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:min-height:100vh;background:#080e1e;color:#e2e8f0}
.box{text-align:center;padding:40px;margin:auto}.icon{font-size:72px;margin-bottom:20px}
.t{font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:700;color:#60a5fa}
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
      ? `<img src="${order.driver.cnhImage}" style="max-width:220px;max-height:130px;border-radius:8px;border:1px solid rgba(198,80,110,.3);object-fit:contain" alt="CNH">`
      : `<span style="color:#64748b;font-style:italic">Não informada</span>`;

    const vehicleRows = [
      row("Placa Cavalo", order.vehicle?.placaCavalo),
      row("Tipo de Veículo", tipoMap[order.vehicle?.tipoVeiculo ?? ""] || order.vehicle?.tipoVeiculo),
      ...(order.vehicle?.carreta1 ? [row("Carreta 1", order.vehicle.carreta1)] : []),
      ...(order.vehicle?.carreta2 ? [row("Carreta 2", order.vehicle.carreta2)] : []),
      ...(order.vehicle?.carreta3 ? [row("Carreta 3", order.vehicle.carreta3)] : []),
    ].join("");

    // Signature block — shows responsible user name if available
    // Responsável block: pre-printed name above the line, label below
    const sigResponsavel = order.createdByName
      ? `<div class="sig-name">${esc(order.createdByName)}</div>`
      : `<div style="height:24px"></div>`;

    const emitidaEm = new Date(order.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OC ${esc(order.orderNumber)} — TRANSPANORAMA</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#080e1e;color:#e2e8f0;min-height:100vh;padding-bottom:84px}

/* ── HEADER (burgundy brand) ── */
.header{
  background:linear-gradient(135deg,#4a1a28 0%,#632336 100%);
  border-bottom:3px solid rgba(198,80,110,.5);
  padding:20px 28px;
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;
  position:relative;
}
.header::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
}
.header-left{display:flex;align-items:center;gap:18px}
.logo{height:52px;object-fit:contain;filter:brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,.4))}
.brand-name{font-family:'Poppins',sans-serif;font-size:1.05rem;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.4)}
.brand-sub{font-size:.7rem;color:rgba(255,210,220,.8);margin-top:3px}
.brand-addr{font-size:.67rem;color:rgba(255,200,215,.6);margin-top:2px}
.oc-badge{text-align:right}
.oc-num{font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;color:#fcd34d;letter-spacing:.06em;text-shadow:0 2px 8px rgba(0,0,0,.4)}
.oc-label{font-size:.62rem;color:rgba(255,210,220,.7);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.status-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:.78rem;font-weight:700;border:1px solid transparent;margin-top:6px}

/* ── LAYOUT ── */
.container{max-width:900px;margin:0 auto;padding:22px 16px}
.card{background:#0d1829;border:1px solid rgba(99,35,54,.3);border-radius:12px;margin-bottom:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.5)}
.card-head{background:rgba(99,35,54,.25);padding:10px 20px;font-family:'Poppins',sans-serif;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#f9a8b8;border-bottom:1px solid rgba(99,35,54,.3);display:flex;align-items:center;gap:8px}
table.info{width:100%;border-collapse:collapse}
table.info td{padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem}
table.info td.lbl{width:36%;font-weight:600;color:#94a3b8;font-size:.75rem;text-transform:uppercase;letter-spacing:.04em}
table.info td.val{color:#f1f5f9;font-weight:500;word-break:break-word}
table.info tr:last-child td{border-bottom:none}

/* ── BOTTOM ROW ── */
.bottom-row{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:22px 24px;background:#0d1829;border:1px solid rgba(99,35,54,.25);border-radius:12px}
.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px}
.sig-box{text-align:center}
.sig-spacer{height:36px}
.sig-line-el{border-top:1px solid rgba(255,255,255,.2);padding-top:6px}
.sig-name{font-family:'Poppins',sans-serif;font-size:.9rem;font-weight:700;color:#fcd34d;margin-bottom:6px}
.sig-label{font-size:.68rem;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
.meta-block{margin-top:14px;font-size:.72rem;color:#334155}
.qr-block{text-align:center;flex-shrink:0}
.qr-block img{border:4px solid rgba(99,35,54,.4);border-radius:10px;background:#fff;padding:4px}
.qr-label{font-size:.68rem;color:#f9a8b8;margin-top:8px;font-weight:600;letter-spacing:.02em}
.qr-url{font-size:.6rem;color:#334155;word-break:break-all;max-width:180px;margin:3px auto 0}

/* ── ACTION BAR ── */
.action-bar{
  position:fixed;bottom:0;left:0;right:0;
  background:rgba(10,5,8,.97);border-top:1px solid rgba(99,35,54,.4);
  padding:12px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;
  backdrop-filter:blur(14px);z-index:100;
}
.action-info{font-size:.78rem;color:#475569}
.action-info strong{color:#fcd34d}
.action-info em{color:#f9a8b8;font-style:normal;font-size:.72rem}
.btn-print{
  background:linear-gradient(135deg,#632336,#8b2e4a);color:#fff;border:none;
  border-radius:9px;padding:10px 24px;font-family:'Poppins',sans-serif;font-size:.9rem;
  font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;
  transition:all .2s;box-shadow:0 2px 16px rgba(99,35,54,.5);
}
.btn-print:hover{transform:translateY(-1px);box-shadow:0 4px 24px rgba(99,35,54,.7)}
.btn-print:active{transform:translateY(0)}
.btn-share{
  background:rgba(99,35,54,.15);color:#f9a8b8;border:1px solid rgba(99,35,54,.35);
  border-radius:9px;padding:10px 18px;font-family:'Poppins',sans-serif;
  font-size:.85rem;font-weight:600;cursor:pointer;transition:all .2s;
}
.btn-share:hover{background:rgba(99,35,54,.28)}

/* ── FOOTER ── */
.footer{text-align:center;color:#1e293b;font-size:.7rem;padding:18px;margin-top:4px}

/* ── RESPONSIVE ── */
@media(max-width:640px){
  .header{flex-direction:column;align-items:flex-start}
  .oc-badge{text-align:left}
  .bottom-row{grid-template-columns:1fr}
  .qr-block{display:flex;flex-direction:column;align-items:center}
  .signatures{grid-template-columns:1fr;gap:20px}
  table.info td{padding:8px 14px}
  .action-bar{flex-direction:column;gap:8px;padding:10px 14px}
  .btn-print,.btn-share{width:100%;justify-content:center}
}

/* ── PRINT — single A4 page ── */
@media print{
  @page{size:A4 portrait;margin:7mm 10mm}

  /* Reset */
  body{background:#fff!important;color:#000!important;padding-bottom:0!important;
    font-size:8.5pt!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* Header — compact */
  .header{
    background:linear-gradient(135deg,#4a1a28 0%,#632336 100%)!important;
    border-bottom:2px solid #632336!important;padding:7px 12px!important;gap:8px!important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .header::after{display:none!important}
  .logo{height:34px!important}
  .header-left{gap:10px!important}
  .brand-name{font-size:.85rem!important;color:#fff!important}
  .brand-sub{font-size:.6rem!important;color:rgba(255,210,220,.9)!important;margin-top:1px!important}
  .brand-addr{font-size:.58rem!important;color:rgba(255,200,215,.8)!important;margin-top:1px!important}
  .oc-num{font-size:1.15rem!important;color:#fcd34d!important;letter-spacing:.04em!important}
  .oc-label{font-size:.56rem!important;color:rgba(255,210,220,.8)!important;margin-bottom:2px!important}
  .status-pill{font-size:.65rem!important;padding:2px 9px!important;margin-top:3px!important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact}

  /* Container */
  .container{padding:5px 0 0!important;max-width:100%!important}

  /* Cards */
  .card{border:1px solid #ddd!important;background:#fff!important;box-shadow:none!important;
    margin-bottom:5px!important;border-radius:5px!important;break-inside:avoid}
  .card-head{
    background:#fdf0f3!important;color:#632336!important;
    border-bottom:1px solid #e8d0d6!important;padding:4px 10px!important;
    font-size:.58rem!important;letter-spacing:.07em!important;gap:4px!important;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  table.info td{padding:3.5px 10px!important;font-size:.75rem!important;border-bottom:1px solid #f5eded!important}
  table.info td.lbl{font-size:.65rem!important;color:#6b7280!important;width:34%!important}
  table.info td.val{color:#111827!important}

  /* Bottom row */
  .bottom-row{
    background:#fff!important;border:1px solid #ddd!important;border-radius:5px!important;
    padding:8px 12px!important;gap:14px!important;
  }
  .signatures{gap:16px!important}
  .sig-box{padding:0!important}
  .sig-spacer{height:22px!important}
  .sig-name{font-size:.78rem!important;color:#7c2d42!important;margin-bottom:4px!important}
  .sig-label{font-size:.6rem!important;color:#6b7280!important;margin-top:3px!important}
  .sig-line-el{border-top:1px solid #9ca3af!important;padding-top:4px!important}
  .meta-block{font-size:.62rem!important;color:#6b7280!important;margin-top:6px!important}

  /* QR Code — compact */
  .qr-block img{width:80px!important;height:80px!important;border-color:#e2d0d5!important;border-width:2px!important;padding:2px!important}
  .qr-label{font-size:.58rem!important;color:#632336!important;margin-top:4px!important}
  .qr-url{font-size:.52rem!important;color:#9ca3af!important;max-width:90px!important}

  /* Hide non-print elements */
  .action-bar,.footer{display:none!important}
}
</style>
</head>
<body>

<!-- ══ HEADER ══ -->
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
    <div><span class="status-pill" style="background:${st.bg};border-color:${st.color}55;color:${st.color}">${st.label}</span></div>
  </div>
</div>

<!-- ══ BODY ══ -->
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
        <div class="sig-box">
          <div class="sig-spacer"></div>
          <div class="sig-line-el"></div>
          <div class="sig-label">Assinatura do Motorista</div>
        </div>
        <div class="sig-box">
          ${sigResponsavel}
          <div class="sig-line-el"></div>
          <div class="sig-label">Responsável pela Ordem</div>
        </div>
      </div>
      <div class="meta-block">
        Emitida em ${emitidaEm} &nbsp;·&nbsp; CONEX — Comunicação Integrada
      </div>
    </div>
    <div class="qr-block">
      <img src="${qrSrc}" alt="QR Code" width="145" height="145">
      <div class="qr-label">Escaneie para verificar</div>
      <div class="qr-url">${pageUrl}</div>
    </div>
  </div>

</div>

<div class="footer">
  ${COMPANY.name} &nbsp;·&nbsp; CNPJ ${COMPANY.cnpj} &nbsp;·&nbsp;
  Documento gerado em ${new Date().toLocaleDateString("pt-BR")}
</div>

<!-- ══ ACTION BAR ══ -->
<div class="action-bar">
  <div class="action-info">
    <strong>${esc(order.orderNumber)}</strong>
    ${order.createdByName ? `&nbsp;·&nbsp; <em>Emitida por ${esc(order.createdByName)}</em>` : ""}
  </div>
  <div style="display:flex;gap:10px;align-items:center">
    <button class="btn-share" id="btn-copy"
      onclick="navigator.clipboard&&navigator.clipboard.writeText(location.href).then(()=>{document.getElementById('btn-copy').textContent='✅ Copiado!';setTimeout(()=>document.getElementById('btn-copy').textContent='🔗 Copiar link',2500)}).catch(()=>0)">
      🔗 Copiar link
    </button>
    <button class="btn-print" onclick="window.print()">
      🖨️ Imprimir / PDF
    </button>
  </div>
</div>

${autoPrint ? `<script>
(function(){
  var done=false;
  window.addEventListener('load',function(){
    if(done)return; done=true;
    setTimeout(function(){ window.print(); }, 900);
  });
})();
<\/script>` : ""}

</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  } catch (err) {
    req.log.error(err, "Failed to render OC page");
    res.status(500).send("Erro interno ao gerar OC");
  }
});

export default router;
