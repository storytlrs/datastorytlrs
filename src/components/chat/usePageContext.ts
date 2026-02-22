import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export interface PageContext {
  page_type: "dashboard" | "brand_detail" | "report_detail" | "admin" | "auth" | "unknown";
  space_id?: string;
  report_id?: string;
  brand_id?: string;
  active_tab?: string;
  pathname: string;
}

export const usePageContext = (): PageContext => {
  const location = useLocation();

  return useMemo(() => {
    const pathname = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const active_tab = searchParams.get("tab") || undefined;

    const brandMatch = pathname.match(new RegExp(`^/brands/(${UUID})`, "i"));
    const reportMatch = pathname.match(new RegExp(`^/reports/(${UUID})`, "i"));

    if (pathname === "/dashboard") {
      return { page_type: "dashboard", pathname, active_tab };
    }

    if (brandMatch) {
      return {
        page_type: "brand_detail",
        brand_id: brandMatch[1],
        space_id: brandMatch[1],
        pathname,
        active_tab,
      };
    }

    if (reportMatch) {
      return {
        page_type: "report_detail",
        report_id: reportMatch[1],
        pathname,
        active_tab,
      };
    }

    if (pathname === "/admin") return { page_type: "admin", pathname };
    if (pathname === "/auth") return { page_type: "auth", pathname };
    return { page_type: "unknown", pathname };
  }, [location.pathname, location.search]);
};
