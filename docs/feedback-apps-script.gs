// PaperPunch – Feedback-Webhook für das Google Sheet "PaperPunch – Feedback".
// Nimmt Bewertungen (App/Web) und das Feedback-Formular der Website entgegen und hängt je Eintrag eine Zeile an.
// Spalten werden über die Überschriften in Zeile 1 zugeordnet; neue Felder bekommen automatisch eine neue Spalte.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

    Object.keys(data).forEach(function (key) {
      if (headers.indexOf(key) === -1) {
        headers.push(key);
        sheet.getRange(1, headers.length).setValue(key);
      }
    });

    var row = headers.map(function (h) {
      var v = data[h];
      if (v === undefined || v === null) return "";
      return typeof v === "object" ? JSON.stringify(v) : v;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
