// Google Apps Script Web App لحفظ التقارير في مستندات Google Docs
// عدل المتغيرات أدناه قبل النشر: FOLDER_ID ورمز SHARED_TOKEN

// ====== CONFIG ======
const FOLDER_ID = "PUT_FOLDER_ID_HERE"; // معرّف مجلد Google Drive الذي سيحفظ المستندات
const REQUIRE_TOKEN = true;
const SHARED_TOKEN = "CHANGE_ME_LONG_RANDOM"; // غيّر التوكن واستخدمه في الإعدادات بالتطبيق

// استقبال الطلبات GET (اختياري)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, hint: "Use POST" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// استقبال الطلبات POST وإنشاء مستند Google
function doPost(e) {
  try {
    // التحقق من التوكن إذا كان مطلوباً
    if (REQUIRE_TOKEN) {
      const token = (e && e.parameter && e.parameter.token) ? String(e.parameter.token) : "";
      if (!token || token !== SHARED_TOKEN) {
        return jsonOut({ ok: false, error: "Unauthorized: bad token" }, 401);
      }
    }

    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : "";
    const payload = JSON.parse(raw || "{}");

    // payload expected: { type, id, createdAt, payload, generatedText, meta }
    const result = archiveToGoogleDoc(payload);
    return jsonOut({ ok: true, ...result }, 200);

  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

// إنشاء مستند Google وتعبئته بالتقرير
function archiveToGoogleDoc(evt) {
  const type = safeStr(evt.type);
  const id = safeStr(evt.id);
  const createdAt = safeStr(evt.createdAt);
  const data = evt.payload || {};
  const text = safeStr(evt.generatedText);

  // صياغة عنوان المستند: النوع - التاريخ، وأضيف الرقم إذا كان NCR
  const titleDate = extractReportDate(type, data) || createdAt.slice(0,10) || new Date().toISOString().slice(0,10);
  const serial = (type === "ncr" && data.serial) ? String(data.serial) : "";
  const docTitle = [mapTypeAr(type), titleDate, serial].filter(Boolean).join(" - ");

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const doc = DocumentApp.create(docTitle);
  const docId = doc.getId();
  const file = DriveApp.getFileById(docId);
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // إزالة من My Drive root

  const body = doc.getBody();
  body.clear();

  // رأس المستند
  body.appendParagraph("إدارة مشروع حديقة المزة").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(docTitle).setHeading(DocumentApp.ParagraphHeading.HEADING2);

  body.appendParagraph("—").setSpacingAfter(8);
  body.appendParagraph("النوع: " + mapTypeAr(type));
  if (serial) body.appendParagraph("الرقم: " + serial);
  body.appendParagraph("تاريخ الإنشاء: " + createdAt);

  const loc = extractLocation(type, data);
  if (loc) body.appendParagraph("الموقع/العنصر: " + loc);
  const decision = (type === "material" && data.decision) ? String(data.decision) : "";
  if (decision) body.appendParagraph("قرار الاعتماد: " + decision);
  const kind = (type === "inspection" && data.kind) ? String(data.kind) : "";
  if (kind) body.appendParagraph("نوع الفحص: " + kind);

  body.appendParagraph("—").setSpacingAfter(8);
  body.appendParagraph("النص الجاهز للإرسال:").setBold(true);
  body.appendParagraph(text || "(لا يوجد نص مولّد)");

  // يمكنك إزالة القسم التالي إذا أردت عدم تخزين JSON
  // body.appendParagraph("—").setSpacingAfter(8);
  // body.appendParagraph("بيانات النموذج (JSON):").setBold(true);
  // body.appendParagraph(prettyJson_(evt)).setFontFamily("Courier New").setFontSize(9);

  doc.saveAndClose();
  return { docId, docUrl: doc.getUrl(), title: docTitle };
}

function jsonOut(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify({ ...obj, status }))
    .setMimeType(ContentService.MimeType.JSON);
}
function prettyJson_(obj) {
  try { return JSON.stringify(obj, null, 2); } catch (e) { return String(obj); }
}
function safeStr(v) { return (v === null || v === undefined) ? "" : String(v); }

// ترجمة نوع التقرير إلى العربية
function mapTypeAr(t) {
  const m = { daily: "تقرير يومي", plan: "خطة الغد", material: "اعتماد مواد", inspection: "طلب فحص", ncr: "عدم مطابقة NCR" };
  return m[t] || t || "غير معروف";
}

// استخراج تاريخ التقرير من البيانات، يختلف حسب النوع
function extractReportDate(type, data) {
  if (!data) return "";
  if (type === "plan") return data.planDate || data.date || "";
  return data.date || "";
}

// استخراج موقع أو عنصر التقرير إذا توفر
function extractLocation(type, data) {
  if (!data) return "";
  return data.locationText || data.location || "";
}