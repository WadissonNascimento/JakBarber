import { headers } from "next/headers";
import { isWrTechInstitutionalHost } from "@/lib/wrTechInstitutional";

export async function isWrTechInstitutionalRequest() {
  try {
    const headerList = await headers();

    return isWrTechInstitutionalHost(
      headerList.get("x-forwarded-host") || headerList.get("host")
    );
  } catch {
    return false;
  }
}
