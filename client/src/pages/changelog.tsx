import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeal, type ChangelogAction, type ChangelogChange, type ChangelogEntityType } from '@/lib/meal-context';

const actionOptions: { label: string; value: ChangelogAction | 'all' }[] = [
  { label: 'All Actions', value: 'all' },
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
];

const entityOptions: { label: string; value: ChangelogEntityType | 'all' }[] = [
  { label: 'All Entities', value: 'all' },
  { label: 'Members', value: 'member' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Meals', value: 'meal_log' },
  { label: 'Deposits', value: 'deposit' },
];

function formatCurrency(value: number) {
  return `৳${value.toFixed(2)}`;
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (value === null || value === undefined || value === '') {
    return 'Empty';
  }

  return String(value);
}

function formatChange(change: ChangelogChange) {
  if (typeof change.value === 'number' && ['amount'].includes(change.field)) {
    return `${change.label}: ${formatCurrency(change.value)}`;
  }

  if (
    typeof change.from === 'number' &&
    typeof change.to === 'number' &&
    ['amount'].includes(change.field)
  ) {
    return `${change.label}: ${formatCurrency(change.from)} -> ${formatCurrency(change.to)}`;
  }

  if (change.from !== undefined || change.to !== undefined) {
    return `${change.label}: ${formatValue(change.from)} -> ${formatValue(change.to)}`;
  }

  return `${change.label}: ${formatValue(change.value)}`;
}

function actionBadgeVariant(action: ChangelogAction) {
  if (action === 'create') return 'default';
  if (action === 'update') return 'secondary';
  return 'destructive';
}

export default function ChangelogPage() {
  const { changelogEntries, activeCycle, pendingCycle } = useMeal();
  const [actionFilter, setActionFilter] = useState<ChangelogAction | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<ChangelogEntityType | 'all'>('all');
  const viewedCycle = pendingCycle ?? activeCycle;

  const filteredEntries = useMemo(
    () =>
      changelogEntries.filter((entry) => (
        (actionFilter === 'all' || entry.action === actionFilter) &&
        (entityFilter === 'all' || entry.entityType === entityFilter)
      )),
    [actionFilter, changelogEntries, entityFilter],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Changelog</h1>
        <p className="text-sm text-muted-foreground">
          {viewedCycle
            ? pendingCycle
              ? 'Track create, update, and delete activity for the current pending cycle until it is fully closed.'
              : 'Track create, update, and delete activity for the current active cycle.'
            : 'No active cycle is available yet.'}
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Action</p>
            <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as ChangelogAction | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Entity</p>
            <Select value={entityFilter} onValueChange={(value) => setEntityFilter(value as ChangelogEntityType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by entity" />
              </SelectTrigger>
              <SelectContent>
                {entityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          There are no logged changes for the current {pendingCycle ? 'pending' : 'active'} cycle yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base">{entry.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(entry.createdAt), 'PPP p')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {entry.entityType.replace('_', ' ')}
                  </Badge>
                  <Badge variant={actionBadgeVariant(entry.action)} className="capitalize">
                    {entry.action}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {entry.changes.map((change, index) => (
                  <p key={`${entry.id}-${change.field}-${index}`} className="text-sm text-muted-foreground">
                    {formatChange(change)}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
