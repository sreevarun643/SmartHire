/**
 * courses-frontend.js — FRONTEND (browser) for Courses & Certificates
 *
 * Shows courses, study modules, the MCQ assessment, results and the printable certificate.
 * It never contains answers and never decides pass/fail: every decision comes from the API
 * in courses-backend.js.
 *
 *   <div id="courses-root"></div>
 *   <script src="courses-frontend.js"></script>
 *   <script>
 *     CoursesUI.mount(document.getElementById('courses-root'), {
 *       apiBase: '',                              // e.g. 'https://api.example.com'
 *       getToken: () => localStorage.getItem('token')   // your login token (JWT)
 *     });
 *     // Public verify page:  CoursesUI.verifyPage(rootEl, 'SH-1A2B3C4D')
 *   </script>
 */
const CoursesUI = (() => {
  let cfg, root, test;                                   // test = { courseId, attemptId, questions }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = t => new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  async function api(path, opts = {}) {
    const res = await fetch((cfg.apiBase || '') + path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(cfg.getToken ? { Authorization: 'Bearer ' + cfg.getToken() } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.error || 'Request failed'), { status: res.status });
    return json;
  }

  const css = `.cu-g{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}.cu-card{border:1px solid #ccd;border-radius:14px;padding:14px;background:#fff;color:#222}
  .cu-btn{border:0;border-radius:10px;padding:8px 14px;background:#4f46e5;color:#fff;cursor:pointer;margin:2px}.cu-btn.ghost{background:#eef;color:#223}
  .cu-bar{height:8px;background:#e5e7eb;border-radius:9px}.cu-bar i{display:block;height:100%;background:#4f46e5;border-radius:9px}
  .cu-ov{position:fixed;inset:0;background:#0008;display:grid;place-items:center;padding:14px;z-index:50}.cu-modal{background:#fff;color:#222;border-radius:14px;padding:18px;max-width:600px;width:100%;max-height:90vh;overflow:auto}
  .cu-err{color:#b91c1c}@media print{body *{visibility:hidden}#cu-cert,#cu-cert *{visibility:visible}#cu-cert{position:absolute;left:0;top:0;width:100%}.cu-ov{background:none}}`;

  function modal(html) {
    close();
    const o = document.createElement('div'); o.className = 'cu-ov'; o.id = 'cu-ov';
    o.innerHTML = `<div class="cu-modal" role="dialog" aria-modal="true">${html}</div>`;
    o.addEventListener('click', e => { if (e.target === o) close(); });
    document.body.append(o);
  }
  const close = () => { const o = document.getElementById('cu-ov'); if (o) o.remove(); };
  const fail = e => alert(e.message);

  // ---------- Course list ----------
  async function list() {
    const courses = await api('/api/courses');
    root.innerHTML = `<style>${css}</style><h2>Courses &amp; Certificates</h2>
      <p><button class="cu-btn ghost" data-act="mine">My certificates</button></p>
      <div class="cu-g">${courses.map(c => `<div class="cu-card"><b>${esc(c.title)}</b>
        <p>${esc(c.level)} · ${esc(c.duration)} · ${esc(c.skill)}</p>
        <div class="cu-bar"><i style="width:${c.certificateId ? 100 : c.modulesDone * 25}%"></i></div>
        <p>${c.certificateId ? 'Certificate earned ✓'
          : c.lastPassed === false ? `<span class="cu-err">Last score ${c.lastScore}% — not passed. Retake available.</span>`
          : c.modulesDone + '/3 modules done'}</p>
        ${c.certificateId ? `<button class="cu-btn" data-act="cert" data-id="${esc(c.certificateId)}">View certificate</button>` : ''}
        <button class="cu-btn ${c.certificateId ? 'ghost' : ''}" data-act="open" data-id="${esc(c.id)}">${c.certificateId ? 'Review material' : c.modulesDone ? 'Continue course' : 'Start course'}</button></div>`).join('')}</div>`;
  }

  // ---------- One course: modules 1-3 + final assessment ----------
  async function open(id) {
    const c = await api('/api/courses/' + encodeURIComponent(id));
    const cur = c.lessons.find(l => !l.completed && !l.locked);
    modal(`<h3>${esc(c.title)}</h3><p>${esc(c.level)} · ${esc(c.duration)}</p>
      <p>${c.docsUrl ? `<a href="${esc(c.docsUrl)}" target="_blank" rel="noopener">📄 Official documentation</a> · ` : ''}
         <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(c.videoQuery)}" target="_blank" rel="noopener">▶ Watch video tutorials</a></p>
      ${c.lessons.map(l => `<details class="cu-card" ${cur && cur.position === l.position ? 'open' : ''}><summary><b>Module ${l.position}: ${esc(l.title)}</b> ${l.completed ? '✅' : l.locked ? '🔒' : '📖'}</summary>
        ${l.locked ? '<p>Complete the previous module to unlock.</p>' : `<ul>${l.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`}
        ${cur && cur.position === l.position ? `<button class="cu-btn" data-act="done" data-id="${esc(id)}">Mark module ${l.position} complete</button>` : ''}</details>`).join('')}
      <div class="cu-card"><b>Module 4: Final assessment (MCQ)</b>
        <p>5 questions · pass mark ${c.passMark}% · the certificate is issued only if you pass. If you don't pass you can retake the assessment.</p>
        ${c.certificateId ? '<p>🎉 Passed — certificate earned.</p>'
          : c.testUnlocked ? `<button class="cu-btn" data-act="test" data-id="${esc(id)}">Start / retake assessment</button>`
          : '<p>Finish modules 1–3 to unlock.</p>'}</div>
      <p><button class="cu-btn ghost" data-act="close">Close</button></p>`);
  }

  // ---------- Assessment ----------
  async function startTest(id) {
    const t = await api(`/api/courses/${encodeURIComponent(id)}/test/start`, { method: 'POST' });
    test = { courseId: id, attemptId: t.attemptId };
    modal(`<h3>Final assessment</h3><p>Pass mark ${t.passMark}% · ${t.minutes} minutes. No certificate is issued if you don't pass; you can retake.</p>
      <form id="cu-form">${t.questions.map((q, i) => `<p><b>${i + 1}. ${esc(q.text)}</b></p>
        ${q.options.map(o => `<label style="display:block"><input type="radio" name="q${q.id}" value="${o.id}" required> ${esc(o.text)}</label>`).join('')}`).join('')}
      <p><button class="cu-btn">Submit assessment</button></p></form>`);
    document.getElementById('cu-form').addEventListener('submit', submitTest);
  }

  async function submitTest(e) {
    e.preventDefault();
    const answers = {};
    new FormData(e.target).forEach((v, k) => { answers[k.slice(1)] = Number(v); });
    try {
      const r = await api(`/api/courses/${encodeURIComponent(test.courseId)}/test/submit`, { method: 'POST', body: { attemptId: test.attemptId, answers } });
      if (r.passed) { await list(); return certificate(r.certificateId); }
      await list();
      modal(`<h3>❌ Assessment not passed</h3><p>You scored <b>${r.score}%</b>. ${esc(r.message)}</p>
        <p>Questions to review: ${r.wrongQuestions.join(', ')}</p>
        <button class="cu-btn" data-act="test" data-id="${esc(test.courseId)}">Retake assessment</button>
        <button class="cu-btn ghost" data-act="open" data-id="${esc(test.courseId)}">Review study material</button>`);
    } catch (err) { fail(err); }
  }

  // ---------- Certificate ----------
  function certHtml(c) {
    const url = location.origin + location.pathname + '#verify/' + c.id;
    return `<div id="cu-cert" style="background:#fffdf5;color:#1f2937;padding:10px;font-family:Georgia,serif"><div style="border:6px double #b8860b;padding:22px 16px;text-align:center">
      <div style="letter-spacing:4px;font-size:12px;color:#7c5c00">SMARTHIRE ACADEMY</div><div style="font-size:28px;font-weight:700;letter-spacing:3px;color:#1e3a8a">CERTIFICATE</div>
      <div style="letter-spacing:5px;font-size:12px">OF COMPLETION</div><div style="margin:14px 0 4px;font-style:italic">This is to certify that</div>
      <div style="font-size:30px;font-style:italic;color:#6d28d9;border-bottom:1px solid #b8860b;display:inline-block;padding:0 24px">${esc(c.holder)}</div>
      <div style="margin:10px 0 2px;font-style:italic">has successfully completed the course</div><div style="font-size:21px;font-weight:700;color:#1e3a8a">${esc(c.title)}</div>
      <div style="font-size:12px;color:#555">${esc(c.level)} level · ${esc(c.duration)} · Skill: ${esc(c.skill)}</div><div style="font-size:12px;margin-top:4px">Final assessment score: <b>${esc(c.score)}%</b></div>
      <div style="display:flex;justify-content:space-around;align-items:flex-end;margin-top:22px;flex-wrap:wrap;gap:8px"><div style="font-size:12px"><b>${fmt(c.issuedAt)}</b><div style="border-top:1px solid #888">Date of issue</div></div>
        <svg width="84" height="84" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#b8860b"/><circle cx="50" cy="50" r="38" fill="#f6d365" stroke="#fff" stroke-width="2"/><path d="M50 22l7 18 19 1-15 12 5 19-16-11-16 11 5-19-15-12 19-1z" fill="#b8860b"/></svg>
        <div style="font-size:12px"><div style="font-family:'Brush Script MT',cursive;font-size:21px;color:#1e3a8a">SmartHire Academy</div><div style="border-top:1px solid #888">Program Director</div></div></div>
      <div style="font-size:11px;margin-top:16px;color:#444;word-break:break-all">Certificate ID: <b>${esc(c.id)}</b><br>Verify at: ${esc(url)}</div></div></div>`;
  }
  async function certificate(id) {
    try {
      const c = await api('/api/certificates/' + encodeURIComponent(id));
      modal(certHtml(c) + `<p><button class="cu-btn" data-act="print">Print / Save as PDF</button><button class="cu-btn ghost" data-act="close">Close</button></p>`);
    } catch (err) { fail(err); }
  }
  async function mine() {
    const list_ = await api('/api/certificates/mine');
    modal(`<h3>My certificates</h3>${list_.length ? list_.map(c => `<p><b>${esc(c.title)}</b> · ${esc(c.id)} · ${fmt(c.issuedAt)} · ${esc(c.score)}%
      <button class="cu-btn ghost" data-act="cert" data-id="${esc(c.id)}">View</button></p>`).join('') : '<p>No certificates yet.</p>'}<button class="cu-btn ghost" data-act="close">Close</button>`);
  }

  // ---------- Public verification page (no login needed) ----------
  async function verifyPage(el, id) {
    cfg = cfg || { apiBase: '' };
    el.innerHTML = `<style>${css}</style><div class="cu-card"><h3>Verify certificate</h3><p>Checking…</p></div>`;
    try {
      const r = await api(`/api/certificates/${encodeURIComponent(id)}/verify`);
      el.querySelector('.cu-card').innerHTML = r.valid
        ? `<h3>✅ Valid certificate</h3><p>${esc(r.title)} — awarded to <b>${esc(r.holder)}</b> on ${fmt(r.issuedAt)} (score ${esc(r.score)}%).</p>`
        : '<h3>❌ Not found</h3><p>No certificate exists with this ID.</p>';
    } catch (err) { el.querySelector('.cu-card').innerHTML = `<p class="cu-err">${esc(err.message)}</p>`; }
  }

  const actions = { open, test: startTest, cert: certificate, mine, close,
    done: async id => { await api(`/api/courses/${encodeURIComponent(id)}/modules/complete`, { method: 'POST' }); await list(); await open(id); },
    print: () => window.print() };

  function mount(el, config) {
    cfg = config; root = el;
    root.addEventListener('click', onClick); document.addEventListener('click', onClick);   // modal is appended to <body>
    return list().catch(fail);
  }
  function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b || !actions[b.dataset.act]) return;
    Promise.resolve(actions[b.dataset.act](b.dataset.id)).catch(fail);
  }
  return { mount, verifyPage };
})();
if (typeof module !== 'undefined') module.exports = CoursesUI;
