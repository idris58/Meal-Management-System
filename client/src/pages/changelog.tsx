import { useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeal, type ChangelogAction, type ChangelogChange, type ChangelogEntityType, type ChangelogEntry } from '@/lib/meal-context';

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
  const absoluteValue = Math.abs(value).toFixed(2);
  return value < 0 ? `-৳${absoluteValue}` : `৳${absoluteValue}`;
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'string') {
    const parsedDate = parseISO(value);
    if (isValid(parsedDate) && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return format(parsedDate, 'PPP');
    }
  }

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
  if (typeof change.value === 'number' && ['amount', 'deposit_balance', 'transaction_amount'].includes(change.field)) {
    return `${change.label}: ${formatCurrency(change.value)}`;
  }

  if (
    typeof change.from === 'number' &&
    typeof change.to === 'number' &&
    ['amount', 'deposit_balance', 'transaction_amount'].includes(change.field)
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

function filterEntries(
  entries: ChangelogEntry[],
  actionFilter: ChangelogAction | 'all',
  entityFilter: ChangelogEntityType | 'all',
) {
  return entries.filter((entry) => (
    (actionFilter === 'all' || entry.action === actionFilter) &&
    (entityFilter === 'all' || entry.entityType === entityFilter)
  ));
}

function getChange(entry: ChangelogEntry, field: string) {
  return entry.changes.find((change) => change.field === field);
}

function getDisplayAction(entry: ChangelogEntry): ChangelogAction {
  return entry.entityType === 'deposit' ? 'update' : entry.action;
}

function getDisplayTitle(entry: ChangelogEntry) {
  if (entry.entityType === 'deposit') {
    const member = getChange(entry, 'member')?.value;
    return `Updated deposit for ${member ?? 'member'}`;
  }

  return entry.title;
}

function getEntrySummary(entry: ChangelogEntry) {
  if (entry.entityType === 'meal_log') {
    const dateChange = getChange(entry, 'date');
    const changedMembers = entry.changes.filter((change) => change.field.startsWith('member:')).length || 1;
    const formattedDate = dateChange ? formatValue(dateChange.value) : 'Unknown date';
    return `${formattedDate} · ${changedMembers} ${changedMembers === 1 ? 'member change' : 'member changes'}`;
  }

  if (entry.entityType === 'deposit') {
    const transactionChange = getChange(entry, 'transaction_amount') ?? getChange(entry, 'amount');
    if (transactionChange && typeof transactionChange.value === 'number') {
      const prefix = transactionChange.value < 0 ? 'Deduction' : 'Transaction';
      return `${prefix}: ${formatCurrency(transactionChange.value)}`;
    }
    return 'Deposit balance updated';
  }

  const meaningfulChanges = entry.changes.filter((change) => change.field !== 'member' && change.field !== 'members_changed');
  if (meaningfulChanges.length === 0) {
    return 'View details';
  }

  return meaningfulChanges.slice(0, 2).map((change) => formatChange(change)).join(' · ');
}

function getDetailedChanges(entry: ChangelogEntry) {
  if (entry.entityType === 'meal_log' && entry.changes.some((change) => change.field.startsWith('member:'))) {
    return [
      ...entry.changes.filter((change) => change.field === 'date'),
      ...entry.changes.filter((change) => change.field.startsWith('member:')),
    ];
  }

  if (entry.entityType === 'deposit') {
    const member = getChange(entry, 'member');
    const balance = getChange(entry, 'deposit_balance');
    const transaction = getChange(entry, 'transaction_amount') ?? getChange(entry, 'amount');
    const note = getChange(entry, 'note');

    return [
      ...(member ? [member] : []),
      ...(balance ? [balance] : []),
      ...(transaction ? [{
        ...transaction,
        field: 'transaction_amount',
        label: 'Transaction',
      }] : []),
      ...(note ? [note] : []),
    ];
  }

  return entry.changes.filter((change) => change.field !== 'members_changed');
}

function ChangelogSection({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: ChangelogEntry[];
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          No matching changelog entries in this section.
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <Collapsible key={entry.id}>
              <Card>
                <CardHeader className="gap-3 pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{getDisplayTitle(entry)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(entry.createdAt), 'PPP p')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {entry.entityType.replace('_', ' ')}
                      </Badge>
                      <Badge variant={actionBadgeVariant(getDisplayAction(entry))} className="capitalize">
                        {getDisplayAction(entry)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">{getEntrySummary(entry)}</p>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-fit gap-2 text-muted-foreground">
                        View details
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-2 border-t pt-4">
                    {getDetailedChanges(entry).map((change, index) => (
                      <p key={`${entry.id}-${change.field}-${index}`} className="text-sm text-muted-foreground">
                        {formatChange(change)}
                      </p>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ChangelogPage() {
  const { activeCycle, activeCycleChangelogEntries, pendingCycle, pendingCycleChangelogEntries } = useMeal();
  const [actionFilter, setActionFilter] = useState<ChangelogAction | 'all'>('all');
  const [entityFilter, setEntityFilter] = useState<ChangelogEntityType | 'all'>('all');

  const filteredPendingEntries = useMemo(
    () => filterEntries(pendingCycleChangelogEntries, actionFilter, entityFilter),
    [actionFilter, entityFilter, pendingCycleChangelogEntries],
  );

  const filteredActiveEntries = useMemo(
    () => filterEntries(activeCycleChangelogEntries, actionFilter, entityFilter),
    [actionFilter, activeCycleChangelogEntries, entityFilter],
  );

  const hasCycleSections = Boolean(pendingCycle || activeCycle);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">Changelog</h1>
        <p className="text-sm text-muted-foreground">
          {pendingCycle
            ? 'Track settlement changes in the pending cycle and new changes in the active cycle side by side.'
            : activeCycle
              ? 'Track create, update, and delete activity for the current active cycle.'
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

      {!hasCycleSections ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          There is no available cycle changelog yet.
        </div>
      ) : (
        <div className="space-y-4">
          {activeCycle ? (
            <ChangelogSection
              title="Active Cycle Changelog"
              description="New changes happening in the currently active cycle."
              entries={filteredActiveEntries}
            />
          ) : null}

          {pendingCycle ? (
            <ChangelogSection
              title="Pending Cycle Changelog"
              description="Settlement and correction activity for the cycle that is still pending."
              entries={filteredPendingEntries}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
