function compareKorean(left, right) {
  return String(left || "").localeCompare(String(right || ""), "ko");
}

function makePositionRankMap(positionOrder) {
  return new Map(positionOrder.map((item, index) => [item, index]));
}

function buildRecords(session) {
  if (session.staffList && session.staffList.length > 0) {
    const signatureMap = new Map((session.signatures || []).map((s) => [s.staffId, s]));
    return session.staffList.map((staff, index) => {
      const signature = signatureMap.get(staff.id);
      return {
        no: index + 1,
        staffId: staff.id,
        affiliation: staff.affiliation || "",
        position: staff.department || "",
        name: staff.name || "",
        signatureData: signature?.signatureData || "",
      };
    });
  }

  // 외부 연수 등 staffList가 빈 경우 서명자 목록 기반으로 렌더링
  return (session.signatures || []).map((signature, index) => ({
    no: index + 1,
    staffId: signature.staffId,
    affiliation: signature.affiliation || "",
    position: signature.department || "",
    name: signature.staffName || "",
    signatureData: signature.signatureData || "",
  }));
}

export function getPositionOptions(session) {
  return Array.from(
    new Set(buildRecords(session).map((record) => record.position).filter(Boolean)),
  ).toSorted(compareKorean);
}

export function buildReportPages(session, options) {
  const {
    filterPosition,
    positionOrder,
    rowsPerPage,
    sortMode,
  } = options;
  const positionRankMap = makePositionRankMap(positionOrder);

  let records = buildRecords(session);

  if (filterPosition && filterPosition !== "all") {
    records = records.filter((record) => record.position === filterPosition);
  }

  records = records.toSorted((left, right) => {
    if (sortMode === "affiliation") {
      return (
        compareKorean(left.affiliation, right.affiliation) ||
        compareKorean(left.position, right.position) ||
        compareKorean(left.name, right.name)
      );
    }

    if (sortMode === "name") {
      return compareKorean(left.name, right.name);
    }

    const leftRank = positionRankMap.get(left.position) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = positionRankMap.get(right.position) ?? Number.MAX_SAFE_INTEGER;

    return (
      leftRank - rightRank ||
      compareKorean(left.position, right.position) ||
      compareKorean(left.name, right.name)
    );
  });

  records = records.map((record, index) => ({
    ...record,
    no: index + 1,
  }));

  const pageSize = Number(rowsPerPage);
  const half = pageSize / 2;
  const pages = [];

  for (let start = 0; start < records.length || start === 0; start += pageSize) {
    const chunk = records.slice(start, start + pageSize);
    const leftRows = [...chunk.slice(0, half)];
    const rightRows = [...chunk.slice(half, pageSize)];

    while (leftRows.length < half) {
      leftRows.push(null);
    }

    while (rightRows.length < half) {
      rightRows.push(null);
    }

    pages.push({
      leftRows,
      rightRows,
      pageNumber: pages.length + 1,
    });
  }

  return {
    records,
    pages,
  };
}
