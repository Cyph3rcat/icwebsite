
# Tech Stack

- Plain HTML5 + CSS3 + vanilla ES6 JS. No framework, no TypeScript (despite Serena
  detecting "typescript" as the project language — that's just the JS-family parser;
  there is no `tsconfig.json` or type checking anywhere).
  No transpilation.
- No package.json, no npm dependencies, no bundler/build step.
- Fonts are self-hosted (`assets/Font/Poppin/*.ttf`, DM_Mono).
- Two independent CSS/JS pairs loaded by `index.html`: `style.css`+`main.js` (main
  page/popup) and `booking.css`+`booking.js` (booking flow), plus `assets/booking/`
  for booking-specific images.
