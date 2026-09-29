import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { THEME_SLUGS } from "@themes/registry";
import { translate } from "../lib/strings";
import { ThemePicker } from "./ThemePicker";

describe("ThemePicker", () => {
  it("previews every theme in its own name and voice, with the purchase note in plain wording", () => {
    render(<ThemePicker busy={false} error={null} onChoose={() => {}} />);
    for (const slug of THEME_SLUGS) {
      expect(screen.getByText(translate(slug, "theme.name"))).toBeInTheDocument();
    }
    expect(screen.getByText(translate(null, "billing.pickerNote"))).toBeInTheDocument();
  });

  it("only allows confirming once a theme is selected", async () => {
    const onChoose = vi.fn();
    render(<ThemePicker busy={false} error={null} onChoose={onChoose} />);
    const confirm = screen.getByRole("button");
    expect(confirm).toBeDisabled();

    const [slug] = THEME_SLUGS;
    await userEvent.click(screen.getByRole("radio", { name: new RegExp(translate(slug, "theme.name")) }));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onChoose).toHaveBeenCalledWith(slug);
  });
});
