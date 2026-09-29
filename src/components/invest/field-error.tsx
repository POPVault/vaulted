type FieldErrorProps = {
  id: string;
  /** Zod field errors come as a string array; the first one is shown. */
  errors?: string | string[];
};

export function FieldError({ id, errors }: FieldErrorProps) {
  const message = Array.isArray(errors) ? errors[0] : errors;
  if (!message) return null;

  return (
    <p id={id} className="mt-2 text-[13px] font-medium text-destructive">
      {message}
    </p>
  );
}
