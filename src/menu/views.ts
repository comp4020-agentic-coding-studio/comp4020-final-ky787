/** Small application views. Interactions and persistence remain owned by the game. */
const escape = (value: string): string => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

const back = '<button id="back-main" class="menu-back" type="button"><span aria-hidden="true">←</span> Back</button>';
const destination = (label: string, title: string, description: string, content: string, className = ''): string => `
    <section class="menu-destination ${className}" aria-labelledby="destination-title">
        ${back}<div class="destination-heading"><span class="eyebrow">BINARY NINJA / ${label}</span>
        <h2 id="destination-title">${title}</h2><p>${description}</p></div>${content}
    </section>`;

export function homeMenu(continueLabel?: string): string {
    return `<section class="home-shell" aria-labelledby="home-title">
        <div class="home-topline"><span class="home-wordmark"><b aria-hidden="true">BN<span>_</span></b> COOPERATIVE PLATFORM PUZZLES</span><span class="home-signal"><i></i> SYSTEM READY</span></div>
        <div class="home-layout"><div class="home-copy">
            <div class="home-heading"><span class="eyebrow">FIND YOUR WAY THROUGH THE CODE</span>
            <h1 id="home-title">BINARY<br><span>NINJA</span><i aria-hidden="true">_</i></h1>
            <p>Read the room. Make the connection.</p></div>
            <nav class="home-nav" aria-label="Main menu">
                <button id="tutorial" class="home-action home-primary" type="button"><span class="home-action-number" aria-hidden="true">01</span><span>Tutorial<small>Learn the moves · solo</small></span><b aria-hidden="true">↗</b></button>
                <button id="play-coop" class="home-action" type="button"><span class="home-action-number" aria-hidden="true">02</span><span>Play Co-op<small>Two ninjas. One way out.</small></span><b aria-hidden="true">→</b></button>
                <button id="level-builder" class="home-action" type="button"><span class="home-action-number" aria-hidden="true">03</span><span>Level Builder</span><b aria-hidden="true">→</b></button>
                <button id="customize-ninja" class="home-action" type="button"><span class="home-action-number" aria-hidden="true">04</span><span>Customize Ninja</span><b aria-hidden="true">→</b></button>
                <button id="about" class="home-action" type="button"><span class="home-action-number" aria-hidden="true">05</span><span>About</span><b aria-hidden="true">→</b></button>
            </nav>
            <div class="home-secondary">${continueLabel ? `<button id="continue" type="button"><span>${escape(continueLabel)}</span><b aria-hidden="true"> →</b></button>` : ''}<button id="settings" type="button">Settings</button></div>
        </div>
        <figure class="home-portrait"><div class="home-orbit" aria-hidden="true"></div>
            <pre class="home-code" aria-hidden="true">; signal in the noise\n0000  move forward\n0010  find your anchor\n0020  trust your partner\n0030  make the connection</pre>
            <div class="home-portrait-label" aria-hidden="true"><span>OPERATIVE / 01</span><span>LINK ESTABLISHED ──</span></div>
            <canvas id="home-ninja-preview" role="img" aria-label="Your ninja swinging from a grapple"></canvas>
            <figcaption class="character-summary home-profile"><i aria-hidden="true"></i><strong id="home-profile-name"></strong><small id="home-profile-status">READY TO CONNECT</small></figcaption>
            <span class="home-portrait-coordinate" aria-hidden="true">X: CONNECT &nbsp; Y: EXPLORE</span>
        </figure></div>
        <div class="home-bottomline"><span>HANDCRAFTED ROOMS. SHARED DISCOVERIES.</span><span id="home-progress" role="status"></span></div>
    </section>`;
}

export function coopMenu(labsMarkup = ''): string {
    return destination('CO-OP', 'Better together.', 'A friend, a grapple, and a little coordination. Find your way through five cooperative chambers.', `
        <div class="destination-choices">
            <button id="create-party" class="destination-choice" type="button"><span class="choice-symbol" aria-hidden="true">＋</span><strong>Start Co-op</strong><span>Open a party, then invite a friend.</span><b aria-hidden="true">Create party →</b></button>
            <button id="show-join" class="destination-choice" type="button"><span class="choice-symbol" aria-hidden="true">↗</span><strong>Join Co-op</strong><span>Have an invitation or party code?</span><b aria-hidden="true">Join a friend →</b></button>
        </div><p class="destination-note">Two players · Separate browsers · Shared checkpoints</p>${labsMarkup}`, 'coop-destination');
}

export function joinMenu(): string {
    return destination('JOIN CO-OP', 'Find your partner.', 'Enter your friend’s four-character party code or paste their invitation link.', `
        <form id="join-room-form" class="join-form"><label for="join-code">PARTY CODE OR INVITATION LINK</label>
            <input id="join-code" name="code" type="text" placeholder="7K3M" autocomplete="off" autocapitalize="characters" spellcheck="false" required aria-describedby="join-error">
            <p id="join-error" role="alert" hidden></p><button id="join-room" class="primary" type="submit">Join Co-op <span aria-hidden="true">→</span></button>
        </form><p class="destination-note">Your friend can copy an invitation link from their party lobby.</p>`, 'join-destination');
}

export function builderMenu(): string {
    return destination('LEVEL BUILDER', 'Make room for ideas.', 'Build a puzzle, test the jump, and share a new challenge.', `
        <div class="destination-choices"><a id="open-workbench" class="destination-choice" href="/workbench.html"><span class="choice-symbol" aria-hidden="true">⌗</span><strong>Open Level Builder</strong><span>Place platforms, switches and machinery.</span><b aria-hidden="true">Start building →</b></a>
        <a id="my-levels" class="destination-choice" href="/my-levels.html"><span class="choice-symbol" aria-hidden="true">▤</span><strong>My Levels</strong><span>Return to your creations and shared levels.</span><b aria-hidden="true">View your levels →</b></a></div>`, 'builder-destination');
}

export function aboutMenu(): string {
    return destination('ABOUT', 'Read. Connect. Escape.', 'Binary Ninja turns the ideas of reverse engineering into handcrafted platform puzzles.', `
        <div class="about-columns"><section><h3>Every room is a conversation.</h3><p>Step on plates, power up code platforms, carry cubes and grapple across gaps. In co-op, share the work: one ninja’s action can open the other ninja’s way forward.</p>
            <h3>Look for the signal.</h3><p>Lit code is solid. Ghosted code is inactive. Aim at a powered anchor or a lit code platform’s address bar to hook it. Ordinary walls and floors are not grapple targets.</p>
            <details class="about-evidence"><summary>Behind the code</summary><p>The tutorial rooms use authored controllers. CONTROL SPINE uses retained, validated OLLVM binary evidence. Text effects and the main menu’s code-inspired decoration are authored presentation. Prototype crumble is a gameplay experiment, not evidence about a binary.</p></details></section>
        <section class="controls-guide" aria-label="Basic controls"><h3>Your controls</h3><dl><div><dt><kbd>A</kbd> <kbd>D</kbd></dt><dd>Move</dd></div><div><dt><kbd>SPACE</kbd></dt><dd>Jump; press again in mid-air to grapple. Press on a rope to jump off.</dd></div><div><dt><kbd>MOUSE</kbd></dt><dd>Aim at a grapple target</dd></div><div><dt><kbd>CLICK + HOLD</kbd></dt><dd>Grapple; release to let go</dd></div><div><dt><kbd>E</kbd></dt><dd>Carry cubes / flip switches</dd></div><div><dt><kbd>R</kbd></dt><dd>Return to checkpoint</dd></div><div><dt><kbd>TAB</kbd></dt><dd>Room overview</dd></div><div><dt><kbd>ESC</kbd></dt><dd>Pause / resume</dd></div></dl></section></div>`, 'about-destination');
}

/** These slots are application-authored controls, never profile or URL strings. */
export function settingsMenu(audioMarkup = '', resetMarkup = '', labsMarkup = ''): string {
    return destination('SETTINGS', 'Set your signal.', 'Sound and saved progress for this browser.', `<div id="settings-content">${audioMarkup}${resetMarkup}${labsMarkup}</div>`, 'settings-destination');
}

export function soloPauseMenu(roomTitle: string, audioMarkup: string, restartAllowed = true): string {
    return `<section class="menu-card pause-card" aria-labelledby="pause-title"><span class="eyebrow">TAKE A BREATHER</span><h2 id="pause-title">Paused.</h2><p class="pause-room">${escape(roomTitle)}</p><button id="continue" class="primary" type="button">Resume <span aria-hidden="true">→</span></button><div class="pause-settings">${audioMarkup}</div><button id="main-menu" type="button">Main Menu</button>${restartAllowed ? '<button id="restart-room" type="button">Restart Room</button>' : ''}<p class="pause-hint">ESC or click outside to resume</p></section>`;
}

export function connectionMenu(): string {
    return destination('PARTY CONNECTION', 'Making the connection.', 'Your ninja is on the way.', '<p id="connection-status" class="connection-status" role="status">Connecting to the party…</p><button id="retry-join" class="primary" type="button" hidden>Retry connection</button>', 'join-destination');
}
