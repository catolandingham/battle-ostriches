// Good or bad news is judged for the player holding this phone.
// The same catch is good on the hunter's phone and bad on the ostrich's.
// Green, red, and navy are the three looks (news.css). This file does not choose new words.
(function (root) {
  function who(S) {
    S = S || {};
    const h = S.h3 || {};
    const seat = h.mySeat || S.role || '';
    const role = S.role || '';
    const kind = S.kind || h.kind || (seat === 'hyena' || seat === 'badger' ? seat : '');
    const ostrich = role === 'blue' || seat === 'blue' || seat === 'o1' || seat === 'o2';
    const vulture = role === 'red' || seat === 'red' || seat === 'v1' || seat === 'v2';
    const hunter = role === 'hunter' || seat === 'hunter' || seat === 'hyena' || seat === 'badger' || kind === 'hyena' || kind === 'badger';
    return { seat, role, kind, ostrich, vulture, hunter };
  }
  function isKind(w, name) {
    if (!name) return false;
    if (w.kind === name || w.seat === name) return true;
    if (name === 'ostrich' || name === 'blue') return w.ostrich;
    if (name === 'vulture' || name === 'red') return w.vulture;
    if (name === 'hyena' || name === 'badger') return w.kind === name || w.seat === name;
    return false;
  }
  // 'good' | 'bad' | 'plain'. A line that is not news for this phone is plain.
  function tone(text, S) {
    const raw = String(text || '').replace(/\s+/g, ' ').trim();
    if (!raw) return 'plain';
    const w = who(S);
    if (/^You smashed an egg!/.test(raw)) return 'good';
    if (/^You kicked /.test(raw)) return 'good';
    if (/^You shoved /.test(raw)) return 'good';
    if (/^You burst out /.test(raw)) return 'good';
    if (/^Your stone hit /.test(raw)) return 'good';
    if (/^Caught the /.test(raw)) return 'good';
    if (/^(Ostrich|Vulture)( \d)? knocked out!/.test(raw)) return 'good';
    if (/^You win!/.test(raw) || /^Your team wins!/.test(raw)) return 'good';
    if (/^Found egg!$/.test(raw) || /^Egg nearby!$/.test(raw) || /^Egg near$/.test(raw)) return 'good';
    if (/^Found an egg\b/.test(raw) || /^Found it\./.test(raw)) return 'good';
    if (/^Picked up a stone\./.test(raw) || /^Ate the leaf\./.test(raw)) return 'good';
    if (/^Kicked it back!/.test(raw) || /^You're on the egg!/.test(raw)) return 'good';
    if (/^Bird near\.$/.test(raw) || /^Still near\.$/.test(raw) || /^Pounce!$/.test(raw)) return 'good';
    if (/^No bird will see you dig in\./.test(raw) || raw.includes('No bird will see you dig in.')) return 'good';
    if (/^You were caught/.test(raw) || /knocked you out/.test(raw) || /^Caught!/.test(raw) || /caught you!/.test(raw)) return 'bad';
    if (/kicked you /.test(raw) || /shoved you/.test(raw) || /^A stone hit you!/.test(raw)) return 'bad';
    if (/smashed your egg!/.test(raw) || /^Vulture found your egg!/.test(raw) || /^The vulture found an egg!/.test(raw) || /^Vulture sniffed an egg\./.test(raw)) return 'bad';
    if (/^You lose\b/.test(raw) || /^You're out\./.test(raw) || /^Look out!$/.test(raw)) return 'bad';
    if (/^A bird saw you dig in\./.test(raw) || raw.includes('A bird will see you dig in.') || /^A bird will see you dig in\./.test(raw)) return 'bad';
    if (/^Hyena near!$/.test(raw) || /^Badger near!$/.test(raw)) return 'bad';
    if (/^Hungry!/.test(raw) || /^Egg cooling\./.test(raw)) return 'bad';
    if (/sees you sit/.test(raw)) return 'bad';
    if (/^It's a draw\./.test(raw) || /^It's a tie\./.test(raw)) return 'plain';
    if (/^Ostriches win!/.test(raw) || /^Ostrich wins!/.test(raw)) return w.ostrich ? 'good' : 'bad';
    if (/^Vultures win!/.test(raw) || /^Vulture wins!/.test(raw)) return w.vulture ? 'good' : 'bad';
    if (/^(The )?Hyena wins!/.test(raw)) return isKind(w, 'hyena') ? 'good' : 'bad';
    if (/^(The )?Badger wins!/.test(raw)) return isKind(w, 'badger') ? 'good' : 'bad';
    if (/^Hunter wins!/.test(raw)) return 'bad';
    const out = raw.match(/^(?:The )?(ostrich|vulture|Ostrich \d|Vulture \d) is out\./i);
    if (out) {
      const side = /ostrich/i.test(out[1]) ? 'ostrich' : 'vulture';
      if (isKind(w, side)) return 'bad';
      if (w.hunter) return 'good';
      return 'plain';
    }
    if (/^Smashed!$/.test(raw) || /^Egg smashed\./.test(raw)) return w.ostrich ? 'bad' : w.vulture ? 'good' : 'plain';
    if (/smashed an egg/i.test(raw) || /smashed .+ egg!/i.test(raw)) return w.ostrich ? 'bad' : w.vulture ? 'good' : 'plain';
    if (/^An egg went cold\./.test(raw)) return w.ostrich ? 'bad' : w.vulture ? 'good' : 'plain';
    const caught = raw.match(/^The (hyena|badger) (?:caught|knocked out) (?:the )?(ostrich|vulture|Ostrich \d|Vulture \d)/i);
    if (caught) {
      const victim = /ostrich/i.test(caught[2]) ? 'ostrich' : 'vulture';
      if (isKind(w, victim)) return 'bad';
      if (isKind(w, caught[1].toLowerCase())) return 'good';
      if (w.hunter) return 'bad';
      return 'plain';
    }
    if (/^Kick blocked\./.test(raw)) return w.ostrich ? 'bad' : 'plain';
    if (/kicked the (hyena|badger|vulture)/i.test(raw)) {
      const target = raw.match(/kicked the (hyena|badger|vulture)/i)[1].toLowerCase();
      return isKind(w, target) ? 'bad' : 'plain';
    }
    if (/kicked the stone right back!/.test(raw)) return w.ostrich ? 'good' : w.vulture ? 'bad' : 'plain';
    if (/^Boing! /.test(raw) || /^Clang! /.test(raw)) return w.vulture ? 'bad' : w.ostrich ? 'good' : 'plain';
    if (/^The stone landed softly /.test(raw) || /^The stone clattered /.test(raw)) return w.vulture ? 'bad' : 'plain';
    if (/^Your stone hit /.test(raw)) return 'good';
    const hit = raw.match(/stone hit the (hyena|badger|ostrich|vulture)/i);
    if (hit) return isKind(w, hit[1].toLowerCase()) ? 'bad' : w.vulture ? 'good' : 'plain';
    const shove = raw.match(/^The (hyena|badger) shoved the (hyena|badger)/);
    if (shove) return isKind(w, shove[2]) ? 'bad' : isKind(w, shove[1]) ? 'good' : 'plain';
    if (/The badger burst out and shoved the hyena/.test(raw)) return isKind(w, 'hyena') ? 'bad' : isKind(w, 'badger') ? 'good' : 'plain';
    if (raw === 'Badger popped up!') return (w.ostrich || w.vulture) ? 'bad' : 'plain';
    if (/^Missed\./.test(raw)) return w.ostrich ? 'good' : w.vulture ? 'bad' : 'plain';
    if (/^Miss\./.test(raw)) return w.vulture ? 'bad' : w.ostrich ? 'good' : 'plain';
    if (/^Bounced! /.test(raw)) return 'bad';
    if (raw === 'The badger dug in!' || raw === 'Nothing near.' || raw === 'No egg nearby' || raw === 'No egg') return 'plain';
    if (/^The vulture hunts eggs/.test(raw) || /^The vultures hunt eggs/.test(raw)) return 'plain';
    if (raw === 'Tap to go on.') return 'plain';
    return 'plain';
  }
  // Class added beside the element's own classes. Plain announcements keep "show" and no extra word.
  function mark(toneName) { return toneName === 'good' || toneName === 'bad' ? toneName : ''; }
  const api = { who, tone, mark };
  if (typeof module !== 'undefined') module.exports = api;
  root.News = api;
})(typeof window === 'undefined' ? globalThis : window);
