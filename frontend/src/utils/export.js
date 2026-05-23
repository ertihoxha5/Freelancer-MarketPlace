function download(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
export function exportCSV(data, filename = "export") {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = [headers, ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")))];
  const csv = rows.map(r => r.join(",")).join("\n");
  download(new Blob(["\ufeff" + csv], { type: "text/csv" }), `${filename}.csv`);
}
export function exportJSON(data, filename = "export") {
  if (!data?.length) return;
  download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `${filename}.json`);
}
