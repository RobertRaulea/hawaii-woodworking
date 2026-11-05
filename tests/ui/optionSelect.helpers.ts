import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

// Pick an option in a Radix-based OptionSelect by its visible label.
export const pickOption = async (
  user: ReturnType<typeof userEvent.setup>,
  trigger: HTMLElement,
  optionName: string | RegExp,
) => {
  await user.click(trigger);
  const option = await screen.findByRole("option", { name: optionName });
  await user.click(option);
};
