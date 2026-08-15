// Voyager au Japon — logique de navigation (onglets, menu mobile, accordéon natif)

/* ==========================================================================
   Contrôle plein écran Leaflet (ex Control.FullScreen.js)
   Basé sur le paquet 'screenfull' — v5.2.0 — (c) Sindre Sorhus — Licence MIT
   ========================================================================== */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define('screenfull', factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports.screenfull = factory();
	} else {
		root.screenfull = factory();
	}
}(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var document = typeof window !== 'undefined' && typeof window.document !== 'undefined' ? window.document : {};

	var fn = (function () {
		var val;

		var fnMap = [
			[
				'requestFullscreen',
				'exitFullscreen',
				'fullscreenElement',
				'fullscreenEnabled',
				'fullscreenchange',
				'fullscreenerror'
			],
			[
				'webkitRequestFullscreen',
				'webkitExitFullscreen',
				'webkitFullscreenElement',
				'webkitFullscreenEnabled',
				'webkitfullscreenchange',
				'webkitfullscreenerror'
			],
			[
				'webkitRequestFullScreen',
				'webkitCancelFullScreen',
				'webkitCurrentFullScreenElement',
				'webkitCancelFullScreen',
				'webkitfullscreenchange',
				'webkitfullscreenerror'
			],
			[
				'mozRequestFullScreen',
				'mozCancelFullScreen',
				'mozFullScreenElement',
				'mozFullScreenEnabled',
				'mozfullscreenchange',
				'mozfullscreenerror'
			],
			[
				'msRequestFullscreen',
				'msExitFullscreen',
				'msFullscreenElement',
				'msFullscreenEnabled',
				'MSFullscreenChange',
				'MSFullscreenError'
			]
		];

		var i = 0;
		var l = fnMap.length;
		var ret = {};

		for (; i < l; i++) {
			val = fnMap[i];
			if (val && val[1] in document) {
				for (i = 0; i < val.length; i++) {
					ret[fnMap[0][i]] = val[i];
				}
				return ret;
			}
		}

		return false;
	})();

	var eventNameMap = {
		change: fn.fullscreenchange,
		error: fn.fullscreenerror
	};

	var screenfull = {
		request: function (element, options) {
			return new Promise(function (resolve, reject) {
				var onFullScreenEntered = function () {
					this.off('change', onFullScreenEntered);
					resolve();
				}.bind(this);

				this.on('change', onFullScreenEntered);

				element = element || document.documentElement;

				var returnPromise = element[fn.requestFullscreen](options);

				if (returnPromise instanceof Promise) {
					returnPromise.then(onFullScreenEntered).catch(reject);
				}
			}.bind(this));
		},
		exit: function () {
			return new Promise(function (resolve, reject) {
				if (!this.isFullscreen) {
					resolve();
					return;
				}

				var onFullScreenExit = function () {
					this.off('change', onFullScreenExit);
					resolve();
				}.bind(this);

				this.on('change', onFullScreenExit);

				var returnPromise = document[fn.exitFullscreen]();

				if (returnPromise instanceof Promise) {
					returnPromise.then(onFullScreenExit).catch(reject);
				}
			}.bind(this));
		},
		toggle: function (element, options) {
			return this.isFullscreen ? this.exit() : this.request(element, options);
		},
		onchange: function (callback) {
			this.on('change', callback);
		},
		onerror: function (callback) {
			this.on('error', callback);
		},
		on: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.addEventListener(eventName, callback, false);
			}
		},
		off: function (event, callback) {
			var eventName = eventNameMap[event];
			if (eventName) {
				document.removeEventListener(eventName, callback, false);
			}
		},
		raw: fn
	};

	if (!fn) {
		return { isEnabled: false };
	} else {
		Object.defineProperties(screenfull, {
			isFullscreen: {
				get: function () {
					return Boolean(document[fn.fullscreenElement]);
				}
			},
			element: {
				enumerable: true,
				get: function () {
					return document[fn.fullscreenElement];
				}
			},
			isEnabled: {
				enumerable: true,
				get: function () {
					return Boolean(document[fn.fullscreenEnabled]);
				}
			}
		});
		return screenfull;
	}
}));

(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define('leafletFullScreen', ['leaflet', 'screenfull'], factory);
	} else if (typeof module === 'object' && module.exports) {
		module.exports = factory(require('leaflet'), require('screenfull'));
	} else {
		factory(root.L, root.screenfull);
	}
}(typeof self !== 'undefined' ? self : this, function (leaflet, screenfull) {
	'use strict';

	leaflet.Control.FullScreen = leaflet.Control.extend({
		options: {
			position: 'topleft',
			title: 'Full Screen',
			titleCancel: 'Exit Full Screen',
			forceSeparateButton: false,
			forcePseudoFullscreen: false,
			fullscreenElement: false
		},

		_screenfull: screenfull,

		onAdd: function (map) {
			var className = 'leaflet-control-zoom-fullscreen', container, content = '';

			if (map.zoomControl && !this.options.forceSeparateButton) {
				container = map.zoomControl._container;
			} else {
				container = leaflet.DomUtil.create('div', 'leaflet-bar');
			}

			if (this.options.content) {
				content = this.options.content;
			} else {
				className += ' fullscreen-icon';
			}

			this._createButton(this.options.title, className, content, container, this.toggleFullScreen, this);
			this._map.fullscreenControl = this;

			this._map.on('enterFullscreen exitFullscreen', this._toggleState, this);

			return container;
		},

		onRemove: function () {
			leaflet.DomEvent
				.off(this.link, 'click', leaflet.DomEvent.stop)
				.off(this.link, 'click', this.toggleFullScreen, this);

			if (this._screenfull.isEnabled) {
				leaflet.DomEvent
					.off(this._container, this._screenfull.raw.fullscreenchange, leaflet.DomEvent.stop)
					.off(this._container, this._screenfull.raw.fullscreenchange, this._handleFullscreenChange, this);

				leaflet.DomEvent
					.off(document, this._screenfull.raw.fullscreenchange, leaflet.DomEvent.stop)
					.off(document, this._screenfull.raw.fullscreenchange, this._handleFullscreenChange, this);
			}
		},

		_createButton: function (title, className, content, container, fn, context) {
			this.link = leaflet.DomUtil.create('a', className, container);
			this.link.href = '#';
			this.link.title = title;
			this.link.innerHTML = content;

			this.link.setAttribute('role', 'button');
			this.link.setAttribute('aria-label', title);

			L.DomEvent.disableClickPropagation(container);

			leaflet.DomEvent
				.on(this.link, 'click', leaflet.DomEvent.stop)
				.on(this.link, 'click', fn, context);

			if (this._screenfull.isEnabled) {
				leaflet.DomEvent
					.on(container, this._screenfull.raw.fullscreenchange, leaflet.DomEvent.stop)
					.on(container, this._screenfull.raw.fullscreenchange, this._handleFullscreenChange, context);

				leaflet.DomEvent
					.on(document, this._screenfull.raw.fullscreenchange, leaflet.DomEvent.stop)
					.on(document, this._screenfull.raw.fullscreenchange, this._handleFullscreenChange, context);
			}

			return this.link;
		},

		toggleFullScreen: function () {
			var map = this._map;
			map._exitFired = false;
			if (map._isFullscreen) {
				if (this._screenfull.isEnabled && !this.options.forcePseudoFullscreen) {
					this._screenfull.exit();
				} else {
					leaflet.DomUtil.removeClass(this.options.fullscreenElement ? this.options.fullscreenElement : map._container, 'leaflet-pseudo-fullscreen');
					map.invalidateSize();
				}
				map.fire('exitFullscreen');
				map._exitFired = true;
				map._isFullscreen = false;
			}
			else {
				if (this._screenfull.isEnabled && !this.options.forcePseudoFullscreen) {
					this._screenfull.request(this.options.fullscreenElement ? this.options.fullscreenElement : map._container);
				} else {
					leaflet.DomUtil.addClass(this.options.fullscreenElement ? this.options.fullscreenElement : map._container, 'leaflet-pseudo-fullscreen');
					map.invalidateSize();
				}
				map.fire('enterFullscreen');
				map._isFullscreen = true;
			}
		},

		_toggleState: function () {
			this.link.title = this._map._isFullscreen ? this.options.title : this.options.titleCancel;
			this._map._isFullscreen ? L.DomUtil.removeClass(this.link, 'leaflet-fullscreen-on') : L.DomUtil.addClass(this.link, 'leaflet-fullscreen-on');
		},

		_handleFullscreenChange: function () {
			var map = this._map;
			map.invalidateSize();
			if (!this._screenfull.isFullscreen && !map._exitFired) {
				map.fire('exitFullscreen');
				map._exitFired = true;
				map._isFullscreen = false;
			}
		}
	});

	leaflet.Map.include({
		toggleFullscreen: function () {
			this.fullscreenControl.toggleFullScreen();
		}
	});

	leaflet.Map.addInitHook(function () {
		if (this.options.fullscreenControl) {
			this.addControl(leaflet.control.fullscreen(this.options.fullscreenControlOptions));
		}
	});

	leaflet.control.fullscreen = function (options) {
		return new leaflet.Control.FullScreen(options);
	};

	return { leaflet: leaflet, screenfull: screenfull };
}));

/* ==========================================================================
   Application
   ========================================================================== */
(function () {
	'use strict';

	const navToggle = document.getElementById('navToggle');
	const siteNav = document.getElementById('siteNav');
	const navLinks = document.querySelectorAll('[data-tab]');
	const panels = document.querySelectorAll('[data-panel]');
	const homeHaikuSlot = document.getElementById('homeHaikuSlot');
	const footerHaikuSlot = document.getElementById('footerHaikuSlot');
	const haikuEl = document.getElementById('haiku');

	const openMenu = () => {
		siteNav.classList.add('is-open');
		navToggle.setAttribute('aria-expanded', 'true');
	};

	const closeMenu = () => {
		siteNav.classList.remove('is-open');
		navToggle.setAttribute('aria-expanded', 'false');
	};

	navToggle.addEventListener('click', () => {
		if (siteNav.classList.contains('is-open')) {
			closeMenu();
		} else {
			openMenu();
		}
	});

	// ferme le menu mobile si on clique en dehors
	document.addEventListener('click', (event) => {
		if (!siteNav.classList.contains('is-open')) return;
		if (siteNav.contains(event.target) || navToggle.contains(event.target)) return;
		closeMenu();
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeMenu();
	});

	// carte topographique (Leaflet) : créée une seule fois, à l'activation de l'onglet
	let topoMap = null;
	const initTopoMap = () => {
		if (topoMap) return;
		topoMap = L.map('topoMap', { fullscreenControl: true, fullscreenControlOptions: { position: 'topleft' } }).fitWorld();
		L.tileLayer('https://maps.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: '<a href="http://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院タイル</a>'
		}).addTo(topoMap);
		topoMap.locate({ setView: true, maxZoom: 18 });
		topoMap.on('locationfound', (e) => {
			const radius = e.accuracy;
			L.marker(e.latlng).addTo(topoMap).bindPopup('You are within ' + radius + ' meters from this point').openPopup();
			L.circle(e.latlng, radius).addTo(topoMap);
		});
		topoMap.on('locationerror', (e) => {
			alert(e.message);
		});
	};

	const activateTab = (tabId) => {
		panels.forEach((panel) => {
			const isActive = panel.id === tabId;
			panel.hidden = !isActive;
			if (isActive) {
				// ne charge la carte (et ne déclenche la géolocalisation) qu'à l'activation de l'onglet
				const lazyIframe = panel.querySelector('iframe[data-src]');
				if (lazyIframe) {
					lazyIframe.src = lazyIframe.dataset.src;
					lazyIframe.removeAttribute('data-src');
				}
			}
		});
		if (tabId === 'topo') initTopoMap();
		navLinks.forEach((link) => {
			link.setAttribute('aria-selected', link.getAttribute('data-tab') === tabId ? 'true' : 'false');
		});
		// le haïku vit dans l'accueil tant qu'aucun onglet n'est actif, sinon en pied de page
		(tabId === 'home' ? homeHaikuSlot : footerHaikuSlot).appendChild(haikuEl);
	};


	navLinks.forEach((link) => {
		link.addEventListener('click', () => {
			activateTab(link.getAttribute('data-tab'));
			closeMenu();
		});
	});

	// aucun onglet actif par défaut : page d'accueil avec haïku centré
	activateTab('home');

	// installation du service worker pour le mode hors-ligne / PWA
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('sw.js').catch(() => {});
		});
	}
})();
