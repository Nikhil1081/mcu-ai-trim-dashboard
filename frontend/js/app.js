// User Session & Authentication Management for Decoupled Frontend
(function initUserSession() {
  const user = localStorage.getItem('mcu_user');
  const role = localStorage.getItem('mcu_role') || 'user';

  if (user) {
    const avatarEl = document.getElementById('user-avatar-initial');
    const emailEl = document.getElementById('user-display-email');
    const roleEl = document.getElementById('user-display-role');
    const adminLink = document.getElementById('admin-link');

    if (avatarEl) avatarEl.textContent = user.charAt(0).toUpperCase();
    if (emailEl) emailEl.textContent = user;
    if (roleEl) {
      roleEl.textContent = role.toUpperCase();
      roleEl.className = `role-badge role-${role}`;
    }
    if (adminLink && role === 'admin') {
      adminLink.style.display = 'inline-flex';
      adminLink.href = `${window.API_BASE}/admin/users`;
    }
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${window.API_BASE}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      } catch (e) {
        // Ignore network errors on logout
      }
      localStorage.removeItem('mcu_user');
      localStorage.removeItem('mcu_role');
      localStorage.removeItem('mcu_token');
      window.location.replace('auth.html');
    });
  }
})();

// Semiconductor Scenarios for 1-click evaluation
const SCENARIOS = {
  nominal: {
    die_x: 9, die_y: 1, x_mm: -24, y_mm: -88, radius_mm: 91.21,
    pcm_vth_n_mV: 452.04, pcm_vth_p_mV: -477.49, pcm_rs_ohm_sq: 284.88,
    pcm_tox_A: 20.435, pcm_mobility_rel: 1.0356,
    bg_untrim_V: 1.19017, hsi_untrim_MHz: 16.98648, ldo_untrim_V: 1.09439,
    ts_cal1_30C_counts: 1055, sram_fail_bits: 0,
    derivative: 'MCU-A', package: 'QFN48', temp_grade: 'industrial'
  },
  slow: {
    die_x: 4, die_y: -6, x_mm: -45, y_mm: -60, radius_mm: 75.0,
    pcm_vth_n_mV: 512.40, pcm_vth_p_mV: -525.10, pcm_rs_ohm_sq: 310.20,
    pcm_tox_A: 21.200, pcm_mobility_rel: 0.9210,
    bg_untrim_V: 1.16200, hsi_untrim_MHz: 15.42000, ldo_untrim_V: 1.06200,
    ts_cal1_30C_counts: 1020, sram_fail_bits: 0,
    derivative: 'MCU-A', package: 'LQFP100', temp_grade: 'industrial'
  },
  fast: {
    die_x: 12, die_y: 8, x_mm: 35, y_mm: 42, radius_mm: 54.67,
    pcm_vth_n_mV: 410.20, pcm_vth_p_mV: -430.50, pcm_rs_ohm_sq: 255.40,
    pcm_tox_A: 19.850, pcm_mobility_rel: 1.1450,
    bg_untrim_V: 1.22800, hsi_untrim_MHz: 17.65000, ldo_untrim_V: 1.13500,
    ts_cal1_30C_counts: 1085, sram_fail_bits: 0,
    derivative: 'MCU-B', package: 'QFN32', temp_grade: 'automotive'
  },
  edge: {
    die_x: 18, die_y: -14, x_mm: 98, y_mm: -105, radius_mm: 143.64,
    pcm_vth_n_mV: 478.10, pcm_vth_p_mV: -462.80, pcm_rs_ohm_sq: 335.60,
    pcm_tox_A: 20.910, pcm_mobility_rel: 0.9850,
    bg_untrim_V: 1.24100, hsi_untrim_MHz: 17.92000, ldo_untrim_V: 1.14800,
    ts_cal1_30C_counts: 1040, sram_fail_bits: 2,
    derivative: 'MCU-C', package: 'QFN48', temp_grade: 'automotive'
  }
};

function loadScenario(type) {
  const data = SCENARIOS[type];
  if (!data) return;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (event && event.target) event.target.classList.add('active');

  for (const [k, v] of Object.entries(data)) {
    const el = document.querySelector(`[name="${k}"]`);
    if (el) el.value = v;
  }
  updateWaferTarget();
}

// Generate background silicon dies on the SVG wafer
function initWaferGrid() {
  const grid = document.getElementById('wafer-die-grid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const cx = 170, cy = 170, rWafer = 145;
  const dieSize = 10;
  const gap = 12;

  for (let x = -130; x <= 130; x += gap) {
    for (let y = -130; y <= 130; y += gap) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist < rWafer - 8) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', cx + x - dieSize / 2);
        rect.setAttribute('y', cy + y - dieSize / 2);
        rect.setAttribute('width', dieSize);
        rect.setAttribute('height', dieSize);
        rect.setAttribute('class', 'sim-die');
        grid.appendChild(rect);
      }
    }
  }
}

// Update the reticle on the wafer map when coordinates change
function updateWaferTarget() {
  const xMm = parseFloat(document.getElementById('inp-x-mm')?.value || 0);
  const yMm = parseFloat(document.getElementById('inp-y-mm')?.value || 0);
  const dieX = document.getElementById('inp-die-x')?.value || 0;
  const dieY = document.getElementById('inp-die-y')?.value || 0;
  const radius = parseFloat(document.getElementById('inp-radius')?.value || 0);

  // Scale -150..+150 mm into wafer SVG (170 center, r=150)
  const svgX = 170 + (xMm / 150) * 135;
  const svgY = 170 - (yMm / 150) * 135; // Invert Y for cartesian

  const reticle = document.getElementById('target-reticle');
  if (reticle) {
    reticle.setAttribute('transform', `translate(${svgX}, ${svgY})`);
  }

  const coordsDisp = document.getElementById('disp-die-coords');
  if (coordsDisp) {
    coordsDisp.textContent = `Die (${dieX}, ${dieY}) | X: ${xMm} mm, Y: ${yMm} mm`;
  }

  const radDisp = document.getElementById('disp-radius-val');
  if (radDisp) {
    let zone = 'Zone 1: Center Core';
    if (radius > 120) zone = 'Zone 3: Outer Edge Risk';
    else if (radius > 60) zone = 'Zone 2: Mid-Wafer Ring';
    radDisp.textContent = `${radius} mm (${zone})`;
  }
}

// Add listeners to wafer coordinate inputs
['inp-die-x', 'inp-die-y', 'inp-x-mm', 'inp-y-mm', 'inp-radius'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateWaferTarget);
});

// Render binary 7-bit fuse registers
function renderFuseBits(code) {
  let bits = '';
  for (let i = 6; i >= 0; i--) {
    const bit = (code >> i) & 1;
    bits += `<span class="fuse-bit ${bit ? 'burned' : 'intact'}" title="Bit ${i}: ${bit ? 'BURNED (1)' : 'INTACT (0)'}">${bit}</span>`;
  }
  return bits;
}

// Fetch dataset summary & model metrics
async function loadSummary() {
  try {
    const r = await fetch(`${window.API_BASE}/api/summary`);
    const d = await r.json();

    const rowsEl = document.getElementById('rows');
    const passRateEl = document.getElementById('pass-rate');
    const bgAccEl = document.getElementById('bg-acc');
    const recallEl = document.getElementById('recall');

    if (rowsEl && d.dataset) rowsEl.textContent = d.dataset.rows.toLocaleString();
    if (passRateEl && d.dataset) passRateEl.textContent = d.dataset.final_pass_rate + '%';
    
    if (bgAccEl && d.metrics?.models?.bg_trim_code_opt) {
      bgAccEl.textContent = 
        (d.metrics.models.bg_trim_code_opt.within_1_code_accuracy * 100).toFixed(1) + '%';
    }
    if (recallEl && d.metrics?.models?.final_pass) {
      recallEl.textContent = 
        (d.metrics.models.final_pass.recall * 100).toFixed(1) + '%';
    }

    const c = document.getElementById('metrics');
    if (!c || !d.metrics || !d.metrics.models) return;
    c.innerHTML = '';

    const modelDisplayNames = {
      bg_trim_code_opt: 'Bandgap Reference Voltage (V_BG)',
      hsi_trim_code_opt: 'High-Speed Internal Osc (HSI_16M)',
      ldo_trim_code_opt: 'Low-Dropout Regulator (V_LDO)',
      final_pass: 'Final ATE Post-Trim Yield Classifier'
    };

    for (const [n, m] of Object.entries(d.metrics.models)) {
      const friendlyName = modelDisplayNames[n] || n.replace(/_/g, ' ');
      let h = `
        <div class="metric-card">
          <div class="metric-hdr">
            <span class="metric-chip-icon"></span>
            <h4>${friendlyName}</h4>
          </div>
          <ul class="metric-stat-list">`;
      for (const [k, v] of Object.entries(m)) {
        if (k === 'confusion_matrix') continue;
        const valStr = typeof v === 'number' ? (v < 1 && v > 0 ? (v * 100).toFixed(2) + '%' : v.toFixed(4)) : v;
        h += `
          <li>
            <span class="stat-name">${k.replace(/_/g, ' ')}</span>
            <strong class="stat-value">${valStr}</strong>
          </li>`;
      }
      h += `</ul></div>`;
      c.innerHTML += h;
    }
  } catch (err) {
    console.error('Error loading summary:', err);
  }
}

// Single Die Prediction Form Submission
document.getElementById('predict-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const payload = {};
  for (const [k, v] of f.entries()) {
    payload[k] = (v !== '' && !isNaN(v)) ? Number(v) : v;
  }

  const box = document.getElementById('prediction-result');
  box.innerHTML = `
    <div class="infer-loading">
      <div class="radar-scan"></div>
      <span>Running Inference across 4 HistGradientBoosting Models...</span>
    </div>
  `;

  try {
    const res = await fetch(`${window.API_BASE}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await res.json();

    if (!d.success) {
      box.innerHTML = `
        <div class="result-box error">
          <strong>Prober Error:</strong> ${d.error}
        </div>
      `;
      return;
    }

    const p = d.prediction;
    const isPass = p["Predicted Final Test Result"] === "PASS";
    const passProb = p["Final Test Pass Probability (%)"];
    const bgCode = p["Bandgap Trim Code"];
    const hsiCode = p["HSI Trim Code"];
    const ldoCode = p["LDO Trim Code"];

    box.innerHTML = `
      <div class="trim-results-card">
        <!-- Yield Status Banner -->
        <div class="yield-badge-banner ${isPass ? 'pass' : 'fail'}">
          <div class="yield-text-group">
            <span class="yield-headline">${isPass ? 'PREDICTED ATE TEST: PASS' : 'PREDICTED RISK: POTENTIAL FAIL'}</span>
            <span class="yield-prob">Confidence: <strong>${passProb}%</strong></span>
          </div>
          <div class="yield-stamp ${isPass ? 'stamp-pass' : 'stamp-fail'}">
            ${isPass ? 'SORT PASS' : 'HOLD / RE-TEST'}
          </div>
        </div>

        <!-- Fuse Register Bitfields -->
        <div class="fuse-registers-grid">
          
          <div class="fuse-box">
            <div class="fuse-top">
              <span class="fuse-name">Bandgap Trim Register (V_BG)</span>
              <span class="fuse-dec">CODE <strong>${bgCode}</strong> / 127</span>
            </div>
            <div class="fuse-bits-row">
              ${renderFuseBits(bgCode)}
            </div>
            <div class="fuse-hex">Register: <code>0x${bgCode.toString(16).toUpperCase().padStart(2, '0')}</code></div>
          </div>

          <div class="fuse-box">
            <div class="fuse-top">
              <span class="fuse-name">HSI Osc Trim Register (16MHz)</span>
              <span class="fuse-dec">CODE <strong>${hsiCode}</strong> / 127</span>
            </div>
            <div class="fuse-bits-row">
              ${renderFuseBits(hsiCode)}
            </div>
            <div class="fuse-hex">Register: <code>0x${hsiCode.toString(16).toUpperCase().padStart(2, '0')}</code></div>
          </div>

          <div class="fuse-box">
            <div class="fuse-top">
              <span class="fuse-name">Internal LDO Trim Register</span>
              <span class="fuse-dec">CODE <strong>${ldoCode}</strong> / 127</span>
            </div>
            <div class="fuse-bits-row">
              ${renderFuseBits(ldoCode)}
            </div>
            <div class="fuse-hex">Register: <code>0x${ldoCode.toString(16).toUpperCase().padStart(2, '0')}</code></div>
          </div>

        </div>

        <div class="trim-footnote">
          <span>Fuse burn protocol: Electrically blown poly-fuse eFuse array</span>
          <span>&bull;</span>
          <span>Inference Latency: &lt;4.2ms</span>
        </div>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `
      <div class="result-box error">
        <strong>Network Error:</strong> ${err.message}
      </div>
    `;
  }
});

// Bulk CSV Upload Handling
const fileInput = document.getElementById('csv-file');
const fileNameDisplay = document.getElementById('selected-filename');
if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024).toFixed(1)} KB)`;
    }
  });
}

document.getElementById('upload-btn')?.addEventListener('click', async () => {
  const i = document.getElementById('csv-file');
  const s = document.getElementById('upload-status');
  const p = document.getElementById('upload-preview');

  if (!i.files.length) {
    s.innerHTML = `<span class="status-warning">Please select a lot CSV file first.</span>`;
    return;
  }

  const f = new FormData();
  f.append('file', i.files[0]);
  s.innerHTML = `<span class="status-processing">Processing wafer lot through ML inference pipeline...</span>`;
  p.innerHTML = '';

  try {
    const res = await fetch(`${window.API_BASE}/api/upload`, { method: 'POST', body: f });
    const d = await res.json();

    if (!d.success) {
      s.innerHTML = `<span class="status-error">Error: ${d.error}</span>`;
      return;
    }

    const dlUrl = d.download_url.startsWith('http') ? d.download_url : (`${window.API_BASE}${d.download_url}`);

    s.innerHTML = `
      <div class="bulk-success-bar">
        <span>Batch Complete: <strong>${d.rows_processed.toLocaleString()}</strong> dies screened.</span>
        <a href="${dlUrl}" class="btn-download-csv">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
          Download Predictions CSV
        </a>
      </div>
    `;

    let h = `
      <div class="table-wrap">
        <table class="mcu-table">
          <thead>
            <tr>`;
    Object.keys(d.preview[0]).forEach(k => {
      h += `<th>${k.replace(/_/g, ' ').toUpperCase()}</th>`;
    });
    h += `</tr></thead><tbody>`;

    d.preview.forEach(row => {
      const isRowPass = row["Predicted Result"] === "PASS";
      h += `<tr>`;
      for (const [k, v] of Object.entries(row)) {
        if (k === 'Predicted Result') {
          h += `<td><span class="badge-status ${isRowPass ? 'pass' : 'fail'}">${v}</span></td>`;
        } else if (k === 'die_id') {
          h += `<td><code>${v}</code></td>`;
        } else {
          h += `<td>${v}</td>`;
        }
      }
      h += `</tr>`;
    });
    h += `</tbody></table></div>`;
    p.innerHTML = h;

  } catch (err) {
    s.innerHTML = `<span class="status-error">Upload failed: ${err.message}</span>`;
  }
});

// Initialize on page load
initWaferGrid();
updateWaferTarget();
loadSummary();
