import { useT } from "../lib/strings";

/**
 * The two prices, shown the same way on the paywall and the marketing pages: lifetime is
 * the one that can be bought, monthly is the anchor beside it. Money copy is never themed.
 */
export function Plans() {
  const t = useT();
  return (
    <div className="plans" role="list">
      <div className="plan plan-lifetime" role="listitem" aria-current="true">
        <span className="plan-tag">{t("paywall.plan.lifetime.tag")}</span>
        <span className="plan-name">{t("paywall.plan.lifetime")}</span>
        <span className="plan-price">{t("paywall.plan.lifetime.price")}</span>
        <span className="plan-sub">{t("paywall.plan.lifetime.sub")}</span>
      </div>
      <div className="plan plan-monthly" role="listitem" aria-disabled="true">
        <span className="plan-tag">{t("paywall.plan.monthly.tag")}</span>
        <span className="plan-name">{t("paywall.plan.monthly")}</span>
        <span className="plan-price">{t("paywall.plan.monthly.price")}</span>
        <span className="plan-sub">{t("paywall.plan.monthly.sub")}</span>
      </div>
    </div>
  );
}
