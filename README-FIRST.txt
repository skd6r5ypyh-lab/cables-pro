CABLES PRO 3.1.1 — CONTINUE BUTTON REPAIR

This repair addresses the fault where tapping Continue on page one did nothing.

CHANGES
- Rebuilt the page-navigation handler
- Added a second event-listener fallback for iPhone Safari
- Removed a possible browser variable-name collision
- Replaced compatibility-sensitive JavaScript
- Added safer local-storage recovery
- Added visible error reporting instead of silent failure
- Changed the service-worker cache version

UPLOAD
1. Extract this ZIP.
2. Replace the seven current files in the root of the GitHub repository.
3. Commit the changes.
4. Wait around one minute for GitHub Pages.

IMPORTANT IPHONE REFRESH
1. Remove the Cables Pro icon from the Home Screen.
2. Open the GitHub Pages address in Safari.
3. Refresh twice.
4. Add it to the Home Screen again.
5. If the old version remains:
   Settings > Safari > Advanced > Website Data
   Remove the GitHub Pages site entry, then reopen the website.

TEST
Open Alarm Service, enter a customer name, and press Continue.
The second section should be System Details.
