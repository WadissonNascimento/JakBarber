export function formatManualFitInNotes({
  customerName,
  customerPhone,
  notes,
}: {
  customerName: string;
  customerPhone?: string | null;
  notes?: string | null;
}) {
  const details = [
    `Cliente: ${customerName || "Cliente sem cadastro"}`,
    customerPhone ? `Telefone: ${customerPhone}` : "",
    notes ? `Obs: ${notes}` : "",
  ].filter(Boolean);

  return `Encaixe Manual | ${details.join(" | ")}`;
}

export function getManualFitInCustomerSnapshot(notes: string | null | undefined) {
  const rawNotes = String(notes || "");
  const name = rawNotes.match(/(?:^|\|\s*)Cliente:\s*([^|]+)/)?.[1]?.trim() || "";
  const phone = rawNotes.match(/(?:^|\|\s*)Telefone:\s*([^|]+)/)?.[1]?.trim() || "";

  return {
    name,
    phone,
  };
}
