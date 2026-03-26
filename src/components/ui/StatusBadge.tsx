import { Badge } from './Badge';
import { STATUS_OPTIONS } from '../../lib/constants';
import type { Status } from '../../types';

export function StatusBadge({ status }: { status: Status }) {
  const opt = STATUS_OPTIONS.find(s => s.value === status);
  return <Badge colour={opt?.colour}>{opt?.label ?? status}</Badge>;
}
