import { dataHubAdminReview, type HubSummary } from '../src/datahub';
import { MIN_GROUP } from '../src/datos';

const ok = (c: boolean, m: string) => { if (!c) throw new Error(m); };
const sum: HubSummary = {
  status: 'ACTIVE', sales_enabled: false, estimated: true, estimated_value_usd: 0,
  lists: {
    consumo: { users: 10, records: 20, ready: false, progress: 10 / MIN_GROUP, goalUsers: MIN_GROUP, estimatedHigh: 0 },
    fresh: { users: MIN_GROUP, records: 100, ready: true, progress: 1, goalUsers: MIN_GROUP, estimatedHigh: 5000 },
    segment: { users: 0, records: 0, ready: false, progress: 0, goalUsers: MIN_GROUP },
    exclusive: { users: 0, records: 0, ready: false, progress: 0, goalUsers: MIN_GROUP },
    predict: { users: 0, records: 0, ready: false, progress: 0, goalUsers: MIN_GROUP },
    trends: { users: 0, records: 0, ready: false, progress: 0, goalUsers: MIN_GROUP },
  },
};
const r = dataHubAdminReview(sum);
ok(r.status === 'ACTIVE', 'status');
ok(r.ready_lists.length === 1 && r.ready_lists[0].id === 'fresh', 'ready');
ok(r.action === 'review_ready_lists', 'action');
ok(r.estimated === true, 'estimated flag');
const m = dataHubAdminReview({ ...sum, million_alert: true, estimated_value_usd: 1_200_000 });
ok(m.action === 'notify_jose_million' && m.million_alert, 'million');
console.log('datahub.test OK');
