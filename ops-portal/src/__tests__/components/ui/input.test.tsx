import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("renders with a label when provided", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeDefined();
  });

  it("uses the label to generate an id", () => {
    render(<Input label="Full Name" />);
    const input = screen.getByLabelText("Full Name");
    expect(input.getAttribute("id")).toBe("full-name");
  });

  it("uses a custom id when provided", () => {
    render(<Input label="Email" id="custom-email" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("id")).toBe("custom-email");
  });

  it("accepts a value and onChange handler", async () => {
    const handleChange = vi.fn();
    render(<Input label="Name" value="John" onChange={handleChange} />);
    const input = screen.getByLabelText("Name");
    expect(input).toHaveValue("John");
    await userEvent.type(input, "ny");
    expect(handleChange).toHaveBeenCalled();
  });

  it("shows an error message and sets aria-invalid", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeDefined();
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows helper text when no error", () => {
    render(<Input label="Email" helperText="We will never share your email" />);
    expect(screen.getByText("We will never share your email")).toBeDefined();
  });

  it("does not show helper text when there is an error", () => {
    render(
      <Input
        label="Email"
        error="Required"
        helperText="We will never share your email"
      />,
    );
    expect(screen.getByText("Required")).toBeDefined();
    expect(screen.queryByText("We will never share your email")).toBeNull();
  });

  it("renders an icon when provided", () => {
    render(
      <Input label="Search" icon={<span data-testid="search-icon">🔍</span>} />,
    );
    expect(screen.getByTestId("search-icon")).toBeDefined();
  });

  it("applies error styling to the input", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("border-accent-danger");
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Input label="Name" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it('renders the error in an element with role="alert"', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("applies the correct type attribute", () => {
    render(<Input type="password" label="Password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("sets aria-describedby when error is present", () => {
    render(<Input label="Email" error="Invalid" />);
    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toMatch(/email-error/);
  });

  it("sets aria-describedby when helperText is present", () => {
    render(<Input label="Email" helperText="Enter your email" />);
    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toMatch(/email-helper/);
  });

  it("renders with a placeholder", () => {
    render(<Input placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText("Enter text...")).toBeDefined();
  });

  it("accepts additional className", () => {
    render(<Input className="custom-input" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("custom-input");
  });

  it("forwards ref to the input element", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
