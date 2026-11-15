// Drill generators for the FSM phone page (apps/mobile.html). Hand-written (not generated).
// GEN[id]() -> {q, kind: "num"|"choice", ans | options+correct, work}. The ids must match the entries of selftest/drills.json.
// Classic script: the consts below are globals shared with the page, so the page must not redeclare fmt, shuffle, pick, vecStr, GEN.
'use strict';
const fmt = x => (Math.abs(x) < 5e-10 ? 0 : +x.toFixed(4)).toString();
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const vecStr = v => `(${v.map(fmt).join(', ')})`;

// Build a shuffled choice question: `correct` string plus up to 3 distinct distractors from `cands` (strings).
const mkChoice = (correct, cands, n = 4) => {
  const seen = new Set([correct]); const wrong = [];
  for (const c of shuffle(cands)) { if (!seen.has(c)) { seen.add(c); wrong.push(c); } }
  const opts = shuffle([correct, ...wrong.slice(0, n - 1)]);
  return {kind: 'choice', options: opts, correct: opts.indexOf(correct)};
};
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));   // integer in [a, b]
const bin8 = v => (v & 255).toString(2).padStart(8, '0');
const num = x => { const a = Math.abs(x); return (a !== 0 && (a >= 1e5 || a < 1e-3)) ? x.toExponential(2).replace(/e\+?(-?)0*(\d+)/, '×10<sup>$1$2</sup>').replace('.00', '') : (+x.toPrecision(4)).toString(); };
const pw2 = e => `2<sup>${e < 0 ? '−' : ''}${Math.abs(e)}</sup>`;

/* ---------- drill generators: each returns {q, kind, ans | options+correct, work} ---------- */
const GEN = {
  'd-eps-add': () => {
    const k = 20 + Math.floor(Math.random() * 8);   // 20..27
    const differs = k <= 23;                         // k = 24 is an exact tie, rounds to even (= 1)
    const opts = ['Yes, it evaluates to exactly 1', 'No, the result differs from 1'];
    const why = k <= 23 ? `2<sup>−${k}</sup> ≥ ε<sub>m</sub> = 2<sup>−23</sup>, a multiple of the spacing of numbers in [1, 2): 1 + 2<sup>−${k}</sup> is representable, so it differs from 1`
      : k === 24 ? `2<sup>−24</sup> is exactly half the spacing 2<sup>−23</sup>: a tie, rounded to even (mantissa of 1.0 is even) ⇒ 1`
      : `2<sup>−${k}</sup> < ½·2<sup>−23</sup>: below half the spacing, rounds back to 1`;
    return {q: `IEEE single precision (ε<sub>m</sub> = 2<sup>−23</sup>). Does 1 + 2<sup>−${k}</sup> evaluate to exactly 1?`, kind: 'choice', options: opts, correct: differs ? 1 : 0, work: why};
  },
  'd-euler-stab': () => {
    const alpha = pick([0.5, 1, 2, 4, 5, 10]);
    const tau = 1 / alpha;   // stability scale
    const f = pick([0.2, 0.4, 0.6, 0.8, 1.3, 1.5, 1.7, 2.3, 2.6, 3]);   // Δt = f/α, never on a boundary
    const dt = +(f * tau).toFixed(4);
    const opts = ['Monotonic decay', 'Oscillating decay', 'Unstable (grows)'];
    const c = f < 1 ? 0 : f < 2 ? 1 : 2;
    return {q: `Explicit Euler on dy/dt = −αy with α = ${alpha}, Δt = ${fmt(dt)}. Behaviour of y<sub>n</sub>?`, kind: 'choice', options: opts, correct: c,
      work: `y<sub>n+1</sub> = (1 − αΔt)y<sub>n</sub>, αΔt = ${fmt(f)} ⇒ factor ${fmt(1 - f)} ⇒ ${opts[c].toLowerCase()} (0 < αΔt < 1 monotonic, 1 < αΔt < 2 oscillating decay, αΔt > 2 unstable)`};
  },

  'd-twos-comp': () => {
    const n = ri(3, 60);
    const c = bin8(-n);
    return {q: `8-bit two's complement. Which bit pattern represents −${n}?`,
      ...mkChoice(c, [bin8(~n), bin8(128 + n), bin8(-n + 1), bin8(-n - 1), bin8(n)]),
      work: `+${n} = ${bin8(n)}; invert all bits → ${bin8(~n)}; add 1 → ${c} (check: 256 − ${n} = ${256 - n}).`};
  },
  'd-char-wrap': () => {
    let a, b, w;
    do { a = ri(11, 70); b = ri(3, 12); w = new Int8Array([a * b])[0]; } while (a * b < 128 || a * b > 500 || ((a * b) & 255) < 128);   // really wraps to a negative value
    const p = a * b;
    return {q: `C, 8-bit <code>signed char</code> (range −128…127, two's complement wrap-around). What is stored by <code>signed char x = ${a} * ${b};</code>?`,
      ...mkChoice(String(w), [String(p), String(p & 255), String(p - 255), String(p - 128), String(-w)]),
      work: `${a}·${b} = ${p}; ${p} − 256 = ${p - 256} (the lowest 8 bits ${bin8(p)} read as signed).`};
  },
  'd-int-div': () => {
    const b = pick([3, 4, 5, 6, 7]);
    let a; do { a = ri(7, 40); } while (a % b === 0);
    const q = Math.trunc(-a / b), r = -a - q * b;    // C99: truncation toward zero, sign of remainder follows dividend
    const askQ = Math.random() < 0.5;
    if (askQ) return {q: `C (C99) integer arithmetic. What is <code>(−${a}) / ${b}</code>?`,
      ...mkChoice(String(q), [String(q - 1), String(-q), String(-q + 1), String(q + 1)]),
      work: `Integer division truncates toward zero: −${a}/${b} = ${(-a / b).toFixed(2)} → ${q} (not the floor ${q - 1}).`};
    return {q: `C (C99) integer arithmetic. What is <code>(−${a}) % ${b}</code>?`,
      ...mkChoice(String(r), [String(-r), String(b + r), String(b - (-r)), String(r - b)]),
      work: `Truncated quotient ${q}, remainder = −${a} − (${q})·${b} = ${r}; the sign follows the dividend.`};
  },
  'd-float-spacing': () => {
    const k = ri(4, 40);
    return {q: `IEEE single precision (23 stored mantissa bits). What is the spacing between adjacent floats in [2<sup>${k}</sup>, 2<sup>${k + 1}</sup>)?`,
      ...mkChoice(pw2(k - 23), [pw2(k - 24), pw2(k - 22), pw2(-23), pw2(k - 25), pw2(k)]),
      work: `Mantissa step is 2<sup>−23</sup> relative to the leading 2<sup>${k}</sup>: ε<sub>m</sub>·2<sup>${k}</sup> = ${pw2(k - 23)}.`};
  },
  'd-float-decode': () => {
    const s = pick([0, 1]), E = ri(124, 130), m = ri(1, 7), f = m / 8;     // top 3 mantissa bits m, rest zero
    const e = E - 127, mag = (1 + f) * Math.pow(2, e), val = (s ? -1 : 1) * mag;
    const mb = m.toString(2).padStart(3, '0') + '0'.repeat(20);
    const sg = x => (s ? -x : x);
    return {q: `IEEE single precision (bias 127, normalised). Bits: sign = ${s}, exponent field = ${E}, mantissa field = ${mb.slice(0, 3)}000…0. Which value is it?`,
      ...mkChoice(num(val), [num(sg(f * Math.pow(2, e))), num(sg(mag * 2)), num(sg(mag / 2)), num(-val), num(sg((1 + f) * Math.pow(2, E - 128 - 1)))]),
      work: `(−1)<sup>${s}</sup> · (1 + ${m}/8) · 2<sup>${E} − 127</sup> = ${s ? '−' : ''}${fmt(1 + f)} · ${pw2(e)} = ${num(val)}.`};
  },
  'd-order-from-ratio': () => {
    const fe = pick([2, 4, 8, 16, 32, 64]);
    const pp = Math.log2(fe);
    return {q: `Halving the step size Δt reduces the global error of an ordinary differential equation (ODE) integrator by a factor ${fe}. What is the order p of the method (global error ∝ Δt<sup>p</sup>)?`,
      ...mkChoice(String(pp), [String(pp + 1), String(pp - 1), String(fe), String(pp + 2), String(fe / 2)].filter(x => +x >= 1)),
      work: `Error ∝ Δt<sup>p</sup> ⇒ 2<sup>p</sup> = ${fe} ⇒ p = log<sub>2</sub> ${fe} = ${pp}.`};
  },
  'd-fevals': () => {
    const meth = pick([['explicit Euler', 1], ['2nd-order Runge–Kutta (RK2, two stages)', 2], ['classical 4th-order Runge–Kutta (RK4)', 4]]);
    const N = pick([100, 200, 250, 500, 1000]);
    const c = meth[1] * N;
    return {q: `Integrating with ${meth[0]} for N = ${N} fixed steps: how many evaluations of the right-hand side f are needed (explicit method, no step control)?`,
      ...mkChoice(String(c), [1, 2, 3, 4, 6].map(f => String(f * N)).concat([String(N + meth[1])])),
      work: `This method needs ${meth[1]} evaluation${meth[1] > 1 ? 's' : ''} per step ⇒ ${meth[1]} · ${N} = ${c}.`};
  },
  'd-adapt-step': () => {
    const [p, r, fac] = pick([[1, 4, 2], [1, 9, 3], [1, 1 / 4, 1 / 2], [3, 16, 2], [3, 1 / 16, 1 / 2], [2, 8, 2], [4, 32, 2], [4, 1 / 32, 1 / 2]]);
    const h = pick([0.1, 0.2, 0.4]);
    const ok = fmt(h * fac);
    const rn = r >= 1 ? `${r}` : `1/${1 / r}`;
    const f4 = x => fmt(+x.toPrecision(3));
    return {q: `Continuous step control with a method of order p = ${p}: h<sub>new</sub> = h (ε<sub>0</sub>/ε)<sup>1/(p+1)</sup>. Current h = ${h}, and ε<sub>0</sub>/ε = ${rn}. What is h<sub>new</sub>?`,
      ...mkChoice(ok, [f4(h * Math.pow(r, 1 / p)), f4(h * Math.pow(r, 1 / (p + 2))), f4(h * r), f4(h / fac), f4(h * Math.pow(r, p + 1))]),
      work: `Exponent 1/(p+1) = 1/${p + 1}; (${rn})<sup>1/${p + 1}</sup> = ${fmt(fac)} ⇒ h<sub>new</sub> = ${h}·${fmt(fac)} = ${ok}.`};
  },
  'd-leapfrog-kdk': () => {
    const x0 = pick([1, 2, 4]), v0 = pick([0, 1, 2, -1]), dt = pick([1, 2]);
    const vh = v0 - x0 * dt / 2, x1 = x0 + vh * dt, v1 = vh - x1 * dt / 2;
    return {q: `Harmonic oscillator a = −x. One kick-drift-kick (KDK) leapfrog step (kick Δt/2, drift Δt, kick Δt/2) from x<sub>0</sub> = ${x0}, v<sub>0</sub> = ${v0} with Δt = ${dt}. Give (x<sub>1</sub>, v<sub>1</sub>).`,
      kind: 'vec', ans: [x1, v1],
      work: `v<sub>½</sub> = ${v0} + (${fmt(-x0)})·${dt / 2} = ${fmt(vh)}; x<sub>1</sub> = ${x0} + (${fmt(vh)})·${dt} = ${fmt(x1)}; v<sub>1</sub> = ${fmt(vh)} + (${fmt(-x1)})·${dt / 2} = ${fmt(v1)}.`};
  },
  'd-relax-scale': () => {
    const [a, b] = pick([[3, 6], [2, 4], [4, 8], [5, 10], [1, 2], [2, 8]]);
    const R = Math.pow(10, b - a) * a / b;
    const wrong = [Math.pow(10, b - a), Math.pow(10, b - a) * b / a, Math.pow(10, b - a) / 8, Math.pow(10, b - a) * a / b * 8, Math.pow(10, 2 * (b - a)) * a / b];
    const fm = x => (x >= 1e5 ? num(x) : (+x.toPrecision(3)).toString());
    return {q: `Relaxation time t<sub>relax</sub> ≈ N/(8 ln N) · t<sub>cross</sub>, with t<sub>cross</sub> independent of N. N increases from 10<sup>${a}</sup> to 10<sup>${b}</sup>. By what factor does t<sub>relax</sub> grow?`,
      ...mkChoice(fm(R), wrong.map(fm)),
      work: `Ratio = (10<sup>${b}</sup>/10<sup>${a}</sup>) · (ln 10<sup>${a}</sup>/ln 10<sup>${b}</sup>) = 10<sup>${b - a}</sup> · ${a}/${b} = ${fm(R)}.`};
  },
  'd-tree-open': () => {
    const th = pick([0.5, 0.8, 1]), l = pick([1, 2, 4, 5]);
    let r; do { r = pick([2, 3, 4, 5, 8, 10, 12, 16, 20]); } while (Math.abs(l / r - th) < 0.04);
    const open = l / r > th;
    const opts = ['Opened: descend into its children', 'Accepted: use its monopole/multipole directly'];
    return {q: `Tree walk with opening angle θ<sub>c</sub> = ${th}. A node has size l = ${l} and distance r = ${r} from the target particle. A node is accepted as a single multipole if l/r &lt; θ<sub>c</sub>, otherwise opened. What happens?`,
      kind: 'choice', options: opts, correct: open ? 0 : 1,
      work: `l/r = ${l}/${r} = ${fmt(l / r)} ${open ? '&gt;' : '&lt;'} ${th} ⇒ ${open ? 'too close/too large: open the node' : 'small enough angle: use the multipole'}.`};
  },
  'd-cic-weight': () => {
    const p = ri(2, 6), ps = pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]);
    const x = p + 0.5 + ps, right = Math.random() < 0.5;
    const w = right ? ps : 1 - ps, cell = right ? p + 1 : p;
    const fx = x - Math.floor(x);
    const f = n => (+n.toFixed(2)).toString();
    return {q: `Clouds-in-cell (CIC) assignment in 1D with h = 1, cell p centred at (p + ½)h. A particle sits at x = ${fmt(x)}. What fraction of its mass goes to cell ${cell}?`,
      ...mkChoice(f(w), [f(1 - w), f(fx), f(1 - fx), '0.5', f(w / 2)]),
      work: `p<sub>f</sub> = x/h − ½ = ${fmt(x - 0.5)}, left cell p = ${p}, p* = ${fmt(ps)}; W<sub>p</sub> = 1 − p* = ${fmt(1 - ps)}, W<sub>p+1</sub> = p* = ${fmt(ps)} ⇒ cell ${cell}: ${f(w)}.`};
  },
  'd-cells-touched': () => {
    const sch = pick([['nearest-grid-point (NGP)', 1], ['clouds-in-cell (CIC)', 2], ['triangular-shaped cloud (TSC)', 3]]), d = ri(1, 3);
    const c = Math.pow(sch[1], d);
    return {q: `In ${d} dimension${d > 1 ? 's' : ''}, over how many mesh cells does a single particle's mass get spread by ${sch[0]} assignment?`,
      ...mkChoice(String(c), [1, 2, 3, 4, 6, 8, 9, 27].map(String).filter(x => +x !== c && (+x <= 27))),
      work: `This scheme touches ${sch[1]} cell${sch[1] > 1 ? 's' : ''} per dimension ⇒ ${sch[1]}<sup>${d}</sup> = ${c}.`};
  },
  'd-nyquist': () => {
    const N = pick([16, 32, 64, 128]), L = pick([2, 4, 8, 16]);
    const m = N / L;   // k_max = (N/2)(2π/L) = m·π
    const mk = x => (x === 1 ? 'π' : `${fmt(x)}π`);
    return {q: `Periodic box of size L = ${L} with N = ${N} grid points per dimension. What is the Nyquist wavenumber k<sub>max</sub> = (N/2)(2π/L)?`,
      ...mkChoice(mk(m), [mk(2 * m), mk(m / 2), mk(4 * m), mk(m / 4), mk(m + 1)]),
      work: `Fundamental mode 2π/L = ${mk(2 / L)}; k<sub>max</sub> = ${N / 2} · ${mk(2 / L)} = ${mk(m)}.`};
  },
  'd-dft-index': () => {
    const N = pick([16, 32, 64, 128]), m = ri(1, N / 2 - 1);
    return {q: `A discrete Fourier transform (DFT) library returns y<sub>k</sub>, k = 0 … N−1, for N = ${N} points (negative frequencies stored “backwards”). At which index k is the coefficient of frequency −${m}·(2π/L) stored?`,
      ...mkChoice(String(N - m), [N - m + 1, N - m - 1, N / 2 - m, N / 2 + m, m].map(String)),
      work: `Frequency −m lives at index N − m = ${N} − ${m} = ${N - m} (k = N/2 = ${N / 2} is the Nyquist term, smallest negative frequency at the largest index).`};
  },
  'd-zeropad': () => {
    const d = pick([2, 3]);
    const c = Math.pow(2, d);
    return {q: `Zero padding for a non-periodic force: the source sits in one corner of a mesh that is twice as long in every direction. In ${d}D, by what factor does the mesh memory grow compared to the unpadded N<sup>${d}</sup> grid?`,
      ...mkChoice(String(c), [2, 4, 8, 6, 3 * 2, 16].map(String)),
      work: `(2N)<sup>${d}</sup> / N<sup>${d}</sup> = 2<sup>${d}</sup> = ${c}.`};
  },
  /* ===== chapters 7-13 ===== */
  'd-jacobi-sweep': () => {
    const h = pick([1, 2, 0.5]);
    const s = h === 0.5 ? pick([4, 8, 12]) : ri(1, 6);
    const a = ri(0, 9), b = ri(0, 9), c = ri(0, 9);
    const h2s = h * h * s, ok = (a + c - h2s) / 2;
    const f = fmt;
    return {q: `1D discrete Poisson equation (Φ<sub>i+1</sub> − 2Φ<sub>i</sub> + Φ<sub>i−1</sub>)/h² = 4πGρ<sub>i</sub>, with grid spacing h = ${h} and source value 4πGρ<sub>i</sub> = ${s} at cell i. Current iterate: Φ<sub>i−1</sub> = ${a}, Φ<sub>i</sub> = ${b}, Φ<sub>i+1</sub> = ${c}. What is the new Φ<sub>i</sub> after one Jacobi sweep?`,
      ...mkChoice(f(ok), [f((a + c + h2s) / 2), f((a + c - s) / 2), f(a + c - h2s), f((a + b + c - h2s) / 3), f((a + c) / 2), f((a + c - h2s) / 4)]),
      work: `Φ<sub>i</sub><sup>new</sup> = ½(Φ<sub>i+1</sub> + Φ<sub>i−1</sub> − 4πG h²ρ<sub>i</sub>) = ½(${c} + ${a} − ${f(h2s)}) = ${f(ok)}; the old Φ<sub>i</sub> = ${b} is not used.`};
  },
  'd-jacobi-vs-gs': () => {
    const meth = pick(['Jacobi', 'Gauss–Seidel', 'Gauss–Seidel']);
    const dir = meth === 'Jacobi' ? pick(['left to right', 'right to left']) : pick(['left to right', 'right to left']);
    const o = ['Φ<sub>i−1</sub> from iteration n+1 (new), Φ<sub>i+1</sub> from iteration n (old)',
      'Both neighbours from iteration n (old)',
      'Both neighbours from iteration n+1 (new)',
      'Φ<sub>i−1</sub> from iteration n (old), Φ<sub>i+1</sub> from iteration n+1 (new)'];
    const c = meth === 'Jacobi' ? 1 : dir === 'left to right' ? 0 : 3;
    return {q: `1D Poisson problem, cells swept ${dir} (increasing i for left to right) within one iteration n → n+1. Which neighbour values does the ${meth} method use when it updates cell i?`,
      kind: 'choice', options: o, correct: c,
      work: meth === 'Jacobi' ? 'Jacobi uses only values of the previous iteration for every cell (so it can be parallelised).'
        : `Gauss–Seidel uses updated values immediately: sweeping ${dir}, the neighbour already visited (${dir === 'left to right' ? 'i−1' : 'i+1'}) is new, the other is still old.`};
  },
  'd-mg-transfer': () => {
    const f = fmt;
    if (Math.random() < 0.5) {
      const a = ri(0, 12), b = ri(0, 12), c = ri(0, 12), ok = (a + 2 * b + c) / 4;
      return {q: `Multigrid in 1D, restriction (fine → coarse) with stencil [¼, ½, ¼]. The three fine-grid values around a coarse point are ${a}, ${b}, ${c} (the coarse point sits at the middle one, ${b}). What coarse value results?`,
        ...mkChoice(f(ok), [f((a + b + c) / 3), f(b), f((a + b + c) / 4), f((a + 2 * b + c) / 2), f((a + c) / 2)]),
        work: `¼·${a} + ½·${b} + ¼·${c} = ${f(ok)}.`};
    }
    const A = ri(0, 12), B = ri(0, 12), ok = (A + B) / 2;
    return {q: `Multigrid in 1D, prolongation (coarse → fine) with stencil ]½, 1, ½[. Two neighbouring coarse points carry the values ${A} and ${B}. What value does the fine-grid point exactly halfway between them receive?`,
      ...mkChoice(f(ok), [f(A + B), f((A + B) / 4), f(A), f(B), f(2 * ok + 1)]),
      work: `The in-between fine point gets ½ from each side: ½·${A} + ½·${B} = ${f(ok)} (a fine point coinciding with a coarse one would copy its value, weight 1).`};
  },
  'd-mg-levels': () => {
    const d = ri(1, 3);
    if (Math.random() < 0.5) {
      const N = pick([16, 32, 64]), k = ri(1, 2), c = Math.pow(N, d) / Math.pow(2, d * k);
      const S = x => String(x);
      return {q: `Multigrid hierarchy in ${d}D: the finest grid (level 0) has ${N} points per dimension, and every coarser level doubles the spacing h in every dimension. How many grid points does level ${k} have in total?`,
        ...mkChoice(S(c), [Math.pow(N, d) / Math.pow(2, k), Math.pow(N, d) / Math.pow(2, d + k), Math.pow(N, d) / Math.pow(2, d * (k + 1)), N / Math.pow(2, k), Math.pow(N, d) / (2 * d * k)].map(S)),
        work: `Each dimension has ${N}/2<sup>${k}</sup> = ${N / Math.pow(2, k)} points ⇒ (${N / Math.pow(2, k)})<sup>${d}</sup> = ${c}.`};
    }
    const withFine = Math.random() < 0.5;
    const tab = {1: ['1', '2'], 2: ['1/3', '4/3'], 3: ['1/7', '8/7']};
    const ok = tab[d][withFine ? 1 : 0];
    const all = ['1', '2', '1/3', '4/3', '1/7', '8/7', '1/2', '3/2'];
    return {q: `Multigrid in ${d}D with an unlimited number of coarser levels, each with spacing 2h of the previous one. Assume the work on a level equals one sweep and is proportional to its number of grid points. Total work on ${withFine ? 'all levels including the finest' : 'all coarser levels (finest level excluded)'}, in units of one sweep on the finest grid?`,
      ...mkChoice(ok, all),
      work: `Points per level shrink by 2<sup>${d}</sup> = ${Math.pow(2, d)}: Σ<sub>k≥1</sub> ${Math.pow(2, d)}<sup>−k</sup> = 1/${Math.pow(2, d) - 1}; with the finest level added: ${Math.pow(2, d)}/${Math.pow(2, d) - 1}. Answer: ${ok}.`};
  },
  'd-lj-potential': () => {
    const T = [['σ', 1, 1], ['2<sup>1/6</sup>σ', Math.pow(2, 1 / 6), 0.5], ['2<sup>−1/6</sup>σ', Math.pow(2, -1 / 6), 2], ['2<sup>1/3</sup>σ', Math.pow(2, 1 / 3), 0.25], ['2<sup>−1/3</sup>σ', Math.pow(2, -1 / 3), 4]];
    const [rt, , x] = pick(T);
    const v = 4 * (x * x - x), S = t => `${fmt(t).replace('-', '−')} ε`;
    return {q: `Lennard-Jones potential V(r) = 4ε[(σ/r)<sup>12</sup> − (σ/r)<sup>6</sup>]. Evaluate V at r = ${rt}.`,
      ...mkChoice(S(v), [S(v / 4), S(-v), S(4 * (1 / (x * x) - 1 / x)), S(4 * x * x), S(4 * (x * x + x)), S(-4 * x), S(1)]),
      work: `Let x = (σ/r)<sup>6</sup> = ${fmt(x)}; V = 4ε(x² − x) = 4ε(${fmt(x * x)} − ${fmt(x)}) = ${S(v)}.`};
  },
  'd-pair-scale': () => {
    const S = x => String(x);
    if (Math.random() < 0.5) {
      const N = pick([10, 20, 50, 100, 1000]), c = N * (N - 1) / 2;
      return {q: `Molecular dynamics (MD) with N = ${N} particles and no cutoff: how many distinct pairs of particles must be evaluated per force calculation?`,
        ...mkChoice(S(c), [N * N, N * (N - 1), N * N / 2, N * (N + 1) / 2, N]), 
        work: `N(N−1)/2 = ${N}·${N - 1}/2 = ${c}.`};
    }
    const f = pick([2, 3, 4, 10]), direct = Math.random() < 0.5, ok = direct ? f * f : f;
    return {q: `Molecular dynamics (MD) at fixed density and fixed cutoff radius. The particle number N is multiplied by ${f}. By what factor does the cost of one force calculation grow with ${direct ? 'the direct all-pairs sum' : 'a search grid (cell list) that ignores cells beyond the cutoff'}?`,
      ...mkChoice(S(ok), [f, f * f, f * f * f, 2 * f, 1].map(S)),
      work: direct ? `All pairs: cost ∝ N² ⇒ ${f}² = ${f * f}.` : `Cell list with cutoff: cost ∝ N ⇒ ${f}.`};
  },
  'd-mach': () => {
    const T = [['5/3', 5 / 3, 5, 3], ['4/3', 4 / 3, 4, 3], ['7/5', 1.4, 7, 5], ['2', 2, 2, 1], ['3/2', 1.5, 3, 2]];
    const [gt, , rho, fc] = pick(T), cs = pick([2, 3, 4, 5]), m = pick([0.5, 1.5, 2, 3, 4]);
    const P = fc * cs * cs, v = m * cs, f = fmt;
    return {q: `Ideal gas ahead of a shock (code units): adiabatic index γ = ${gt}, pressure P = ${P}, density ρ = ${rho}. The gas streams into the shock at speed v = ${f(v)}. What is the Mach number ℳ = v/c<sub>s</sub>, with c<sub>s</sub>² = γP/ρ?`,
      ...mkChoice(f(m), [f(1 / m), f(m * m), f(v / (cs * cs)), f(v)]),
      work: `c<sub>s</sub> = √(γP/ρ) = √(${gt}·${P}/${rho}) = ${cs}; ℳ = ${f(v)}/${cs} = ${f(m)} ${m > 1 ? '&gt; 1: supersonic, a shock can form' : '&lt; 1: subsonic, no shock'}.`};
  },
  'd-eos-pressure': () => {
    const T = [['5/3', 2 / 3, [3, 6]], ['4/3', 1 / 3, [3, 6]], ['7/5', 0.4, [5, 10]], ['2', 1, [1, 2, 3, 4]], ['3/2', 0.5, [2, 4, 6]]];
    const [gt, g1, rs] = pick(T), rho = pick(rs), u = ri(1, 6), P = g1 * rho * u, g = g1 + 1, f = x => fmt(+x.toFixed(6));
    return {q: `Ideal gas with adiabatic index γ = ${gt}, density ρ = ${rho} and thermal energy per unit mass u = ${u}. Equation of state P = (γ−1)ρu. What is the pressure P?`,
      ...mkChoice(f(P), [f(g * rho * u), f(rho * u / g1), f(g1 * u / rho), f(rho * u), f(g * rho * u / 2)]),
      work: `P = (${gt} − 1)·${rho}·${u} = ${f(g1)}·${rho * u} = ${f(P)}.`};
  },
  'd-shock-jump': () => {
    const f = fmt;
    if (Math.random() < 0.5) {
      const T = [['5/3', 4], ['4/3', 7], ['3/2', 5], ['2', 3], ['7/5', 6]];
      const [gt, r] = pick(T), rho = pick([1, 2, 3]), ok = r * rho;
      return {q: `Strong shock (very large Mach number) in an ideal gas with γ = ${gt}. In this limit the density jump is ρ′/ρ = (γ+1)/(γ−1). Pre-shock density ρ = ${rho}. What is the post-shock density ρ′?`,
        ...mkChoice(f(ok), [f(rho / r), f(r), f(rho * (r - 1)), f(rho * (r + 1)), f(rho * eval(gt))]),
        work: `(γ+1)/(γ−1) = (${gt}+1)/(${gt}−1) = ${r}; ρ′ = ${r}·${rho} = ${ok}.`};
    }
    const rho = pick([1, 2]), r = pick([2, 3, 4, 6]), v = pick([12, 24]), rho2 = r * rho, ok = v / r;
    return {q: `Shock in its rest frame: the mass flux ρv = ρ′v′ is conserved across it. Pre-shock density ρ = ${rho} and velocity v = ${v}; post-shock density ρ′ = ${rho2}. What is the post-shock velocity v′?`,
      ...mkChoice(f(ok), [f(v * r), f(v), f(v * rho2), f(v * (r - 1)), f(v / (r + 1))]),
      work: `v′ = ρv/ρ′ = ${rho}·${v}/${rho2} = ${f(ok)} (the compressed gas moves slower).`};
  },
  'd-rt-stability': () => {
    let r1, r2; do { r1 = ri(1, 5); r2 = ri(1, 5); } while (r1 === r2);
    const unstable = r1 > r2;
    const o = ['Unstable: ω² &lt; 0, perturbations grow', 'Stable: ω² &gt; 0, perturbations oscillate'];
    return {q: `Rayleigh–Taylor set-up, both fluids at rest, gravity g pointing down, perturbation ∝ e<sup>i(kx−ωt)</sup> with ω² = (ρ<sub>2</sub> − ρ<sub>1</sub>)kg/(ρ<sub>1</sub> + ρ<sub>2</sub>), where fluid 1 lies on top. Fluid 1 has density ρ<sub>1</sub> = ${r1} on top of fluid 2 with ρ<sub>2</sub> = ${r2}. Stable or unstable?`,
      kind: 'choice', options: o, correct: unstable ? 0 : 1,
      work: `ρ<sub>2</sub> − ρ<sub>1</sub> = ${r2 - r1} ${unstable ? '&lt; 0 ⇒ ω² &lt; 0 ⇒ Im(ω) &gt; 0: growth (heavy fluid on top)' : '&gt; 0 ⇒ ω² &gt; 0: oscillation (light fluid on top is stable)'}.`};
  },
  'd-kh-rate': () => {
    const T = [[1, 1, 1, 2], [1, 4, 2, 5], [2, 8, 4, 10], [4, 4, 4, 8], [1, 9, 3, 10], [3, 12, 6, 15], [2, 2, 2, 4]];
    const [r1, r2, s, sum] = pick(T), k = pick([1, 2, 5, 10]);
    let v1, v2; do { v1 = ri(-4, 5); v2 = ri(-4, 5); } while (v1 === v2);
    const dv = Math.abs(v1 - v2), rate = k * s * dv / sum, f = x => fmt(+x.toFixed(6));
    return {q: `Kelvin–Helmholtz instability without gravity, perturbation ∝ e<sup>i(kx−ωt)</sup>, where ω = k(ρ<sub>1</sub>v<sub>1</sub> + ρ<sub>2</sub>v<sub>2</sub>)/(ρ<sub>1</sub> + ρ<sub>2</sub>) ± i·k√(ρ<sub>1</sub>ρ<sub>2</sub>)|v<sub>1</sub> − v<sub>2</sub>|/(ρ<sub>1</sub> + ρ<sub>2</sub>). Take ρ<sub>1</sub> = ${r1}, v<sub>1</sub> = ${v1}, ρ<sub>2</sub> = ${r2}, v<sub>2</sub> = ${v2}, k = ${k}. What is the growth rate Im(ω) of the growing mode?`,
      ...mkChoice(f(rate), [f(k * r1 * r2 * dv / sum), f(k * s * Math.abs(v1 + v2) / sum), f(k * s * dv / Math.sqrt(sum)), f(k * dv), f(k * s * dv / (sum * 2)), f(k * s * dv)]),
      work: `Im(ω) = k√(ρ<sub>1</sub>ρ<sub>2</sub>)|Δv|/(ρ<sub>1</sub>+ρ<sub>2</sub>) = ${k}·${s}·${dv}/${sum} = ${f(rate)}.`};
  },
  'd-pde-class': () => {
    const cls = pick([0, 1, 2]);
    let a, b, c, D;
    do { a = ri(-3, 4); b = ri(-4, 4); c = ri(-3, 4); D = b * b - 4 * a * c; } while (cls === 0 ? D >= 0 : cls === 1 ? D !== 0 : D <= 0);
    const o = ['Elliptic', 'Parabolic', 'Hyperbolic'];
    return {q: `Second-order linear partial differential equation (PDE) in x, y: ${a}·∂<sub>x</sub>²u + ${b}·∂<sub>x</sub>∂<sub>y</sub>u + ${c}·∂<sub>y</sub>²u + (lower-order terms) = g. With D = b² − 4ac, the type is elliptic for D &lt; 0, parabolic for D = 0 and hyperbolic for D &gt; 0. Which type is it?`.replace(/\+ -/g, '− '),
      kind: 'choice', options: o, correct: cls,
      work: `D = (${b})² − 4·(${a})·(${c}) = ${D} ${D < 0 ? '&lt; 0' : D === 0 ? '= 0' : '&gt; 0'} ⇒ ${o[cls].toLowerCase()}.`};
  },
  'd-cfl-step': () => {
    let C, dx, v, cs, ans;
    do { C = pick([0.4, 0.5, 0.8]); dx = pick([0.1, 0.2, 0.5, 1]); v = pick([-3, -2, -1, 1, 2, 3]); cs = pick([1, 2, 3, 5, 7]); ans = C * dx / (Math.abs(v) + cs); }
    while (![2, 4, 5, 8, 10].includes(Math.abs(v) + cs) || Math.abs(ans * 1e4 - Math.round(ans * 1e4)) > 1e-9);
    const f = x => fmt(+x.toFixed(6));
    return {q: `Courant–Friedrichs–Lewy (CFL) time step in 1D hydrodynamics: Δt = C·Δx/(|v| + c<sub>s</sub>). Take C = ${C}, Δx = ${dx}, gas velocity v = ${v}, sound speed c<sub>s</sub> = ${cs}. What is Δt?`,
      ...mkChoice(f(ans), [f(C * dx / Math.abs(v)), f(C * dx / cs), f(dx / (Math.abs(v) + cs)), f(C * dx / Math.max(1, Math.abs(Math.abs(v) - cs))), f(C * dx * (Math.abs(v) + cs))]),
      work: `|v| + c<sub>s</sub> = ${Math.abs(v)} + ${cs} = ${Math.abs(v) + cs}; Δt = ${C}·${dx}/${Math.abs(v) + cs} = ${f(ans)}.`};
  },
  'd-sph': () => {
    const f = x => fmt(+x.toFixed(6));
    if (Math.random() < 0.5) {
      const m = [ri(1, 3), ri(1, 3), ri(1, 3)], W = [ri(1, 9) / 10, ri(1, 9) / 10, ri(1, 9) / 10];
      const rho = m[0] * W[0] + m[1] * W[1] + m[2] * W[2], sm = m[0] + m[1] + m[2], sw = W[0] + W[1] + W[2];
      return {q: `Smoothed particle hydrodynamics (SPH) density estimate ρ<sub>i</sub> = Σ<sub>j</sub> m<sub>j</sub> W(|r<sub>i</sub> − r<sub>j</sub>|, h). Particle i has three contributions (itself included) with masses m = ${m.join(', ')} and kernel values W = ${W.join(', ')}, respectively. What is ρ<sub>i</sub>?`,
        ...mkChoice(f(rho), [f(sw), f(sm * sw), f(sm), f(sm * sw / 3), f(m[0] * W[0])]),
        work: `${m[0]}·${W[0]} + ${m[1]}·${W[1]} + ${m[2]}·${W[2]} = ${f(rho)}.`};
    }
    const [d, q] = pick([[3, 2], [3, 3], [2, 2], [2, 3], [2, 4], [1, 4], [1, 8]]);
    const fct = Math.pow(q, d), S = t => `×${t}`;
    return {q: `Smoothed particle hydrodynamics (SPH) in ${d}D with fixed particle mass m and smoothing length h ∝ (m/ρ)<sup>1/${d}</sup>. The local density ρ increases by a factor ${fct}. By what factor does h change?`,
      ...mkChoice(S(`1/${q}`), [S(String(q)), S(`1/${fct}`), S(String(fct)), S(`1/${q * q}`)]),
      work: `h ∝ ρ<sup>−1/${d}</sup> ⇒ ${fct}<sup>−1/${d}</sup> = 1/${q}.`};
  },
  'd-fem-count': () => {
    const S = x => String(x);
    if (Math.random() < 0.5) {
      const p = ri(1, 5);
      return {q: `Finite-element method in 1D: on each element the solution is a polynomial of degree p = ${p}. How many nodes per element are needed to specify it uniquely?`,
        ...mkChoice(S(p + 1), [p, p + 2, 2 * p, 2, p * p + 1].map(S)),
        work: `A degree-${p} polynomial has ${p} + 1 = ${p + 1} coefficients ⇒ ${p + 1} nodes.`};
    }
    const N = ri(3, 12), p = pick([1, 1, 2, 3]);
    return {q: `Finite-element mesh in 1D with N = ${N} elements in a row, polynomial degree p = ${p} on each, neighbouring elements sharing their end nodes. How many nodes (unknowns) in total?`,
      ...mkChoice(S(p * N + 1), [(p + 1) * N, p * N, N + 1, p * (N + 1), (p + 1) * N + 1].map(S)),
      work: `Each element adds ${p} new nodes, plus the very first node: ${p}·${N} + 1 = ${p * N + 1}.`};
  },
  'd-mc-error': () => {
    const S = x => String(x);
    if (Math.random() < 0.5) {
      const fr = pick([2, 3, 4, 5, 10]), d = pick([2, 3, 6]);
      return {q: `Monte Carlo integration in ${d} dimensions: the statistical error scales as 1/√N, irrespective of dimension. By what factor must the number of samples N grow to make the error ${fr} times smaller?`,
        ...mkChoice(`×${fr * fr}`, [`×${fr}`, `×${Math.pow(fr, d)}`, `×${2 * fr}`, `×${fr * fr * fr}`]),
        work: `Error ∝ N<sup>−1/2</sup> ⇒ N ∝ error<sup>−2</sup> ⇒ ${fr}² = ${fr * fr}.`};
    }
    const q = pick([2, 3, 5, 10]), k = q * q;
    return {q: `Monte Carlo integration with error ∝ 1/√N. The number of samples N is multiplied by ${k}. By what factor does the error shrink?`,
      ...mkChoice(`÷${q}`, [`÷${k}`, `÷${k * q}`, `÷${2 * q}`, `÷${q * q + 1}`]),
      work: `Error ∝ N<sup>−1/2</sup> ⇒ √${k} = ${q}.`};
  },
  'd-mc-inversion': () => {
    const lam = pick([1, 2, 4]), n = pick([1, 2, 3]), x = 1 - Math.pow(2, -n);
    const y = -Math.log(1 - x) / lam, t = z => z.toFixed(3);
    return {q: `Exact inversion for p(y) = λe<sup>−λy</sup> (y ≥ 0) from a uniform x ∈ [0, 1): y = −ln(1 − x)/λ. Take λ = ${lam} and x = ${fmt(x)} (use ln 2 ≈ 0.693). What is y?`,
      ...mkChoice(t(y), [t(-Math.log(x) / lam), t(-lam * Math.log(1 - x)), t(-y), t((1 - x) / lam), t(Math.log(2) / lam * (n + 1))]),
      work: `1 − x = 2<sup>−${n}</sup> ⇒ −ln(1 − x) = ${n}·ln 2 ≈ ${t(n * Math.log(2))}; divide by λ = ${lam}: y ≈ ${t(y)}.`};
  },
  'd-mc-rejection': () => {
    const n = ri(1, 4), L = pick([2, 3, 4]);
    const S = x => String(x);
    if (Math.random() < 0.5) {
      return {q: `Rejection method for the (unnormalised) density p(y) = y<sup>${n}</sup> on [0, ${L}), using the constant envelope f(y) = ${L}<sup>${n}</sup> (the maximum of p). Efficiency = area under p / area under f. What fraction of the trial values is accepted on average?`,
        ...mkChoice(`1/${n + 1}`, [`1/${n}`, `1/${n + 2}`, `${n}/${n + 1}`, `1/${L}`, `1/${2 * n + 1}`]),
        work: `Area under p: ${L}<sup>${n + 1}</sup>/${n + 1}; area under f: ${L}·${L}<sup>${n}</sup> = ${L}<sup>${n + 1}</sup>; ratio = 1/${n + 1}.`};
    }
    return {q: `Rejection method for the (unnormalised) density p(y) = y<sup>${n}</sup> on [0, ${L}), with constant envelope f(y) = ${L}<sup>${n}</sup>. On average, how many trial values y must be generated per accepted sample?`,
      ...mkChoice(S(n + 1), [n, n + 2, L, 2 * n + 1, n * n + 2].map(S)),
      work: `Efficiency = (area under p)/(area under f) = 1/${n + 1} ⇒ ${n + 1} trials per accepted sample.`};
  },
  'd-mc-metropolis': () => {
    let p, p2, qf, qb, r;
    do { p = pick([2, 4, 5, 8, 10]); p2 = pick([1, 2, 3, 4, 5, 6, 8, 10]); [qf, qb] = pick([[0.5, 0.5], [0.25, 0.5], [0.5, 0.25], [0.2, 0.4], [0.4, 0.2]]); r = p2 * qb / (p * qf); } while (Math.abs(r - 1) < 1e-9);
    const f = x => fmt(+x.toFixed(6)), ok = Math.min(1, r);
    return {q: `Metropolis–Hastings algorithm: a proposed move x → x′ is accepted with probability min(1, p(x′)q(x′→x) / (p(x)q(x→x′))). Target (unnormalised) p(x) = ${p}, p(x′) = ${p2}; proposal probabilities q(x→x′) = ${qf}, q(x′→x) = ${qb}. What is the acceptance probability?`,
      ...mkChoice(f(ok), [f(r), f(Math.min(1, p2 / p)), f(Math.min(1, p / p2 * qf / qb)), f(Math.min(1, p2 * qf / (p * qb))), '0.5', f(r / 2)]),
      work: `Hastings ratio = (${p2}·${qb})/(${p}·${qf}) = ${f(r)} ⇒ min(1, ${f(r)}) = ${f(ok)}.`};
  },
  'd-mc-lcg': () => {
    const m = pick([8, 10, 11, 16]), a = pick([3, 5, 7]), c = pick([1, 3, 5]), x0 = ri(1, m - 1);
    const x1 = (a * x0 + c) % m, x2 = (a * x1 + c) % m, S = x => String(x);
    return {q: `Linear congruential generator (LCG): x<sub>n+1</sub> = (a·x<sub>n</sub> + c) mod m with a = ${a}, c = ${c}, m = ${m} and seed x<sub>0</sub> = ${x0}. What is x<sub>2</sub>?`,
      ...mkChoice(S(x2), [x1, (a * x1 + c) % m === x2 ? x1 + 1 : x2, (a * x1 + c), (a * x1) % m, (a * x2 + c) % m, (x2 + 1) % m, a * x1 + c - m].map(S)),
      work: `x<sub>1</sub> = (${a}·${x0} + ${c}) mod ${m} = ${a * x0 + c} mod ${m} = ${x1}; x<sub>2</sub> = (${a}·${x1} + ${c}) mod ${m} = ${a * x1 + c} mod ${m} = ${x2}.`};
  },
};
