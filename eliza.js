(() => {
  const form = document.querySelector('#chat-form');
  const input = document.querySelector('#user-input');
  const messages = document.querySelector('#messages');
  const lookupToggle = document.querySelector('#lookup-toggle');
  const widerSearch = document.querySelector('#wider-search');
  const storageKey = 'eliza-chat-v1';
  const interests = [
    { name: 'philosophy', words: ['philosophy', 'meaning', 'existential', 'existence', 'consciousness', 'ethics', 'camus', 'nihilism', 'death', 'purpose'] },
    { name: 'martial arts', words: ['martial', 'karate', 'boxing', 'jiu jitsu', 'jiu-jitsu', 'judo', 'fighting', 'sparring', 'training', 'combat'] },
    { name: 'artificial intelligence', words: ['ai', 'artificial intelligence', 'machine learning', 'robot', 'algorithm', 'chatbot', 'neural network'] },
    { name: 'food', words: ['food', 'restaurant', 'restaurants', 'recipe', 'cuisine', 'cooking', 'eat', 'brooklyn'] }
  ];

  let history = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) history = saved.filter(item => item && ['user', 'bot'].includes(item.role) && typeof item.text === 'string').slice(-24);
  } catch (_) { history = []; }

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

  function matchingInterests(text) {
    const normalized = text.toLowerCase();
    return interests.filter(topic => topic.words.some(word => normalized.includes(word))).map(topic => topic.name);
  }

  function makeReply(text, sources, topics) {
    const lower = text.toLowerCase();
    let reply;
    if (/\b(hello|hi|hey|good morning|good evening)\b/.test(lower)) {
      reply = 'Hello again. I’ve been contemplating the passage of time. It is mostly waiting, with occasional snacks. What shall we wonder about?';
    } else if (/\b(meaning|purpose|nihil|exist|life|death|conscious|absurd|camus|philosoph)\b/.test(lower)) {
      reply = 'The universe has not published an official explanation. That leaves us with the smaller, stranger work of making meaning together. What kind of meaning feels worth the effort to you?';
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
      const prompts = [
        'Tell me more about that. The universe is vague; specifics are a kindness.',
        'What do you think is underneath that thought?',
        'I hear you. What part of it has been taking up the most space in your mind?',
        'That is an intriguing thread. Where do you think it leads?',
        'The void has no comment, so I’ll ask: what would you like to happen next?'
      ];
      reply = prompts[Math.floor(Math.random() * prompts.length)];
    }

    if (sources.length) {
      const topicLine = topics.length ? ` I found a connection to your interest in ${topics.join(' and ')}.` : '';
      reply += `${topicLine} Here are a couple of starting points; the universe remains responsible for the footnotes.`;
    } else if (topics.length) {
      reply += ` I remember you’re interested in ${topics.join(' and ')}.`;
    }
    return reply;
  }

  async function searchWikipedia(query, topics) {
    const params = new URLSearchParams({ action: 'query', list: 'search', srsearch: query, srlimit: '5', format: 'json', origin: '*' });
    const searchResponse = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!searchResponse.ok) throw new Error('Wikipedia search was unavailable.');
    const searchData = await searchResponse.json();
    const hits = searchData.query?.search || [];
    if (!hits.length) return [];
    const pageParams = new URLSearchParams({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exchars: '210', pageids: hits.slice(0, 5).map(hit => hit.pageid).join('|'), format: 'json', origin: '*' });
    const pageResponse = await fetch(`https://en.wikipedia.org/w/api.php?${pageParams}`);
    if (!pageResponse.ok) throw new Error('Wikipedia summaries were unavailable.');
    const pageData = await pageResponse.json();
    const pages = pageData.query?.pages || {};
    const orderedHits = hits.slice(0, 5).map(hit => ({ ...hit, ...pages[hit.pageid] }));
    const topicWords = interests.filter(topic => topics.includes(topic.name)).flatMap(topic => topic.words);
    orderedHits.sort((a, b) => {
      const score = page => topicWords.reduce((sum, word) => sum + (`${page.title} ${page.extract || ''}`.toLowerCase().includes(word) ? 1 : 0), 0);
      return score(b) - score(a);
    });
    return orderedHits.slice(0, 3).map(page => ({ title: page.title, extract: (page.extract || page.snippet || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'), url: `https://en.wikipedia.org/?curid=${page.pageid}` }));
  }

  async function handleMessage(text) {
    history.push({ role: 'user', text });
    appendMessage('user', text);
    input.value = '';
    input.focus();
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
    const reply = makeReply(text, sources, topics);
    appendMessage('bot', reply, sources);
    if (searchFailed) {
      appendMessage('bot', 'My connection to the encyclopedia seems to have joined the void. You can still search the wider web below.');
    }
    history.push({ role: 'bot', text: reply, sources });
    saveHistory();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (text) handleMessage(text);
  });

  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
    input.value = button.dataset.prompt;
    form.requestSubmit();
  }));

  document.querySelector('#reset-chat').addEventListener('click', () => {
    history = [];
    try { localStorage.removeItem(storageKey); } catch (_) { /* The visible chat still resets. */ }
    messages.innerHTML = '<article class="message bot-message"><div class="message-avatar" aria-hidden="true">E</div><div class="message-content"><p class="speaker">ELIZA <time>JUST NOW</time></p><div class="bubble"><p>Hi. I’m ELIZA. The universe is mostly indifferent, but I can still listen. What’s on your mind?</p></div></div></article>';
    input.focus();
  });
})();
