export function getPostLoginRedirect(role?: string | null) {
  if (role === "ADMIN") {
    return "/admin";
  }

  if (role === "BARBER") {
    return "/barber";
  }

  return "/";
}
