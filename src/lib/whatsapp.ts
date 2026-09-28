// Link wa.me para o numero cadastrado da loja. Numeros brasileiros com DDD (10-11
// digitos) ganham o codigo do pais +55 automaticamente.
export function whatsappLink(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const full =
    digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}
