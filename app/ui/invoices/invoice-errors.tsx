interface InvoiceErrorsProps {
  id: string;
  errors: string[];
}

export default function InvoiceErrors({ id, errors }: InvoiceErrorsProps) {
  return (
    <div id={id} aria-live="polite" className="mt-2 text-sm text-red-500">
      {errors.map((error) => (
        <p key={error}>{error}</p>
      ))}
    </div>
  );
}
