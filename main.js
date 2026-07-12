var LoggedIn = false;

const machineTrainingData = {
  printer: {
    title: '3D Printing Training',
    subtitle: 'Learn how to operate 3D printer',
    photo: 'assets/photos/BambuX1_Carbon1.jpg'
  },
  laser: {
    title: 'Laser Cutter Training',
    subtitle: 'Learn how to operate Laser Cutter',
    photo: 'assets/photos/Hybrid_DualLaser2.jpg'
  },
  uv: {
    title: 'UV Printer Training',
    subtitle: 'Learn how to operate UV Printer',
    photo: 'assets/photos/Roland_VersaUV1.jpg'
  },
  scanner: {
    title: '3D Scanner Training',
    subtitle: 'Learn how to operate 3D Scanner',
    photo: 'assets/photos/EinScan_Pro_HD1.jpg'
  }
};

const tabs = document.querySelectorAll('.machine-tab');
const selector = document.querySelector('.tab-selector');
const currentActive = document.querySelector('.machine-tab.is-active');
const tabsBar = document.querySelector('.machine-tabs-bar');

function updateHeaderHeight() {
  if (!tabsBar) return;
  document.documentElement.style.setProperty('--header-h', `${tabsBar.offsetHeight}px`);
}

updateHeaderHeight();

// Preserve original CTA SVG paths so logout can restore them
const ctaPath_lg = document.querySelector('#login-btn-text-lg').getAttribute('d');
const ctaPath_sm = document.querySelector('#login-btn-text-sm').getAttribute('d');

if (LoggedIn) {
  loggedinStatus("2502838D");
}

if (currentActive) {
  moveSelectorTo(currentActive);
}

document.getElementById('login/out-btn').addEventListener('click', function () {
  if (!LoggedIn) {
    doLogin();
  } else {
    LoggedIn = false;
    loggedOutStatus();
  }
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const oldActive = document.querySelector('.machine-tab.is-active');

    if (oldActive) {
      oldActive.classList.remove('is-active');
      oldActive.setAttribute('aria-selected', 'false');
    }

    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');

    moveSelectorTo(tab);

    const target = document.getElementById(tab.dataset.target);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Big hero login button
document.querySelector('.login-img').addEventListener('click', function () {
  if (!LoggedIn) doLogin();
});

// Machine card click → show training modal if not passed
document.querySelectorAll('.machine-card-outer').forEach(cardOuter => {
  cardOuter.addEventListener('click', () => {
    const section = cardOuter.closest('.machine-section');
    if (!section) return;
    const badge = section.querySelector('.badge-training');
    if (badge && badge.classList.contains('passed')) return;
    openTrainingModal(section.id);
  });
});

// Training modal buttons
document.getElementById('training-close').addEventListener('click', closeTrainingModal);
document.getElementById('training-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeTrainingModal();
});
document.getElementById('training-login-btn').addEventListener('click', function () {
  if (!LoggedIn) doLogin();
  closeTrainingModal();
});

window.addEventListener('resize', () => {
  updateHeaderHeight();

  const activeTab = document.querySelector('.machine-tab.is-active');

  if (activeTab) {
    selector.classList.add('no-transition');
    
    moveSelectorTo(activeTab);
    
    void selector.offsetWidth; 
    
    selector.classList.remove('no-transition');
  }
});

function moveSelectorTo(activeTab) {
  if (!activeTab) return;

  const width = activeTab.offsetWidth;
  const height = activeTab.offsetHeight;
  const left = activeTab.offsetLeft;
  const top = activeTab.offsetTop;

  selector.style.width = `${width}px`;
  selector.style.height = `${height}px`;
  selector.style.left = `${left}px`;
  selector.style.top = `${top}px`;
}

function loggedinStatus(UserID) {
  const buttonText_lg = document.querySelector('#login-btn-text-lg');
  const buttonText_sm = document.querySelector('#login-btn-text-sm');
  const right_hero_animation = document.querySelector('.hero__video');
  const logout_button = document.getElementById('login/out-btn');
  const userID_field = document.getElementById('user-id');

  buttonText_lg.setAttribute('d', 'M164.5 110.872V114.94H154.024V121.384H162.052V125.38H154.024V136H148.984V110.872H164.5ZM170.63 113.68C169.742 113.68 168.998 113.404 168.398 112.852C167.822 112.276 167.534 111.568 167.534 110.728C167.534 109.888 167.822 109.192 168.398 108.64C168.998 108.064 169.742 107.776 170.63 107.776C171.518 107.776 172.25 108.064 172.826 108.64C173.426 109.192 173.726 109.888 173.726 110.728C173.726 111.568 173.426 112.276 172.826 112.852C172.25 113.404 171.518 113.68 170.63 113.68ZM173.114 116.056V136H168.074V116.056H173.114ZM189.145 115.768C191.521 115.768 193.441 116.524 194.905 118.036C196.369 119.524 197.101 121.612 197.101 124.3V136H192.061V124.984C192.061 123.4 191.665 122.188 190.873 121.348C190.081 120.484 189.001 120.052 187.633 120.052C186.241 120.052 185.137 120.484 184.321 121.348C183.529 122.188 183.133 123.4 183.133 124.984V136H178.093V116.056H183.133V118.54C183.805 117.676 184.657 117.004 185.689 116.524C186.745 116.02 187.897 115.768 189.145 115.768ZM200.598 125.956C200.598 123.94 200.994 122.152 201.786 120.592C202.602 119.032 203.706 117.832 205.098 116.992C206.49 116.152 208.038 115.732 209.742 115.732C211.038 115.732 212.274 116.02 213.45 116.596C214.626 117.148 215.562 117.892 216.258 118.828V109.36H221.37V136H216.258V133.048C215.634 134.032 214.758 134.824 213.63 135.424C212.502 136.024 211.194 136.324 209.706 136.324C208.026 136.324 206.49 135.892 205.098 135.028C203.706 134.164 202.602 132.952 201.786 131.392C200.994 129.808 200.598 127.996 200.598 125.956ZM216.294 126.028C216.294 124.804 216.054 123.76 215.574 122.896C215.094 122.008 214.446 121.336 213.63 120.88C212.814 120.4 211.938 120.16 211.002 120.16C210.066 120.16 209.202 120.388 208.41 120.844C207.618 121.3 206.97 121.972 206.466 122.86C205.986 123.724 205.746 124.756 205.746 125.956C205.746 127.156 205.986 128.212 206.466 129.124C206.97 130.012 207.618 130.696 208.41 131.176C209.226 131.656 210.09 131.896 211.002 131.896C211.938 131.896 212.814 131.668 213.63 131.212C214.446 130.732 215.094 130.06 215.574 129.196C216.054 128.308 216.294 127.252 216.294 126.028ZM254.851 110.872L246.355 127.252V136H241.315V127.252L232.783 110.872H238.471L243.871 122.356L249.235 110.872H254.851ZM266.613 136.324C264.693 136.324 262.965 135.904 261.429 135.064C259.893 134.2 258.681 132.988 257.793 131.428C256.929 129.868 256.497 128.068 256.497 126.028C256.497 123.988 256.941 122.188 257.829 120.628C258.741 119.068 259.977 117.868 261.537 117.028C263.097 116.164 264.837 115.732 266.757 115.732C268.677 115.732 270.417 116.164 271.977 117.028C273.537 117.868 274.761 119.068 275.649 120.628C276.561 122.188 277.017 123.988 277.017 126.028C277.017 128.068 276.549 129.868 275.613 131.428C274.701 132.988 273.453 134.2 271.869 135.064C270.309 135.904 268.557 136.324 266.613 136.324ZM266.613 131.932C267.525 131.932 268.377 131.716 269.169 131.284C269.985 130.828 270.633 130.156 271.113 129.268C271.593 128.38 271.833 127.3 271.833 126.028C271.833 124.132 271.329 122.68 270.321 121.672C269.337 120.64 268.125 120.124 266.685 120.124C265.245 120.124 264.033 120.64 263.049 121.672C262.089 122.68 261.609 124.132 261.609 126.028C261.609 127.924 262.077 129.388 263.013 130.42C263.973 131.428 265.173 131.932 266.613 131.932ZM299.542 116.056V136H294.466V133.48C293.818 134.344 292.966 135.028 291.91 135.532C290.878 136.012 289.75 136.252 288.526 136.252C286.966 136.252 285.586 135.928 284.386 135.28C283.186 134.608 282.238 133.636 281.542 132.364C280.87 131.068 280.534 129.532 280.534 127.756V116.056H285.574V127.036C285.574 128.62 285.97 129.844 286.762 130.708C287.554 131.548 288.634 131.968 290.002 131.968C291.394 131.968 292.486 131.548 293.278 130.708C294.07 129.844 294.466 128.62 294.466 127.036V116.056H299.542ZM309.555 119.152C310.203 118.096 311.043 117.268 312.075 116.668C313.131 116.068 314.331 115.768 315.675 115.768V121.06H314.343C312.759 121.06 311.559 121.432 310.743 122.176C309.951 122.92 309.555 124.216 309.555 126.064V136H304.515V116.056H309.555V119.152ZM336.324 136.252C334.572 136.252 332.988 135.952 331.572 135.352C330.18 134.752 329.076 133.888 328.26 132.76C327.444 131.632 327.024 130.3 327 128.764H332.4C332.472 129.796 332.832 130.612 333.48 131.212C334.152 131.812 335.064 132.112 336.216 132.112C337.392 132.112 338.316 131.836 338.988 131.284C339.66 130.708 339.996 129.964 339.996 129.052C339.996 128.308 339.768 127.696 339.312 127.216C338.856 126.736 338.28 126.364 337.584 126.1C336.912 125.812 335.976 125.5 334.776 125.164C333.144 124.684 331.812 124.216 330.78 123.76C329.772 123.28 328.896 122.572 328.152 121.636C327.432 120.676 327.072 119.404 327.072 117.82C327.072 116.332 327.444 115.036 328.188 113.932C328.932 112.828 329.976 111.988 331.32 111.412C332.664 110.812 334.2 110.512 335.928 110.512C338.52 110.512 340.62 111.148 342.228 112.42C343.86 113.668 344.76 115.42 344.928 117.676H339.384C339.336 116.812 338.964 116.104 338.268 115.552C337.596 114.976 336.696 114.688 335.568 114.688C334.584 114.688 333.792 114.94 333.192 115.444C332.616 115.948 332.328 116.68 332.328 117.64C332.328 118.312 332.544 118.876 332.976 119.332C333.432 119.764 333.984 120.124 334.632 120.412C335.304 120.676 336.24 120.988 337.44 121.348C339.072 121.828 340.404 122.308 341.436 122.788C342.468 123.268 343.356 123.988 344.1 124.948C344.844 125.908 345.216 127.168 345.216 128.728C345.216 130.072 344.868 131.32 344.172 132.472C343.476 133.624 342.456 134.548 341.112 135.244C339.768 135.916 338.172 136.252 336.324 136.252ZM368.126 125.596C368.126 126.316 368.078 126.964 367.982 127.54H353.402C353.522 128.98 354.026 130.108 354.914 130.924C355.802 131.74 356.894 132.148 358.19 132.148C360.062 132.148 361.394 131.344 362.186 129.736H367.622C367.046 131.656 365.942 133.24 364.31 134.488C362.678 135.712 360.674 136.324 358.298 136.324C356.378 136.324 354.65 135.904 353.114 135.064C351.602 134.2 350.414 132.988 349.55 131.428C348.71 129.868 348.29 128.068 348.29 126.028C348.29 123.964 348.71 122.152 349.55 120.592C350.39 119.032 351.566 117.832 353.078 116.992C354.59 116.152 356.33 115.732 358.298 115.732C360.194 115.732 361.886 116.14 363.374 116.956C364.886 117.772 366.05 118.936 366.866 120.448C367.706 121.936 368.126 123.652 368.126 125.596ZM362.906 124.156C362.882 122.86 362.414 121.828 361.502 121.06C360.59 120.268 359.474 119.872 358.154 119.872C356.906 119.872 355.85 120.256 354.986 121.024C354.146 121.768 353.63 122.812 353.438 124.156H362.906ZM376.844 119.152C377.492 118.096 378.332 117.268 379.364 116.668C380.42 116.068 381.62 115.768 382.964 115.768V121.06H381.632C380.048 121.06 378.848 121.432 378.032 122.176C377.24 122.92 376.844 124.216 376.844 126.064V136H371.804V116.056H376.844V119.152ZM394.675 131.356L399.715 116.056H405.079L397.699 136H391.579L384.235 116.056H389.635L394.675 131.356ZM410.466 113.68C409.578 113.68 408.834 113.404 408.234 112.852C407.658 112.276 407.37 111.568 407.37 110.728C407.37 109.888 407.658 109.192 408.234 108.64C408.834 108.064 409.578 107.776 410.466 107.776C411.354 107.776 412.086 108.064 412.662 108.64C413.262 109.192 413.562 109.888 413.562 110.728C413.562 111.568 413.262 112.276 412.662 112.852C412.086 113.404 411.354 113.68 410.466 113.68ZM412.95 116.056V136H407.91V116.056H412.95ZM416.633 126.028C416.633 123.964 417.053 122.164 417.893 120.628C418.733 119.068 419.897 117.868 421.385 117.028C422.873 116.164 424.577 115.732 426.497 115.732C428.969 115.732 431.009 116.356 432.617 117.604C434.249 118.828 435.341 120.556 435.893 122.788H430.457C430.169 121.924 429.677 121.252 428.981 120.772C428.309 120.268 427.469 120.016 426.461 120.016C425.021 120.016 423.881 120.544 423.041 121.6C422.201 122.632 421.781 124.108 421.781 126.028C421.781 127.924 422.201 129.4 423.041 130.456C423.881 131.488 425.021 132.004 426.461 132.004C428.501 132.004 429.833 131.092 430.457 129.268H435.893C435.341 131.428 434.249 133.144 432.617 134.416C430.985 135.688 428.945 136.324 426.497 136.324C424.577 136.324 422.873 135.904 421.385 135.064C419.897 134.2 418.733 133 417.893 131.464C417.053 129.904 416.633 128.092 416.633 126.028ZM458.126 125.596C458.126 126.316 458.078 126.964 457.982 127.54H443.402C443.522 128.98 444.026 130.108 444.914 130.924C445.802 131.74 446.894 132.148 448.19 132.148C450.062 132.148 451.394 131.344 452.186 129.736H457.622C457.046 131.656 455.942 133.24 454.31 134.488C452.678 135.712 450.674 136.324 448.298 136.324C446.378 136.324 444.65 135.904 443.114 135.064C441.602 134.2 440.414 132.988 439.55 131.428C438.71 129.868 438.29 128.068 438.29 126.028C438.29 123.964 438.71 122.152 439.55 120.592C440.39 119.032 441.566 117.832 443.078 116.992C444.59 116.152 446.33 115.732 448.298 115.732C450.194 115.732 451.886 116.14 453.374 116.956C454.886 117.772 456.05 118.936 456.866 120.448C457.706 121.936 458.126 123.652 458.126 125.596ZM452.906 124.156C452.882 122.86 452.414 121.828 451.502 121.06C450.59 120.268 449.474 119.872 448.154 119.872C446.906 119.872 445.85 120.256 444.986 121.024C444.146 121.768 443.63 122.812 443.438 124.156H452.906Z');
  buttonText_sm.setAttribute('d', 'M150.028 153.917V158.81H155.362V160.385H150.028V165.425H155.992V167H148.117V152.342H155.992V153.917H150.028ZM164.89 167L162.16 162.716L159.535 167H157.54L161.257 161.288L157.54 155.492H159.703L162.433 159.755L165.037 155.492H167.032L163.336 161.183L167.053 167H164.89ZM170.843 157.613C171.221 156.955 171.781 156.409 172.523 155.975C173.279 155.527 174.154 155.303 175.148 155.303C176.17 155.303 177.094 155.548 177.92 156.038C178.76 156.528 179.418 157.221 179.894 158.117C180.37 158.999 180.608 160.028 180.608 161.204C180.608 162.366 180.37 163.402 179.894 164.312C179.418 165.222 178.76 165.929 177.92 166.433C177.094 166.937 176.17 167.189 175.148 167.189C174.168 167.189 173.3 166.972 172.544 166.538C171.802 166.09 171.235 165.537 170.843 164.879V172.46H168.932V155.492H170.843V157.613ZM178.655 161.204C178.655 160.336 178.48 159.58 178.13 158.936C177.78 158.292 177.304 157.802 176.702 157.466C176.114 157.13 175.463 156.962 174.749 156.962C174.049 156.962 173.398 157.137 172.796 157.487C172.208 157.823 171.732 158.32 171.368 158.978C171.018 159.622 170.843 160.371 170.843 161.225C170.843 162.093 171.018 162.856 171.368 163.514C171.732 164.158 172.208 164.655 172.796 165.005C173.398 165.341 174.049 165.509 174.749 165.509C175.463 165.509 176.114 165.341 176.702 165.005C177.304 164.655 177.78 164.158 178.13 163.514C178.48 162.856 178.655 162.086 178.655 161.204ZM185.035 151.46V167H183.124V151.46H185.035ZM193.311 167.189C192.233 167.189 191.253 166.944 190.371 166.454C189.503 165.964 188.817 165.271 188.313 164.375C187.823 163.465 187.578 162.415 187.578 161.225C187.578 160.049 187.83 159.013 188.334 158.117C188.852 157.207 189.552 156.514 190.434 156.038C191.316 155.548 192.303 155.303 193.395 155.303C194.487 155.303 195.474 155.548 196.356 156.038C197.238 156.514 197.931 157.2 198.435 158.096C198.953 158.992 199.212 160.035 199.212 161.225C199.212 162.415 198.946 163.465 198.414 164.375C197.896 165.271 197.189 165.964 196.293 166.454C195.397 166.944 194.403 167.189 193.311 167.189ZM193.311 165.509C193.997 165.509 194.641 165.348 195.243 165.026C195.845 164.704 196.328 164.221 196.692 163.577C197.07 162.933 197.259 162.149 197.259 161.225C197.259 160.301 197.077 159.517 196.713 158.873C196.349 158.229 195.873 157.753 195.285 157.445C194.697 157.123 194.06 156.962 193.374 156.962C192.674 156.962 192.03 157.123 191.442 157.445C190.868 157.753 190.406 158.229 190.056 158.873C189.706 159.517 189.531 160.301 189.531 161.225C189.531 162.163 189.699 162.954 190.035 163.598C190.385 164.242 190.847 164.725 191.421 165.047C191.995 165.355 192.625 165.509 193.311 165.509ZM203.635 157.361C203.971 156.703 204.447 156.192 205.063 155.828C205.693 155.464 206.456 155.282 207.352 155.282V157.256H206.848C204.706 157.256 203.635 158.418 203.635 160.742V167H201.724V155.492H203.635V157.361ZM210.545 153.623C210.181 153.623 209.873 153.497 209.621 153.245C209.369 152.993 209.243 152.685 209.243 152.321C209.243 151.957 209.369 151.649 209.621 151.397C209.873 151.145 210.181 151.019 210.545 151.019C210.895 151.019 211.189 151.145 211.427 151.397C211.679 151.649 211.805 151.957 211.805 152.321C211.805 152.685 211.679 152.993 211.427 153.245C211.189 153.497 210.895 153.623 210.545 153.623ZM211.469 155.492V167H209.558V155.492H211.469ZM220.333 155.282C221.733 155.282 222.867 155.709 223.735 156.563C224.603 157.403 225.037 158.621 225.037 160.217V167H223.147V160.49C223.147 159.342 222.86 158.467 222.286 157.865C221.712 157.249 220.928 156.941 219.934 156.941C218.926 156.941 218.121 157.256 217.519 157.886C216.931 158.516 216.637 159.433 216.637 160.637V167H214.726V155.492H216.637V157.13C217.015 156.542 217.526 156.087 218.17 155.765C218.828 155.443 219.549 155.282 220.333 155.282ZM232.905 155.303C233.899 155.303 234.767 155.52 235.509 155.954C236.265 156.388 236.825 156.934 237.189 157.592V155.492H239.121V167.252C239.121 168.302 238.897 169.233 238.449 170.045C238.001 170.871 237.357 171.515 236.517 171.977C235.691 172.439 234.725 172.67 233.619 172.67C232.107 172.67 230.847 172.313 229.839 171.599C228.831 170.885 228.236 169.912 228.054 168.68H229.944C230.154 169.38 230.588 169.94 231.246 170.36C231.904 170.794 232.695 171.011 233.619 171.011C234.669 171.011 235.523 170.682 236.181 170.024C236.853 169.366 237.189 168.442 237.189 167.252V164.837C236.811 165.509 236.251 166.069 235.509 166.517C234.767 166.965 233.899 167.189 232.905 167.189C231.883 167.189 230.952 166.937 230.112 166.433C229.286 165.929 228.635 165.222 228.159 164.312C227.683 163.402 227.445 162.366 227.445 161.204C227.445 160.028 227.683 158.999 228.159 158.117C228.635 157.221 229.286 156.528 230.112 156.038C230.952 155.548 231.883 155.303 232.905 155.303ZM237.189 161.225C237.189 160.357 237.014 159.601 236.664 158.957C236.314 158.313 235.838 157.823 235.236 157.487C234.648 157.137 233.997 156.962 233.283 156.962C232.569 156.962 231.918 157.13 231.33 157.466C230.742 157.802 230.273 158.292 229.923 158.936C229.573 159.58 229.398 160.336 229.398 161.204C229.398 162.086 229.573 162.856 229.923 163.514C230.273 164.158 230.742 164.655 231.33 165.005C231.918 165.341 232.569 165.509 233.283 165.509C233.997 165.509 234.648 165.341 235.236 165.005C235.838 164.655 236.314 164.158 236.664 163.514C237.014 162.856 237.189 162.093 237.189 161.225ZM250.28 157.067V163.85C250.28 164.41 250.399 164.809 250.637 165.047C250.875 165.271 251.288 165.383 251.876 165.383H253.283V167H251.561C250.497 167 249.699 166.755 249.167 166.265C248.635 165.775 248.369 164.97 248.369 163.85V157.067H246.878V155.492H248.369V152.594H250.28V155.492H253.283V157.067H250.28ZM261.31 155.282C262.178 155.282 262.962 155.471 263.662 155.849C264.362 156.213 264.908 156.766 265.3 157.508C265.706 158.25 265.909 159.153 265.909 160.217V167H264.019V160.49C264.019 159.342 263.732 158.467 263.158 157.865C262.584 157.249 261.8 156.941 260.806 156.941C259.798 156.941 258.993 157.256 258.391 157.886C257.803 158.516 257.509 159.433 257.509 160.637V167H255.598V151.46H257.509V157.13C257.887 156.542 258.405 156.087 259.063 155.765C259.735 155.443 260.484 155.282 261.31 155.282ZM279.531 160.805C279.531 161.169 279.51 161.554 279.468 161.96H270.27C270.34 163.094 270.725 163.983 271.425 164.627C272.139 165.257 273 165.572 274.008 165.572C274.834 165.572 275.52 165.383 276.066 165.005C276.626 164.613 277.018 164.095 277.242 163.451H279.3C278.992 164.557 278.376 165.46 277.452 166.16C276.528 166.846 275.38 167.189 274.008 167.189C272.916 167.189 271.936 166.944 271.068 166.454C270.214 165.964 269.542 165.271 269.052 164.375C268.562 163.465 268.317 162.415 268.317 161.225C268.317 160.035 268.555 158.992 269.031 158.096C269.507 157.2 270.172 156.514 271.026 156.038C271.894 155.548 272.888 155.303 274.008 155.303C275.1 155.303 276.066 155.541 276.906 156.017C277.746 156.493 278.39 157.151 278.838 157.991C279.3 158.817 279.531 159.755 279.531 160.805ZM277.557 160.406C277.557 159.678 277.396 159.055 277.074 158.537C276.752 158.005 276.311 157.606 275.751 157.34C275.205 157.06 274.596 156.92 273.924 156.92C272.958 156.92 272.132 157.228 271.446 157.844C270.774 158.46 270.389 159.314 270.291 160.406H277.557ZM301.491 155.282C302.387 155.282 303.185 155.471 303.885 155.849C304.585 156.213 305.138 156.766 305.544 157.508C305.95 158.25 306.153 159.153 306.153 160.217V167H304.263V160.49C304.263 159.342 303.976 158.467 303.402 157.865C302.842 157.249 302.079 156.941 301.113 156.941C300.119 156.941 299.328 157.263 298.74 157.907C298.152 158.537 297.858 159.454 297.858 160.658V167H295.968V160.49C295.968 159.342 295.681 158.467 295.107 157.865C294.547 157.249 293.784 156.941 292.818 156.941C291.824 156.941 291.033 157.263 290.445 157.907C289.857 158.537 289.563 159.454 289.563 160.658V167H287.652V155.492H289.563V157.151C289.941 156.549 290.445 156.087 291.075 155.765C291.719 155.443 292.426 155.282 293.196 155.282C294.162 155.282 295.016 155.499 295.758 155.933C296.5 156.367 297.053 157.004 297.417 157.844C297.739 157.032 298.271 156.402 299.013 155.954C299.755 155.506 300.581 155.282 301.491 155.282ZM308.574 161.204C308.574 160.028 308.812 158.999 309.288 158.117C309.764 157.221 310.415 156.528 311.241 156.038C312.081 155.548 313.012 155.303 314.034 155.303C315.042 155.303 315.917 155.52 316.659 155.954C317.401 156.388 317.954 156.934 318.318 157.592V155.492H320.25V167H318.318V164.858C317.94 165.53 317.373 166.09 316.617 166.538C315.875 166.972 315.007 167.189 314.013 167.189C312.991 167.189 312.067 166.937 311.241 166.433C310.415 165.929 309.764 165.222 309.288 164.312C308.812 163.402 308.574 162.366 308.574 161.204ZM318.318 161.225C318.318 160.357 318.143 159.601 317.793 158.957C317.443 158.313 316.967 157.823 316.365 157.487C315.777 157.137 315.126 156.962 314.412 156.962C313.698 156.962 313.047 157.13 312.459 157.466C311.871 157.802 311.402 158.292 311.052 158.936C310.702 159.58 310.527 160.336 310.527 161.204C310.527 162.086 310.702 162.856 311.052 163.514C311.402 164.158 311.871 164.655 312.459 165.005C313.047 165.341 313.698 165.509 314.412 165.509C315.126 165.509 315.777 165.341 316.365 165.005C316.967 164.655 317.443 164.158 317.793 163.514C318.143 162.856 318.318 162.093 318.318 161.225ZM322.765 161.225C322.765 160.035 323.003 158.999 323.479 158.117C323.955 157.221 324.613 156.528 325.453 156.038C326.307 155.548 327.28 155.303 328.372 155.303C329.786 155.303 330.948 155.646 331.858 156.332C332.782 157.018 333.391 157.97 333.685 159.188H331.627C331.431 158.488 331.046 157.935 330.472 157.529C329.912 157.123 329.212 156.92 328.372 156.92C327.28 156.92 326.398 157.298 325.726 158.054C325.054 158.796 324.718 159.853 324.718 161.225C324.718 162.611 325.054 163.682 325.726 164.438C326.398 165.194 327.28 165.572 328.372 165.572C329.212 165.572 329.912 165.376 330.472 164.984C331.032 164.592 331.417 164.032 331.627 163.304H333.685C333.377 164.48 332.761 165.425 331.837 166.139C330.913 166.839 329.758 167.189 328.372 167.189C327.28 167.189 326.307 166.944 325.453 166.454C324.613 165.964 323.955 165.271 323.479 164.375C323.003 163.479 322.765 162.429 322.765 161.225ZM341.947 155.282C342.815 155.282 343.599 155.471 344.299 155.849C344.999 156.213 345.545 156.766 345.937 157.508C346.343 158.25 346.546 159.153 346.546 160.217V167H344.656V160.49C344.656 159.342 344.369 158.467 343.795 157.865C343.221 157.249 342.437 156.941 341.443 156.941C340.435 156.941 339.63 157.256 339.028 157.886C338.44 158.516 338.146 159.433 338.146 160.637V167H336.235V151.46H338.146V157.13C338.524 156.542 339.042 156.087 339.7 155.765C340.372 155.443 341.121 155.282 341.947 155.282ZM350.655 153.623C350.291 153.623 349.983 153.497 349.731 153.245C349.479 152.993 349.353 152.685 349.353 152.321C349.353 151.957 349.479 151.649 349.731 151.397C349.983 151.145 350.291 151.019 350.655 151.019C351.005 151.019 351.299 151.145 351.537 151.397C351.789 151.649 351.915 151.957 351.915 152.321C351.915 152.685 351.789 152.993 351.537 153.245C351.299 153.497 351.005 153.623 350.655 153.623ZM351.579 155.492V167H349.668V155.492H351.579ZM360.443 155.282C361.843 155.282 362.977 155.709 363.845 156.563C364.713 157.403 365.147 158.621 365.147 160.217V167H363.257V160.49C363.257 159.342 362.97 158.467 362.396 157.865C361.822 157.249 361.038 156.941 360.044 156.941C359.036 156.941 358.231 157.256 357.629 157.886C357.041 158.516 356.747 159.433 356.747 160.637V167H354.836V155.492H356.747V157.13C357.125 156.542 357.636 156.087 358.28 155.765C358.938 155.443 359.659 155.282 360.443 155.282ZM378.768 160.805C378.768 161.169 378.747 161.554 378.705 161.96H369.507C369.577 163.094 369.962 163.983 370.662 164.627C371.376 165.257 372.237 165.572 373.245 165.572C374.071 165.572 374.757 165.383 375.303 165.005C375.863 164.613 376.255 164.095 376.479 163.451H378.537C378.229 164.557 377.613 165.46 376.689 166.16C375.765 166.846 374.617 167.189 373.245 167.189C372.153 167.189 371.173 166.944 370.305 166.454C369.451 165.964 368.779 165.271 368.289 164.375C367.799 163.465 367.554 162.415 367.554 161.225C367.554 160.035 367.792 158.992 368.268 158.096C368.744 157.2 369.409 156.514 370.263 156.038C371.131 155.548 372.125 155.303 373.245 155.303C374.337 155.303 375.303 155.541 376.143 156.017C376.983 156.493 377.627 157.151 378.075 157.991C378.537 158.817 378.768 159.755 378.768 160.805ZM376.794 160.406C376.794 159.678 376.633 159.055 376.311 158.537C375.989 158.005 375.548 157.606 374.988 157.34C374.442 157.06 373.833 156.92 373.161 156.92C372.195 156.92 371.369 157.228 370.683 157.844C370.011 158.46 369.626 159.314 369.528 160.406H376.794Z');

  right_hero_animation.src = "assets/Video/Dynamic_Info/Logined_Animation/video_dynamicinfo_2.webm";
  right_hero_animation.load();
  right_hero_animation.play();

  userID_field.innerText = UserID;
  logout_button.innerText = "Logout";
  logout_button.classList.remove("login");
  logout_button.classList.add("logout");
}

function loggedOutStatus() {
  const buttonText_lg = document.querySelector('#login-btn-text-lg');
  const buttonText_sm = document.querySelector('#login-btn-text-sm');
  const right_hero_animation = document.querySelector('.hero__video');
  const logout_button = document.getElementById('login/out-btn');
  const userID_field = document.getElementById('user-id');

  buttonText_lg.setAttribute('d', ctaPath_lg);
  buttonText_sm.setAttribute('d', ctaPath_sm);

  right_hero_animation.src = "assets/Video/Dynamic_Info/notLogin_Animation/video_dynamicinfo_1.webm";
  right_hero_animation.load();
  right_hero_animation.play().catch(() => {});

  userID_field.innerText = '';
  logout_button.innerText = "Login";
  logout_button.classList.remove("logout");
  logout_button.classList.add("login");

  document.querySelectorAll('.badge-training').forEach(badge => {
    badge.textContent = 'Training Required ⓘ';
    badge.classList.remove('passed', 'notpass');
  });

  if (typeof bkOnLogout === 'function') bkOnLogout();
}

function doLogin() {
  LoggedIn = true;
  loggedinStatus("2502838D");
  document.querySelectorAll('.badge-training').forEach(badge => {
    badge.textContent = 'Training Required ⓘ';
    badge.classList.remove('passed', 'notpass');
  });
  setTimeout(setDemoTrainingStatus, 1500);
}

function setDemoTrainingStatus() {
  const demoStatus = {
    printer: { text: 'Training Passed ✓',   cls: 'passed'  },
    laser:   { text: 'Training Passed ✓',   cls: 'passed'  },
    uv:      { text: 'Training Required ✗', cls: 'notpass' },
    scanner: { text: 'Training Required ✗', cls: 'notpass' },
  };
  Object.entries(demoStatus).forEach(([id, s]) => {
    const badge = document.querySelector(`#${id} .badge-training`);
    if (!badge) return;
    badge.textContent = s.text;
    badge.classList.remove('passed', 'notpass');
    badge.classList.add(s.cls);
  });
}

function openTrainingModal(machineId) {
  if (!LoggedIn) return; // training card is only shown to logged-in users
  const data = machineTrainingData[machineId];
  if (!data) return;
  document.getElementById('training-title').textContent = data.title;
  document.getElementById('training-subtitle').textContent = data.subtitle;
  document.getElementById('training-photo').src = data.photo;
  document.getElementById('training-photo').alt = data.title;
  const loginBlock = document.getElementById('training-login-btn').closest('.training-card__block');
  if (loginBlock) loginBlock.style.display = LoggedIn ? 'none' : '';
  const overlay = document.getElementById('training-overlay');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeTrainingModal() {
  const overlay = document.getElementById('training-overlay');
  overlay.classList.remove('is-open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ============================================================
   MACHINE DETAIL POPUP
============================================================ */

const MPOP_ICON = 'assets/Icon/Machine Feature/';
const MPOP_FEATURE_BG = [
  'assets/popup/feature/bambu_feature_1.jpg',
  'assets/popup/feature/bambu_feature_2.jpg',
  'assets/popup/feature/bambu_feature_3.jpg',
  'assets/popup/feature/bambu_feature_4.jpg',
];

/* Reminder / What-to-prepare / FAQ are shared by both 3D printers (Figma "Machine Details") */
const MPOP_PRINTER_COMMON = {
  chips: [
    { label: 'Training Required ⓘ', cls: 'red'  },
    { label: 'Self-Service',        cls: 'blue' },
  ],
  reminders: [
    { icon: MPOP_ICON + 'Orientation.svg',   title: 'Model orientation',
      desc: 'Models should not overlap with each other and properly oriented.' },
    { icon: MPOP_ICON + 'Close_surface.svg', title: 'Closed surface model',
      desc: 'Only closed-surface models can be printed.' },
    { icon: MPOP_ICON + 'Allowance.svg',     title: 'Model size allowance 1mm',
      desc: 'The final printed outcome may be reduced by up to 1 mm.' },
  ],
  prepare: [
    { icon: MPOP_ICON + 'STL_file.svg', label: 'STL file' },
    { icon: MPOP_ICON + 'USB.svg',      label: 'Personal USB drive' },
    { icon: MPOP_ICON + 'Cash.svg',     label: 'Cash or<br>Octopus Card' },
  ],
  faqs: [
    { q: 'What file format do I need?',
      a: 'Export your 3D model as an STL file. The file must be a closed surface (watertight) to print successfully. You can use software like SolidWorks, Fusion 360, or Tinkercad.' },
    { q: 'Can I print overnight?',
      a: 'Only the last booking session of the day (starting at 4:30 PM) allows for overnight printing.' },
    { q: 'What if my booking overruns?',
      a: 'If your print is not finished when your session ends and another user has booked the next slot, staff and student assistant may remove your print from the machine. Please choose a booking time that fits your estimated print duration.' },
    { q: 'What if my print fails?',
      a: 'You are responsible for the material cost even if the print fails. If you want to try again, please make a new booking.' },
    { q: 'Will staff help me?',
      a: 'The 3D printers are self-service. Maker Lab staff and student assistant are available to assist with machine issues and safety.' },
  ],
};

const machineDetailData = {
  bambu: {
    name: 'Bambu X1 Carbon',
    price: { val: '$0.2', unit: '/g' },
    specs: [
      { icon: MPOP_ICON + 'size.svg',      label: 'Maximum print size', val: '256 x 256 x 256 mm' },
      { icon: MPOP_ICON + 'Material.svg',  label: 'Material',           val: 'Thermoplastics (PLA, PLA+)' },
      { icon: MPOP_ICON + 'Thickness.svg', label: 'Layer thickness',    val: '0.2 mm (default)' },
    ],
    tags: ['Multi-colour', 'High quality'],
    carousel: [
      'assets/popup/carousel/bambu_cover1.jpg',
      'assets/photos/BambuX1_Carbon1.jpg',
      'assets/photos/BambuX1_Carbon_hover.jpg',
    ],
    features: [
      { bg: MPOP_FEATURE_BG[0], icon: MPOP_ICON + 'size.svg',
        title: 'Maximum size',
        desc: 'Able to print models up to <b>256 × 256 × 256 mm</b>' },
      { bg: MPOP_FEATURE_BG[1], icon: MPOP_ICON + 'Bambu.svg',
        title: 'Software Support<br><span class="sub">Bambu Studio</span>',
        desc: 'Able to print models up to <b>256 × 256 × 256 mm</b>' },
      { bg: MPOP_FEATURE_BG[2], icon: MPOP_ICON + 'Material.svg',
        title: 'Different material',
        desc: 'Can print solid and flexible materials such as <b>PLA and other plastics</b>' },
      { bg: MPOP_FEATURE_BG[3], icon: MPOP_ICON + 'Colour.svg',
        title: 'Prints in<br>Different colours',
        desc: '<b>Black, Gray</b>, and <b>White</b> filament are provided. <b>consult the staff in W301 for other colour printing.</b>' },
    ],
    samples: [
      { img: 'assets/popup/sample-work/bambu_sample_1.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
      { img: 'assets/popup/sample-work/bambu_sample_2.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
      { img: 'assets/popup/sample-work/bambu_sample_3.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
    ],
    priceSection: {
      headline: 'HKD $0.2', unit: '/g',
      desc: 'Actual price is based on the slicing result (including support material)',
    },
    ...MPOP_PRINTER_COMMON,
  },
  creality: {
    name: 'Creality Sermoon V1 Pro',
    price: { val: '$0.2', unit: '/g' },
    specs: [
      { icon: MPOP_ICON + 'size.svg',      label: 'Maximum print size', val: '300 x 300 x 300 mm' },
      { icon: MPOP_ICON + 'Material.svg',  label: 'Material',           val: 'Thermoplastics (PLA, PETG)' },
      { icon: MPOP_ICON + 'Thickness.svg', label: 'Layer thickness',    val: '0.2 mm (default)' },
    ],
    tags: ['Fast', 'Single-colour', 'Large Printing'],
    carousel: [
      'assets/photos/Creality_K1_Max1.jpg',
      'assets/popup/carousel/creality_k1max_2.jpg',
      'assets/popup/carousel/creality_k1max_3.jpg',
    ],
    features: [
      { bg: MPOP_FEATURE_BG[0], icon: MPOP_ICON + 'size.svg',
        title: 'Maximum size',
        desc: 'Able to print models up to <b>300 × 300 × 300 mm</b>' },
      { bg: MPOP_FEATURE_BG[1], icon: MPOP_ICON + 'Creality_print.svg',
        title: 'Software Support<br><span class="sub">Creality Print</span>',
        desc: 'Prepare and slice your models with <b>Creality Print</b>' },
      { bg: MPOP_FEATURE_BG[2], icon: MPOP_ICON + 'Material.svg',
        title: 'Different material',
        desc: 'Can print solid materials such as <b>PLA and PETG plastics</b>' },
      { bg: MPOP_FEATURE_BG[3], icon: MPOP_ICON + 'Direct_print.svg',
        title: 'Fast printing',
        desc: 'High-speed printing for <b>large single-colour models</b>' },
    ],
    samples: [
      { img: 'assets/popup/sample-work/creality_sample_1.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
      { img: 'assets/popup/sample-work/creality_sample_2.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
      { img: 'assets/popup/sample-work/creality_sample_3.jpg', time: '3h 30m', weight: '61g', cost: '12.2' },
    ],
    priceSection: {
      headline: 'HKD $0.2', unit: '/g',
      desc: 'Actual price is based on the slicing result (including support material)',
    },
    ...MPOP_PRINTER_COMMON,
  },
};

let currentMachineKey = 'bambu';
let currentSlide = 0;

function openMachinePopup(machineKey) {
  currentMachineKey = machineKey || 'bambu';
  currentSlide = 0;
  renderMachinePopup(currentMachineKey);
  updateBooknowButton();

  const overlay = document.getElementById('machine-popup');
  overlay.classList.remove('is-closing');
  overlay.classList.add('is-open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  requestAnimationFrame(positionTabIndicator);
}

function closeMachinePopup() {
  const overlay = document.getElementById('machine-popup');
  overlay.classList.add('is-closing');
  overlay.setAttribute('aria-hidden', 'true');
  setTimeout(() => {
    overlay.classList.remove('is-open', 'is-closing');
    document.body.style.overflow = '';
  }, 340);
}

function renderMachinePopup(key) {
  const data = machineDetailData[key];
  if (!data) return;

  document.getElementById('mpopup-machine-title').textContent = data.name;

  // Intro chips + price tab
  document.getElementById('mpopup-chips').innerHTML = data.chips.map(c =>
    `<span class="mpop-intro-chip mpop-intro-chip--${c.cls}">${c.label}</span>`
  ).join('');
  document.getElementById('mpopup-price-badge').innerHTML =
    `<span class="val">${data.price.val}</span><span class="unit">${data.price.unit}</span>`;

  // Carousel slides
  const track = document.getElementById('mpopup-carousel-track');
  track.innerHTML = data.carousel.map(src =>
    `<div class="mpop-carousel-slide"><img src="${src}" alt="${data.name}"></div>`
  ).join('');
  track.style.transform = 'translateX(0)';

  // Dots
  const dotsEl = document.getElementById('mpopup-dots');
  dotsEl.innerHTML = data.carousel.map((_, i) =>
    `<button class="mpop-carousel-dot${i === 0 ? ' is-active' : ''}" data-idx="${i}" aria-label="Slide ${i + 1}"></button>`
  ).join('');
  dotsEl.querySelectorAll('.mpop-carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(+dot.dataset.idx));
  });

  // Specs
  document.getElementById('mpopup-spec-list').innerHTML = data.specs.map(s =>
    `<div class="mpop-spec-row">
      <img class="mpop-spec-icon" src="${s.icon}" alt="">
      <div class="mpop-spec-text">
        <p class="mpop-spec-label">${s.label}</p>
        <p class="mpop-spec-val">${s.val}</p>
      </div>
    </div>`
  ).join('');

  // "What can it do?" tags
  document.getElementById('mpopup-tag-list').innerHTML = data.tags.map(t =>
    `<span class="mpop-tag">${t}</span>`
  ).join('');

  // Feature cards (2x2)
  document.getElementById('mpopup-features-grid').innerHTML = data.features.map(f =>
    `<div class="mpop-feature-card">
      <div class="mpop-feature-card-bg" style="background-image:url('${f.bg}')"></div>
      <img class="mpop-feature-icon" src="${f.icon}" alt="">
      <div class="mpop-feature-text">
        <p class="mpop-feature-title">${f.title}</p>
        <p class="mpop-feature-desc">${f.desc}</p>
      </div>
    </div>`
  ).join('');

  // Samples
  document.getElementById('mpopup-samples-row').innerHTML = data.samples.map(s =>
    `<div class="mpop-sample-card">
      <img src="${s.img}" alt="Sample work" loading="lazy">
      <div class="mpop-sample-meta">
        <span class="mpop-sample-chip"><span class="mpop-chip-ico mpop-chip-ico--time"></span>${s.time}</span>
        <span class="mpop-sample-chip"><span class="mpop-chip-ico mpop-chip-ico--weight"></span>${s.weight}</span>
        <span class="mpop-sample-chip"><span class="mpop-chip-dollar">$</span>${s.cost}</span>
      </div>
    </div>`
  ).join('');

  // Price section
  document.getElementById('mpopup-price-headline').innerHTML =
    `<span class="val">${data.priceSection.headline}</span><span class="unit">${data.priceSection.unit}</span>`;
  document.getElementById('mpopup-price-desc').textContent = data.priceSection.desc;

  // Reminder cards
  document.getElementById('mpopup-reminder-row').innerHTML = data.reminders.map(r =>
    `<div class="mpop-reminder-card">
      <img class="mpop-reminder-icon" src="${r.icon}" alt="">
      <div class="mpop-reminder-text">
        <p class="mpop-reminder-title">${r.title}</p>
        <p class="mpop-reminder-desc">${r.desc}</p>
      </div>
    </div>`
  ).join('');

  // What to prepare cards
  document.getElementById('mpopup-prepare-row').innerHTML = data.prepare.map(p =>
    `<div class="mpop-prepare-card">
      <img class="mpop-prepare-icon" src="${p.icon}" alt="">
      <p class="mpop-prepare-label">${p.label}</p>
    </div>`
  ).join('');

  // FAQ
  document.getElementById('mpopup-faq-list').innerHTML = data.faqs.map(f =>
    `<div class="mpop-faq-item">
      <p class="mpop-faq-q">${f.q}</p>
      <hr class="mpop-faq-line">
      <p class="mpop-faq-a">${f.a}</p>
    </div>`
  ).join('');

  // Reset scroll and slide
  const scrollport = document.getElementById('mpopup-scrollport');
  if (scrollport) scrollport.scrollTop = 0;
  setActiveSideBtn(mpopSideBtns[0]); // back at the top, so About is in view

  // Sync active tab
  document.querySelectorAll('.mpop-tab').forEach(tab => {
    tab.classList.toggle('is-active', tab.dataset.machine === key);
  });
}

function goToSlide(idx) {
  const data = machineDetailData[currentMachineKey];
  if (!data) return;
  currentSlide = Math.max(0, Math.min(idx, data.carousel.length - 1));
  const track = document.getElementById('mpopup-carousel-track');
  if (track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
  document.querySelectorAll('.mpop-carousel-dot').forEach((d, i) =>
    d.classList.toggle('is-active', i === currentSlide)
  );
}

function positionTabIndicator() {
  const activeTab = document.querySelector('.mpop-tab.is-active');
  const indicator = document.querySelector('.mpop-tab-indicator');
  if (!activeTab || !indicator) return;
  indicator.style.left  = activeTab.offsetLeft + 'px';
  indicator.style.width = activeTab.offsetWidth + 'px';
}

// Close button
function updateBooknowButton() {
  const btn = document.getElementById('mpopup-booknow');
  btn.classList.toggle('is-login', !LoggedIn);
  btn.setAttribute('aria-label', LoggedIn ? 'Book Now' : 'Login to book');
}

document.getElementById('mpopup-booknow').addEventListener('click', function () {
  if (!LoggedIn) {
    doLogin();
    updateBooknowButton();
    return;
  }
  // Booking flow implemented for Bambu X1 only so far (see booking.js)
  if (typeof openBookingFlow === 'function' && currentMachineKey === 'bambu') {
    closeMachinePopup();
    openBookingFlow(currentMachineKey);
  }
});

document.getElementById('mpopup-close').addEventListener('click', closeMachinePopup);

// Click outside popup to close
document.getElementById('machine-popup').addEventListener('click', function (e) {
  if (e.target === this) closeMachinePopup();
});

// Tab switcher
document.querySelectorAll('.mpop-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.machine === currentMachineKey) return;
    currentMachineKey = tab.dataset.machine;
    renderMachinePopup(currentMachineKey);
    requestAnimationFrame(positionTabIndicator);
  });
});

// Carousel arrows
document.getElementById('mpopup-prev').addEventListener('click', () => goToSlide(currentSlide - 1));
document.getElementById('mpopup-next').addEventListener('click', () => goToSlide(currentSlide + 1));

// Sidebar nav: click scrolls to the section; the button whose section is
// currently in view stays extended (is-active), like a real tab.
const mpopSideBtns = Array.from(document.querySelectorAll('.mpop-side-btn[data-scroll-to]'));
let mpopSideNavLocked = false; // suppress scrollspy while a click's smooth scroll runs

function setActiveSideBtn(activeBtn) {
  mpopSideBtns.forEach(b => b.classList.toggle('is-active', b === activeBtn));
}

// The reading line matches where the click handler parks each section:
// the card's resting content top (margin-top clears the topbar zone +
// overlay padding, padding-top gives the title breathing room below it).
function mpopSectionGap(card) {
  const cardStyle = getComputedStyle(card);
  return (parseFloat(cardStyle.marginTop) || 0) + (parseFloat(cardStyle.paddingTop) || 0);
}

function updateSideNav() {
  if (mpopSideNavLocked) return;
  const scrollport = document.getElementById('mpopup-scrollport');
  const card = document.getElementById('mpopup-card');
  if (!scrollport || !card) return;
  const portTop = scrollport.getBoundingClientRect().top;
  const line = scrollport.scrollTop + mpopSectionGap(card) + 1;
  let active = mpopSideBtns[0];
  mpopSideBtns.forEach(btn => {
    const target = document.getElementById(btn.dataset.scrollTo);
    if (!target) return;
    const top = target.getBoundingClientRect().top - portTop + scrollport.scrollTop;
    if (top <= line) active = btn;
  });
  // Bottomed out: the last section wins even if too short to reach the line
  if (scrollport.scrollTop + scrollport.clientHeight >= scrollport.scrollHeight - 2) {
    active = mpopSideBtns[mpopSideBtns.length - 1];
  }
  setActiveSideBtn(active);
}

document.getElementById('mpopup-scrollport').addEventListener('scroll', updateSideNav, { passive: true });

mpopSideBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.scrollTo);
    const scrollport = document.getElementById('mpopup-scrollport');
    const card = document.getElementById('mpopup-card');
    if (!target || !scrollport || !card) return;
    // Stop short of the section so its title isn't flush with the card top
    const gap = mpopSectionGap(card);
    const top = target.getBoundingClientRect().top - scrollport.getBoundingClientRect().top + scrollport.scrollTop - gap;
    setActiveSideBtn(btn);
    mpopSideNavLocked = true;
    scrollport.addEventListener('scrollend', () => { mpopSideNavLocked = false; }, { once: true });
    setTimeout(() => { mpopSideNavLocked = false; }, 1200); // in case scrollend never fires
    scrollport.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  });
});

// Override machine card click: 3D Printer cards open popup; others keep training modal
document.querySelectorAll('.machine-card-outer').forEach(cardOuter => {
  // Remove existing listeners by cloning
  const clone = cardOuter.cloneNode(true);
  cardOuter.parentNode.replaceChild(clone, cardOuter);
});

document.querySelectorAll('.machine-card-outer').forEach(cardOuter => {
  cardOuter.addEventListener('click', () => {
    const machineKey = cardOuter.dataset.machine;
    if (machineKey && machineDetailData[machineKey]) {
      openMachinePopup(machineKey);
      return;
    }
    const section = cardOuter.closest('.machine-section');
    if (!section) return;
    const badge = section.querySelector('.badge-training');
    if (badge && badge.classList.contains('passed')) return;
    openTrainingModal(section.id);
  });
});
