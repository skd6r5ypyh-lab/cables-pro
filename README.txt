CABLES PRO V1 CLICKABLE PROTOTYPE

What works
- Branded dashboard
- Add customers automatically from reports
- Full five-step alarm-service workflow
- Electrical readings and maintenance checks
- Dynamic device test schedule
- Save and reopen drafts using local device storage
- Report preview
- Print / Save as PDF
- Home-screen PWA setup when hosted over HTTPS
- Basic offline cache after first successful hosted visit

Important prototype limitations
- Data is stored only in the browser on that device.
- Clearing Safari website data will remove saved records.
- There is no secure login, cloud database, automatic email or photo upload yet.
- Signature fields are typed names in this prototype.
- The final production version should use secure hosting and a backed-up database.

Testing on a computer
1. Unzip the folder.
2. Run a local web server in the folder, for example:
   python3 -m http.server 8080
3. Open http://localhost:8080

Testing on iPhone/iPad
The folder must be uploaded to HTTPS web hosting. Then:
1. Open the web address in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Open Cables Pro from the new icon.
