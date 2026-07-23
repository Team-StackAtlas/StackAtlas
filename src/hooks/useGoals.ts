import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserScope } from '../context/UserScopeContext';

/**
 * Single source for the user's goal categories. localStorage (via user scope)
 * is the always-available working set the feeds rank against; for a signed-in
 * user it also syncs to their profile so goals follow the account across
 * devices. The profile write is best-effort — if the goals column isn't there
 * yet (migration not applied), editing still works locally and simply doesn't
 * sync, so nothing breaks.
 */
export function useGoals() {
  const { scope, updateScope } = useUserScope();
  const { services, user, profile } = useAuth();
  const backed = !!(services && user);
  const reconciledFor = useRef<string | null>(null);

  // Once per signed-in profile load, reconcile local and remote goals: a
  // populated remote wins (another device set them); otherwise push any local
  // goals up so the account keeps them.
  useEffect(() => {
    if (!backed || !services || !user || !profile) return;
    if (reconciledFor.current === profile.id) return;
    reconciledFor.current = profile.id;
    const remote = profile.goals ?? [];
    if (remote.length > 0) {
      if (remote.join('|') !== scope.goals.join('|')) updateScope({ goals: remote });
    } else if (scope.goals.length > 0) {
      services.profiles.update(user.id, { goals: scope.goals }).catch(() => {});
    }
  }, [backed, services, user, profile, scope.goals, updateScope]);

  const setGoals = useCallback(
    (goals: string[]) => {
      updateScope({ goals });
      if (backed && services && user) {
        services.profiles.update(user.id, { goals }).catch(() => {});
      }
    },
    [backed, services, updateScope, user],
  );

  return { goals: scope.goals, setGoals };
}
