// The badger's quotes, in one place so they are easy to edit. Works in the browser (window.BadgerLines) and in Node.
// LINES holds the words. WHO says who may see each line, and why: a line about something every player can see (a catch, a walk-in, the shove,
// a pop-out in sight of a bird, the win) shows on every phone that sees that event. A line about something hidden (burrowing, staying
// burrowed, ambush sight, popping out unseen) shows only on the badger player's own phone, so it never gives away a hidden badger.
(function () {
  const LINES = {
    ambush: "Badger doesn't care.",                       // a catch on the move out of the burrow
    openCatch: "Nothing can stop the badger when it's hungry.", // a catch in the open
    walkIn: 'Thanks for the treat, stupid birds!',            // a bird walks onto the burrowed badger (after the walk-in line)
    popOut: "Look at it run in slow-motion, it's pretty badass.", // out of the burrow without a catch
    firstBurrow: 'The badger has been referred to by the Guinness Book of World Records as the most fearless animal in all of the animal kingdom.',
    rotate: ["Badger doesn't care.", 'Look at this nasty badass.'], // staying burrowed on later turns, and later burrows, taking turns
    sight: "Nothing can stop the badger when it's hungry.", // ambush sight shows a bird next to the burrow
    kicked: 'Ouch. I mean... badger doesn\'t care.',      // the ostrich kicks the badger
    shove: "Look! It's chasing a jackal! ... Badger doesn't care, it doesn't give a #$%!, it just takes what it wants.", // Hunters: the badger moves onto the hyena
    win: 'Look at this nasty badass.',                        // the badger wins the game
  };
  const WHO = { ambush: 'all', openCatch: 'all', walkIn: 'all', popOut: 'all who see it', shove: 'all', kicked: 'all', win: 'all',
    firstBurrow: 'badger', rotate: 'badger', sight: 'badger' };
  const isBadgerPlayer = S => !!(S && S.role === 'hunter' && ((S.h3 && S.h3.kind) || S.kind) === 'badger');
  // The words added after a catch by a badger, for every viewer. lc: the lastCatch from the view.
  const catchTail = lc => lc.walked ? LINES.walkIn : lc.ambush ? LINES.ambush : LINES.openCatch;
  // One per player, so the first burrow of a game gets its own line and the rotation never repeats a line twice in a row.
  const createPicker = () => ({ burrows: 0, i: 0 });
  const rotate = p => LINES.rotate[p.i++ % LINES.rotate.length];
  const sig = a => (a || []).map(q => q.p.join(',')).join('|');
  // Reads two views in a row (prev may be null) and says which lines to show. Public events come from public fields; hidden ones are only
  // looked for when this view is the badger player's own.
  function detect(prev, S, picker) {
    const out = [], h = S && S.h3; if (!prev || !h || S.phase !== 'play') return out;
    const ph = prev.h3 || {};
    if (h.rival && h.rival.by === 'badger' && (!ph.rival || ph.rival.seq !== h.rival.seq)) out.push({ event: 'shove', text: LINES.shove });
    else if (h.burst && (!ph.burst || ph.burst.seq !== h.burst.seq)) out.push({ event: 'shove', text: LINES.shove }); // bursting out from under the hyena shoves it too
    else if (h.popout && h.popout.seen && (prev.turn === 'hunter' || prev.turn === 'badger') && S.turn !== prev.turn && (!ph.popout || ph.popout.seq !== h.popout.seq)) out.push({ event: 'popOut', text: LINES.popOut });
    if (S.kick && S.kick.who === 'badger' && (!prev.kick || prev.kick.seq !== S.kick.seq)) out.push({ event: 'kicked', text: LINES.kicked });
    if (isBadgerPlayer(S) && prev.phase === 'play') {
      if (S.burrowed && !prev.burrowed) out.push(picker.burrows++ === 0 ? { event: 'firstBurrow', text: LINES.firstBurrow } : { event: 'burrow', text: rotate(picker) });
      else if (S.burrowed && prev.burrowed && prev.myTurn && !S.myTurn) out.push({ event: 'stay', text: rotate(picker) });
      if (sig(S.seenBirds) && sig(S.seenBirds) !== sig(prev.seenBirds)) out.push({ event: 'sight', text: LINES.sight });
    }
    return out;
  }
  // The win screen line: when the badger won (3 and 5 players: the hunter, if it was the badger; Hunters: the badger).
  const winLine = S => S && S.phase === 'over' && (S.winner === 'badger' || (S.winner === 'hunter' && S.h3 && S.h3.kind === 'badger')) ? LINES.win : '';
  const API = { LINES, WHO, isBadgerPlayer, catchTail, createPicker, detect, winLine };
  if (typeof module !== 'undefined') module.exports = API; else window.BadgerLines = API;
})();
