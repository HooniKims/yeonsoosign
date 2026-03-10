import { useEffect, useMemo, useState } from "react";
import { APP_NAME, PAGE_SIZE_OPTIONS } from "../lib/constants";
import { buildReportPages, getPositionOptions } from "../lib/print";
import { readSortOrder, writeSortOrder } from "../lib/storage";

function parseSortOrder(text) {
  return text
    .split(/[\n,>]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function SignatureCell({ row }) {
  if (!row?.signatureData) {
    return <span className="signature-placeholder">서명란</span>;
  }

  return <img alt={`${row.name} 서명`} className="signature-preview" src={row.signatureData} />;
}

function ReportTable({ rows, deleteMode, onDelete }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>연번</th>
          <th>소속</th>
          <th>직위</th>
          <th>성명</th>
          <th>서명</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr
            className={deleteMode && row ? "report-row-delete" : ""}
            key={`${row?.staffId || "blank"}-${index}`}
            onClick={() => {
              if (deleteMode && row) {
                onDelete(row);
              }
            }}
          >
            <td>{row?.no ?? ""}</td>
            <td>{row?.affiliation ?? ""}</td>
            <td>{row?.position ?? ""}</td>
            <td>{row?.name ?? ""}</td>
            <td>
              <SignatureCell row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrintPreview({ busy, onClose, onDeleteSignature, session }) {
  const [sortMode, setSortMode] = useState("position");
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZE_OPTIONS[0]);
  const [filterPosition, setFilterPosition] = useState("all");
  const [deleteMode, setDeleteMode] = useState(false);
  const [orderText, setOrderText] = useState(() => readSortOrder().join(", "));

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

  return (
    <section className="report-shell">
      <header className="report-toolbar no-print">
        <div className="report-toolbar-meta">
          <h1>{APP_NAME} 출력 미리보기</h1>
          <p>
            출력 대상 {report.records.length}명 / 총 {report.pages.length}페이지
          </p>
        </div>

        <div className="report-controls">
          <label>
            <span>정렬</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="position">직위순</option>
              <option value="affiliation">소속순</option>
              <option value="name">이름순</option>
            </select>
          </label>

          <label>
            <span>페이지당 인원</span>
            <select
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}명
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>직위 필터</span>
            <select
              value={filterPosition}
              onChange={(event) => setFilterPosition(event.target.value)}
            >
              <option value="all">전체</option>
              {positionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="report-order-field">
            <span>직위 순서</span>
            <input
              value={orderText}
              onChange={(event) => setOrderText(event.target.value)}
              placeholder="원장, 원감, 교장, 교감, 교사..."
            />
          </label>

          <button
            className={`mini-button ${deleteMode ? "mini-button-danger" : ""}`}
            onClick={() => setDeleteMode((current) => !current)}
          >
            {deleteMode ? "삭제 모드 종료" : "삭제 모드"}
          </button>
          <button className="action-button action-button-primary" onClick={() => window.print()}>
            인쇄
          </button>
          <button className="ghost-button" onClick={onClose}>
            닫기
          </button>
        </div>
      </header>

      <div className="report-pages">
        {report.pages.map((page) => (
          <article className="report-page" key={page.pageNumber}>
            <header className="report-page-header">
              <p className="report-page-note">* 온라인 연수연명부 양식에 맞춰 바로 인쇄할 수 있습니다.</p>
              <h2>[ {session.title} ]</h2>
              <h3>{APP_NAME}</h3>
              <div className="report-page-meta">
                <span>
                  일시: {session.date} {session.time || ""}
                </span>
                <span>장소: {session.schoolName}</span>
              </div>
              <div className="report-page-meta report-page-meta-right">
                <span>
                  연수대상자 {report.records.length}명 / {report.records.length}명 참가
                </span>
              </div>
            </header>

            <div className="report-grid">
              <ReportTable
                deleteMode={deleteMode}
                onDelete={(row) => onDeleteSignature(session.id, row.staffId)}
                rows={page.leftRows}
              />
              <ReportTable
                deleteMode={deleteMode}
                onDelete={(row) => onDeleteSignature(session.id, row.staffId)}
                rows={page.rightRows}
              />
            </div>

            <footer className="report-page-footer">
              <p>위와 같이 연수를 실시하였음을 확인합니다.</p>
              <strong>{session.schoolName}</strong>
            </footer>
          </article>
        ))}
      </div>

      {busy ? <div className="busy-note no-print">데이터 반영 중...</div> : null}
    </section>
  );
}
