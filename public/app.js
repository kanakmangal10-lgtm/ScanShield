/* ══════════════════════════════════════════════════════════════
   EMAIL GUARD DASHBOARD — Application Logic
   ══════════════════════════════════════════════════════════════ */

const API_BASE = '';  // Same origin

// ─── State ──────────────────────────────────────────────────────────────────
let allReports = [];
let currentFilter = 'ALL';
let currentSearch = '';

// ─── DOM Refs ───────────────────────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSearch();
  setupFilters();
  setupModal();
  setupRefresh();
  loadDashboard();
});

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function setupNavigation() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // "View all" link on dashboard
  $('#view-all-reports').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('reports');
  });
}

function switchView(viewName) {
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  $$(`.nav-item[data-view="${viewName}"]`).forEach(n => n.classList.add('active'));

  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $(`#view-${viewName}`);
  if (target) target.classList.add('active');

  if (viewName === 'dashboard') loadDashboard();
  else if (viewName === 'reports') loadReports();
  else if (viewName === 'workflow') renderWorkflow();
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboard() {
  try {
    const [statsRes, reportsRes] = await Promise.all([
      fetch(`${API_BASE}/api/stats`),
      fetch(`${API_BASE}/api/reports?limit=5`)
    ]);

    const stats = await statsRes.json();
    const reportsData = await reportsRes.json();
    allReports = reportsData.reports;

    renderStats(stats);
    renderTimeline(stats.timeline);
    renderDonut(stats);
    renderRecentThreats(allReports);
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderStats(stats) {
  animateNumber($('#stat-total'), stats.total);
  animateNumber($('#stat-high'), stats.high);
  animateNumber($('#stat-suspicious'), stats.suspicious);
  animateNumber($('#stat-low'), stats.low);
}

function animateNumber(el, target) {
  const duration = 800;
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─── Timeline Bar Chart ─── */
function renderTimeline(timeline) {
  const container = $('#timeline-chart');
  const maxTotal = Math.max(...timeline.map(d => d.total), 1);

  const html = `<div class="bar-chart">${timeline.map(day => {
    const dayLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const shortLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const totalHeight = Math.max((day.total / maxTotal) * 160, day.total > 0 ? 8 : 2);
    const highH = day.total > 0 ? (day.high / day.total) * totalHeight : 0;
    const suspH = day.total > 0 ? (day.suspicious / day.total) * totalHeight : 0;
    const lowH = day.total > 0 ? (day.low / day.total) * totalHeight : 0;

    return `
      <div class="bar-group" title="${dayLabel}: ${day.total} emails (${day.high} high, ${day.suspicious} suspicious, ${day.low} low)">
        <span class="bar-value">${day.total}</span>
        <div class="bar-stack">
          ${highH > 0 ? `<div class="bar-segment high" style="height:${highH}px"></div>` : ''}
          ${suspH > 0 ? `<div class="bar-segment suspicious" style="height:${suspH}px"></div>` : ''}
          ${lowH > 0 ? `<div class="bar-segment low" style="height:${lowH}px"></div>` : ''}
          ${day.total === 0 ? `<div class="bar-segment low" style="height:2px;opacity:0.2"></div>` : ''}
        </div>
        <span class="bar-label">${shortLabel}</span>
      </div>`;
  }).join('')}</div>`;

  container.innerHTML = html;
}

// ─── Donut Chart (SVG) ─── */
function renderDonut(stats) {
  const container = $('#donut-chart');
  const legend = $('#donut-legend');

  const segments = [
    { label: 'High Risk', value: stats.high, color: 'var(--risk-high)' },
    { label: 'Suspicious', value: stats.suspicious, color: 'var(--risk-suspicious)' },
    { label: 'Low / Safe', value: stats.low, color: 'var(--risk-low)' },
    { label: 'Unknown', value: stats.unknown, color: 'var(--risk-unknown)' }
  ].filter(s => s.value > 0);

  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const circumference = 2 * Math.PI * 60; // radius=60
  let offset = 0;

  const svgSegments = segments.map(seg => {
    const pct = seg.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const html = `<circle class="donut-segment" cx="80" cy="80" r="60" fill="none" stroke="${seg.color}" stroke-width="22" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" />`;
    offset += dash;
    return html;
  });

  container.innerHTML = `
    <svg class="donut-chart-svg" width="160" height="160" viewBox="0 0 160 160">
      <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="22"/>
      ${svgSegments.join('')}
      <g transform="rotate(90, 80, 80)">
        <text class="donut-center-label" x="80" y="76" text-anchor="middle" dominant-baseline="central">${stats.total}</text>
        <text class="donut-center-sub" x="80" y="96" text-anchor="middle">total</text>
      </g>
    </svg>`;

  legend.innerHTML = segments.map(s => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${s.color}"></span>
      ${s.label}: ${s.value}
    </span>`).join('');
}

// ─── Recent Threats Table ─── */
function renderRecentThreats(reports) {
  const tbody = $('#recent-threats-body');

  if (!reports.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><h3>No reports yet</h3><p>Waiting for Email Guard to process emails</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr data-id="${r.report_id}">
      <td>${riskBadgeHTML(r.classification)}</td>
      <td>
        <div class="sender-cell">
          <span class="sender-name">${escapeHtml(r.sender_name || '')}</span>
          <span class="sender-email">${escapeHtml(r.sender)}</span>
        </div>
      </td>
      <td>${escapeHtml(truncate(r.subject, 60))}</td>
      <td>${scoreBarHTML(r.risk_score, r.classification)}</td>
      <td class="time-cell">${timeAgo(r.generated_at)}</td>
      <td>
        <span class="detail-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
      </td>
    </tr>`).join('');

  // Attach click handlers
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openReport(row.dataset.id));
  });
}

// ═══════════════════════════════════════════════════════════════
// REPORTS VIEW
// ═══════════════════════════════════════════════════════════════
async function loadReports() {
  try {
    const params = new URLSearchParams();
    if (currentFilter !== 'ALL') params.set('classification', currentFilter);
    if (currentSearch) params.set('search', currentSearch);
    params.set('limit', '100');

    const res = await fetch(`${API_BASE}/api/reports?${params}`);
    const data = await res.json();
    allReports = data.reports;
    renderReportsList(allReports);
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

function renderReportsList(reports) {
  const container = $('#reports-list');

  if (!reports.length) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <h3>No reports found</h3>
        <p>Try adjusting your filters or search query</p>
      </div>`;
    return;
  }

  container.innerHTML = reports.map(r => {
    const scoreClass = classFromClassification(r.classification);
    return `
    <div class="report-card" data-id="${r.report_id}">
      <div class="report-card-score ${scoreClass}">${r.risk_score}</div>
      <div class="report-card-info">
        <div class="report-card-subject">${escapeHtml(r.subject)}</div>
        <div class="report-card-meta">
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${escapeHtml(r.sender_name || r.sender)}
          </span>
          <span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ${escapeHtml(r.sender)}
          </span>
          ${r.urls_checked ? `<span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            ${r.urls_checked} URLs
          </span>` : ''}
        </div>
      </div>
      <div class="report-card-badge">${riskBadgeHTML(r.classification)}</div>
      <div class="report-card-time">${timeAgo(r.generated_at)}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', () => openReport(card.dataset.id));
  });
}

// ─── Search ─── */
function setupSearch() {
  const input = $('#search-input');
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      currentSearch = input.value.trim();
      loadReports();
    }, 300);
  });
}

// ─── Filters ─── */
function setupFilters() {
  $$('.chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      $$('.chip[data-filter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      loadReports();
    });
  });
}

// ─── Refresh ─── */
function setupRefresh() {
  $('#btn-refresh').addEventListener('click', () => {
    const icon = $('#btn-refresh svg');
    icon.style.transition = 'transform 0.6s';
    icon.style.transform = 'rotate(360deg)';
    setTimeout(() => { icon.style.transform = ''; }, 600);
    loadDashboard();
  });
}

// ═══════════════════════════════════════════════════════════════
// REPORT DETAIL MODAL
// ═══════════════════════════════════════════════════════════════
function setupModal() {
  const overlay = $('#modal-overlay');
  const closeBtn = $('#modal-close');

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function closeModal() {
  $('#modal-overlay').classList.remove('active');
}

async function openReport(reportId) {
  try {
    const res = await fetch(`${API_BASE}/api/reports/${reportId}`);
    if (!res.ok) return;
    const report = await res.json();
    renderModal(report);
    $('#modal-overlay').classList.add('active');
  } catch (err) {
    console.error('Failed to load report:', err);
  }
}

function renderModal(r) {
  const body = $('#modal-body');
  const scoreClass = classFromClassification(r.classification);
  const auth = r.sender_authentication || {};
  const ai = r.ai_analysis || {};

  let html = `
    <!-- Risk Header -->
    <div class="modal-risk-header">
      <div class="modal-score-ring ${scoreClass}">${r.risk_score}</div>
      <div class="modal-classification" style="color: var(--risk-${scoreClass === 'suspicious' ? 'suspicious' : scoreClass})">${r.classification}</div>
      <div class="modal-subject">${escapeHtml(r.subject)}</div>
    </div>

    <!-- Email Info -->
    <div class="modal-section">
      <div class="modal-section-title">Email Details</div>
      <div class="modal-info-grid">
        <div class="modal-info-item">
          <div class="modal-info-label">Sender</div>
          <div class="modal-info-value">${escapeHtml(r.sender_name || '')} &lt;${escapeHtml(r.sender)}&gt;</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Received</div>
          <div class="modal-info-value">${formatDate(r.email_timestamp)}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">Report ID</div>
          <div class="modal-info-value" style="font-family:var(--font-mono);font-size:0.78rem">${r.report_id}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">URLs Checked</div>
          <div class="modal-info-value">${r.urls_checked || 0}</div>
        </div>
      </div>
    </div>

    <!-- Sender Authentication -->
    <div class="modal-section">
      <div class="modal-section-title">Sender Authentication</div>
      <div class="auth-grid">
        <span class="auth-badge ${authClass(auth.spf)}">SPF: ${(auth.spf || 'unknown').toUpperCase()}</span>
        <span class="auth-badge ${authClass(auth.dkim)}">DKIM: ${(auth.dkim || 'unknown').toUpperCase()}</span>
        <span class="auth-badge ${authClass(auth.dmarc)}">DMARC: ${(auth.dmarc || 'unknown').toUpperCase()}</span>
        ${auth.returnPathMismatch ? '<span class="auth-badge fail">Return-Path Mismatch</span>' : ''}
        ${auth.replyToMismatch ? '<span class="auth-badge fail">Reply-To Mismatch</span>' : ''}
      </div>
    </div>`;

  // Scoring Reasons
  if (r.reasons && r.reasons.length) {
    html += `
    <div class="modal-section">
      <div class="modal-section-title">Risk Scoring Breakdown</div>
      <ul class="reason-list">
        ${r.reasons.map(reason => {
          const match = reason.match(/^\+(\d+)\s(.+)$/);
          return `<li class="reason-item">
            <span class="reason-points positive">${match ? '+' + match[1] : ''}</span>
            <span>${escapeHtml(match ? match[2] : reason)}</span>
          </li>`;
        }).join('')}
      </ul>
    </div>`;
  }

  // Suspicious URLs
  if (r.suspicious_urls && r.suspicious_urls.length) {
    html += `
    <div class="modal-section">
      <div class="modal-section-title">Suspicious URLs</div>
      <ul class="url-list">
        ${r.suspicious_urls.map(u => `
          <li class="url-item">
            ${escapeHtml(u.url_defanged)}
            <div class="url-flags">
              ${(u.flags || []).map(f => `<span class="url-flag">${escapeHtml(f)}</span>`).join('')}
              <span class="url-flag" style="background:rgba(255,255,255,0.04);color:var(--text-muted)">${u.kind}</span>
            </div>
          </li>`).join('')}
      </ul>
    </div>`;
  }

  // Threat Intelligence
  if (r.threat_intel) {
    const ti = r.threat_intel;
    html += `
    <div class="modal-section">
      <div class="modal-section-title">Threat Intelligence</div>
      <div class="modal-info-grid">
        <div class="modal-info-item">
          <div class="modal-info-label">Google Safe Browsing</div>
          <div class="modal-info-value" style="color: ${ti.safe_browsing?.status === 'MATCH' ? 'var(--risk-high)' : ti.safe_browsing?.status === 'NO_MATCH' ? 'var(--risk-low)' : 'var(--text-secondary)'}">${ti.safe_browsing?.status || 'N/A'}</div>
        </div>
        <div class="modal-info-item">
          <div class="modal-info-label">VirusTotal</div>
          <div class="modal-info-value">${(ti.virustotal || []).map(v => `<span style="color:${v.status === 'MALICIOUS' ? 'var(--risk-high)' : v.status === 'SUSPICIOUS' ? 'var(--risk-suspicious)' : 'var(--risk-low)'}">${v.status}${v.malicious ? ` (${v.malicious} engines)` : ''}</span>`).join(', ') || 'N/A'}</div>
        </div>
      </div>
    </div>`;
  }

  // AI Analysis
  if (ai.status === 'OK') {
    html += `
    <div class="modal-section">
      <div class="modal-section-title">AI Analysis (${ai.confidence} confidence)</div>
      <div class="ai-box">
        <div class="ai-explanation">${escapeHtml(ai.explanation)}</div>
        ${ai.suspicious_signals && ai.suspicious_signals.length ? `
          <div class="ai-signals">
            ${ai.suspicious_signals.map(s => `<span class="ai-signal-tag">${escapeHtml(s)}</span>`).join('')}
          </div>` : ''}
      </div>
    </div>`;
  }

  // Recommended Action
  html += `
    <div class="modal-section">
      <div class="modal-section-title">Recommended Action</div>
      <div class="action-box ${scoreClass === 'high' ? 'high' : ''}">${escapeHtml(r.recommended_action)}</div>
    </div>`;

  // Email Preview
  if (r.preview) {
    html += `
    <div class="modal-section">
      <div class="modal-section-title">Email Preview</div>
      <div class="preview-box">${escapeHtml(r.preview)}</div>
    </div>`;
  }

  body.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW VIEW
// ═══════════════════════════════════════════════════════════════
function renderWorkflow() {
  const container = $('#workflow-pipeline');

  const stages = [
    {
      icon: '1',
      dotClass: 'receive',
      title: 'Receive New Email',
      desc: 'Polls Gmail every minute for new inbox messages received in the last day, skips emails already processed, and loads the full message metadata in read-only mode.',
      nodes: ['Gmail Trigger', 'Skip Already Processed', 'Gmail Get Message']
    },
    {
      icon: '2',
      dotClass: 'prepare',
      title: 'Prepare & Normalize Email Data',
      desc: 'Applies configuration settings (max body length, max URLs to check), parses HTML to plain text, extracts sender info, authentication headers (SPF/DKIM/DMARC), and detects keyword signals like credential theft, OTP requests, and urgency language.',
      nodes: ['Config', 'Extract and Normalize Email Data', 'Extract URLs']
    },
    {
      icon: '3',
      dotClass: 'assess',
      title: 'Assess Email Risk',
      desc: 'Checks extracted URLs against Google Safe Browsing and VirusTotal threat databases. Runs the email through a Google Gemini AI model for phishing/social engineering analysis. Computes a weighted risk score (0–100) combining confirmed threat matches, authentication failures, lookalike domain detection, keyword signals, and AI opinion.',
      nodes: ['Google Safe Browsing Check', 'Prepare VirusTotal Requests', 'VirusTotal URL Lookup', 'Collect Threat Intel', 'AI Email Analysis (Gemini)', 'Risk Scoring']
    },
    {
      icon: '4',
      dotClass: 'alert',
      title: 'Save Report & Alert',
      desc: 'POSTs the analysis report to this dashboard API for storage and visualization. If the risk classification is not "LOW", sends an alert email to the mailbox owner with the full breakdown, suspicious URLs (defanged), scoring reasons, and recommended action.',
      nodes: ['Save Report to Dashboard API', 'Risk Decision (If)', 'Send Alert to Mailbox Owner']
    }
  ];

  container.innerHTML = stages.map(stage => `
    <div class="workflow-stage">
      <div class="workflow-dot ${stage.dotClass}">${stage.icon}</div>
      <div class="workflow-card">
        <h3>${stage.title}</h3>
        <p>${stage.desc}</p>
        <div class="workflow-nodes">
          ${stage.nodes.map(n => `<span class="workflow-node-tag">${n}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function classFromClassification(c) {
  switch (c) {
    case 'HIGH RISK': return 'high';
    case 'SUSPICIOUS': return 'suspicious';
    case 'LOW SIGNALS DETECTED': return 'low';
    default: return 'unknown';
  }
}

function riskBadgeHTML(classification) {
  const cls = classFromClassification(classification);
  const label = classification === 'LOW SIGNALS DETECTED' ? 'LOW' : classification;
  return `<span class="risk-badge ${cls}"><span class="risk-badge-dot"></span>${label}</span>`;
}

function scoreBarHTML(score, classification) {
  const cls = classFromClassification(classification);
  return `
    <div class="score-bar">
      <div class="score-track">
        <div class="score-fill ${cls}" style="width:${score}%"></div>
      </div>
      <span class="score-num">${score}</span>
    </div>`;
}

function authClass(value) {
  if (value === 'pass') return 'pass';
  if (value === 'fail' || value === 'softfail') return 'fail';
  return 'unknown';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
