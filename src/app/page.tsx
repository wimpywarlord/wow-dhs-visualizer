import { aggregateData } from './lib/aggregate-data';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-static';

export default function Home() {
  const data = aggregateData();

  return <DashboardClient data={data} />;
}
