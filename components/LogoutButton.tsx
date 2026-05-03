"use client";

export function LogoutButton() {
  function handleLogout() {
    window.location.assign("/logout");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex rounded-xl border border-red-700 px-4 py-2 text-sm text-red-400 transition hover:bg-red-700/10"
    >
      Sair
    </button>
  );
}
