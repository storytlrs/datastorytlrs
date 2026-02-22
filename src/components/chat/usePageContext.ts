import { useLocation, useParams } from "react-router-dom";
import { useMemo } from "react";

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
  const params = useParams();

  return useMemo(() => {
    const pathname = location.pathname;

    // Extract tab from URL search params or hash
    const searchParams = new URLSearchParams(location.search);
    const active_tab = searchParams.get("tab") || undefined;

    if (pathname === "/dashboard") {
      return { page_type: "dashboard", pathname, active_tab };
    }

    if (pathname.startsWith("/brands/") && params.brandId) {
      return {
        page_type: "brand_detail",
        brand_id: params.brandId,
        space_id: params.brandId, // brandId IS the space_id in this app
        pathname,
        active_tab,
      };
    }

    if (pathname.startsWith("/reports/") && params.reportId) {
      return {
        page_type: "report_detail",
        report_id: params.reportId,
        pathname,
        active_tab,
      };
    }

    if (pathname === "/admin") {
      return { page_type: "admin", pathname };
    }

    if (pathname === "/auth") {
      return { page_type: "auth", pathname };
    }

    return { page_type: "unknown", pathname };
  }, [location.pathname, location.search, params.brandId, params.reportId]);
};
