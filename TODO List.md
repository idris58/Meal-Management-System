fix: allow shared PWA to switch meal code

- Add a one-time switch-code flag for the shared PWA
- Prevent saved-code auto-redirect when switching codes
- Rename Change Meal Code actions to Switch Code

fix: keep shared PWA on code switch after refresh

- Preserve switch-code mode while the shared access page is open
- Prevent refresh from auto-redirecting back to the saved Meal Code
- Clear switch-code mode only after a valid new code is opened


feat: improve PWA install buttons

- Add reusable Install App button with fallback install instructions
- Show main app install action in the app header
- Show shared app install action in shared view headers
- Keep shared install action visible inside the installed main PWA
- Remove old dashboard and shared install card placements

fix: improve route-aware PWA install flow

- Track main and shared PWA install state separately
- Use the current route as the install context
- Hide install buttons after the matching app is installed
- Keep shared install available when only the main app is installed
- Remove the read-only badge from the shared header

fix: restore native PWA install button behavior

- Hide install buttons when no native install prompt is available
- Remove fallback install instruction dialog
- Trigger browser install flow directly from the install button
- Keep install buttons hidden after the matching app is installed

fix: keep iOS PWA install instructions

- Show install button on iOS without native prompt support
- Open Add to Home Screen instructions for iOS users
- Keep direct native install behavior for supported browsers
- Avoid fallback dialogs on non-iOS browsers without install prompts

fix: prevent main PWA manifest from overriding shared install

- Use a route-aware manifest link before the browser evaluates installability
- Move the main PWA manifest to a static public manifest file
- Disable Vite PWA manifest injection to avoid duplicate main manifest links
- Keep shared routes using the shared manifest when MealTrack is already installed

fix: separate main and shared PWA install scopes

- Move the main MealTrack PWA scope from root to /app
- Route authenticated main app pages through /app paths
- Redirect old main app routes to their new /app equivalents
- Keep shared routes outside the main PWA scope so shared install remains available