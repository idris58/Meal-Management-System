fix: auto-enable shared notice notifications

- remove shared-view notification toggle button
- add hidden auto-subscriber for shared notice push notifications
- keep browser permission handling through the existing push subscription flow

fix: require user gesture for shared notice notifications

- restore a one-way enable action for shared notice notification permission
- auto-subscribe shared viewers only after notification permission is already granted
- remove the shared notification on/off toggle behavior

fix: restore shared notice notification toggle

- restore the shared-view bell button for notification permission
- remove automatic shared notification subscription attempts
- keep shared notification subscribe and unsubscribe user-driven for installed PWAs
- record notice delivery only when matching shared push subscriptions exist

fix: preserve push subscriptions across app contexts

- make shared notification bell icon use primary color when enabled
- allow one browser push endpoint to register for both main and shared notifications
- scope push unsubscribe requests to the current notification audience
- keep browser PushManager subscriptions active when disabling one notification context
- add migration for scoped push subscription uniqueness