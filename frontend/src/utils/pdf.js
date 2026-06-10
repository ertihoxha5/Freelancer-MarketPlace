function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildTextLines(text, maxChars) {
  const words = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) return [""];

  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createPage() {
  return { commands: [] };
}

function push(page, command) {
  page.commands.push(command);
}

function text(page, x, y, size, value, font = "F1") {
  const safe = escapePdfText(value);
  push(page, `BT /${font} ${size} Tf ${x} ${y} Td (${safe}) Tj ET`);
}

function rect(page, x, y, w, h, stroke = null, fill = null) {
  if (fill) push(page, `${fill} rg ${x} ${y} ${w} ${h} re f`);
  if (stroke) push(page, `${stroke} RG ${x} ${y} ${w} ${h} re S`);
}

function buildPdfFromPages(pages) {
  const header = "%PDF-1.4\n";
  const objects = [];
  const objectsById = new Map();

  const catalogId = 1;
  const pagesId = 2;
  const font1Id = 3;
  const font2Id = 4;
  let nextId = 5;
  const kids = [];

  for (const page of pages) {
    const pageId = nextId++;
    const contentId = nextId++;
    kids.push(`${pageId} 0 R`);
    page.pageId = pageId;
    page.contentId = contentId;
  }

  objectsById.set(catalogId, `${catalogId} 0 obj << /Type /Catalog /Pages ${pagesId} 0 R >> endobj`);
  objectsById.set(
    pagesId,
    `${pagesId} 0 obj << /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >> endobj`,
  );
  objectsById.set(font1Id, `${font1Id} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);
  objectsById.set(font2Id, `${font2Id} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj`);

  for (const page of pages) {
    const content = page.commands.join("\n");
    objectsById.set(
      page.pageId,
      `${page.pageId} 0 obj << /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> /Contents ${page.contentId} 0 R >> endobj`,
    );
    objectsById.set(
      page.contentId,
      `${page.contentId} 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
    );
  }

  for (let id = 1; id < nextId; id += 1) {
    const object = objectsById.get(id);
    if (object) objects.push(object);
  }

  let body = "";
  const offsets = [0];
  for (const object of objects) {
    offsets.push((header + body).length);
    body += `${object}\n`;
  }

  const xrefOffset = (header + body).length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([header + body + xref + trailer], {
    type: "application/pdf",
  });
}

function renderHeader(page, title, subtitle, pageNumber, totalPages) {
  rect(page, 0, 0, 612, 792, null, "1 1 1");
  rect(page, 0, 720, 612, 72, null, "0.09 0.24 0.18");
  text(page, 44, 757, 20, title, "F2");
  if (subtitle) {
    text(page, 44, 737, 10, subtitle, "F1");
  }
  text(page, 464, 740, 10, `Page ${pageNumber} of ${totalPages}`, "F1");
  rect(page, 44, 709, 524, 2, null, "0.86 0.89 0.88");
}

function renderFooter(page, footerText) {
  rect(page, 44, 38, 524, 1, null, "0.86 0.89 0.88");
  if (footerText) {
    text(page, 44, 24, 9, footerText, "F1");
  }
}

function renderSection(page, y, title) {
  rect(page, 44, y - 4, 524, 18, null, "0.95 0.97 0.96");
  rect(page, 44, y - 4, 4, 18, null, "0.09 0.24 0.18");
  text(page, 56, y + 4, 11, title, "F2");
  return y - 28;
}

function renderLabelValue(page, y, label, value) {
  const labelWidth = 150;
  const valueWidth = 332;
  const lineHeight = 14;
  const labelText = String(label ?? "");
  const valueText = String(value ?? "-");
  const valueLines = buildTextLines(valueText, Math.max(28, Math.floor(valueWidth / 6)));
  const height = Math.max(1, valueLines.length) * lineHeight + 4;

  rect(page, 44, y - height + 10, 524, height, "0.88 0.90 0.89", "1 1 1");
  text(page, 56, y - 2, 10, labelText, "F2");
  valueLines.forEach((line, index) => {
    text(page, 210, y - 2 - index * lineHeight, 10, line, "F1");
  });
  return y - height - 6;
}

function renderParagraph(page, y, textValue, widthChars = 72) {
  const lines = buildTextLines(textValue, widthChars);
  const lineHeight = 14;
  lines.forEach((line, index) => {
    text(page, 56, y - index * lineHeight, 10, line, "F1");
  });
  return y - lines.length * lineHeight - 6;
}

function renderChip(page, x, y, label, value, width) {
  rect(page, x, y, width, 32, "0.79 0.85 0.82", "0.96 0.98 0.97");
  text(page, x + 10, y + 18, 8, label, "F2");
  text(page, x + 10, y + 8, 11, value, "F1");
}

export function exportApplicationPdf(application) {
  const title = "Application Review";
  const projectTitle = application?.projectTitle || "Untitled project";
  const subtitle = `Client review export for "${projectTitle}"`;
  const footerText = `Generated on ${new Date().toLocaleString()}`;

  // Collect body content commands per logical page first.
  // Then, when building final PDF pages, we ALWAYS draw header + footer FIRST (white bg + header bar at top of stream),
  // followed by the body commands. This prevents the full-page white rect from overpainting the content.
  const pageBodies = []; // each entry is an array of PDF drawing commands for the body of that page

  let bodyCmds = [];
  let y = 672;

  // Proxy object so we can reuse the existing renderSection / renderLabelValue / renderParagraph helpers.
  // They expect an object with .commands array and will push drawing commands into it.
  const bodyProxy = { commands: bodyCmds };

  function startBodyPage() {
    if (bodyCmds.length > 0) {
      pageBodies.push(bodyCmds);
    }
    bodyCmds = [];
    bodyProxy.commands = bodyCmds;
    y = 672;
  }

  // Draw top status chips (absolute positioning, below where header bar will be)
  function drawChip(x, yPos, label, value, width) {
    // These go into the current bodyCmds via the proxy? For chips we push directly to current bodyCmds.
    const safeLabel = escapePdfText(label);
    const safeValue = escapePdfText(value);
    bodyCmds.push(`0.79 0.85 0.82 rg ${x} ${yPos} ${width} 32 re f`);
    bodyCmds.push(`0.96 0.98 0.97 rg ${x} ${yPos} ${width} 32 re S`); // light border-ish
    bodyCmds.push(`BT /F2 8 Tf ${x + 10} ${yPos + 18} Td (${safeLabel}) Tj ET`);
    bodyCmds.push(`BT /F1 11 Tf ${x + 10} ${yPos + 8} Td (${safeValue}) Tj ET`);
  }

  // First page body
  startBodyPage();

  drawChip(44, 680, "STATUS", String(application?.propStatus || "pending").toUpperCase(), 114);
  drawChip(168, 680, "BID", application?.bidAmount != null ? `$${Number(application.bidAmount).toLocaleString()}` : "-", 126);
  drawChip(304, 680, "EST. DAYS", application?.estimatedDays != null ? String(application.estimatedDays) : "-", 126);
  drawChip(440, 680, "APPLIED", application?.createdAt ? new Date(application.createdAt).toLocaleDateString() : "-", 126);

  y = renderSection(bodyProxy, y, "Application Summary");
  y = renderLabelValue(bodyProxy, y, "Application ID", application?.applicationId ?? "-");
  y = renderLabelValue(bodyProxy, y, "Status", application?.propStatus ?? "pending");
  y = renderLabelValue(bodyProxy, y, "Applied on", application?.createdAt ? new Date(application.createdAt).toLocaleString() : "-");
  y = renderLabelValue(bodyProxy, y, "Updated on", application?.updatedAt ? new Date(application.updatedAt).toLocaleString() : "-");

  y = renderSection(bodyProxy, y, "Freelancer");
  y = renderLabelValue(bodyProxy, y, "Name", application?.freelancerName || "-");
  y = renderLabelValue(bodyProxy, y, "Email", application?.freelancerEmail || "-");

  y = renderSection(bodyProxy, y, "Project");
  y = renderLabelValue(bodyProxy, y, "Project title", projectTitle);
  y = renderLabelValue(bodyProxy, y, "Project status", application?.projectStatus || "-");
  y = renderLabelValue(bodyProxy, y, "Project budget", application?.projectBudget != null ? `$${Number(application.projectBudget).toLocaleString()}` : "-");
  y = renderLabelValue(bodyProxy, y, "Deadline", application?.projectDeadline ? new Date(application.projectDeadline).toLocaleDateString() : "-");

  y = renderSection(bodyProxy, y, "Cover Letter");
  const coverLetter = application?.coverLetter?.trim() || "No cover letter was provided.";
  y = renderParagraph(bodyProxy, y, coverLetter, 72);

  const attachmentName = application?.attachmentName || application?.fileName || null;
  if (attachmentName) {
    y = renderSection(bodyProxy, y, "Attachment");
    y = renderLabelValue(bodyProxy, y, "File", attachmentName);
  }

  // Save first page's body
  if (bodyCmds.length > 0) {
    pageBodies.push(bodyCmds);
  }

  if (y < 100) {
    // Second page body
    startBodyPage();
    y = renderSection(bodyProxy, y, "Additional Notes");
    y = renderParagraph(bodyProxy, y, "This application was exported with the full project and freelancer metadata for offline review.", 72);
    if (bodyCmds.length > 0) {
      pageBodies.push(bodyCmds);
    }
  }

  // Assemble final pages: HEADER + FOOTER commands FIRST, then body commands.
  // This guarantees the full-page white background + green header bar are painted before any body text.
  const finalPages = [];
  const total = Math.max(1, pageBodies.length);

  pageBodies.forEach((bodyCommandsForPage, index) => {
    const pg = createPage();
    const pageNum = index + 1;

    // These must be the very first commands for the page
    renderHeader(pg, title, subtitle, pageNum, total);
    renderFooter(pg, footerText);

    // Body content drawn on top of the header/footer
    pg.commands.push(...bodyCommandsForPage);

    finalPages.push(pg);
  });

  // Edge case: nothing to export
  if (finalPages.length === 0) {
    const pg = createPage();
    renderHeader(pg, title, subtitle, 1, 1);
    renderFooter(pg, footerText);
    finalPages.push(pg);
  }

  const blob = buildPdfFromPages(finalPages);
  downloadBlob(blob, `application-${application?.applicationId ?? "export"}.pdf`);
}

export function exportPdf(lines, filename = "export", title = "Export") {
  const safeLines = Array.isArray(lines) ? lines : [String(lines ?? "")];
  const page = createPage();
  let y = 720;
  text(page, 72, y, 16, title, "F2");
  y -= 24;
  safeLines.forEach((line) => {
    const wrapped = buildTextLines(line, 76);
    wrapped.forEach((wrappedLine) => {
      text(page, 72, y, 11, wrappedLine, "F1");
      y -= 15;
    });
  });
  const blob = buildPdfFromPages([page]);
  downloadBlob(blob, `${filename}.pdf`);
}
