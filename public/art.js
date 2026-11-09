// The four animals: one locked drawing each (approved by Brian, 2026-11-08), the same in every theme.
// Drawn as images, so no theme stylesheet can restyle their lines or fills.
(function(){
const img=n=>'<img class="aimg aimg-'+n+'" src="/art/'+n+'.svg" alt="" aria-hidden="true" draggable="false">';
window.ART={ostrich:img('ostrich'),vulture:img('vulture'),hyena:img('hyena'),badger:img('badger')};
})();
