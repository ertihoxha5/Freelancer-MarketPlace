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

const COLORS = {
  black: "0 0 0",
  darkText: "0.12 0.12 0.12",
  mediumGray: "0.35 0.35 0.35",
  lightGray: "0.95 0.95 0.95",
  borderGray: "0.82 0.82 0.82",
  brandGreen: "0.10 0.24 0.18",      // #1a3c2e
  brandGreenLight: "0.90 0.93 0.91",
  white: "1 1 1",
};

function renderHeader(page, title, subtitle, pageNumber, totalPages) {
  // White background
  rect(page, 0, 0, 612, 792, null, COLORS.white);
  
  // Professional green header bar
  rect(page, 0, 720, 612, 72, null, COLORS.brandGreen);
  
  // White text for header
  push(page, `${COLORS.white} rg`);
  
  // Title (bold, white)
  text(page, 44, 757, 17, title, "F2");
  
  // Subtitle (white)
  if (subtitle) {
    text(page, 44, 738, 9, subtitle, "F1");
  }
  
  // Page number (white)
  text(page, 480, 738, 9, `Page ${pageNumber} of ${totalPages}`, "F1");
  
  // Reset to black for body content
  push(page, `${COLORS.black} rg`);
  
  // Subtle divider
  rect(page, 44, 709, 524, 1, null, COLORS.borderGray);
  
  // Branding line under header
  text(page, 44, 696, 7, "FREELANCER MARKETPLACE", "F2");
}

function renderFooter(page, footerText) {
  rect(page, 44, 38, 524, 1, null, BRAND.border);
  const footer = footerText || "Confidential • Freelancer Marketplace";
  text(page, 44, 24, 8, footer, "F1");
}

function renderSection(page, y, title) {
  // Section background pill
  rect(page, 44, y - 3, 524, 20, null, BRAND.surface);
  // Left accent bar
  rect(page, 44, y - 3, 4, 20, null, BRAND.green);
  text(page, 56, y + 5, 10, title, "F2");
  return y - 26;
}

function renderLabelValue(page, y, label, value) {
  const labelText = String(label ?? "");
  const valueText = String(value ?? "-");
  const valueLines = buildTextLines(valueText, 68);
  const lineHeight = 13;
  const height = Math.max(16, valueLines.length * lineHeight + 6);

  // Alternating row background
  rect(page, 44, y - height + 8, 524, height, null, BRAND.surface);
  
  text(page, 56, y - 1, 9, labelText, "F2");
  
  valueLines.forEach((line, index) => {
    text(page, 200, y - 1 - index * lineHeight, 9, line, "F1");
  });
  
  return y - height - 4;
}

function renderParagraph(page, y, textValue, widthChars = 72) {
  const lines = buildTextLines(textValue, widthChars);
  const lineHeight = 13;
  lines.forEach((line, index) => {
    text(page, 56, y - index * lineHeight, 9, line, "F1");
  });
  return y - lines.length * lineHeight - 8;
}

function renderChip(page, x, y, label, value, width) {
  rect(page, x, y, width, 28, null, BRAND.greenLight);
  rect(page, x, y, width, 28, BRAND.border, null);
  text(page, x + 8, y + 16, 7, label, "F2");
  text(page, x + 8, y + 6, 10, value, "F1");
}

function renderKeyValueRow(page, y, key, value) {
  text(page, 56, y, 9, key, "F2");
  const valLines = buildTextLines(String(value ?? "-"), 60);
  valLines.forEach((line, i) => {
    text(page, 180, y - (i * 12), 9, line, "F1");
  });
  return y - Math.max(14, valLines.length * 12);
}

export function exportApplicationPdf(application) {
  const title = "Application Review";
  const projectTitle = application?.projectTitle || "Untitled project";
  const subtitle = `Exported for client review • ${projectTitle}`;
  const footerText = `Freelancer Marketplace • Generated ${new Date().toLocaleDateString()}`;

  const pageBodies = [];

  let bodyCmds = [];
  let y = 665;

  const bodyProxy = { commands: bodyCmds };

  function startBodyPage() {
    if (bodyCmds.length > 0) {
      pageBodies.push(bodyCmds);
    }
    bodyCmds = [];
    bodyProxy.commands = bodyCmds;
    y = 665;
  }

  function drawChip(x, yPos, label, value, width) {
    const safeLabel = escapePdfText(label);
    const safeValue = escapePdfText(value);
    bodyCmds.push(`${BRAND.greenLight} rg ${x} ${yPos} ${width} 26 re f`);
    bodyCmds.push(`${BRAND.border} RG ${x} ${yPos} ${width} 26 re S`);
    bodyCmds.push(`BT /F2 7 Tf ${x + 8} ${yPos + 15} Td (${safeLabel}) Tj ET`);
    bodyCmds.push(`BT /F1 10 Tf ${x + 8} ${yPos + 5} Td (${safeValue}) Tj ET`);
  }

  startBodyPage();

  // Top status chips row
  drawChip(44, 672, "STATUS", String(application?.propStatus || "pending").toUpperCase(), 108);
  drawChip(160, 672, "BID", application?.bidAmount != null ? `$${Number(application.bidAmount).toLocaleString()}` : "-", 118);
  drawChip(286, 672, "EST. DAYS", application?.estimatedDays != null ? String(application.estimatedDays) : "-", 118);
  drawChip(412, 672, "APPLIED", application?.createdAt ? new Date(application.createdAt).toLocaleDateString() : "-", 118);

  y = renderSection(bodyProxy, y, "Application Summary");
  y = renderLabelValue(bodyProxy, y, "Application ID", application?.applicationId ?? "-");
  y = renderLabelValue(bodyProxy, y, "Status", application?.propStatus ?? "pending");
  y = renderLabelValue(bodyProxy, y, "Applied on", application?.createdAt ? new Date(application.createdAt).toLocaleString() : "-");
  y = renderLabelValue(bodyProxy, y, "Last updated", application?.updatedAt ? new Date(application.updatedAt).toLocaleString() : "-");

  y = renderSection(bodyProxy, y, "Freelancer");
  y = renderLabelValue(bodyProxy, y, "Name", application?.freelancerName || "-");
  y = renderLabelValue(bodyProxy, y, "Email", application?.freelancerEmail || "-");

  y = renderSection(bodyProxy, y, "Project");
  y = renderLabelValue(bodyProxy, y, "Project title", projectTitle);
  y = renderLabelValue(bodyProxy, y, "Project status", application?.projectStatus || "-");
  y = renderLabelValue(bodyProxy, y, "Budget", application?.projectBudget != null ? `$${Number(application.projectBudget).toLocaleString()}` : "-");
  y = renderLabelValue(bodyProxy, y, "Deadline", application?.projectDeadline ? new Date(application.projectDeadline).toLocaleDateString() : "-");

  y = renderSection(bodyProxy, y, "Cover Letter");
  const coverLetter = application?.coverLetter?.trim() || "No cover letter was provided.";
  y = renderParagraph(bodyProxy, y, coverLetter, 78);

  const attachmentName = application?.attachmentName || application?.fileName || null;
  if (attachmentName) {
    y = renderSection(bodyProxy, y, "Attachment");
    y = renderLabelValue(bodyProxy, y, "File", attachmentName);
  }

  if (bodyCmds.length > 0) {
    pageBodies.push(bodyCmds);
  }

  // Add a closing note page if content is short
  if (y < 180) {
    startBodyPage();
    y = renderSection(bodyProxy, y, "Notes");
    y = renderParagraph(bodyProxy, y, "This document contains the full details of the freelancer application for offline review and record keeping.", 78);
    y = renderParagraph(bodyProxy, y, "For the latest status or to take action, please log into the Freelancer Marketplace platform.", 78);
    if (bodyCmds.length > 0) {
      pageBodies.push(bodyCmds);
    }
  }

  const finalPages = [];
  const total = Math.max(1, pageBodies.length);

  pageBodies.forEach((bodyCommandsForPage, index) => {
    const pg = createPage();
    const pageNum = index + 1;

    renderHeader(pg, title, subtitle, pageNum, total);
    renderFooter(pg, footerText);

    pg.commands.push(...bodyCommandsForPage);

    finalPages.push(pg);
  });

  if (finalPages.length === 0) {
    const pg = createPage();
    renderHeader(pg, title, subtitle, 1, 1);
    renderFooter(pg, footerText);
    finalPages.push(pg);
  }

  const blob = buildPdfFromPages(finalPages);
  downloadBlob(blob, `application-${application?.applicationId ?? "export"}.pdf`);
}

export function exportPdf(linesOrData, filename = "export", title = "Export") {
  const page = createPage();
  let y = 665;

  // Use shared header for consistency
  const subtitle = `Generated ${new Date().toLocaleDateString()}`;
  renderHeader(page, title, subtitle, 1, 1);

  y = 665;

  const safeLines = Array.isArray(linesOrData) ? linesOrData : [String(linesOrData ?? "")];

  safeLines.forEach((item) => {
    if (y < 90) return;

    if (typeof item === "object" && item !== null && "key" in item) {
      text(page, 50, y, 9, String(item.key), "F2");
      const val = String(item.value ?? "-");
      const valLines = buildTextLines(val, 62);
      valLines.forEach((vl, i) => {
        text(page, 185, y - i * 11, 9, vl, "F1");
      });
      y -= Math.max(13, valLines.length * 11 + 3);
    } else {
      const wrapped = buildTextLines(item, 78);
      wrapped.forEach((line) => {
        text(page, 50, y, 9, line, "F1");
        y -= 11;
      });
      y -= 3;
    }
  });

  renderFooter(page, "Freelancer Marketplace • Confidential Report");

  const blob = buildPdfFromPages([page]);
  downloadBlob(blob, `${filename}.pdf`);
}
