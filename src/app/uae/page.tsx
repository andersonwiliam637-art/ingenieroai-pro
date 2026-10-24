import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUaeOperationsSummary } from "@/lib/uae";

export default async function UaePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let summary = null;
  let tenantUnavailable = false;
  try { summary = await getUaeOperationsSummary(); }
  catch (error) { if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") tenantUnavailable = true; else throw error; }
  return (
    <main className="shell">
      <div className="eyebrow">UAE · OPERATIONS & LOGISTICS OS</div>
      <h1>Operations</h1>
      {tenantUnavailable ? <section className="panel"><h2>Tu usuario aún no pertenece a una organización.</h2><p>La provisión de organizaciones y membresías debe completarse por un flujo administrativo autorizado antes de operar.</p></section> : (
        <section className="metrics">
          <Metric label="Orders" value={summary?.orders ?? 0}/><Metric label="Drivers" value={summary?.drivers ?? 0}/>
          <Metric label="Vehicles" value={summary?.vehicles ?? 0}/><Metric label="Open deliveries" value={summary?.openDeliveries ?? 0}/>
          <Metric label="COD pending" value={summary?.pendingCod ?? 0}/>
        </section>
      )}
    </main>
  );
}
function Metric({label,value}:{label:string;value:number}) { return <article className="metric"><span>{label}</span><strong>{value}</strong></article>; }
