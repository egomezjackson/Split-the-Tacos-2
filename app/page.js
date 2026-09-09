"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  supabase, deviceId, savedName, saveName, billCode, shrink,
  fmt, toCents, computeShares, PALETTE, initials,
} from "./lib";

/**
 * One page, two screens.
 *
 * No bill code in the URL means you're starting one. A code means you're
 * looking at one. Keeping both here means the whole app is four files,
 * which matters when the only way to get code into GitHub is a browser.
 */
export default function Page() {
  return (
    <Suspense fallback={<div className="page" />}>
      <Router />
    </Suspense>
  );
}

function Router() {
  const code = useSearchParams().get("c");
  return code ? <BillView code={code} /> : <NewBill />;
}

function NewBill() {
  const router = useRouter();
  const [name, setName] = useState(savedName());
  const [merchant, setMerchant] = useState("");
  const [items, setItems] = useState([]);
  const [printedSubtotal, setPrintedSubtotal] = useState(0); // cross-check only
  const [tax, setTax] = useState("");
  const [fee, setFee] = useState("");
  const [total, setTotal] = useState(""); // handwritten. typed, never scanned.
  const [reading, setReading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const photo = useRef(null);
  const totalBox = useRef(null);

  const scan = async (file) => {
    setError("");
    setReading(true);
    try {
      const image = await shrink(file);
      const r = await fetch("/api/go", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "scan", image }),
      });
      const d = await r.json();
      if (d.error) throw new Error();
      setMerchant(d.merchant || "");
      setItems((d.items || []).map((it) => ({ name: it.n, price: String(it.p) })));
      setPrintedSubtotal(toCents(d.subtotal));
      setTax(String(d.tax ?? 0));
      setFee(String(d.fee ?? 0));
      // Straight to the one number they have to read off the paper.
      setTimeout(() => totalBox.current?.focus(), 200);
    } catch {
      setError("Couldn't read that one. Try a brighter, straighter photo — or type the lines in.");
      setItems([{ name: "", price: "" }]);
    }
    setReading(false);
  };

  const setItem = (i, patch) =>
    setItems(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));

  const itemsSum = items.reduce((a, it) => a + toCents(it.price), 0);
  const printed = itemsSum + toCents(tax) + toCents(fee);
  const totalCents = toCents(total);

  // The tip is whatever they wrote, minus everything the machine printed.
  // One number to type instead of two, and it can't disagree with itself.
  const tipCents = totalCents > 0 ? totalCents - printed : 0;

  // Two percentages, because "I left 18%" means different things depending
  // on whether you counted the tax. Showing both settles it.
  const pctFood = itemsSum > 0 ? (tipCents / itemsSum) * 100 : 0;
  const pctBill = printed > 0 ? (tipCents / printed) * 100 : 0;
  const pct = (n) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);

  const missedLine = printedSubtotal > 0 && Math.abs(printedSubtotal - itemsSum) > 2;
  const totalTooLow = totalCents > 0 && tipCents < 0;
  const tipOdd = totalCents > 0 && tipCents >= 0 && (pctFood > 40 || (pctFood < 5 && tipCents > 0));

  const ready = name.trim() && items.length > 0 && totalCents > 0 && !totalTooLow;

  const create = async () => {
    setCreating(true);
    saveName(name.trim());
    const code = billCode();
    const r = await fetch("/api/go", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        code,
        merchant,
        payer_name: name.trim(),
        total_cents: totalCents,
        tax_cents: toCents(tax),
        fee_cents: toCents(fee),
        tip_cents: Math.max(0, tipCents),
        items: items
          .filter((it) => it.name || toCents(it.price))
          .map((it) => ({ name: it.name, price_cents: toCents(it.price) })),
      }),
    });
    const d = await r.json();
    if (d.error) {
      setError("Could not create the bill. Try again.");
      setCreating(false);
      return;
    }
    router.push("/?c=" + code + "&new=1");
  };

  return (
    <div className="page">
      <div className="wrap">
        <h1>Split the bill</h1>
        <p className="sub">
          Photograph the receipt, share the code, everyone taps what they had. Tax and tip
          get split by what you ordered, not down the middle.
        </p>

        {error && <div className="flag rose">{error}</div>}

        <div className="fld" style={{ marginBottom: 16 }}>
          <label>Your name</label>
          <input value={name} placeholder="Marco" onChange={(e) => setName(e.target.value)} />
        </div>

        {items.length === 0 ? (
          <div className="drop">
            <div className="num" style={{ fontSize: 15 }}>
              {reading ? "Reading the receipt…" : "Photograph the receipt"}
            </div>
            <p>
              Get the item lines and the tax in frame. You&apos;ll type the total yourself —
              handwriting is the one thing a scan can&apos;t be trusted with.
            </p>
            <input
              ref={photo}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => e.target.files[0] && scan(e.target.files[0])}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn" disabled={reading} onClick={() => photo.current.click()}>
                {reading ? "Reading…" : "Take a photo"}
              </button>
              <button className="btn ghost" onClick={() => setItems([{ name: "", price: "" }])}>
                Type it in
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ---- the one number they read off the paper ---- */}
            <div className="sechead">
              <h2>What did you write at the bottom?</h2>
              <span>The total, in pen</span>
            </div>

            <div className="totalbox">
              <span className="sign">$</span>
              <input
                ref={totalBox}
                className="bigin"
                value={total}
                inputMode="decimal"
                placeholder="0.00"
                onChange={(e) => setTotal(e.target.value)}
              />
            </div>

            {totalCents > 0 && !totalTooLow && (
              <div className="tipcard">
                <div className="tipamt">
                  <span>Tip</span>
                  <b className="num">{fmt(tipCents)}</b>
                </div>
                <div className="tippcts">
                  <div>
                    <b className="num">{pct(pctFood)}%</b>
                    <span>on the food</span>
                  </div>
                  <div>
                    <b className="num">{pct(pctBill)}%</b>
                    <span>on the whole bill</span>
                  </div>
                </div>
              </div>
            )}
            {totalTooLow && (
              <div className="flag rose" style={{ marginTop: 10 }}>
                That&apos;s {fmt(-tipCents)} less than the printed lines come to. Check for a
                typo, or fix a price below.
              </div>
            )}
            {tipOdd && (
              <div className="flag amber" style={{ marginTop: 10 }}>
                That works out to a {pct(pctFood)}% tip on the food. Might be right — worth a second look at the
                total and the item prices.
              </div>
            )}

            {/* ---- the printed half ---- */}
            <div className="sec">
              <div className="sechead">
                <h2>{merchant || "The printed lines"}</h2>
                <span>Fix anything the scan got wrong</span>
              </div>

              <div className="fld" style={{ marginBottom: 10 }}>
                <input
                  value={merchant}
                  placeholder="Where were you?"
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>

              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6 }}>
                  <input
                    value={it.name}
                    placeholder="Item"
                    onChange={(e) => setItem(i, { name: e.target.value })}
                  />
                  <input
                    value={it.price}
                    inputMode="decimal"
                    placeholder="0.00"
                    style={{ width: 86, flex: "0 0 86px", textAlign: "right" }}
                    onChange={(e) => setItem(i, { price: e.target.value })}
                  />
                  <button className="x" onClick={() => setItems(items.filter((_, k) => k !== i))}>
                    ×
                  </button>
                </div>
              ))}
              <button
                className="btn ghost sm"
                onClick={() => setItems([...items, { name: "", price: "" }])}
              >
                Add a line
              </button>

              <div className="grid2" style={{ marginTop: 14 }}>
                <div className="fld">
                  <label>Tax</label>
                  <input value={tax} inputMode="decimal" onChange={(e) => setTax(e.target.value)} />
                </div>
                <div className="fld">
                  <label>Card fee</label>
                  <input value={fee} inputMode="decimal" onChange={(e) => setFee(e.target.value)} />
                </div>
              </div>

              {missedLine && (
                <div className="flag amber" style={{ marginTop: 12 }}>
                  The receipt prints a subtotal of {fmt(printedSubtotal)}, but these lines add up
                  to {fmt(itemsSum)}. The scan probably missed an item or misread a price.
                </div>
              )}

              <div className="lline" style={{ marginTop: 10 }}>
                <span>Printed lines come to</span>
                <b className="num">{fmt(printed)}</b>
              </div>
            </div>

            <button
              className="btn"
              style={{ width: "100%", marginTop: 20 }}
              disabled={!ready || creating}
              onClick={create}
            >
              {creating
                ? "Creating…"
                : ready
                ? "Looks right — make the code"
                : totalCents > 0
                ? "Fix the total first"
                : "Add your name and the total"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BillView({ code }) {
  const [bill, setBill] = useState(null);
  const [items, setItems] = useState([]);
  const [diners, setDiners] = useState([]);
  const [claims, setClaims] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [showShare, setShowShare] = useState(false);
  const qrRef = useRef(null);

  const load = useCallback(async () => {
    const [b, i, d] = await Promise.all([
      supabase.from("bills").select("*").eq("id", code).maybeSingle(),
      supabase.from("items").select("*").eq("bill_id", code).order("position"),
      supabase.from("diners").select("*").eq("bill_id", code).order("joined_at"),
    ]);
    if (!b.data) { setMissing(true); setLoading(false); return; }
    const ids = (i.data || []).map((x) => x.id);
    const c = ids.length ? await supabase.from("claims").select("*").in("item_id", ids) : { data: [] };
    setBill(b.data);
    setItems(i.data || []);
    setDiners(d.data || []);
    setClaims(c.data || []);
    setMe((d.data || []).find((x) => x.device_id === deviceId()) || null);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    load();
    // Any change, reload everything. At a dinner table that's a handful of
    // rows — simpler and far less buggy than patching state by hand.
    const ch = supabase
      .channel("bill:" + code)
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "diners" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "claims" }, load)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [code, load]);

  // Whoever made the bill lands here with the code open, ready to show.
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new")) {
      setShowShare(true);
    }
  }, []);

  const url = typeof window !== "undefined" ? window.location.origin + "/?c=" + code : "";
  useEffect(() => {
    if (showShare && qrRef.current && url) QRCode.toCanvas(qrRef.current, url, { width: 200, margin: 1 });
  }, [showShare, url]);

  const join = async (n) => {
    const clean = (n || "").trim();
    if (!clean) return;
    saveName(clean);
    const { data } = await supabase
      .from("diners")
      .insert({ bill_id: code, device_id: deviceId(), name: clean, color: PALETTE[diners.length % PALETTE.length] })
      .select().single();
    setMe(data);
    load();
  };

  const toggle = async (itemId) => {
    if (!me) return;
    const mine = claims.some((c) => c.item_id === itemId && c.diner_id === me.id);
    // Optimistic, so tapping feels instant on restaurant wifi.
    setClaims((cs) =>
      mine ? cs.filter((c) => !(c.item_id === itemId && c.diner_id === me.id))
           : [...cs, { item_id: itemId, diner_id: me.id }]
    );
    if (mine) await supabase.from("claims").delete().eq("item_id", itemId).eq("diner_id", me.id);
    else await supabase.from("claims").insert({ item_id: itemId, diner_id: me.id });
  };

  if (loading) return <Shell><p className="sub">Loading…</p></Shell>;
  if (missing)
    return (
      <Shell>
        <h1>No such bill</h1>
        <p className="sub">That link is wrong, or the bill was deleted.</p>
        <a className="btn" href="/">Start a new one</a>
      </Shell>
    );

  const s = computeShares({ items, diners, claims, bill });
  const done = s.unclaimedCount === 0 && diners.length > 0;

  /* --- not on the bill yet --- */
  if (!me)
    return (
      <Shell>
        <h1>{bill.merchant || "Split the bill"}</h1>
        <p className="sub">
          {bill.payer_name ? bill.payer_name + " covered this one. " : ""}
          {fmt(s.grand)} total. Put your name in and tap what you had.
        </p>
        <div style={{ display: "flex", gap: 7 }}>
          <input
            value={joinName || savedName()}
            placeholder="Your name"
            onChange={(e) => setJoinName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && join(joinName || savedName())}
          />
          <button className="btn" onClick={() => join(joinName || savedName())}>Join</button>
        </div>
      </Shell>
    );

  const mine = s.byId[me.id];

  return (
    <Shell>
      <h1>{bill.merchant || "Split the bill"}</h1>
      <p className="sub">
        You&apos;re {me.name}. Tap everything you had — everyone else&apos;s screen updates as you go.
      </p>

      {showShare && (
        <div className="share" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Everyone scan this</div>
          <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
            Phone camera, not the app. It opens straight to this bill.
          </div>
          <canvas ref={qrRef} />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
            <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(url)}>
              Copy the link
            </button>
            <button className="btn ghost sm" onClick={() => setShowShare(false)}>Hide</button>
          </div>
        </div>
      )}

      {/* ---- what you owe ---- */}
      <div className="tot" style={{ marginBottom: 22 }}>
        <div className="hint" style={{ marginTop: 0 }}>Your share</div>
        <div className="big num" style={{ margin: "4px 0 6px" }}>{fmt(mine.total)}</div>
        <div className="brk">
          {fmt(mine.sub)} for what you had, plus {fmt(mine.extra)} of the tax, tip and fees
        </div>
      </div>

      {/* ---- items ---- */}
      <div className="sechead">
        <h2>{done ? "Everything's claimed" : `${s.unclaimedCount} left to claim`}</h2>
        {!showShare && <button className="mini" onClick={() => setShowShare(true)}>show the code</button>}
      </div>
      <div className="prog">
        <i style={{ width: `${items.length ? ((items.length - s.unclaimedCount) / items.length) * 100 : 0}%` }} />
      </div>

      {items.map((it) => {
        const on = s.claimersOf[it.id] || [];
        const isMine = on.includes(me.id);
        return (
          <button
            key={it.id}
            className={"row" + (isMine ? " mine" : "") + (on.length === 0 ? " open" : "")}
            onClick={() => toggle(it.id)}
          >
            <span className="nm">{it.name || "Untitled item"}</span>
            <span className="pr num">{fmt(it.price_cents)}</span>
            <span className="foot">
              {on.map((id) => {
                const d = diners.find((x) => x.id === id);
                return d ? <span key={id} className="chip" style={{ background: d.color }}>{initials(d.name)}</span> : null;
              })}
              {on.length === 0 ? (
                <span className="warn">Nobody yet</span>
              ) : on.length > 1 ? (
                <span className="each">{fmt(Math.round(it.price_cents / on.length))} each, {on.length} ways</span>
              ) : null}
            </span>
          </button>
        );
      })}

      {s.unclaimed !== 0 && (
        <div className="flag amber" style={{ marginTop: 12 }}>
          {fmt(s.unclaimed)} nobody has claimed, including its share of tax and tip.
        </div>
      )}

      {/* ---- everyone ---- */}
      <div className="sec">
        <div className="sechead">
          <h2>Everyone</h2>
          <span>{fmt(s.grand)} total</span>
        </div>
        <div className="ledger">
          {diners.map((d) => (
            <div className="lline" key={d.id} style={{ padding: "6px 0" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink)" }}>
                <span className="chip" style={{ background: d.color }}>{initials(d.name)}</span>
                {d.name}
              </span>
              <b className="num">{fmt(s.byId[d.id].total)}</b>
            </div>
          ))}
          {s.unclaimed !== 0 && (
            <div className="lline" style={{ padding: "6px 0" }}>
              <span>Still unclaimed</span>
              <b className="num">{fmt(s.unclaimed)}</b>
            </div>
          )}
          <div className="lline big">
            <span>Charged to the card</span>
            <span className="num">{fmt(s.grand)}</span>
          </div>
        </div>
        <div className="hint">
          Everyone&apos;s share adds up to the charge exactly — no rounding left on{" "}
          {bill.payer_name || "whoever paid"}.
        </div>
      </div>

      <div className="bar">
        <div className="barin">
          <div>
            <div className="lbl">You owe {bill.payer_name || "the payer"}</div>
            <div className="val num">{fmt(mine.total)}</div>
          </div>
          <div className="right">
            <div className="lbl">{done ? "All claimed" : `${s.unclaimedCount} unclaimed`}</div>
            <div className="val num" style={{ color: done ? "#7FD6BE" : "#F2C572" }}>
              {done ? "✓" : fmt(s.unclaimed)}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

const Shell = ({ children }) => (
  <div className="page"><div className="wrap">{children}</div></div>
);
