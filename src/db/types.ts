// Shapes of the JSON columns on the offerings table.

export type KeyTerm = { label: string; value: string };

export type HowItWorksStep = { title: string; text: string };

export type HowYouGetPaid = { intro: string; example_steps: string[] };

export type FaqEntry = { q: string; a: string };

export type WireInstructions = {
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  instructions: string;
};
