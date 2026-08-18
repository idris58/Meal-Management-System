import { useEffect, useState, type FormEvent } from 'react';
import {
  Pencil,
  X,
  Save,
  Copy,
  Check,
  RefreshCw,
  ChefHat,
  User,
  Mail,
  Link2,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { RoleBadge } from '@/components/role-badge';
import { supabase } from '@/lib/supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null): string {
  const source = name ?? email ?? '';
  const parts = source.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

// ─── Mess info types ─────────────────────────────────────────────────────────

type MessInfo = {
  id: string;
  name: string;
  invite_code: string;
};

// ─── UserProfileCard ─────────────────────────────────────────────────────────

function UserProfileCard() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [pictureUrl, setPictureUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync local state when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPictureUrl(profile.picture_url ?? '');
    }
  }, [profile]);

  const startEdit = () => {
    setFullName(profile?.full_name ?? '');
    setPictureUrl(profile?.picture_url ?? '');
    setMessage(null);
    setError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setMessage(null);
    setError(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;

    const trimName = fullName.trim();
    const trimUrl = pictureUrl.trim();

    if (!trimName) {
      setError('Full name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: trimName, picture_url: trimUrl || null, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setMessage('Profile updated successfully.');
      setIsEditing(false);
      // Fetch the updated profile via context so UI updates immediately
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile right now.');
    } finally {
      setSaving(false);
    }
  };

  const initials = getInitials(profile?.full_name, user?.email);

  if (profileLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Gradient banner */}
      <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />

      <CardHeader className="-mt-12 pb-3 pt-0 px-6">
        <div className="flex items-end justify-between gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar className="h-20 w-20 ring-4 ring-card shadow-md">
              {profile?.picture_url ? (
                <AvatarImage src={profile.picture_url} alt={profile.full_name ?? 'Avatar'} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Edit / Cancel button */}
          {!isEditing ? (
            <Button
              id="profile-edit-btn"
              variant="outline"
              size="sm"
              className="gap-2 mb-1"
              onClick={startEdit}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <Button
              id="profile-cancel-btn"
              variant="ghost"
              size="sm"
              className="gap-2 mb-1 text-muted-foreground"
              onClick={cancelEdit}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>

        {/* Name + role row */}
        <div className="mt-3 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">{profile?.full_name ?? '—'}</CardTitle>
            {profile ? <RoleBadge role={profile.role} /> : null}
          </div>
          <CardDescription className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {user?.email ?? '—'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-6 pb-6">
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-full-name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Name
              </Label>
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(null); }}
                placeholder="Enter your name"
                disabled={saving}
              />
            </div>

            {/* Picture URL */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-picture-url" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                Picture URL
              </Label>
              <Input
                id="profile-picture-url"
                value={pictureUrl}
                onChange={(e) => { setPictureUrl(e.target.value); setError(null); }}
                placeholder="https://example.com/avatar.jpg"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Paste a direct image URL. The avatar above will update after saving.
              </p>
            </div>

            {/* Live preview when url entered */}
            {pictureUrl.trim() && (
              <div className="flex items-center gap-3 rounded-lg border bg-secondary/30 p-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={pictureUrl.trim()} alt="Preview" />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">Preview of your new picture</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button id="profile-save-btn" type="submit" className="gap-2" disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save Profile'}
              </Button>
            </div>

            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </form>
        ) : (
          /* Read-only view – info rows */
          <div className="space-y-3 pt-1">
            <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile?.full_name} />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
            <InfoRow
              icon={<Link2 className="h-4 w-4" />}
              label="Picture URL"
              value={profile?.picture_url}
              placeholder="No picture URL set"
            />
            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Mess Info Card ───────────────────────────────────────────────────────────

function MessInfoCard() {
  const { profile, canManageMess } = useAuth();
  const isManager = profile?.role === 'manager';

  const [mess, setMess] = useState<MessInfo | null>(null);
  const [messLoading, setMessLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [messName, setMessName] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load mess data
  useEffect(() => {
    if (!profile?.mess_id) { setMessLoading(false); return; }
    let active = true;

    void supabase
      .from('messes')
      .select('id, name, invite_code')
      .eq('id', profile.mess_id)
      .maybeSingle()
      .then(({ data, error: fetchErr }) => {
        if (!active) return;
        if (fetchErr) console.error('Error loading mess:', fetchErr);
        setMess(data as MessInfo | null);
        setMessLoading(false);
      });

    return () => { active = false; };
  }, [profile?.mess_id]);

  if (!profile?.mess_id) return null;

  const startEdit = () => {
    setMessName(mess?.name ?? '');
    setMessage(null);
    setError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setMessage(null);
    setError(null);
  };

  const handleSaveMessName = async (e: FormEvent) => {
    e.preventDefault();
    if (!canManageMess || saving) return;
    const trimName = messName.trim();
    if (!trimName) { setError('Mess name is required.'); return; }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const { error: rpcErr } = await supabase.rpc('update_mess_settings', { mess_name: trimName });
      if (rpcErr) throw rpcErr;
      setMess((prev) => (prev ? { ...prev, name: trimName } : prev));
      setMessage('Mess name updated successfully.');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update mess name.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!canManageMess || generating) return;
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      // Generate a new 6-char alphanumeric invite code on the client
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => alphabet[b % alphabet.length])
        .join('');

      const { error: updateErr } = await supabase
        .from('messes')
        .update({ invite_code: newCode, updated_at: new Date().toISOString() })
        .eq('id', profile!.mess_id!);

      if (updateErr) throw updateErr;
      setMess((prev) => (prev ? { ...prev, invite_code: newCode } : prev));
      setMessage('New invite code generated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate a new code.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!mess?.invite_code) return;
    try {
      await navigator.clipboard.writeText(mess.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard. Copy it manually.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            <CardTitle>Mess Information</CardTitle>
          </div>

          {/* Edit / Cancel – only for managers */}
          {isManager && !messLoading && mess && (
            !isEditing ? (
              <Button
                id="mess-edit-btn"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={startEdit}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Button
                id="mess-cancel-btn"
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={cancelEdit}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            )
          )}
        </div>
        <CardDescription>
          {isManager ? 'Manager-level mess details and administration.' : 'Your mess details.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {messLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : mess ? (
          <>
            {isEditing && isManager ? (
              /* Edit form */
              <form onSubmit={handleSaveMessName} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mess-name" className="flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5" />
                    Mess Name
                  </Label>
                  <Input
                    id="mess-name"
                    value={messName}
                    onChange={(e) => { setMessName(e.target.value); setError(null); }}
                    placeholder="Enter new mess name"
                    disabled={saving}
                  />
                </div>

                <div className="flex gap-2">
                  <Button id="mess-save-btn" type="submit" className="gap-2" disabled={saving}>
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving…' : 'Save Mess Name'}
                  </Button>
                </div>
              </form>
            ) : (
              /* Read-only name row */
              <InfoRow icon={<ChefHat className="h-4 w-4" />} label="Mess Name" value={mess.name} />
            )}

            {/* Invite code – always visible, copy + generate for managers */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Invite Code</p>
              <div className="flex flex-wrap items-center gap-2">
                <code
                  id="mess-invite-code"
                  className="flex-1 rounded-lg border bg-secondary/40 px-4 py-2 font-mono text-lg font-bold tracking-[0.3em] text-primary"
                >
                  {mess.invite_code}
                </code>
                <Button
                  id="mess-copy-code-btn"
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                  title="Copy invite code"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>

                {/* Generate new code – only for managers */}
                {isManager && (
                  <Button
                    id="mess-generate-code-btn"
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleGenerateCode}
                    disabled={generating}
                    title="Generate a new invite code (old one becomes invalid)"
                  >
                    {generating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {generating ? 'Generating…' : 'New Code'}
                  </Button>
                )}
              </div>
              {isManager && (
                <p className="text-xs text-muted-foreground">
                  Generating a new code immediately invalidates the previous one.
                </p>
              )}
            </div>

            {message && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {message}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No mess information found.</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  placeholder = '—',
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-secondary/20 px-4 py-3">
      {icon ? <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span> : null}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-medium ${!value ? 'text-muted-foreground' : ''}`}>
          {value || placeholder}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div className="space-y-6 pb-20">
      <header>
        <h1 className="font-heading text-2xl font-bold">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage your personal details and mess information.
        </p>
      </header>

      <UserProfileCard />
      <MessInfoCard />
    </div>
  );
}
