// Builds invite texts and share links. Shared by server (email) and client (WhatsApp/share).

export function inviteText(teamName: string, role: "CAPTAIN" | "MEMBER", inviterName?: string | null): string {
  const who = inviterName ? `${inviterName} nodigt je uit` : "Je bent uitgenodigd";
  const as = role === "CAPTAIN" ? "als aanvoerder van" : "voor";
  return `🎾 ${who} ${as} team ${teamName} in de WinterTennis competitie. Via de link maak je een account aan of log je in met Google. De link is 7 dagen geldig.`;
}

/** Converts a Dutch or international phone number to the digits-only format wa.me expects. */
export function normalizePhone(phone: string): string | null {
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `31${d.slice(1)}`;
  return /^\d{8,15}$/.test(d) ? d : null;
}

export function whatsappUrl(text: string, link: string, phone?: string | null): string {
  const msg = encodeURIComponent(`${text}\n\n${link}`);
  const p = phone ? normalizePhone(phone) : null;
  return p ? `https://wa.me/${p}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
