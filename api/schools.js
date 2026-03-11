const NEIS_ENDPOINT = "https://open.neis.go.kr/hub/schoolInfo";

function extractResult(payload) {
  if (payload?.RESULT) {
    return payload.RESULT;
  }

  if (!Array.isArray(payload?.schoolInfo)) {
    return null;
  }

  const headSection = payload.schoolInfo.find((section) => Array.isArray(section?.head));
  const resultEntry = headSection?.head?.find((entry) => entry.RESULT);
  return resultEntry?.RESULT || null;
}

function extractRows(payload) {
  if (!Array.isArray(payload?.schoolInfo)) {
    return [];
  }

  const rowSection = payload.schoolInfo.find((section) => Array.isArray(section?.row));
  return Array.isArray(rowSection?.row) ? rowSection.row : [];
}

function normalizeRow(row) {
  const officeCode = row.ATPT_OFCDC_SC_CODE || "";
  const schoolCode = row.SD_SCHUL_CODE || "";

  return {
    schoolId: `${officeCode}_${schoolCode}`,
    schoolName: row.SCHUL_NM || "",
    officeCode,
    officeName: row.ATPT_OFCDC_SC_NM || "",
    schoolCode,
    schoolKind: row.SCHUL_KND_SC_NM || "",
    address: row.ORG_RDNMA || row.ORG_RDNDA || "",
    homepage: row.HMPG_ADRES || "",
  };
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).json({
      message: "GET 요청만 허용됩니다.",
    });
    return;
  }

  const apiKey = process.env.NEIS_API_KEY;

  if (!apiKey) {
    response.status(500).json({
      message: "NEIS_API_KEY 환경변수가 설정되지 않았습니다.",
    });
    return;
  }

  const query = String(request.query?.query || "").trim();

  if (query.length < 2) {
    response.status(200).json({
      data: [],
    });
    return;
  }

  const url = new URL(NEIS_ENDPOINT);
  url.searchParams.set("KEY", apiKey);
  url.searchParams.set("Type", "json");
  url.searchParams.set("pIndex", "1");
  url.searchParams.set("pSize", "15");
  url.searchParams.set("SCHUL_NM", query);

  try {
    const apiResponse = await fetch(url);
    const payload = await apiResponse.json();
    const result = extractResult(payload);

    if (!apiResponse.ok) {
      throw new Error(result?.MESSAGE || "학교 검색 응답을 받지 못했습니다.");
    }

    if (result?.CODE && result.CODE !== "INFO-000") {
      if (result.CODE === "INFO-200") {
        response.status(200).json({
          data: [],
        });
        return;
      }

      throw new Error(result.MESSAGE || "학교 검색에 실패했습니다.");
    }

    response.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    response.status(200).json({
      data: extractRows(payload).map(normalizeRow),
    });
  } catch (error) {
    response.status(500).json({
      message: error.message || "학교 검색에 실패했습니다.",
    });
  }
}
