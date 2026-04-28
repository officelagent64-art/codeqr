const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── Verification page ───────────────────────────────────────────────────────
app.get('/verify', async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send(renderPage('error', null, 'Certificate ID is missing'));
  }

  try {
    // Search for the certificate in demandes_certificats + student join
    const { data: cert, error } = await supabase
      .from('demandes_certificats')
      .select(`
        *,
        student (
          student_id,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          birth_date,
          birth_place_ar,
          field,
          levele,
          specialty,
          year
        )
      `)
      .eq('cert_id', id)
      .single();

    if (error || !cert || !cert.student) {
      return res.status(404).send(renderPage('invalid', null, id));
    }

    return res.send(renderPage('valid', cert, id));

  } catch (err) {
    console.error(err);
    return res.status(500).send(renderPage('error', null, 'Server error'));
  }
});

// ─── Home page ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>University of Ain Témouchent - Certificate Verification</title>
      ${styles()}
    </head>
    <body>
      <div class="container">
        ${header()}
        <div class="card" style="text-align:center; padding: 50px 30px;">
          <div style="font-size: 60px; margin-bottom: 20px;">🎓</div>
          <h2 style="color: #1a3a5c; margin-bottom: 15px;">Certificate Verification Platform</h2>
          <p style="color: #666; font-size: 16px;">
            Scan the QR code on the certificate to verify its authenticity
          </p>
        </div>
        ${footer()}
      </div>
    </body>
    </html>
  `);
});

// ─── Render helpers ──────────────────────────────────────────────────────────
function renderPage(status, cert, meta) {
  const s = cert?.student || {};

  if (status === 'valid') {
    return `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>✅ Verified Certificate - University of Ain Témouchent</title>
        ${styles()}
      </head>
      <body>
        <div class="container">
          ${header()}

          <div class="status-badge valid-badge">
            <span class="status-icon">✅</span>
            <div>
              <div class="status-title">Certified and Authenticated Certificate</div>
              <div class="status-sub">This certificate has been successfully verified</div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">📋 Student Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Full Name (Arabic)</div>
                <div class="info-value">${s.first_name_ar || ''} ${s.last_name_ar || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Full Name (French)</div>
                <div class="info-value" style="direction:ltr">${s.first_name || ''} ${s.last_name || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Date of Birth</div>
                <div class="info-value">${s.birth_date || ''} — ${s.birth_place_ar || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Registration Number</div>
                <div class="info-value highlight">${s.student_id || ''}</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="section-title">🎓 Academic Information</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Academic Year Level</div>
                <div class="info-value">${s.levele || cert.levele || 'L3'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Field</div>
                <div class="info-value" style="direction:ltr">${s.field || 'Mathématiques et Informatique'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Specialty</div>
                <div class="info-value" style="direction:ltr">${s.specialty || 'Système Informatique'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">University Year</div>
                <div class="info-value highlight">${s.year || '2025-2026'}</div>
              </div>
            </div>
          </div>

          <div class="card cert-id-card">
            <div class="section-title">🔐 Certificate ID</div>
            <div class="cert-id">${meta}</div>
            <div style="color:#888; font-size:13px; margin-top:8px;">
              Issue Date: ${cert.date_validation ? new Date(cert.date_validation).toLocaleDateString('en-GB') : new Date(cert.created_at).toLocaleDateString('en-GB')}
            </div>
          </div>

          ${footer()}
        </div>
      </body>
      </html>
    `;
  }

  if (status === 'invalid') {
    return `
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>❌ Invalid Certificate</title>
        ${styles()}
      </head>
      <body>
        <div class="container">
          ${header()}
          <div class="status-badge invalid-badge">
            <span class="status-icon">❌</span>
            <div>
              <div class="status-title">Certificate Not Recognized</div>
              <div class="status-sub">This certificate does not exist in the database or has been revoked</div>
            </div>
          </div>
          <div class="card" style="text-align:center; color:#666;">
            <p style="font-size:15px;">Entered ID: <strong style="color:#c0392b;">${meta}</strong></p>
            <p style="font-size:14px;">If you believe this is an error, please contact the university administration.</p>
          </div>
          ${footer()}
        </div>
      </body>
      </html>
    `;
  }

  // error
  return `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <title>Error</title>
      ${styles()}
    </head>
    <body>
      <div class="container">
        ${header()}
        <div class="status-badge invalid-badge">
          <span class="status-icon">⚠️</span>
          <div>
            <div class="status-title">An Error Occurred</div>
            <div class="status-sub">${meta}</div>
          </div>
        </div>
        ${footer()}
      </div>
    </body>
    </html>
  `;
}

function header() {
  return `
    <div class="header">
      <div class="header-logo">🏛️</div>
      <div>
        <div class="header-title">University of Ain Témouchent</div>
        <div class="header-sub">Université d'Ain Témouchent</div>
      </div>
    </div>
  `;
}

function footer() {
  return `
    <div class="footer">
      <div>Route de Sidi Bel Abbès P.O. Box 284/46000 Ain Témouchent</div>
      <div style="margin-top:5px; color: #1a3a5c; font-weight:600;">
        Official University Certificate Verification Platform
      </div>
    </div>
  `;
}

function styles() {
  return `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: linear-gradient(135deg, #e8f0fe 0%, #f0f4ff 100%);
        min-height: 100vh;
        padding: 20px;
      }

      .container {
        max-width: 600px;
        margin: 0 auto;
      }

      /* Header */
      .header {
        background: linear-gradient(135deg, #1a3a5c, #2563a8);
        color: white;
        border-radius: 16px;
        padding: 20px 25px;
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
        box-shadow: 0 4px 20px rgba(26,58,92,0.3);
      }
      .header-logo { font-size: 40px; }
      .header-title { font-size: 20px; font-weight: 700; }
      .header-sub { font-size: 13px; opacity: 0.8; margin-top: 3px; }

      /* Status badges */
      .status-badge {
        border-radius: 14px;
        padding: 20px 25px;
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      }
      .valid-badge {
        background: linear-gradient(135deg, #d4edda, #c3e6cb);
        border: 2px solid #28a745;
      }
      .invalid-badge {
        background: linear-gradient(135deg, #f8d7da, #f5c6cb);
        border: 2px solid #dc3545;
      }
      .status-icon { font-size: 36px; }
      .status-title { font-size: 20px; font-weight: 700; color: #1a3a5c; }
      .status-sub { font-size: 13px; color: #555; margin-top: 4px; }

      /* Cards */
      .card {
        background: white;
        border-radius: 14px;
        padding: 22px;
        margin-bottom: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.07);
      }
      .section-title {
        font-size: 15px;
        font-weight: 700;
        color: #2563a8;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e8f0fe;
      }

      /* Info grid */
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }
      @media (max-width: 480px) {
        .info-grid { grid-template-columns: 1fr; }
      }
      .info-item {
        background: #f8faff;
        border-radius: 10px;
        padding: 12px 15px;
        border: 1px solid #e0eaff;
      }
      .info-label {
        font-size: 11px;
        color: #888;
        margin-bottom: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .info-value {
        font-size: 15px;
        font-weight: 600;
        color: #1a3a5c;
      }
      .info-value.highlight {
        color: #2563a8;
        font-size: 16px;
      }

      /* Cert ID */
      .cert-id-card { text-align: center; }
      .cert-id {
        font-family: monospace;
        font-size: 18px;
        font-weight: 700;
        color: #2563a8;
        background: #e8f0fe;
        padding: 12px 20px;
        border-radius: 8px;
        letter-spacing: 1px;
        margin-top: 10px;
        display: inline-block;
      }

      /* Footer */
      .footer {
        text-align: center;
        color: #888;
        font-size: 13px;
        padding: 20px;
        margin-top: 10px;
      }
    </style>
  `;
}

// ─── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
