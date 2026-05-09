export const PASSWORD_REQUIREMENT_MESSAGE =
  "A senha deve ter no minimo 7 caracteres, uma letra e um caractere especial.";

export const NEW_PASSWORD_REQUIREMENT_MESSAGE =
  "A nova senha deve ter no minimo 7 caracteres, uma letra e um caractere especial.";

export function isStrongPassword(password: string) {
  return (
    password.length >= 7 &&
    /[A-Za-z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
