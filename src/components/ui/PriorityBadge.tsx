import { Badge } from './Badge';
import { PRIORITY_OPTIONS } from '../../lib/constants';
import type { Priority } from '../../types';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const opt = PRIORITY_OPTIONS.find(p => p.value === priority);
  return <Badge colour={opt?.colour}>{opt?.label ?? priority}</Badge>;
}
