
# Suggested Commands (Windows)

No build/test/lint tooling exists. Just serve statically:

```
python -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080/index.html`. Opening `index.html` directly via
`file://` mostly works but can break asset-relative loading in some browsers — prefer
the local server.

Shell in this environment is PowerShell (`powershell.exe`) — use `Get-ChildItem`/`ls`,
`Select-String` instead of `grep`, etc. Bash tool (git-bash/POSIX) is also available for
unix-style one-liners (e.g. `wc -l`).
