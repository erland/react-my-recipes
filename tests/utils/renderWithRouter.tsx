import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

export function renderWithRouter(ui: React.ReactElement, initialEntries = ["/"]) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}