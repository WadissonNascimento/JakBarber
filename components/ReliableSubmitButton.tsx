"use client";

import { useRef, useState } from "react";

type Props = {
  idleText: string;
  loadingText: string;
  className?: string;
};

const defaultClassName =
  "w-full rounded-2xl bg-[var(--brand)] px-6 py-4 font-semibold text-white shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

export default function ReliableSubmitButton({
  idleText,
  loadingText,
  className,
}: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submittedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  function submitNow() {
    if (submittedRef.current) return;

    const button = buttonRef.current;
    const form = button?.form;

    if (!button || !form) return;
    if (typeof form.reportValidity === "function" && !form.reportValidity()) {
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);

    if (typeof form.requestSubmit === "function") {
      form.requestSubmit(button);
      return;
    }

    form.submit();
  }

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={submitting}
      className={className || defaultClassName}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch") return;

        event.preventDefault();
        submitNow();
      }}
      onClick={(event) => {
        const form = buttonRef.current?.form;

        if (
          form &&
          typeof form.reportValidity === "function" &&
          !form.reportValidity()
        ) {
          return;
        }

        if (submittedRef.current) {
          event.preventDefault();
          return;
        }

        submittedRef.current = true;
        setSubmitting(true);
      }}
    >
      {submitting ? loadingText : idleText}
    </button>
  );
}
