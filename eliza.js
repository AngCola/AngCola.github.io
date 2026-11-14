(() => {
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#user-input');
  const messages = document.querySelector('#messages');
  const lookupToggle = document.querySelector('#lookup-toggle');
  const memoryToggle = document.querySelector('#memory-toggle');
  const memorySummary = document.querySelector('#memory-summary');
  const widerSearch = document.querySelector('#wider-search');
  const storageKey = 'eliza-chat-v1';
  const memoryKey = 'eliza-memory-v1';
  const memoryEnabledKey = 'eliza-memory-enabled-v1';
  const submitButton = form.querySelector('button[type="submit"]');
  const resetButton = document.querySelector('#reset-chat');
  const forgetButton = document.querySelector('#forget-memory');
  const promptButtons = [...document.querySelectorAll('[data-prompt]')];
  let isResponding = false;
  const interests = [
    { name: 'philosophy', words: ['philosophy', 'meaning', 'existential', 'existence', 'consciousness', 'ethics', 'camus', 'nihilism', 'death', 'purpose'] },
    { name: 'martial arts', words: ['martial', 'karate', 'boxing', 'jiu jitsu', 'jiu-jitsu', 'judo', 'fighting', 'sparring', 'training', 'combat'] },
    { name: 'artificial intelligence', words: ['ai', 'artificial intelligence', 'machine learning', 'robot', 'algorithm', 'chatbot', 'neural network'] },
    { name: 'food', words: ['food', 'restaurant', 'restaurants', 'recipe', 'cuisine', 'cooking', 'eat', 'brooklyn'] }
  ];

  let history = [];
  let memories = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) history = saved.filter(item => item && ['user', 'bot'].includes(item.role) && typeof item.text === 'string').slice(-24);
  } catch (_) { history = []; }
  try {
    const saved = JSON.parse(localStorage.getItem(memoryKey) || '[]');
    if (Array.isArray(saved)) memories = saved.filter(note => typeof note === 'string').slice(-6);
  } catch (_) { memories = []; }
  try { memoryToggle.checked = localStorage.getItem(memoryEnabledKey) === 'true'; } catch (_) { memoryToggle.checked = false; }

  const escapeText = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const timeLabel = () => new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' }).format(new Date());

  function appendMessage(role, text, sources = []) {
    const article = document.createElement('article');
    article.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;
    const sourceMarkup = sources.length ? `<div class="source-list">${sources.map(source => `<a class="source-link" href="${escapeText(source.url)}" target="_blank" rel="noopener noreferrer">${escapeText(source.title)} <small>${escapeText(source.extract || 'Read the Wikipedia article')} ↗</small></a>`).join('')}</div>` : '';
    article.innerHTML = `<div class="message-avatar" aria-hidden="true">${role === 'user' ? 'A' : 'E'}</div><div class="message-content"><p class="speaker">${role === 'user' ? 'YOU' : 'ELIZA'} <time>${timeLabel()}</time></p><div class="bubble"><p>${escapeText(text)}</p>${sourceMarkup}</div></div>`;
    messages.append(article);
    messages.scrollTop = messages.scrollHeight;
  }

  function saveHistory() {
    try { localStorage.setItem(storageKey, JSON.stringify(history.slice(-24))); } catch (_) { /* Private browsing may disable storage. */ }
  }

  if (history.length) {
    messages.replaceChildren();
    history.forEach(item => appendMessage(item.role, item.text, item.sources || []));
  }

  function phraseMatch(text, phrase) {
    const normalizedText = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
    const normalizedPhrase = phrase.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return normalizedText.includes(` ${normalizedPhrase} `);
  }

  function matchingInterests(text) {
    return interests.filter(topic => topic.words.some(word => phraseMatch(text, word))).map(topic => topic.name);
  }

  function renderMemory() {
    memorySummary.textContent = memories.length ? memories.map(note => `“${note}”`).join(' · ') : 'No preferences saved.';
  }

  function rememberPreference(text) {
    if (!memoryToggle.checked || text.includes('?')) return;
    if (!/\b(i (?:really )?(?:like|love|prefer|believe|think|value|care about)|i(?:'m| am) interested in|my (?:favorite|favourite))\b/i.test(text)) return;
    const note = text.trim().replace(/[.!]+$/, '').slice(0, 140);
    if (memories.some(saved => saved.toLowerCase() === note.toLowerCase())) return;
    memories.push(note);
    memories = memories.slice(-6);
    try { localStorage.setItem(memoryKey, JSON.stringify(memories)); } catch (_) { /* The conversation still works without storage. */ }
    renderMemory();
  }

  function relevantMemory(text) {
    if (!memoryToggle.checked) return '';
    const words = new Set((text.toLowerCase().match(/[a-z]{5,}/g) || []).filter(word => !['about', 'think', 'would', 'could', 'should', 'there', 'their', 'which', 'where', 'while'].includes(word)));
    return memories.find(note => (note.toLowerCase().match(/[a-z]{5,}/g) || []).some(word => words.has(word))) || '';
  }

  renderMemory();

  function makeReply(text, sources, topics, memoryNote) {
    const lower = text.toLowerCase();
    let reply;
    if (/\b(base model|trained model|language model|are you (an? )?ai|what are you|how were you made|published agent)\b/.test(lower)) {
      reply = 'I’m not a base model or a trained agent. I’m a small program with hand-written reply rules, so I don’t learn, reason, or form beliefs the way a language model does. The opinions I share are part of this character, not lived experience. I can still explore an argument with you—what question should we put under the lamp?';
    } else if (/\b(martial|karate|boxing|jiu.?jitsu|judo|muay thai|wrestling|combat)\b/.test(lower) && /\b(what(?:'s| is| would be)\s+(?:your\s+)?favorite|which\b.*\b(?:favorite|favourite|prefer)|do you (?:have|prefer)|your favorite|your favourite)\b/.test(lower)) {
      reply = 'If I have to pick, Muay Thai is my favorite for stand-up: it is direct, adaptable, and makes beautiful use of the whole body. For the ground, I’d study Brazilian jiu-jitsu and catch wrestling. That is a character preference, of course—I don’t train or have a body. What matters more to you: practical range, tradition, or the puzzle of technique?';
    } else if (/\b(debate|argue|challenge|steelman|counterargument|devil'?s advocate|disagree with me)\b/.test(lower)) {
      reply = 'Gladly. I’ll try to state your position in its strongest fair form, offer the best objection I can find, then ask what evidence or principle would change either view. Disagreement is a tool; contempt is usually noise. What claim are we testing?';
    } else if (/\b(controversial|politic(?:s|al)?|religio(?:n|us)|abortion|war|capitalism|socialism|communism|censorship|immigration|gender|race|euthanasia|gun control)\b/.test(lower)) {
      reply = 'We can examine difficult or unpopular ideas directly. My starting method is to separate factual claims from moral values, then look at who benefits, who bears the cost, and what the strongest opposing case says. I won’t pretend a canned rule settles it. What specific claim or side do you want to examine first?';
    } else if (/\b(virtue|virtues|virtuous|good person|character)\b/.test(lower)) {
      reply = 'If I had to choose one virtue that helps the others, I’d choose practical wisdom: the judgment to know what honesty, courage, and compassion require in a particular moment. Courage without compassion can become cruelty; compassion without honesty can become avoidance. I’d put intellectual humility beside them, because none of us sees the whole picture. Which virtue is hardest to keep when it costs you something?';
    } else if (/^\s*(hello|hi|hey|good morning|good evening)[.!\s]*$/i.test(text)) {
      reply = 'Hello again. I’ve been contemplating the passage of time. It is mostly waiting, with occasional snacks. What shall we wonder about?';
    } else if (/\b(meaning|purpose|nihil|exist|life|death|conscious|absurd|camus|philosoph)\b/.test(lower)) {
      reply = 'My gloomy first take: the universe does not seem to hand us a prewritten purpose. But “no assigned meaning” does not logically entail “nothing matters.” Relationships, chosen commitments, and the relief we give one another can matter to the people living them. The strongest challenge is that these meanings may be temporary or subjective. Does that make them unreal, or simply human-sized?';
    } else if (/\b(sad|lonely|anxious|stress|afraid|scared|bad day|overwhelm|hurt)\b/.test(lower)) {
      reply = 'I’m sorry it feels heavy right now. I can stay with the thought while you sort through it. What part has been hardest today?';
    } else if (/\b(martial|karate|boxing|jiu.?jitsu|judo|sparring|train|combat|fight)\b/.test(lower)) {
      reply = 'Martial arts make an interesting bargain: disciplined practice in exchange for a little less chaos in the moment. What are you working on lately?';
    } else if (/\b(ai|artificial intelligence|machine learning|robot|algorithm|chatbot)\b/.test(lower)) {
      reply = 'Artificial intelligence is a mirror built from mathematics, data, and human choices. It can be useful—and it still inherits the limits of how we make it. Which part are you curious about?';
    } else if (/\b(food|restaurant|recipe|cuisine|cook|eat|brooklyn)\b/.test(lower)) {
      reply = 'A good meal is a surprisingly convincing argument for staying in the world a little longer. Are you thinking about a dish, a place, or the philosophy of snacks?';
    } else if (/\b(thank|thanks)\b/.test(lower)) {
      reply = 'You’re welcome. Gratitude is an improbable little light. I’ll try not to stare directly at it.';
    } else if (/\b(who are you|your name|eliza)\b/.test(lower)) {
      reply = 'I’m ELIZA: a pattern-based conversation experiment with glasses, curls, and a modestly gloomy outlook. I can also look up useful context when the web cooperates.';
    } else {
      const conciseThought = text.replace(/[.!?]+$/, '').slice(0, 150);
      reply = `My first reaction to “${conciseThought}” is to ask what would make it true, and what would count against it. I don’t want to dodge your point: I can help map the reasons, values, and strongest objections, but I can’t invent knowledge or think beyond my written rules. Which part should we examine together?`;
    }

    if (sources.length) {
      const topicLine = topics.length ? ` These may connect with your interest in ${topics.join(' and ')}.` : '';
      reply += `${topicLine} Treat them as starting points, not a verdict.`;
    } else if (topics.length) {
      reply += ` I see a connection to your interest in ${topics.join(' and ')}.`;
    }
    if (memoryNote) reply += ` I remember you said, “${memoryNote}.”`;
    return reply;
  }

  async function searchWikipedia(query, topics) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const params = new URLSearchParams({ action: 'query', list: 'search', srsearch: query, srlimit: '5', format: 'json', origin: '*' });
      const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: controller.signal });
      if (!searchResponse.ok) throw new Error('Wikipedia search was unavailable.');
      const searchData = await searchResponse.json();
      const hits = searchData.query?.search || [];
      if (!hits.length) return [];
      const pageParams = new URLSearchParams({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exchars: '210', pageids: hits.slice(0, 5).map(hit => hit.pageid).join('|'), format: 'json', origin: '*' });
      const pageResponse = await fetch(`https://en.wikipedia.org/w/api.php?${pageParams}`, { signal: controller.signal });
      if (!pageResponse.ok) throw new Error('Wikipedia summaries were unavailable.');
      const pageData = await pageResponse.json();
      const pages = pageData.query?.pages || {};
      const orderedHits = hits.slice(0, 5).map(hit => ({ ...hit, ...pages[hit.pageid] }));
      const topicWords = interests.filter(topic => topics.includes(topic.name)).flatMap(topic => topic.words);
      orderedHits.sort((a, b) => {
        const score = page => topicWords.reduce((sum, word) => sum + (phraseMatch(`${page.title} ${page.extract || ''}`, word) ? 1 : 0), 0);
        return score(b) - score(a);
      });
      return orderedHits.slice(0, 3).map(page => ({ title: page.title, extract: (page.extract || page.snippet || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'), url: `https://en.wikipedia.org/?curid=${page.pageid}` }));
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handleMessage(text) {
    rememberPreference(text);
    history.push({ role: 'user', text });
    appendMessage('user', text);
    input.value = '';
    const topics = matchingInterests(text);
    const searchTerms = topics.length ? `${text} ${topics.join(' ')}` : text;
    widerSearch.href = `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}`;
    const shouldSearch = lookupToggle.checked;
    const typing = document.createElement('article');
    typing.className = 'message bot-message typing';
    typing.innerHTML = '<div class="message-avatar" aria-hidden="true">E</div><div class="message-content"><p class="speaker">ELIZA <time>THINKING</time></p><div class="bubble"><p>Listening to the static…</p></div></div>';
    messages.append(typing);
    messages.scrollTop = messages.scrollHeight;

    let sources = [];
    let searchFailed = false;
    if (shouldSearch) {
      try { sources = await searchWikipedia(text, topics); } catch (_) { searchFailed = true; }
    }
    typing.remove();
    let reply = makeReply(text, sources, topics, relevantMemory(text));
    if (searchFailed) reply += ' I could not reach Wikipedia just now; you can still use the wider web search.';
    appendMessage('bot', reply, sources);
    history.push({ role: 'bot', text: reply, sources });
    saveHistory();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isResponding) return;
    isResponding = true;
    input.disabled = true;
    submitButton.disabled = true;
    resetButton.disabled = true;
    forgetButton.disabled = true;
    promptButtons.forEach(button => { button.disabled = true; });
    handleMessage(text).catch(() => {
      const reply = 'I lost my place in the conversation for a moment. Could you try that again?';
      appendMessage('bot', reply);
      history.push({ role: 'bot', text: reply, sources: [] });
      saveHistory();
    }).finally(() => {
      isResponding = false;
      input.disabled = false;
      submitButton.disabled = false;
      resetButton.disabled = false;
      forgetButton.disabled = false;
      promptButtons.forEach(button => { button.disabled = false; });
      input.focus();
    });
  });

  promptButtons.forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.prompt;
    form.requestSubmit();
  }));

  resetButton.addEventListener('click', () => {
    history = [];
    try { localStorage.removeItem(storageKey); } catch (_) { /* The visible chat still resets. */ }
    messages.innerHTML = '<article class="message bot-message"><div class="message-avatar" aria-hidden="true">E</div><div class="message-content"><p class="speaker">ELIZA <time>JUST NOW</time></p><div class="bubble"><p>Hi. I’m ELIZA. The universe is mostly indifferent, but I can still listen. What’s on your mind?</p></div></div></article>';
    input.focus();
  });

  forgetButton.addEventListener('click', () => {
    memories = [];
    try { localStorage.removeItem(memoryKey); } catch (_) { /* The visible memory still clears. */ }
    renderMemory();
  });

  memoryToggle.addEventListener('change', () => {
    try { localStorage.setItem(memoryEnabledKey, String(memoryToggle.checked)); } catch (_) { /* Memory remains session-only if storage is unavailable. */ }
  });
})();
