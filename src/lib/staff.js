import { saveAs } from "file-saver";
import { createId } from "./storage";

const DEFAULT_DEPARTMENT = "교직원";
const TEMPLATE_SHEET_NAME = "양식";
const TEMPLATE_FILE_NAME = "명단양식.xlsx";

const NAME_HEADER_LABELS = [
  "name",
  "full name",
  "fullname",
  "\uC131\uBA85",
  "\uC774\uB984",
];

const DEPARTMENT_HEADER_LABELS = [
  "department",
  "dept",
  "team",
  "division",
  "organization",
  "affiliation",
  "position",
  "title",
  "role",
  "\uBD80\uC11C",
  "\uC18C\uC18D",
  "\uC9C1\uC704",
  "\uC9C1\uAE09",
  "\uBD80\uBB38",
];

let xlsxModulePromise = null;

async function loadXlsx() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }

  return xlsxModulePromise;
}

function normalizeCell(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function normalizeHeaderLabel(value) {
  return normalizeCell(value)
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._-]/g, " ");
}

function isNameHeader(value) {
  const label = normalizeHeaderLabel(value);
  return NAME_HEADER_LABELS.includes(label);
}

function isDepartmentHeader(value) {
  const label = normalizeHeaderLabel(value);
  return DEPARTMENT_HEADER_LABELS.includes(label);
}

function looksLikeHeaderRow(row) {
  const cells = (row || []).map(normalizeCell).filter(Boolean);

  if (!cells.length) {
    return false;
  }

  const hasNameHeader = cells.some(isNameHeader);
  const hasDepartmentHeader = cells.some(isDepartmentHeader);

  if (hasNameHeader && hasDepartmentHeader) {
    return true;
  }

  return cells.every((cell) => isNameHeader(cell) || isDepartmentHeader(cell));
}

function normalizeEntry(entry) {
  const department = normalizeCell(entry.department) || DEFAULT_DEPARTMENT;
  const name = normalizeCell(entry.name);

  if (!name) {
    return null;
  }

  return {
    id: createId(),
    department,
    name,
  };
}

function findColumnIndexes(rows) {
  let headerRowIndex = -1;
  let nameColumn = -1;
  let departmentColumn = -1;

  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const row = rows[rowIndex] || [];

    row.forEach((cell, columnIndex) => {
      if (isNameHeader(cell)) {
        headerRowIndex = rowIndex;
        nameColumn = columnIndex;
      }

      if (isDepartmentHeader(cell)) {
        headerRowIndex = rowIndex;
        departmentColumn = columnIndex;
      }
    });

    if (headerRowIndex >= 0 && nameColumn >= 0) {
      break;
    }
  }

  return {
    headerRowIndex,
    nameColumn,
    departmentColumn,
  };
}

function parseTableRows(rows) {
  if (!rows.length) {
    return [];
  }

  const normalizedRows = rows.map((row) => (Array.isArray(row) ? row.map(normalizeCell) : []));
  const { departmentColumn, headerRowIndex, nameColumn } = findColumnIndexes(normalizedRows);
  const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : looksLikeHeaderRow(normalizedRows[0]) ? 1 : 0;
  const entries = [];

  for (let index = startIndex; index < normalizedRows.length; index += 1) {
    const row = normalizedRows[index];

    if (!row.some(Boolean)) {
      continue;
    }

    const candidate = normalizeEntry({
      department:
        departmentColumn >= 0
          ? row[departmentColumn]
          : row.length > 1
            ? row[0]
            : DEFAULT_DEPARTMENT,
      name:
        nameColumn >= 0
          ? row[nameColumn]
          : row.length > 1
            ? row[1]
            : row[0],
    });

    if (candidate) {
      entries.push(candidate);
    }
  }

  return entries;
}

function parseDelimitedText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[\t,]/).map(normalizeCell));

  return parseTableRows(rows);
}

export async function parseStaffFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const XLSX = await loadXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return parseTableRows(rows);
  }

  return parseDelimitedText(await file.text());
}

export async function buildStaffTemplateBlob() {
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.json_to_sheet(
    [
      {
        "직위": "교사",
        "성명": "홍길동",
      },
      {
        "직위": "행정실",
        "성명": "김연수",
      },
    ],
    { header: ["직위", "성명"] },
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, TEMPLATE_SHEET_NAME);
  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([arrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function downloadStaffTemplate() {
  const blob = await buildStaffTemplateBlob();
  saveAs(blob, TEMPLATE_FILE_NAME);
}

export { TEMPLATE_FILE_NAME as STAFF_TEMPLATE_FILE_NAME };
