// Renders a JSON-LD <script> block. Safe to use in Server Components.
// Values are JSON-serialized and HTML-escaped for the `</script>` edge case.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
