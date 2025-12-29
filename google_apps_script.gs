const SHEET_NAME = "Reports";

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    ensureHeader(sh);

    const body = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(body);

    if (data.test) {
      appendRow(sh, {
        project: data.project || "",
        enteredBy: data.enteredBy || "",
        reportType: "test",
        reportTitle: "Webhook Test",
        createdAt: data.sentAt || new Date().toISOString(),
        meta: { message: data.message || "" },
        text: data.message || "Test",
        raw: data
      });
      return out({ ok: true, mode: "test" });
    }

    if (data.batch && Array.isArray(data.reports)) {
      data.reports.forEach(r => appendRow(sh, normalize(r)));
      return out({ ok: true, mode: "batch", count: data.reports.length });
    }

    appendRow(sh, normalize(data));
    return out({ ok: true, mode: "single" });

  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function ensureHeader(sh) {
  const v = sh.getRange(1, 1, 1, 9).getValues()[0];
  if (v[0] !== "Timestamp") {
    sh.getRange(1, 1, 1, 9).setValues([[
      "Timestamp","Project","EnteredBy","ReportType","ReportTitle","CreatedAt","Meta(JSON)","Text","Raw(JSON)"
    ]]);
    sh.setFrozenRows(1);
  }
}

function normalize(p) {
  return {
    project: p.project || "",
    enteredBy: p.enteredBy || "",
    reportType: p.reportType || p.type || "",
    reportTitle: p.reportTitle || p.title || "",
    createdAt: p.createdAt || "",
    meta: p.meta || {},
    text: p.text || "",
    raw: p.raw || p
  };
}

function appendRow(sh, r) {
  sh.appendRow([
    new Date(),
    r.project,
    r.enteredBy,
    r.reportType,
    r.reportTitle,
    r.createdAt,
    JSON.stringify(r.meta || {}),
    r.text,
    JSON.stringify(r.raw || {})
  ]);
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
