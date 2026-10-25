/* BOBALAB P0 prototype: figure linking, pearl morph, filters, plate stepper. No loops. */
(() => {
  const d = document, h = d.documentElement;
  const $ = (s, r = d) => r.querySelector(s), $$ = (s, r = d) => [...r.querySelectorAll(s)];
  const reduced = () => h.dataset.motion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  let D;
  const data = () => D || (D = JSON.parse(($("#lab-data") || {}).textContent || '{"p":{},"d":{}}'));
  const hot = (slug, on, r = d) => $$(`.f1-seed[data-p="${slug}"]`, r).forEach((s) => s.classList.toggle("is-hot", on));
  const hover = (el, enter, leave) => {
    el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", enter); el.addEventListener("focusout", leave);
  };
  const angles = (n) => (n <= 5 ? [0, 30, -30, 60, -60].slice(0, n) : Array.from({ length: n }, (_, j) => Math.round((-75 + (j * 150) / (n - 1)) * 100) / 100));

  /* Fig. 1: direction names <-> pearls, seeds name their paper (pointer only). */
  function fig() {
    const plate = $(".f1-plate"); if (!plate) return;
    const layers = $$(".f1-cap-layer", plate), seedL = $('[data-cap="seed"]', plate);
    let dir = null, seed = null;
    const show = () => {
      const key = seed ? "seed" : dir || "legend";
      layers.forEach((l) => l.classList.toggle("is-on", l.dataset.cap === key));
      dir ? (plate.dataset.active = dir) : delete plate.dataset.active;
      $$(".f1-item", plate).forEach((i) => i.classList.toggle("is-on", i.dataset.slug === dir));
      $$(".hm-legend a").forEach((a) => a.classList.toggle("is-on", a.dataset.dir === dir));
    };
    const set = (v) => () => { dir = v; show(); };
    $$(".f1-item", plate).forEach((it) => hover(it, set(it.dataset.slug), set(null)));
    $$(".hm-legend a").forEach((a) => hover(a, set(a.dataset.dir), set(null)));
    plate.addEventListener("pointerover", (e) => {
      const el = e.target.closest(".f1-seed"), p = el && data().p[el.dataset.p]; if (!p) return;
      const item = el.closest(".f1-item"), also = p.d.filter((x) => x !== item.dataset.slug).map((x) => data().d[x]);
      const [a, b, c] = $$("p", seedL);
      a.textContent = p.t; b.textContent = `${p.k}, ${p.y}.` + (also.length ? ` Also in ${also.join(" and ")}.` : ""); c.textContent = p.b;
      seedL.dataset.swatch = item.dataset.swatch; seed = el.dataset.p; hot(seed, true, plate); show();
    });
    plate.addEventListener("pointerout", (e) => {
      const el = e.target.closest(".f1-seed"); if (!el) return;
      hot(el.dataset.p, false, plate); seed = null; show();
    });
    if (h.hasAttribute("data-intro")) setTimeout(() => h.removeAttribute("data-intro"), 2000);
    grow();
  }

  /* Growth harness (?n=2x | ?n=4x): SYNTHETIC copies; at most 12 dots per pearl (live SEED_CAP). */
  function grow() {
    const m = /^([24])x$/.exec(new URLSearchParams(location.search).get("n") || ""); if (!m) return;
    const k = +m[1], P = data().p;
    $$(".f1-item").forEach((it) => {
      const box = $(".f1-seeds", it), list = [];
      const base = $$(".f1-seed", box).map((s) => s.dataset.p);
      for (let r = 0; r < k; r++) base.forEach((s) => {
        if (!r) return list.push(s);
        const id = `${s}~${r}`; P[id] = { ...P[s], t: `SYNTHETIC – ${P[s].t}` }; list.push(id);
      });
      const fill = angles(Math.min(12, list.length)), arc = fill.slice().sort((a, b) => a - b);
      box.innerHTML = arc.map((a, j) => `<i class="seed f1-seed" data-p="${list[j]}" style="--a:${a}deg;--k:${fill.indexOf(a)}"></i>`).join("");
      $(".f1-count", it).textContent = `${list.length} papers`;
    });
    $(".f1-key span").textContent = `Growth test ×${k} with SYNTHETIC copies. At most 12 dots per pearl; the count carries the number.`;
  }

  /* Direction page: a paper in the list lights its dot on the pearl, and a dot names its paper. */
  function dirPage() {
    const hero = $(".f1-dp--hero"), tag = $(".dr-seedtag"); if (!hero) return;
    const cur = $(".dr-body").dataset.dir;
    const on = (slug, v) => {
      hot(slug, v, hero); const p = data().p[slug];
      if (v && p) tag.textContent = `${p.s}, ${p.y}${p.d.length > 1 ? ". Shared with " + p.d.filter((x) => x !== cur).map((x) => data().d[x]).join(" and ") : ""}`;
      tag.classList.toggle("is-on", v);
    };
    $$(".dr-pubs .bl-pub").forEach((a) => hover(a, () => on(a.dataset.p, true), () => on(a.dataset.p, false)));
    hero.addEventListener("pointerover", (e) => { const s = e.target.closest(".f1-seed"); s && on(s.dataset.p, true); });
    hero.addEventListener("pointerout", (e) => { const s = e.target.closest(".f1-seed"); s && on(s.dataset.p, false); });
  }

  /* Publications: text toggles (button[aria-pressed]) + search. Results steep in. */
  function pubs() {
    const root = $(".pubs"); if (!root) return;
    const st = { type: "all", dirs: new Set(), q: "" };
    const items = $$(".pubs-list .bl-pub", root), years = $$(".pubs-year:not(.pubs-wip)", root);
    const pl = (n) => `${n} paper${n === 1 ? "" : "s"}`;
    const apply = () => {
      let n = 0; const q = st.q.toLowerCase();
      items.forEach((it) => {
        const ok = (st.type === "all" || it.dataset.type === st.type) && (!st.dirs.size || it.dataset.dirs.split(" ").some((x) => st.dirs.has(x))) && (!q || it.textContent.toLowerCase().includes(q));
        const was = it.hidden; it.hidden = !ok;
        if (ok) { n++; if (was) { it.classList.remove("is-steep"); void it.offsetWidth; it.classList.add("is-steep"); } }
      });
      years.forEach((y) => { const c = $$(".bl-pub", y).filter((i) => !i.hidden).length; y.hidden = !c; $(".pubs-year__count", y).textContent = pl(c); });
      $("#pubs-results").textContent = pl(n) + (n < items.length ? ` of ${items.length}` : "");
      $(".pubs-empty", root).hidden = !!n;
    };
    $$("button[data-type]", root).forEach((b) => (b.onclick = () => { st.type = b.dataset.type; $$("button[data-type]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); apply(); }));
    $$("button[data-dir]", root).forEach((b) => (b.onclick = () => { const v = b.dataset.dir; st.dirs.has(v) ? st.dirs.delete(v) : st.dirs.add(v); b.setAttribute("aria-pressed", st.dirs.has(v)); apply(); }));
    $("#pubs-q").oninput = (e) => { st.q = e.target.value.trim(); apply(); };
    const t = $(".pubs-toggle"), f = $("#pubs-filters");
    t.onclick = () => { const o = t.getAttribute("aria-expanded") !== "true"; t.setAttribute("aria-expanded", o); f.classList.toggle("is-open", o); };
  }

  /* Study-design plate: reader-triggered, four finite steps. Reduced motion keeps the full plate. */
  function plate() {
    const f = $(".plate"); if (!f || reduced()) return;
    const b = $("[data-plate-step]", f), st = $(".plate-status", f);
    const L = ["Orders arrive: four burger orders in a round.", "Each order splits into chop, then cook, then plate.", "The chef leaves: the disrupted configuration, best finish 34 ticks.", "Phase II: participants are randomised to one of four arms."];
    $(".plate-bar", f).hidden = false;
    let n = 4;
    b.onclick = () => {
      n = n >= 4 ? 1 : n + 1;
      f.classList.add("is-playing"); f.dataset.step = n;
      $$("[data-step]", f).forEach((e) => e.classList.toggle("is-in", e.dataset.step == n));
      st.textContent = `Step ${n} of 4. ${L[n - 1]}`;
      b.textContent = n === 4 ? "Start again" : "Next step";
    };
  }

  function misc() {
    $$("[data-motion-toggle]").forEach((b) => {
      b.setAttribute("aria-pressed", h.dataset.motion === "reduce");
      b.onclick = () => {
        const on = h.dataset.motion !== "reduce";
        on ? (h.dataset.motion = "reduce") : delete h.dataset.motion;
        try { localStorage.setItem("bobalab-motion", on ? "reduce" : ""); } catch (e) {}
        b.setAttribute("aria-pressed", on);
      };
    });
    $$("[data-copy]").forEach((b) => (b.onclick = () => navigator.clipboard && navigator.clipboard.writeText($("#" + b.dataset.copy).textContent).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy BibTeX"), 1600); })));
  }

  const init = () => { D = null; fig(); dirPage(); pubs(); plate(); misc(); };

  /* Pearl -> direction header: one shared view-transition-name ("pearl") on exactly one element per state. */
  d.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-morph]");
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !d.startViewTransition || reduced()) return;
    e.preventDefault();
    fetch(a.href).then((r) => { if (!r.ok) throw 0; return r.text(); }).then((t) => {
      const nd = new DOMParser().parseFromString(t, "text/html");
      $(".f1-pearl", a).style.viewTransitionName = "pearl";
      d.startViewTransition(() => {
        d.title = nd.title; h.dataset.page = nd.documentElement.dataset.page;
        d.body.replaceWith(d.adoptNode(nd.body));
        history.pushState({ p0: 1 }, "", a.href); scrollTo(0, 0);
        const hero = $(".f1-dp--hero"); hero && (hero.dataset.bloom = "");
        init();
      });
    }).catch(() => (location.href = a.href));
  });
  addEventListener("popstate", () => location.reload());
  d.readyState === "loading" ? d.addEventListener("DOMContentLoaded", init) : init();
})();
