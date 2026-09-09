export const metadata = {
  title: "Split the bill",
  description: "Everyone pays for what they ate, tax and tip included.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#15232B" };

// The stylesheet lives here rather than in its own file, purely so the
// project is fewer files to get into GitHub through a browser.
const css = `@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap');

:root{
  --ink:#15232B; --ink2:#4A5C66; --paper:#EDEFEA; --card:#FFFFFF;
  --marine:#1F5F5B; --amber:#B98420; --rose:#B4453C; --stone:#D6DAD1;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  font-family:'Archivo',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  background:var(--paper); color:var(--ink);
  font-variant-numeric:tabular-nums; -webkit-font-smoothing:antialiased;
}
.page{min-height:100vh;padding:22px 16px 130px;}
.wrap{max-width:560px;margin:0 auto;}
.num{font-variant-numeric:tabular-nums;font-weight:700;letter-spacing:-0.02em;}

h1{font-size:30px;font-weight:800;letter-spacing:-0.035em;margin:0 0 4px;line-height:1.05;}
h2{font-size:13px;font-weight:700;margin:0;}
.sub{color:var(--ink2);font-size:14px;margin:0 0 26px;line-height:1.5;}
.sec{margin-top:30px;}
.sechead{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:8px;margin-bottom:12px;border-bottom:1.5px solid var(--stone);}
.sechead span{font-size:12px;color:var(--ink2);}
.hint{font-size:11.5px;color:var(--ink2);line-height:1.5;margin-top:6px;}

.btn{font:inherit;font-weight:600;font-size:14px;border-radius:9px;padding:11px 16px;
  border:1.5px solid var(--ink);background:var(--ink);color:#fff;cursor:pointer;
  text-decoration:none;display:inline-block;text-align:center;}
.btn:hover{background:#0C171D;}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--stone);}
.btn.ghost:hover{border-color:var(--ink2);}
.btn.sm{padding:7px 11px;font-size:13px;border-radius:7px;}
.btn:disabled{opacity:.45;cursor:default;}
.btn:focus-visible,input:focus-visible,.row:focus-visible{outline:2.5px solid var(--marine);outline-offset:2px;}

input{font:inherit;font-size:14px;border:1.5px solid var(--stone);background:var(--card);
  border-radius:8px;padding:9px 11px;color:var(--ink);width:100%;}
input:focus{border-color:var(--marine);outline:none;}
.fld label{display:block;font-size:12px;color:var(--ink2);margin-bottom:4px;font-weight:500;}
.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;}

.drop{border:2px dashed var(--stone);border-radius:14px;background:var(--card);
  padding:34px 22px;text-align:center;}
.drop p{margin:12px 0 18px;color:var(--ink2);font-size:14px;line-height:1.55;}

.row{display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center;
  background:var(--card);border:1.5px solid var(--stone);border-radius:11px;
  padding:11px 13px;margin-bottom:7px;cursor:pointer;transition:border-color .12s;
  text-align:left;width:100%;font:inherit;color:inherit;}
.row.mine{border-color:var(--ink);}
.row.open{border-style:dashed;border-color:var(--amber);}
.row .nm{font-size:14.5px;font-weight:500;line-height:1.3;}
.row .pr{font-size:14.5px;}
.row .foot{grid-column:1/-1;display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:5px;}
.chip{display:inline-flex;align-items:center;justify-content:center;width:23px;height:23px;
  border-radius:50%;color:#fff;font-size:10px;font-weight:700;flex:0 0 23px;}
.each{font-size:11.5px;color:var(--ink2);}
.warn{font-size:11.5px;color:var(--amber);font-weight:600;}
.mini{background:none;border:none;font:inherit;font-size:11.5px;color:var(--ink2);
  text-decoration:underline;cursor:pointer;padding:0;}

.pplrow{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px;}
.ptab{display:flex;align-items:center;gap:7px;border:1.5px solid var(--stone);background:var(--card);
  border-radius:999px;padding:5px 12px 5px 6px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;}
.ptab.on{border-color:var(--ink);background:var(--ink);color:#fff;}
.x{background:none;border:none;color:inherit;opacity:.45;cursor:pointer;font-size:15px;
  line-height:1;padding:0 0 0 2px;font-family:inherit;}
.x:hover{opacity:1;}

.tot{background:var(--card);border:1.5px solid var(--stone);border-radius:11px;padding:13px 15px;margin-bottom:8px;}
.tot.done{border-color:var(--marine);background:#F2F7F5;}
.tot.claimed{border-color:var(--amber);background:#FBF7EE;}
.totline{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.brk{font-size:12px;color:var(--ink2);margin-top:4px;line-height:1.45;}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px;}

.ledger{background:var(--card);border:1.5px solid var(--stone);border-radius:11px;padding:14px 15px;}
.lline{display:flex;justify-content:space-between;font-size:13.5px;padding:4px 0;color:var(--ink2);gap:12px;}
.lline b{color:var(--ink);font-weight:600;}
.lline.big{font-size:16px;color:var(--ink);font-weight:700;border-top:1.5px solid var(--stone);
  margin-top:7px;padding-top:9px;}

.flag{border-radius:9px;padding:11px 13px;font-size:13px;line-height:1.5;margin-bottom:12px;}
.flag.amber{background:#FBF3E2;border:1.5px solid #E6CE95;color:#6B4C0A;}
.flag.rose{background:#FBEDEC;border:1.5px solid #E4B3AE;color:#7C2B24;}
.flag.marine{background:#EAF3F1;border:1.5px solid #A8C9C2;color:#134945;}


.bar{position:fixed;left:0;right:0;bottom:0;background:var(--ink);color:#fff;
  padding:13px 16px calc(13px + env(safe-area-inset-bottom));}
.barin{max-width:560px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;}
.barin .lbl{font-size:11.5px;opacity:.62;line-height:1.3;}
.barin .val{font-size:19px;}
.right{text-align:right;}

.share{background:var(--card);border:1.5px solid var(--stone);border-radius:13px;
  padding:18px;text-align:center;}
.share canvas{border-radius:8px;}
.code{font-size:13px;color:var(--ink2);word-break:break-all;margin:10px 0 14px;}


@media (prefers-reduced-motion:reduce){*{transition:none!important;}}

.prog{height:5px;background:var(--stone);border-radius:3px;overflow:hidden;margin-bottom:14px;}
.prog i{display:block;height:100%;background:var(--marine);transition:width .25s;}
.share{background:var(--card);border:1.5px solid var(--stone);border-radius:13px;padding:20px;text-align:center;}
.big{font-size:38px;font-weight:800;letter-spacing:-0.04em;line-height:1;}

/* the one handwritten number, given the weight it deserves */
.totalbox{display:flex;align-items:center;gap:6px;background:var(--card);
  border:2px solid var(--ink);border-radius:12px;padding:10px 16px;}
.totalbox .sign{font-size:26px;font-weight:700;color:var(--ink2);}
.bigin{border:none!important;background:none;padding:0;font-size:40px;font-weight:800;
  letter-spacing:-0.04em;font-variant-numeric:tabular-nums;width:100%;}
.bigin:focus{outline:none;}
.derived{font-size:13px;color:var(--ink2);margin-top:9px;}
.derived b{color:var(--ink);}

.tipcard{background:var(--card);border:1.5px solid var(--stone);border-top:none;
  border-radius:0 0 12px 12px;margin:0 10px;padding:11px 14px;
  display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.tipamt{display:flex;align-items:baseline;gap:8px;}
.tipamt span{font-size:12px;color:var(--ink2);font-weight:500;}
.tipamt b{font-size:19px;}
.tippcts{display:flex;gap:18px;}
.tippcts div{text-align:right;}
.tippcts b{font-size:15px;display:block;line-height:1.2;}
.tippcts span{font-size:10.5px;color:var(--ink2);display:block;}
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head><style dangerouslySetInnerHTML={{ __html: css }} /></head>
      <body>{children}</body>
    </html>
  );
}
