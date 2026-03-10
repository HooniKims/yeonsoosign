import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PAGE_SIZE_OPTIONS, PRINT_TITLE } from "../lib/constants";
import { buildReportPages, getPositionOptions } from "../lib/print";
import { readSortOrder, writeSortOrder } from "../lib/storage";

function parseSortOrder(text) {
  return text
    .split(/[\n,>]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* ── 열 정의 ── */
const ALL_COLUMNS = [
  { key: "no", label: "연번", defaultVisible: true },
  { key: "affiliation", label: "소속", defaultVisible: false },
  { key: "position", label: "직위", defaultVisible: false },
  { key: "name", label: "성명", defaultVisible: true },
  { key: "signature", label: "서명", defaultVisible: true },
];
const PDF_EXPORT_CLASS = "report-pdf-export";

/* ── 열 너비 비율 계산 ── */
function computeColWidths(visibleKeys) {
  const base = {
    no: 8,
    affiliation: 18,
    position: 12,
    name: 22,
    signature: 36,
  };
  const total = visibleKeys.reduce((sum, k) => sum + (base[k] || 10), 0);
  return Object.fromEntries(visibleKeys.map((k) => [k, `${((base[k] || 10) / total) * 100}%`]));
}

/* ── 서명 셀 ── */
function SignatureCell({ row }) {
  if (!row?.signatureData) {
    return <span className="signature-placeholder">서명란</span>;
  }
  return <img alt={`${row.name} 서명`} className="signature-preview" src={row.signatureData} />;
}

/* ── 열 선택 드롭다운 ── */
function ColumnPicker({ visibleColumns, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(key) {
    const alwaysOn = ["no", "name", "signature"];
    if (alwaysOn.includes(key)) return;
    onChange(
      visibleColumns.includes(key)
        ? visibleColumns.filter((k) => k !== key)
        : [...visibleColumns, key],
    );
  }

  return (
    <div className="column-picker" ref={ref}>
      <button
        className="toolbar-btn"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        📋 열 선택
      </button>
      {open && (
        <div className="column-picker-dropdown">
          {ALL_COLUMNS.map((col) => {
            const locked = ["no", "name", "signature"].includes(col.key);
            const checked = visibleColumns.includes(col.key);
            return (
              <label key={col.key} className={`column-picker-item ${locked ? "locked" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked}
                  onChange={() => toggle(col.key)}
                />
                {col.label}
                {locked && <span className="column-picker-lock">필수</span>}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 테이블 ── */
function ReportTable({ rows, deleteMode, onDelete, visibleColumns, colWidths }) {
  return (
    <table className="report-table">
      <colgroup>
        {visibleColumns.map((key) => (
          <col key={key} style={{ width: colWidths[key] }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {visibleColumns.map((key) => (
            <th key={key}>{ALL_COLUMNS.find((c) => c.key === key)?.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            className={deleteMode && row ? "report-row-delete" : ""}
            key={`${row?.staffId || "blank"}-${index}`}
            onClick={() => {
              if (deleteMode && row) onDelete(row);
            }}
          >
            {visibleColumns.map((key) => {
              if (key === "signature") {
                return (
                  <td key={key}>
                    <SignatureCell row={row} />
                  </td>
                );
              }
              const valueMap = {
                no: row?.no ?? "",
                affiliation: row?.affiliation ?? "",
                position: row?.position ?? "",
                name: row?.name ?? "",
              };
              return <td key={key}>{valueMap[key]}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── 토글 스위치 ── */
function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label className="toggle-switch-label">
      <span className="toggle-switch-text">{label}</span>
      <div
        className={`toggle-switch ${checked ? "toggle-switch-on" : ""}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <div className="toggle-switch-knob" />
      </div>
    </label>
  );
}

/* ── 메인 ── */
export default function PrintPreview({ busy, onClose, onDeleteSignature, session }) {
  const [sortMode, setSortMode] = useState("position");
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filterPosition, setFilterPosition] = useState("all");
  const [deleteMode, setDeleteMode] = useState(false);
  const [orderText, setOrderText] = useState(() => readSortOrder().join(", "));
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
  );
  const [pdfBusy, setPdfBusy] = useState(false);
  const pagesRef = useRef(null);

  const positionOrder = useMemo(() => parseSortOrder(orderText), [orderText]);
  const positionOptions = useMemo(() => getPositionOptions(session), [session]);
  const report = useMemo(
    () =>
      buildReportPages(session, {
        filterPosition,
        positionOrder,
        rowsPerPage,
        sortMode,
      }),
    [filterPosition, positionOrder, rowsPerPage, session, sortMode],
  );

  useEffect(() => {
    writeSortOrder(positionOrder);
  }, [positionOrder]);

  const colWidths = useMemo(() => computeColWidths(visibleColumns), [visibleColumns]);
  const visibleTargetCount = report.records.length;
  const signedVisibleCount = useMemo(
    () => report.records.filter((record) => Boolean(record?.signatureData)).length,
    [report.records],
  );

  // A4 셀 높이 계산
  const half = rowsPerPage / 2;
  const tableHeightMm = 297 - 24 - 42 - 18;
  const cellHeightMm = Math.max((tableHeightMm - 7) / half, 6);

  // PDF 저장
  const handleSavePdf = useCallback(async () => {
    if (!pagesRef.current) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const formattedDate = session.date ? session.date.slice(2).replace(/-/g, "") : "yymmdd";
      const filename = `${formattedDate}_${session.title || "연수"}_연수 연명부.pdf`;
      const pages = Array.from(pagesRef.current.querySelectorAll(".report-page"));
      if (pages.length === 0) return;
      const a4WidthPx = Math.round((210 / 25.4) * 96);
      const a4HeightPx = Math.round((297 / 25.4) * 96);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index];
        const canvas = await html2canvas(page, {
          backgroundColor: "#ffffff",
          logging: false,
          scale: Math.max(window.devicePixelRatio || 1, 2),
          width: a4WidthPx,
          height: a4HeightPx,
          useCORS: true,
          windowWidth: 1400,
          windowHeight: 1600,
          onclone: (clonedDocument) => {
            clonedDocument.documentElement.classList.add(PDF_EXPORT_CLASS);
          },
        });
        const imageData = canvas.toDataURL("image/jpeg", 0.98);

        if (index > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imageData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      }

      pdf.save(filename);
    } catch (error) {
      console.error("PDF 저장 실패:", error);
    } finally {
      setPdfBusy(false);
    }
  }, [session]);

  return (
    <section className="report-shell">
      <header className="report-toolbar no-print">
        <div className="report-toolbar-meta">
          <h1>등록부 출력 미리보기</h1>
          <p>
            출력 대상 {visibleTargetCount}명 중 {signedVisibleCount}명 참가 / 총 {report.pages.length}페이지
          </p>
        </div>

        <div className="report-controls">
          <label className="report-control-inline">
            <span>정렬:</span>
            <select className="toolbar-select" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="position">직위순</option>
              <option value="affiliation">소속순</option>
              <option value="name">이름순</option>
            </select>
          </label>

          <label className="report-control-inline">
            <span>페이지당 인원:</span>
            <select
              className="toolbar-select"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}명
                </option>
              ))}
            </select>
          </label>

          <button className="toolbar-btn" onClick={() => setShowOrderDialog(true)}>
            🔧 직위 순서 설정
          </button>

          <label className="report-control-inline">
            <span>직위 필터:</span>
            <select
              className="toolbar-select"
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
            >
              <option value="all">전체</option>
              {positionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <ColumnPicker visibleColumns={visibleColumns} onChange={setVisibleColumns} />

          <ToggleSwitch checked={deleteMode} onChange={setDeleteMode} label="삭제 모드" />

          <button className="toolbar-btn toolbar-btn-pdf" disabled={pdfBusy} onClick={handleSavePdf}>
            {pdfBusy ? "저장 중…" : "📄 PDF 저장"}
          </button>
          <button className="toolbar-btn toolbar-btn-print" onClick={() => window.print()}>
            🖨️ 인쇄
          </button>
          <button className="toolbar-btn toolbar-btn-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </header>

      {/* 직위 순서 설정 다이얼로그 */}
      {showOrderDialog && (
        <div className="modal-backdrop no-print" onClick={() => setShowOrderDialog(false)}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>직위 순서 설정</h3>
              <p className="muted-copy">쉼표(,)로 구분하여 직위 순서를 입력하세요.</p>
            </div>
            <div className="form-stack" style={{ marginTop: 16 }}>
              <textarea
                className="text-input"
                rows={4}
                style={{ minHeight: 100, padding: "12px 16px", resize: "vertical" }}
                value={orderText}
                onChange={(e) => setOrderText(e.target.value)}
                placeholder="교장, 교감, 부장교사, 교사, 강사, 행정실장, 주무관, 실무사, 직원, 기타"
              />
            </div>
            <div className="dialog-actions">
              <button className="ghost-button" onClick={() => setShowOrderDialog(false)}>
                닫기
              </button>
              <button
                className="action-button action-button-primary"
                onClick={() => setShowOrderDialog(false)}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="report-pages" ref={pagesRef}>
        {report.pages.map((page) => (
          <article
            className="report-page"
            key={page.pageNumber}
            style={{ "--cell-h": `${cellHeightMm}mm` }}
          >
            <header className="report-page-header">
              <p className="report-page-note">* 정렬 순서: 직위(사용자설정) &gt; 성명(가나다순)</p>
              <h2>[ {session.title} ]</h2>
              <h3>{PRINT_TITLE}</h3>
              <div className="report-page-meta">
                <span>
                  일시: {session.date} {session.time || ""}
                </span>
                <span className="report-meta-separator" />
                <span>장소: {session.schoolName}</span>
              </div>
              <hr className="report-divider" />
              <div className="report-page-meta report-page-meta-right">
                <span>
                  연수대상자 {visibleTargetCount}명 / {signedVisibleCount}명 참가
                </span>
              </div>
            </header>

            <div className="report-grid">
              <ReportTable
                deleteMode={deleteMode}
                onDelete={(row) => onDeleteSignature(session.id, row.staffId)}
                rows={page.leftRows}
                visibleColumns={visibleColumns}
                colWidths={colWidths}
              />
              <ReportTable
                deleteMode={deleteMode}
                onDelete={(row) => onDeleteSignature(session.id, row.staffId)}
                rows={page.rightRows}
                visibleColumns={visibleColumns}
                colWidths={colWidths}
              />
            </div>

            <footer className="report-page-footer">
              <p>위와 같이 연수를 실시하였음을 확인합니다.</p>
              <strong>{session.schoolName}</strong>
            </footer>
          </article>
        ))}
      </div>

      {(busy || pdfBusy) ? <div className="busy-note no-print">{pdfBusy ? "PDF 저장 중..." : "데이터 반영 중..."}</div> : null}
    </section>
  );
}
