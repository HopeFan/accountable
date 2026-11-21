import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Details } from "./RecordPage";

const rows: [string, string][] = [["Industry", "Freight"]];

describe("Details", () => {
  it("shows who added and last changed the record", () => {
    render(
      <Details
        rows={rows}
        author={{
          created_by: "sam@example.com",
          updated_by: "kim@example.com",
        }}
      />,
    );
    expect(screen.getByText("Added by")).toBeInTheDocument();
    expect(screen.getByText("Last changed by")).toBeInTheDocument();
    expect(screen.getByText("sam@example.com")).toHaveClass(
      "font-mono",
      "text-muted",
    );
    expect(screen.getByText("kim@example.com")).toBeInTheDocument();
    expect(screen.getByText("Freight")).toBeInTheDocument();
  });

  it("says Sample data when there is no author", () => {
    render(
      <Details rows={rows} author={{ created_by: null, updated_by: null }} />,
    );
    expect(screen.getAllByText("Sample data")).toHaveLength(2);
  });
});
