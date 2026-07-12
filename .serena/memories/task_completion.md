
# Task Completion Checklist

No linter, formatter, type checker, or test suite exists in this repo. "Done" means:

1. Serve locally (`python -m http.server 8080`) and manually exercise the changed flow
   in a browser (tab switching, popup open/close, login/logout, booking flow steps) —
   there is no automated way to verify UI correctness.
2. Check the browser console for JS errors.
3. No build step to run before committing.
