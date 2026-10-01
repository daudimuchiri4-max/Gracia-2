// Forcefully unregister any legacy service workers and clear stale caches
(function () {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (var i = 0; i < registrations.length; i++) {
        registrations[i].unregister().catch(function () {});
      }
    }).catch(function () {});
  }
  if (typeof caches !== 'undefined') {
    caches.keys().then(function (keys) {
      for (var j = 0; j < keys.length; j++) {
        caches.delete(keys[j]).catch(function () {});
      }
    }).catch(function () {});
  }
})();
