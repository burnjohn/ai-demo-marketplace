import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../EmptyState";
import { ErrorState } from "../ErrorState";
import { Skeleton } from "../Skeleton";

describe("EmptyState", () => {
  it("renders a heading, optional description and action", () => {
    render(
      <EmptyState
        heading="Nothing here"
        description="Try a different search."
        action={<a href="/somewhere">Go somewhere</a>}
      />,
    );
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go somewhere" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("shows the message, retries on demand, and links to the repository", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        message="The catalog failed to load."
        onRetry={onRetry}
        repositoryUrl="https://github.com/burnjohn/ai-demo-marketplace"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("The catalog failed to load.");

    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    const repoLink = screen.getByRole("link");
    expect(repoLink).toHaveAttribute("href", "https://github.com/burnjohn/ai-demo-marketplace");
    expect(repoLink).toHaveAttribute("target", "_blank");
  });
});

describe("Skeleton", () => {
  it("renders the requested count of layout-reserving placeholders", () => {
    const { container } = render(<Skeleton variant="card" count={3} />);
    expect(container.querySelectorAll(".skeleton--card")).toHaveLength(3);
  });
});
