import { describe, expect, it } from "vitest";

import { buildReportPages } from "./print";
import { sortStaffByPositionThenName } from "./sort";

describe("staff sorting", () => {
  it("sorts Korean names with numeric suffixes in natural order", () => {
    const session = {
      staffList: [
        { id: "staff-1", department: "교사", name: "교사1" },
        { id: "staff-11", department: "교사", name: "교사 11" },
        { id: "staff-2", department: "교사", name: "교사2" },
        { id: "staff-10", department: "교사", name: "교사10" },
      ],
      signatures: [],
    };

    const { records } = buildReportPages(session, {
      filterPosition: "all",
      positionOrder: ["교사"],
      rowsPerPage: 26,
      sortMode: "position",
    });

    expect(records.map((record) => record.name)).toEqual([
      "교사1",
      "교사2",
      "교사10",
      "교사 11",
    ]);
  });

  it("applies natural ordering to the shared signer staff list", () => {
    const staffList = [
      { id: "staff-11", department: "교사", name: "교사11" },
      { id: "staff-1", department: "교사", name: "교사1" },
      { id: "staff-10", department: "교사", name: "교사10" },
      { id: "staff-2", department: "교사", name: "교사2" },
    ];

    expect(sortStaffByPositionThenName(staffList).map((staff) => staff.name)).toEqual([
      "교사1",
      "교사2",
      "교사10",
      "교사11",
    ]);
  });
});
