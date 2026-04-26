import { DEFAULT_POSITION_ORDER } from "./constants";

const KOREAN_NATURAL_COLLATOR = new Intl.Collator("ko", {
  numeric: true,
  sensitivity: "base",
});

function normalizeNaturalSortValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([^\d\s])\s+(\d)/g, "$1$2")
    .replace(/(\d)\s+([^\d\s])/g, "$1$2");
}

export function compareKorean(left, right) {
  return KOREAN_NATURAL_COLLATOR.compare(
    normalizeNaturalSortValue(left),
    normalizeNaturalSortValue(right),
  );
}

export function makePositionRankMap(positionOrder) {
  return new Map(positionOrder.map((item, index) => [item, index]));
}

export function sortStaffByPositionThenName(staffList) {
  const positionRankMap = makePositionRankMap(DEFAULT_POSITION_ORDER);

  return [...staffList].sort((left, right) => {
    const leftPos = left.department || "";
    const rightPos = right.department || "";
    const leftRank = positionRankMap.get(leftPos) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = positionRankMap.get(rightPos) ?? Number.MAX_SAFE_INTEGER;

    return (
      leftRank - rightRank ||
      compareKorean(leftPos, rightPos) ||
      compareKorean(left.name, right.name)
    );
  });
}
