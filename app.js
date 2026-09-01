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

	let koyoMap = null;
	const initKoyoMap = () => {
		if (koyoMap) return;
		const container = document.getElementById('kouyou-map-wrap');
		if (!container || !window.L) return;

		const points = [
			[42.94474108361818, 142.37300312436682, '赤岩青巌峡', 'https://tenki.jp/kouyou/1/1/30004.html', 'https://static.tenki.jp/static-images/kouyou/point/30004/square.jpg', '紅葉の情報：イタヤカエデ、シラカバ、タモ、ナナカマド、ナラ'],
			[42.96501930433676, 141.16258052422947, '定山渓', 'https://tenki.jp/kouyou/1/2/30005.html', 'https://static.tenki.jp/static-images/kouyou/point/30005/square.jpg', '紅葉の情報：カエデ、ナナカマド、ウルシ、サクラ、カツラ'],
			[42.7729029328937, 141.40328466318442, '支笏湖温泉', 'https://tenki.jp/kouyou/1/2/30006.html', 'https://static.tenki.jp/static-images/kouyou/point/30006/square.jpg', '紅葉の情報：ミズナラ、イタヤカエデ、ヤマモミジ、ハウチワカエデ、ナナカマド'],
			[42.87398542738479, 140.63890353741516, 'ニセコアンヌプリ', 'https://tenki.jp/kouyou/1/2/30007.html', 'https://static.tenki.jp/static-images/kouyou/point/30007/square.jpg', '紅葉の情報：ナナカマド、ダケカンバ'],
			[42.60596463180507, 139.99964678707937, '賀老高原ブナ原生林', 'https://tenki.jp/kouyou/1/2/30008.html', 'https://static.tenki.jp/static-images/kouyou/point/30008/square.jpg', '紅葉の情報：ブナ、イタヤカエデ'],
			[41.98365827876644, 140.67234054736159, '大沼国定公園', 'https://tenki.jp/kouyou/1/4/30009.html', 'https://static.tenki.jp/static-images/kouyou/point/30009/square.jpg', '紅葉の情報：カエデ、ブナ、ナラ、ウルシ、ヤマモミジ'],
			[43.7220358678659, 142.95501116546973, '層雲峡紅葉谷', 'https://tenki.jp/kouyou/1/1/30012.html', 'https://static.tenki.jp/static-images/kouyou/point/30012/square.jpg', '紅葉の情報：ハウチワカエデ、イタヤカエデ、カツラ、ナナカマド、ニレ'],
			[43.43024077135283, 144.1404159759805, '阿寒(滝見橋)', 'https://tenki.jp/kouyou/1/3/30015.html', 'https://static.tenki.jp/static-images/kouyou/point/30015/square.jpg', '紅葉の情報：モミジ、イタヤカエデ、カエデ'],
			[42.56621971301185, 140.8183303830675, '洞爺湖周辺', 'https://tenki.jp/kouyou/1/4/30018.html', 'https://static.tenki.jp/static-images/kouyou/point/30018/square.jpg', '紅葉の情報：モミジ、イチョウ、サクラ、ミズナラ、ナナカマド'],
			[42.87222415974661, 142.44368124600177, '沙流川渓谷', 'https://tenki.jp/kouyou/1/4/30019.html', 'https://static.tenki.jp/static-images/kouyou/point/30019/square.jpg', '紅葉の情報：クロビイタヤ、ヤマモミジ、ミズナラ、ナナカマド、カツラ'],
			[42.66978059733838, 143.03366969381443, '岩内仙峡', 'https://tenki.jp/kouyou/1/3/30020.html', 'https://static.tenki.jp/static-images/kouyou/point/30020/square.jpg', '紅葉の情報：ヤマモミジ、シラカバ'],
			[42.85798764762482, 140.869626431585, '京極町ふきだし公園', 'https://tenki.jp/kouyou/1/2/30022.html', 'https://static.tenki.jp/static-images/kouyou/point/30022/square.jpg', '紅葉の情報：モミジ、カエデ'],
			[42.912276644600816, 141.9693410432305, '滝の上公園', 'https://tenki.jp/kouyou/1/2/30023.html', 'https://static.tenki.jp/static-images/kouyou/point/30023/square.jpg', '紅葉の情報：ドウダンツツジ、エゾヤマツツジ、ヤシオツツジ、クロフネツツジ、トキワツツジ'],
			[43.41364907096822, 142.64285707823836, '十勝岳温泉郷', 'https://tenki.jp/kouyou/1/1/30025.html', 'https://static.tenki.jp/static-images/kouyou/point/30025/square.jpg', '紅葉の情報：ダケカンバ、ナナカマド、モミジ'],
			[43.367124395422486, 143.19809410659118, '糠平湖畔', 'https://tenki.jp/kouyou/1/3/30028.html', 'https://static.tenki.jp/static-images/kouyou/point/30028/square.jpg', '紅葉の情報：モミジ、シラカバ、ナナカマド、ナラ'],
			[42.281262717015835, 143.02128316501333, '五色渓谷', 'https://tenki.jp/kouyou/1/4/30033.html', 'https://static.tenki.jp/static-images/kouyou/point/30033/square.jpg', '紅葉の情報：ダケカンバ、モミジ、イタヤカエデ、カツラ、アサダ'],
			[44.19848830713847, 143.08551624209068, '滝上渓谷 錦仙峡', 'https://tenki.jp/kouyou/1/3/30037.html', 'https://static.tenki.jp/static-images/kouyou/point/30037/square.jpg', '紅葉の情報：ナナカマド、イタヤカエデ、ヤマモミジ'],
			[44.306477427096326, 142.18074861718216, '道立自然公園朱鞠内湖', 'https://tenki.jp/kouyou/1/1/30044.html', 'https://static.tenki.jp/static-images/kouyou/point/30044/square.jpg', '紅葉の情報：シラカバ、ナナカマド'],
			[42.974553199764856, 142.80633246791118, '日勝峠(国道274号線)', 'https://tenki.jp/kouyou/1/3/30045.html', 'https://static.tenki.jp/static-images/kouyou/point/30045/square.jpg', '紅葉の情報：イタヤカエデ、サクラ、シラカバ、ダケカンバ、ナナカマド、ウルシ'],
			[43.30448316112831, 144.59937505145197, '標茶中学校の並木道', 'https://tenki.jp/kouyou/1/3/30046.html', 'https://static.tenki.jp/static-images/kouyou/point/30046/square.jpg', '紅葉の情報：モミジ'],
			[43.52163866098442, 141.93233944387507, '北海道子どもの国', 'https://tenki.jp/kouyou/1/2/30054.html', 'https://static.tenki.jp/static-images/kouyou/point/30054/square.jpg', '紅葉の情報：ナナカマド、カラマツ、カエデ、モミジ、サクラ'],
			[43.67100982321048, 142.96066529134816, '赤岳銀泉台', 'https://tenki.jp/kouyou/1/1/30100.html', 'https://static.tenki.jp/static-images/kouyou/point/30100/square.jpg', '紅葉の情報：ウラシマツツジ、チングルマ、ダケカンバ、ナナカマド'],
			[43.710828644310276, 142.94021234483216, '黒岳', 'https://tenki.jp/kouyou/1/1/30101.html', 'https://static.tenki.jp/static-images/kouyou/point/30101/square.jpg', '紅葉の情報：ナナカマド、ウラシマツツジ、ミネカエデ、ダケカンバ'],
			[42.08178072728107, 140.54289608168978, '鳥崎渓谷', 'https://tenki.jp/kouyou/1/4/30802.html', 'https://static.tenki.jp/static-images/kouyou/point/30802/square.jpg', '紅葉の情報：カエデ、ヤマザクラ、ミズナラ、ツタウルシ'],
			[40.65047985869395, 140.8257453505614, '城ヶ倉渓流', 'https://tenki.jp/kouyou/2/5/30708.html', 'https://static.tenki.jp/static-images/kouyou/point/30708/square.jpg', '紅葉の情報：ブナ、ダケカンバ'],
			[40.680839450830234, 140.83178854105145, '八甲田', 'https://tenki.jp/kouyou/2/5/32154.html', 'https://static.tenki.jp/static-images/kouyou/point/32154/square.jpg', '紅葉の情報：ブナ、ナナカマド、カエデ、ダケカンバ'],
			[40.57460576050641, 140.97861781473725, '奥入瀬渓流', 'https://tenki.jp/kouyou/2/5/32157.html', 'https://static.tenki.jp/static-images/kouyou/point/32157/square.jpg', '紅葉の情報：ブナ、ミズナラ、トチ、カツラ、カエデ'],
			[41.27724431292822, 140.979221095601, '川内川渓谷遊歩道', 'https://tenki.jp/kouyou/2/5/32158.html', 'https://static.tenki.jp/static-images/kouyou/point/32158/square.jpg', '紅葉の情報：モミジ、ブナ、ナラ、カエデ、ウルシ'],
			[40.61021864888318, 140.68014318736732, '中野もみじ山', 'https://tenki.jp/kouyou/2/5/32159.html', 'https://static.tenki.jp/static-images/kouyou/point/32159/square.jpg', '紅葉の情報：イロハモミジ、ヤマモミジ、オオモミジ、ウチワカエデ'],
			[41.38172935906677, 141.07419687594228, '薬研渓流', 'https://tenki.jp/kouyou/2/5/32160.html', 'https://static.tenki.jp/static-images/kouyou/point/32160/square.jpg', '紅葉の情報：モミジ、イタヤカエデ、ハウチワカエデ、ブナ、トチ'],
			[40.64016362273093, 140.2618166271182, '岩木山', 'https://tenki.jp/kouyou/2/5/32359.html', 'https://static.tenki.jp/static-images/kouyou/point/32359/square.jpg', '紅葉の情報：ブナ、ナラ、カラマツ、オオヤマザクラ、ダケカンバ'],
			[40.60786714070034, 140.46367541391436, '弘前公園', 'https://tenki.jp/kouyou/2/5/32360.html', 'https://static.tenki.jp/static-images/kouyou/point/32360/square.jpg', '紅葉の情報：カエデ、サクラ、イチョウ'],
			[40.563389881512606, 139.96707974985398, '十二湖', 'https://tenki.jp/kouyou/2/5/32361.html', 'https://static.tenki.jp/static-images/kouyou/point/32361/square.jpg', '紅葉の情報：モミジ、ブナ、イタヤカエデ、カツラ、ハウチワカエデ'],
			[39.10649517285355, 140.87279699167559, '胆沢川渓谷', 'https://tenki.jp/kouyou/2/6/30072.html', 'https://static.tenki.jp/static-images/kouyou/point/30072/square.jpg', '紅葉の情報：ブナ'],
			[39.29133156581806, 141.69899176652487, '仙人峠', 'https://tenki.jp/kouyou/2/6/30074.html', 'https://static.tenki.jp/static-images/kouyou/point/30074/square.jpg', '紅葉の情報：ナラ、ヤマザクラ、カエデ、ダケカンバ'],
			[38.98932060089078, 141.25520838005224, '猊鼻渓', 'https://tenki.jp/kouyou/2/6/30076.html', 'https://static.tenki.jp/static-images/kouyou/point/30076/square.jpg', '紅葉の情報：モミジ、カエデ、ウルシ、ナナカマド'],
			[40.08500213098266, 141.51292740472033, '平庭高原', 'https://tenki.jp/kouyou/2/6/30282.html', 'https://static.tenki.jp/static-images/kouyou/point/30282/square.jpg', '紅葉の情報：シラカバ'],
			[39.814916454247246, 140.9031588118759, '葛根田渓谷', 'https://tenki.jp/kouyou/2/6/30284.html', 'https://static.tenki.jp/static-images/kouyou/point/30284/square.jpg', '紅葉の情報：ブナ、カエデ、ナナカマド'],
			[39.21223426854845, 140.88610279937382, '夏油温泉', 'https://tenki.jp/kouyou/2/6/30601.html', 'https://static.tenki.jp/static-images/kouyou/point/30601/square.jpg', '紅葉の情報：ブナ、カツラ、ナナカマド'],
			[38.94403843804184, 141.04772923001514, '厳美渓', 'https://tenki.jp/kouyou/2/6/30602.html', 'https://static.tenki.jp/static-images/kouyou/point/30602/square.jpg', '紅葉の情報：ナナカマド、モミジ、イチョウ'],
			[39.00161705640812, 141.10123499832537, '中尊寺', 'https://tenki.jp/kouyou/2/6/30604.html', 'https://static.tenki.jp/static-images/kouyou/point/30604/square.jpg', '紅葉の情報：モミジ'],
			[39.70038817698931, 141.15140220877066, '盛岡城跡公園(岩手公園)', 'https://tenki.jp/kouyou/2/6/30606.html', 'https://static.tenki.jp/static-images/kouyou/point/30606/square.jpg', '紅葉の情報：イロハモミジ、イタヤカエデ、ナナカマド、イチョウ、ヤマモミジ'],
			[39.17541859344467, 141.7179075281609, '大沢渓谷', 'https://tenki.jp/kouyou/2/6/30610.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：ミズナラ、ブナ、ヤマザクラ'],
			[40.2533496083791, 141.2665195652811, '馬仙峡', 'https://tenki.jp/kouyou/2/6/30632.html', 'https://static.tenki.jp/static-images/kouyou/point/30632/square.jpg', '紅葉の情報：ナラ、ブナ、モミジ、カエデ、ナナカマド'],
			[40.176813546902025, 141.6422266574256, '久慈渓流', 'https://tenki.jp/kouyou/2/6/30703.html', 'https://static.tenki.jp/static-images/kouyou/point/30703/square.jpg', '紅葉の情報：コナラ、トチ、カエデ'],
			[39.314012772495694, 140.77707457351298, '錦秋湖(ほっと三五橋付近)', 'https://tenki.jp/kouyou/2/6/30704.html', 'https://static.tenki.jp/static-images/kouyou/point/30704/square.jpg', '紅葉の情報：イタヤカエデ、ヤマモミジ'],
			[39.99500643297641, 140.9391172289017, '安比高原ブナの二次林', 'https://tenki.jp/kouyou/2/6/30818.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：ブナ'],
			[39.94771118905511, 140.92911340438147, '十和田八幡平国立公園 八幡平地域 八幡平アスピーテライン(御在所)', 'https://tenki.jp/kouyou/2/6/32152.html', 'https://static.tenki.jp/static-images/kouyou/point/32152/square.jpg', '紅葉の情報：ミネカエデ、ダケカンバ、ナナカマド'],
			[40.0022453699842, 140.97053943893872, '安比高原', 'https://tenki.jp/kouyou/2/6/32153.html', 'https://static.tenki.jp/static-images/kouyou/point/32153/square.jpg', '紅葉の情報：ブナ、ダケカンバ、カエデ'],
			[38.961670079674086, 140.78869297882883, '栗駒山(須川)', 'https://tenki.jp/kouyou/2/6/32155.html', 'https://static.tenki.jp/static-images/kouyou/point/32155/square.jpg', '紅葉の情報：ナナカマド、モミジ、イチョウ'],
			[38.135216891668655, 140.4828048959873, '宮城蔵王(蔵王エコーライン・賽の磧)', 'https://tenki.jp/kouyou/2/7/30078.html', 'https://static.tenki.jp/static-images/kouyou/point/30078/square.jpg', '紅葉の情報：カエデ、モミジ、ナラ、クヌギ、ナナカマド'],
			[38.33066408036791, 140.6158851439375, '作並温泉', 'https://tenki.jp/kouyou/2/7/30079.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：サクラ、ブナ、カエデ、ケヤキ、クリ'],
			[38.57620523037501, 140.70507217241067, '薬莱山', 'https://tenki.jp/kouyou/2/7/30625.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：現地問合せ'],
			[38.14963281913564, 140.68830429056086, '谷山自然公園', 'https://tenki.jp/kouyou/2/7/30709.html', 'https://static.tenki.jp/static-images/kouyou/point/30709/square.jpg', '紅葉の情報：イヌシデ、モミジ、コナラ'],
			[38.41888415152718, 140.72297370752298, 'スプリングバレー仙台泉', 'https://tenki.jp/kouyou/2/7/30805.html', 'https://static.tenki.jp/static-images/kouyou/point/30805/square.jpg', '紅葉の情報：ブナ、カエデ、カラマツ'],
			[38.134265131872205, 140.52506343397195, '宮城蔵王(蔵王エコーライン・滝見台)', 'https://tenki.jp/kouyou/2/7/30815.html', 'https://static.tenki.jp/static-images/kouyou/point/30815/square.jpg', '紅葉の情報：カエデ、モミジ、ナラ、クヌギ、ナナカマド'],
			[38.45548281578555, 140.62018569637348, '御所山', 'https://tenki.jp/kouyou/2/7/30834.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：ブナ'],
			[38.275052178294565, 140.60349756861493, '秋保大滝', 'https://tenki.jp/kouyou/2/7/32551.html', 'https://static.tenki.jp/static-images/kouyou/point/32551/square.jpg', '紅葉の情報：モミジ、カエデ、イチョウ'],
			[38.72891477745019, 140.69093199738262, '鳴子峡', 'https://tenki.jp/kouyou/2/7/32553.html', 'https://static.tenki.jp/static-images/kouyou/point/32553/square.jpg', '紅葉の情報：コハウチワカエデ、ウリハダカエデ、イタヤカエデ、コシアブラ、タカノツメ'],
			[37.92211975298503, 140.76016369507744, '阿武隈ライン舟下り', 'https://tenki.jp/kouyou/2/7/32569.html', 'https://static.tenki.jp/static-images/kouyou/point/32569/square.jpg', '紅葉の情報：モミジ、カエデ、サクラ、ウルシ、ツタ'],
			[37.98433878857344, 140.5635129421778, '小原渓谷(碧玉渓)', 'https://tenki.jp/kouyou/2/7/32570.html', 'https://static.tenki.jp/static-images/kouyou/point/32570/square.jpg', '紅葉の情報：ナラ、クヌギ、カエデ'],
			[38.014419548939685, 140.39740446157765, '滑津大滝', 'https://tenki.jp/kouyou/2/7/32571.html', 'https://static.tenki.jp/static-images/kouyou/point/32571/square.jpg', '紅葉の情報：ブナ、ナラ、カエデ'],
			[38.94458489461503, 140.80433313780068, '栗駒山', 'https://tenki.jp/kouyou/2/7/32572.html', 'https://static.tenki.jp/static-images/kouyou/point/32572/square.jpg', '紅葉の情報：ナナカマド、サラサドウダン、ミネザクラ、ブナ、カエデ'],
			[38.02527754369323, 140.4750191827628, '横川渓谷(やまびこ吊り橋)', 'https://tenki.jp/kouyou/2/7/32573.html', 'https://static.tenki.jp/static-images/kouyou/point/32573/square.jpg', '紅葉の情報：ブナ、ナラ、カエデ'],
			[38.02855332993338, 140.48024851526043, '長老湖', 'https://tenki.jp/kouyou/2/7/32574.html', 'https://static.tenki.jp/static-images/kouyou/point/32574/square.jpg', '紅葉の情報：ブナ、ナラ、カエデ'],
			[38.36937029984946, 141.0617017181055, '松島(観瀾亭・松島博物館)', 'https://tenki.jp/kouyou/2/7/32584.html', 'https://static.tenki.jp/static-images/kouyou/point/32584/square.jpg', '紅葉の情報：イロハモミジ'],
			[39.03020128586876, 140.57926149496672, '三途川渓谷', 'https://tenki.jp/kouyou/2/8/30060.html', 'https://static.tenki.jp/static-images/kouyou/point/30060/square.jpg', '紅葉の情報：ベニイタヤ、ミズナラ、ブナ、ヤマモミジ、アカシデ'],
			[40.417795848794356, 140.68642995384383, '坂梨峠', 'https://tenki.jp/kouyou/2/8/30062.html', 'https://static.tenki.jp/static-images/kouyou/point/30062/square.jpg', '紅葉の情報：ブナ、カエデ、モミジ'],
			[39.26248050954732, 140.2399158713912, '八塩いこいの森', 'https://tenki.jp/kouyou/2/8/30063.html', 'https://static.tenki.jp/static-images/kouyou/point/30063/square.jpg', '紅葉の情報：モミジ、サクラ、カエデ'],
			[38.98002544303822, 140.76749165415208, '須川温泉', 'https://tenki.jp/kouyou/2/8/30626.html', 'https://static.tenki.jp/static-images/kouyou/point/30626/square.jpg', '紅葉の情報：ブナ、アオダモ、ダケカンバ、ヤマウルシ、ナナカマド'],
			[39.95524300942617, 140.4917552369187, '阿仁ゴンドラ(阿仁スキー場)', 'https://tenki.jp/kouyou/2/8/30680.html', 'https://static.tenki.jp/static-images/kouyou/point/30680/square.jpg', '紅葉の情報：ブナ、ナナカマド、ダケカンバ、ミヤマナラ、ミネザクラ'],
			[40.41773713946608, 140.8578359089389, '十和田湖', 'https://tenki.jp/kouyou/2/8/32151.html', 'https://static.tenki.jp/static-images/kouyou/point/32151/square.jpg', '紅葉の情報：ナナカマド、ウルシ、サクラ、モミジ、ブナ'],
			[39.982276886958815, 140.80184218466206, '大沼・後生掛', 'https://tenki.jp/kouyou/2/8/32156.html', 'https://static.tenki.jp/static-images/kouyou/point/32156/square.jpg', '紅葉の情報：ブナ、ナラ、モミジ、カエデ、クサモミジ'],
			[39.60862123706597, 140.65300688559228, '抱返り渓谷', 'https://tenki.jp/kouyou/2/8/32353.html', 'https://static.tenki.jp/static-images/kouyou/point/32353/square.jpg', '紅葉の情報：サクラ、カエデ'],
			[39.011905746084366, 140.66083534009402, '小安峡', 'https://tenki.jp/kouyou/2/8/32354.html', 'https://static.tenki.jp/static-images/kouyou/point/32354/square.jpg', '紅葉の情報：イタヤカエデ、ブナ、ヤマモミジ、ナナカマド'],
			[40.221283793006606, 140.2562288345796, 'きみまち阪県立自然公園', 'https://tenki.jp/kouyou/2/8/32355.html', 'https://static.tenki.jp/static-images/kouyou/point/32355/square.jpg', '紅葉の情報：モミジ、ハウチワカエデ、ウリハダカエデ、ベニイタヤ、ヤマモミジ'],
			[39.12302925667914, 139.99146633845214, '鳥海山(鉾立)', 'https://tenki.jp/kouyou/2/8/32356.html', 'https://static.tenki.jp/static-images/kouyou/point/32356/square.jpg', '紅葉の情報：ナナカマド、カエデ、ナラ、ミズキ、ブナ'],
			[40.39374793131891, 140.02527670397765, '真瀬渓谷', 'https://tenki.jp/kouyou/2/8/32357.html', 'https://static.tenki.jp/static-images/kouyou/point/32357/square.jpg', '紅葉の情報：モミジ'],
			[39.778974245161066, 140.76742109870398, '田沢湖高原', 'https://tenki.jp/kouyou/2/8/32362.html', 'https://static.tenki.jp/static-images/kouyou/point/32362/square.jpg', '紅葉の情報：ブナ'],
			[40.12924587834596, 140.82360092517516, '湯瀬渓谷', 'https://tenki.jp/kouyou/2/8/32363.html', 'https://static.tenki.jp/static-images/kouyou/point/32363/square.jpg', '紅葉の情報：モミジ、サクラ、ナナカマド'],
			[40.05031640045777, 140.6125233439805, '太平湖・小又峡', 'https://tenki.jp/kouyou/2/8/32364.html', 'https://static.tenki.jp/static-images/kouyou/point/32364/square.jpg', '紅葉の情報：ブナ、ナラ、カエデ、ミズナラ'],
			[40.412882354887905, 140.2513007779711, '白神山地 駒ヶ岳', 'https://tenki.jp/kouyou/2/8/32365.html', 'https://static.tenki.jp/static-images/kouyou/point/32365/square.jpg', '紅葉の情報：ブナ、サワグルミ、ミズナラ'],
			[40.422153999392876, 140.26940809704573, '白神山地 岳岱自然観察教育林', 'https://tenki.jp/kouyou/2/8/32366.html', 'https://static.tenki.jp/static-images/kouyou/point/32366/square.jpg', '紅葉の情報：ブナ、イタヤカエデ、ヤチダモ、ホオノキ、サワグルミ'],
			[40.342590202572254, 140.24714981463015, '白神山地 素波里園地', 'https://tenki.jp/kouyou/2/8/32367.html', 'https://static.tenki.jp/static-images/kouyou/point/32367/square.jpg', '紅葉の情報：ブナ、サクラ、クリ、シラカバ'],
			[39.159455396024384, 140.01992712370716, '獅子ヶ鼻湿原', 'https://tenki.jp/kouyou/2/8/32370.html', 'https://static.tenki.jp/static-images/kouyou/point/32370/square.jpg', '紅葉の情報：ブナ、ナラ、カエデ、ナナカマド'],
			[39.10811892458756, 140.158139793376, '法体の滝', 'https://tenki.jp/kouyou/2/8/32371.html', 'https://static.tenki.jp/static-images/kouyou/point/32371/square.jpg', '紅葉の情報：ブナ、モミジ、ナラ、ツツジ、カエデ'],
			[38.9906248898554, 140.6120210417512, '木地山・泥湯周辺', 'https://tenki.jp/kouyou/2/8/32372.html', 'https://static.tenki.jp/static-images/kouyou/point/32372/square.jpg', '紅葉の情報：カエデ、ブナ、ヤマザクラ、モミジ'],
			[39.59879630254174, 140.56213606522877, '角館武家屋敷', 'https://tenki.jp/kouyou/2/8/32373.html', 'https://static.tenki.jp/static-images/kouyou/point/32373/square.jpg', '紅葉の情報：モミジ、イチョウ'],
			[39.02785691532219, 139.9849643010628, '月光川ダム周辺', 'https://tenki.jp/kouyou/2/9/30065.html', 'https://static.tenki.jp/static-images/kouyou/point/30065/square.jpg', '紅葉の情報：ブナ、モミジ'],
			[39.061090634749746, 139.96621122004882, '高瀬峡', 'https://tenki.jp/kouyou/2/9/30066.html', 'https://static.tenki.jp/static-images/kouyou/point/30066/square.jpg', '紅葉の情報：ブナ'],
			[38.40718679374682, 140.50994979793236, '大滝公園', 'https://tenki.jp/kouyou/2/9/30067.html', 'https://static.tenki.jp/static-images/kouyou/point/30067/square.jpg', '紅葉の情報：ブナ、モミジ'],
			[38.46206956425237, 140.4773908755224, 'レークピア白水', 'https://tenki.jp/kouyou/2/9/30068.html', 'https://static.tenki.jp/static-images/kouyou/point/30068/square.jpg', '紅葉の情報：ケヤキ、サクラ'],
			[38.44196668166089, 140.4018246080024, '東根の大ケヤキ', 'https://tenki.jp/kouyou/2/9/30069.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：ケヤキ'],
			[37.933368725123216, 139.9063254625603, '白川湖周辺', 'https://tenki.jp/kouyou/2/9/30081.html', 'https://static.tenki.jp/static-images/kouyou/point/30081/square.jpg', '紅葉の情報：モミジ、カエデ、ナラ、ウルシ'],
			[38.85631736351211, 139.97916468757006, '眺海の森', 'https://tenki.jp/kouyou/2/9/30612.html', 'https://static.tenki.jp/static-images/kouyou/point/30612/square.jpg', '紅葉の情報：サクラ、ナナカマド、モミジ、ブナ、クリ'],
			[38.56825116226921, 140.53146875617026, '銀山温泉', 'https://tenki.jp/kouyou/2/9/30619.html', 'https://static.tenki.jp/static-images/kouyou/point/30619/square.jpg', '紅葉の情報：モミジ'],
			[38.00788823199694, 140.21746894763578, 'まほろば古の里 歴史公園', 'https://tenki.jp/kouyou/2/9/30621.html', 'https://static.tenki.jp/static-images/kouyou/point/30621/square.jpg', '紅葉の情報：モミジ、ケヤキ、サクラ'],
			[38.75133926803146, 140.328402662225, '陣峰市民の森', 'https://tenki.jp/kouyou/2/9/30681.html', 'https://static.tenki.jp/static-images/kouyou/point/30681/square.jpg', '紅葉の情報：ナナカマド、モミジ'],
			[38.51756897991829, 140.0071218846261, '月山', 'https://tenki.jp/kouyou/2/9/32552.html', 'https://static.tenki.jp/static-images/kouyou/point/32552/square.jpg', '紅葉の情報：イワカガミ、チングルマ、ミネザクラ、ナナカマド'],
			[38.38653004845932, 139.99303614521602, '大井沢', 'https://tenki.jp/kouyou/2/9/32557.html', 'https://static.tenki.jp/images/icon/kouyou/noimage-square.png', '紅葉の情報：ブナ、ミズナラ'],
			[37.77525894414661, 140.13433934072847, '天元台・西吾妻スカイバレー', 'https://tenki.jp/kouyou/2/9/32562.html', 'https://static.tenki.jp/static-images/kouyou/point/32562/square.jpg', '紅葉の情報：ナナカマド、ウルシ、イタヤカエデ、ドウダンツツジ、モミジ'],
			[37.77948106200124, 140.22794194503183, '滑川・姥湯', 'https://tenki.jp/kouyou/2/9/32563.html', 'https://static.tenki.jp/static-images/kouyou/point/32563/square.jpg', '紅葉の情報：ブナ、ダケカンバ、ナナカマド'],
			[38.16742395546234, 140.39367498078522, '蔵王温泉', 'https://tenki.jp/kouyou/2/9/32565.html', 'https://static.tenki.jp/static-images/kouyou/point/32565/square.jpg', '紅葉の情報：ナナカマド、ミネカエデ、サラサドウダン'],
			[38.312345500300026, 140.43594288918084, '宝珠山 立石寺(山寺)', 'https://tenki.jp/kouyou/2/9/32566.html', 'https://static.tenki.jp/static-images/kouyou/point/32566/square.jpg', '紅葉の情報：サクラ、カエデ、イチョウ、ブナ'],
			[38.74061961620835, 140.14999994137008, '最上峡', 'https://tenki.jp/kouyou/2/9/32567.html', 'https://static.tenki.jp/static-images/kouyou/point/32567/square.jpg', '紅葉の情報：ブナ、ナラ、モミジ'],
			[38.4644643959567, 139.99179000974272, '月山花笠ライン', 'https://tenki.jp/kouyou/2/9/32568.html', 'https://static.tenki.jp/static-images/kouyou/point/32568/square.jpg', '紅葉の情報：モミジ、カエデ、ブナ、ナラ、ウルシ'],
			[38.049317136764,  139.70056407159524,  '玉川渓流',  'https://tenki.jp/kouyou/2/9/32583.html',  'https://static.tenki.jp/static-images/kouyou/point/32583/square.jpg',  '紅葉の情報：ヤマウルシ、ブナ、ミズナラ、カエデ、コナラ'], 
			[37.53294310001804,  139.72490678106632,  '福満虚空藏菩薩圓藏寺',  'https://tenki.jp/kouyou/2/10/30082.html',  'https://static.tenki.jp/static-images/kouyou/point/30082/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[37.39614813870465,  139.71881324043656,  'つむじ倉滝',  'https://tenki.jp/kouyou/2/10/30083.html',  'https://static.tenki.jp/static-images/kouyou/point/30083/square.jpg',  '紅葉の情報：モミジ'], 
			[37.07120167760802,  139.4187998063807,  '屏風岩',  'https://tenki.jp/kouyou/2/10/30084.html',  'https://static.tenki.jp/static-images/kouyou/point/30084/square.jpg',  '紅葉の情報：モミジ、ナラ、ブナ'], 
			[37.1118234732462,  140.21773708816173,  '南湖公園',  'https://tenki.jp/kouyou/2/10/30086.html',  'https://static.tenki.jp/static-images/kouyou/point/30086/square.jpg',  '紅葉の情報：カエデ、サクラ'], 
			[37.17040810811607,  140.07954915445666,  '雪割橋周辺',  'https://tenki.jp/kouyou/2/10/30088.html',  'https://static.tenki.jp/static-images/kouyou/point/30088/square.jpg',  '紅葉の情報：ミズナラ、カエデ、コナラ、モミジ、ブナ'], 
			[36.9744532276255,  139.4786128430729,  '田代山付近',  'https://tenki.jp/kouyou/2/10/30090.html',  'https://static.tenki.jp/static-images/kouyou/point/30090/square.jpg',  '紅葉の情報：カエデ、カツラ、サラサドウダン、ブナ、トチノキ'], 
			[37.076104069749846,  140.55760464266774,  '鎌倉岳遊歩道',  'https://tenki.jp/kouyou/2/10/30614.html',  'https://static.tenki.jp/static-images/kouyou/point/30614/square.jpg',  '紅葉の情報：モミジ'], 
			[37.682390125851825,  140.32501273993194,  '土湯温泉',  'https://tenki.jp/kouyou/2/10/30615.html',  'https://static.tenki.jp/static-images/kouyou/point/30615/square.jpg',  '紅葉の情報：ナラ、ブナ、モミジ'], 
			[37.65749644113143,  140.25805492107142,  '磐梯横向温泉',  'https://tenki.jp/kouyou/2/10/30616.html',  'https://static.tenki.jp/static-images/kouyou/point/30616/square.jpg',  '紅葉の情報：ブナ、カラマツ、モミジ、ナナカマド、ウルシ'], 
			[37.08654853077857,  139.72757869753698,  '山王峠(道の駅「たじま」)',  'https://tenki.jp/kouyou/2/10/30623.html',  'https://static.tenki.jp/static-images/kouyou/point/30623/square.jpg',  '紅葉の情報：モミジ、コナラ、クヌギ、ウルシ'], 
			[36.81758737698992,  140.46755513860003,  '滝川渓谷',  'https://tenki.jp/kouyou/2/10/30682.html',  'https://static.tenki.jp/static-images/kouyou/point/30682/square.jpg',  '紅葉の情報：モミジ、ナラ、クヌギ'], 
			[37.29265204610622,  140.38129759469544,  '翠ヶ丘公園',  'https://tenki.jp/kouyou/2/10/30710.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ、モミジ'], 
			[37.48771709494954,  139.92976792768047,  '鶴ヶ城址',  'https://tenki.jp/kouyou/2/10/30745.html',  'https://static.tenki.jp/static-images/kouyou/point/30745/square.jpg',  '紅葉の情報：サクラ、モミジ、イチョウ'], 
			[37.5137228218403,  140.37541964746632,  '花と歴史の郷 蛇の鼻',  'https://tenki.jp/kouyou/2/10/30758.html',  'https://static.tenki.jp/static-images/kouyou/point/30758/square.jpg',  '紅葉の情報：ヤマカエデ、イロハカエデ'], 
			[37.178021019846206,  139.5265986587733,  '古町の大イチョウ',  'https://tenki.jp/kouyou/2/10/30794.html',  'https://static.tenki.jp/static-images/kouyou/point/30794/square.jpg',  '紅葉の情報：イチョウ'], 
			[37.27337023735133,  140.3892030747415,  '須賀川牡丹園',  'https://tenki.jp/kouyou/2/10/30812.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ、モミジ'], 
			[36.95216927745867,  140.40568023789328,  '薬王寺薬師堂の大いちょう',  'https://tenki.jp/kouyou/2/10/30817.html',  'https://static.tenki.jp/static-images/kouyou/point/30817/square.jpg',  '紅葉の情報：イチョウ'], 
			[37.27395798189826,  139.90527615353304,  '塔のへつり',  'https://tenki.jp/kouyou/2/10/32554.html',  'https://static.tenki.jp/static-images/kouyou/point/32554/square.jpg',  '紅葉の情報：モミジ、ナラ'], 
			[36.98044431637809,  139.32126495237105,  '尾瀬ブナ平',  'https://tenki.jp/kouyou/2/10/32555.html',  'https://static.tenki.jp/static-images/kouyou/point/32555/square.jpg',  '紅葉の情報：ブナ、モミジ、ナナカマド'], 
			[37.72358013080932,  140.25653978526094,  '磐梯吾妻スカイライン',  'https://tenki.jp/kouyou/2/10/32556.html',  'https://static.tenki.jp/static-images/kouyou/point/32556/square.jpg',  '紅葉の情報：ナナカマド、カエデ、ダケカンバ'], 
			[36.8512354201415,  140.3940148012914,  '矢祭山公園',  'https://tenki.jp/kouyou/2/10/32558.html',  'https://static.tenki.jp/static-images/kouyou/point/32558/square.jpg',  '紅葉の情報：モミジ、クヌギ、サクラ、コナラ'], 
			[37.622897482855,  140.32489260341612,  '安達太良山',  'https://tenki.jp/kouyou/2/10/32575.html',  'https://static.tenki.jp/static-images/kouyou/point/32575/square.jpg',  '紅葉の情報：ドウダンツツジ、ウラジロヨウラク'], 
			[37.6712750758542,  140.14764446481456,  '磐梯吾妻レークライン(中津川渓谷)',  'https://tenki.jp/kouyou/2/10/32578.html',  'https://static.tenki.jp/static-images/kouyou/point/32578/square.jpg',  '紅葉の情報：モミジ、トチ、カエデ、カラマツ'], 
			[37.61459433055251,  140.04819961814127,  '磐梯山ゴールドライン',  'https://tenki.jp/kouyou/2/10/32579.html',  'https://static.tenki.jp/static-images/kouyou/point/32579/square.jpg',  '紅葉の情報：モミジ、ブナ、ナラ'], 
			[37.19052339366705,  140.80323899549253,  '夏井川渓谷',  'https://tenki.jp/kouyou/2/10/34255.html',  'https://static.tenki.jp/static-images/kouyou/point/34255/square.jpg',  '紅葉の情報：イロハモミジ、カエデ、アカヤシオ'], 
			[37.768500128390954,  140.68715464605236,  '霊山',  'https://tenki.jp/kouyou/2/10/34256.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ミズナラ、ブナ、イロハモミジ、クヌギ'], 
			[36.9634082414575,  140.8074810773821,  '中釜戸のシダレモミジ',  'https://tenki.jp/kouyou/2/10/34672.html',  'https://static.tenki.jp/static-images/kouyou/point/34672/square.jpg',  '紅葉の情報：イロハカエデ'], 
			[36.07155440521121,  140.43831513344608,  '西蓮寺の大イチョウ',  'https://tenki.jp/kouyou/3/11/30135.html',  'https://static.tenki.jp/static-images/kouyou/point/30135/square.jpg',  '紅葉の情報：イチョウ'], 
			[36.764403462243486,  140.40668293035762,  '袋田の滝',  'https://tenki.jp/kouyou/3/11/30136.html',  'https://static.tenki.jp/static-images/kouyou/point/30136/square.jpg',  '紅葉の情報：イロハカエデ、オオモミジ、ヤマウルシ、ミズナラ、シラキ'], 
			[36.21441229513243,  140.10028647116044,  '筑波山',  'https://tenki.jp/kouyou/3/11/34251.html',  'https://static.tenki.jp/static-images/kouyou/point/34251/square.jpg',  '紅葉の情報：ツタ、ナラ、ブナ、モミジ'], 
			[36.87023852845354,  140.6360302157451,  '花園渓谷',  'https://tenki.jp/kouyou/3/11/34253.html',  'https://static.tenki.jp/static-images/kouyou/point/34253/square.jpg',  '紅葉の情報：カエデ、ナラ、ヤマモミジ、クヌギ、イヌブナ'], 
			[36.3825032149279,  140.2674313974398,  '佐白山',  'https://tenki.jp/kouyou/3/11/34257.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[36.683491895414775,  140.4660951424204,  '竜神峡',  'https://tenki.jp/kouyou/3/11/34258.html',  'https://static.tenki.jp/static-images/kouyou/point/34258/square.jpg',  '紅葉の情報：イロハカエデ、カツラ、ハウチワカエデ、ヤマウルシ、モミジバフウ'], 
			[36.77092849593758,  140.35078687178424,  '奥久慈温泉郷',  'https://tenki.jp/kouyou/3/11/34259.html',  'https://static.tenki.jp/static-images/kouyou/point/34259/square.jpg',  '紅葉の情報：イロハカエデ、オオモミジ、ヤマウルシ、ミズナラ、シラキ'], 
			[36.541424445306774,  140.50653477327245,  '西山御殿(西山荘)',  'https://tenki.jp/kouyou/3/11/34260.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イチョウ、コナラ'], 
			[36.40646742319186,  140.59975950926182,  '国営ひたち海浜公園',  'https://tenki.jp/kouyou/3/11/34262.html',  'https://static.tenki.jp/static-images/kouyou/point/34262/square.jpg',  '紅葉の情報：コキア(ホウキグサ)'], 
			[36.37311197491044,  140.4494788572343,  '偕楽園',  'https://tenki.jp/kouyou/3/11/36263.html',  'https://static.tenki.jp/static-images/kouyou/point/36263/square.jpg',  '紅葉の情報：モミジ'], 
			[36.96226388967765,  139.59067860291523,  '湯西川温泉',  'https://tenki.jp/kouyou/3/12/30130.html',  'https://static.tenki.jp/static-images/kouyou/point/30130/square.jpg',  '紅葉の情報：イチョウ、カエデ'], 
			[36.87786270724744,  139.52034013211707,  '川俣湖・瀬戸合峡',  'https://tenki.jp/kouyou/3/12/30131.html',  'https://static.tenki.jp/static-images/kouyou/point/30131/square.jpg',  '紅葉の情報：カエデ、ツタウルシ'], 
			[36.360166362086616,  139.69551418794336,  '太平山',  'https://tenki.jp/kouyou/3/12/30132.html',  'https://static.tenki.jp/static-images/kouyou/point/30132/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.96744347990869,  139.83651783670805,  '塩原渓谷',  'https://tenki.jp/kouyou/3/12/30134.html',  'https://static.tenki.jp/static-images/kouyou/point/30134/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.91522221662001,  139.83223312821312,  '八方ヶ原',  'https://tenki.jp/kouyou/3/12/30171.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、ナナカマド、ドウダンツツジ'], 
			[36.64913193590688,  139.50119455312705,  '古峰ヶ原高原',  'https://tenki.jp/kouyou/3/12/30172.html',  'https://static.tenki.jp/static-images/kouyou/point/30172/square.jpg',  '紅葉の情報：モミジ、カエデ、シラカバ'], 
			[36.65951496769071,  139.56026856515103,  '大芦渓谷',  'https://tenki.jp/kouyou/3/12/30173.html',  'https://static.tenki.jp/static-images/kouyou/point/30173/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.66250112178979,  140.17635450930894,  '落石',  'https://tenki.jp/kouyou/3/12/30174.html',  'https://static.tenki.jp/static-images/kouyou/point/30174/square.jpg',  '紅葉の情報：ケヤキ、モミジ、イヌシデ、クヌギ'], 
			[36.882571374749396,  139.9908714314173,  '大山参道',  'https://tenki.jp/kouyou/3/12/30823.html',  'https://static.tenki.jp/static-images/kouyou/point/30823/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[37.12477486164718,  139.96957790337729,  '那須高原「茶臼岳」',  'https://tenki.jp/kouyou/3/12/34451.html',  'https://static.tenki.jp/static-images/kouyou/point/34451/square.jpg',  '紅葉の情報：ナナカマド、ドウダンツツジ、モミジ'], 
			[36.860189439838656,  139.71713896629157,  '龍王峡',  'https://tenki.jp/kouyou/3/12/34452.html',  'https://static.tenki.jp/static-images/kouyou/point/34452/square.jpg',  '紅葉の情報：ブナ、ナラ、ツツジ、モミジ'], 
			[36.739500335823685,  139.49386910692422,  '日光(中禅寺湖)',  'https://tenki.jp/kouyou/3/12/34453.html',  'https://static.tenki.jp/static-images/kouyou/point/34453/square.jpg',  '紅葉の情報：カエデ、ミズナラ、カツラ、シラカバ、カラマツ'], 
			[36.79501379113994,  139.428488058595,  '日光(湯ノ湖・湯滝)',  'https://tenki.jp/kouyou/3/12/34656.html',  'https://static.tenki.jp/static-images/kouyou/point/34656/square.jpg',  '紅葉の情報：カエデ、ナナカマド、シラカバ、ダケカンバ、ツツジ'], 
			[36.73779877685681,  139.50240421329786,  '日光(いろは坂・華厳滝)',  'https://tenki.jp/kouyou/3/12/34657.html',  'https://static.tenki.jp/static-images/kouyou/point/34657/square.jpg',  '紅葉の情報：カエデ、ツツジ、ヤマザクラ、ミズナラ、ハンノキ'], 
			[36.758873897140646,  139.45114714634303,  '日光(竜頭ノ滝)',  'https://tenki.jp/kouyou/3/12/34658.html',  'https://static.tenki.jp/static-images/kouyou/point/34658/square.jpg',  '紅葉の情報：トウゴクミツバツツジ、ナナカマド、カエデ、ミズナラ、カラマツ'], 
			[36.77690610346982,  139.44121699371948,  '日光(戦場ヶ原)',  'https://tenki.jp/kouyou/3/12/34659.html',  'https://static.tenki.jp/static-images/kouyou/point/34659/square.jpg',  '紅葉の情報：クサモミジ、ミズナラ、ズミ、シラカバ、カラマツ'], 
			[36.77999168267122,  139.62396427081228,  '日光(霧降ノ滝)',  'https://tenki.jp/kouyou/3/12/34660.html',  'https://static.tenki.jp/static-images/kouyou/point/34660/square.jpg',  '紅葉の情報：カエデ、ツツジ、ミズナラ、ヤマザクラ'], 
			[36.757877820019466,  139.59871854276133,  '日光(東照宮・輪王寺・二荒山神社)',  'https://tenki.jp/kouyou/3/12/34661.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、モミジ'], 
			[36.29789782901408,  138.76568375239194,  '妙義山',  'https://tenki.jp/kouyou/3/13/30138.html',  'https://static.tenki.jp/static-images/kouyou/point/30138/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.92896910529332,  139.22321302051517,  '尾瀬',  'https://tenki.jp/kouyou/3/13/30139.html',  'https://static.tenki.jp/static-images/kouyou/point/30139/square.jpg',  '紅葉の情報：ナナカマド、ブナ、ナラ、ダケカンバ'], 
			[36.561599559679884,  138.72139234436028,  '吾妻渓谷',  'https://tenki.jp/kouyou/3/13/30159.html',  'https://static.tenki.jp/static-images/kouyou/point/30159/square.jpg',  '紅葉の情報：モミジ、カエデ、サクラ、クヌギ'], 
			[36.33013549561361,  138.95712816704273,  '少林山達磨寺',  'https://tenki.jp/kouyou/3/13/30650.html',  'https://static.tenki.jp/static-images/kouyou/point/30650/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[36.304970569254024,  138.98831528244446,  '洞窟観音・徳明園',  'https://tenki.jp/kouyou/3/13/30651.html',  'https://static.tenki.jp/static-images/kouyou/point/30651/square.jpg',  '紅葉の情報：モミジ'], 
			[36.16577324553962,  139.0215380504362,  '桜山公園',  'https://tenki.jp/kouyou/3/13/30672.html',  'https://static.tenki.jp/static-images/kouyou/point/30672/square.jpg',  '紅葉の情報：モミジ、イロハモミジ、カエデ、ドウダンツツジ'], 
			[36.61426508499044,  138.64045390222861,  '白砂渓谷ライン',  'https://tenki.jp/kouyou/3/13/30673.html',  'https://static.tenki.jp/static-images/kouyou/point/30673/square.jpg',  '紅葉の情報：ナラ、モミジ'], 
			[36.49901882474934,  139.4111215005523,  '桐生川上流',  'https://tenki.jp/kouyou/3/13/30674.html',  'https://static.tenki.jp/static-images/kouyou/point/30674/square.jpg',  '紅葉の情報：ヤマモミジ'], 
			[36.43864811280479,  139.27871883213598,  '高津戸峡',  'https://tenki.jp/kouyou/3/13/30684.html',  'https://static.tenki.jp/static-images/kouyou/point/30684/square.jpg',  '紅葉の情報：ナラ、モミジ'], 
			[36.54535591791565,  139.16681289776903,  '赤城山',  'https://tenki.jp/kouyou/3/13/30685.html',  'https://static.tenki.jp/static-images/kouyou/point/30685/square.jpg',  '紅葉の情報：ツツジ、ナナカマド、クサモミジ、ミズナラ、カエデ'], 
			[36.479985361043525,  138.87250492216282,  '榛名湖畔',  'https://tenki.jp/kouyou/3/13/30712.html',  'https://static.tenki.jp/static-images/kouyou/point/30712/square.jpg',  '紅葉の情報：モミジ、カエデ、カラマツ'], 
			[36.81817046142433,  138.94967845626635,  '谷川岳ヨッホ',  'https://tenki.jp/kouyou/3/13/34152.html',  'https://static.tenki.jp/static-images/kouyou/point/34152/square.jpg',  '紅葉の情報：ブナ、イロハカエデ、ヤマザクラ、ミズナラ、ナナカマド'], 
			[36.49205113716196,  138.9148647648521,  '伊香保温泉',  'https://tenki.jp/kouyou/3/13/34153.html',  'https://static.tenki.jp/static-images/kouyou/point/34153/square.jpg',  '紅葉の情報：モミジ、クヌギ、ウルシ、カエデ'], 
			[36.358037012277855,  138.69827731681252,  '碓氷第三橋梁(めがね橋)',  'https://tenki.jp/kouyou/3/13/34155.html',  'https://static.tenki.jp/static-images/kouyou/point/34155/square.jpg',  '紅葉の情報：カエデ、ケヤキ、イロハモミジ'], 
			[35.879797550222,  139.18259704959152,  '鳥居観音',  'https://tenki.jp/kouyou/3/14/30120.html',  'https://static.tenki.jp/static-images/kouyou/point/30120/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ'], 
			[35.941113319064854,  139.24476370862016,  '黒山三滝',  'https://tenki.jp/kouyou/3/14/30122.html',  'https://static.tenki.jp/static-images/kouyou/point/30122/square.jpg',  '紅葉の情報：モミジ'], 
			[36.12459195731712,  139.0241564522337,  '城峯公園',  'https://tenki.jp/kouyou/3/14/30164.html',  'https://static.tenki.jp/static-images/kouyou/point/30164/square.jpg',  '紅葉の情報：モミジ'], 
			[36.03324754342243,  139.3032508542765,  '嵐山渓谷',  'https://tenki.jp/kouyou/3/14/30165.html',  'https://static.tenki.jp/static-images/kouyou/point/30165/square.jpg',  '紅葉の情報：モミジ、コナラ、クヌギ、サクラ'], 
			[35.876147430854324,  139.1491926694442,  '有間渓谷',  'https://tenki.jp/kouyou/3/14/30686.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ'], 
			[36.09539927209914,  139.1153896944882,  '長瀞',  'https://tenki.jp/kouyou/3/14/30687.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：クヌギ、モミジ、ナラ'], 
			[35.99401170272094,  139.05255583135056,  '秩父ミューズパークのイチョウ',  'https://tenki.jp/kouyou/3/14/30746.html',  'https://static.tenki.jp/static-images/kouyou/point/30746/square.jpg',  '紅葉の情報：イチョウ、モミジ、カツラ'], 
			[35.91517417200945,  139.21208895640703,  '東郷公園 秩父御嶽神社',  'https://tenki.jp/kouyou/3/14/30747.html',  'https://static.tenki.jp/static-images/kouyou/point/30747/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[36.08949391455744,  139.37272897322433,  '国営武蔵丘陵森林公園',  'https://tenki.jp/kouyou/3/14/30771.html',  'https://static.tenki.jp/static-images/kouyou/point/30771/square.jpg',  '紅葉の情報：オオモミジ、イロハモミジ、ハウチワカエデ、イタヤカエデ、トウカエデ'], 
			[34.968201540472194,  139.91009588309905,  '小松寺',  'https://tenki.jp/kouyou/3/15/30148.html',  'https://static.tenki.jp/static-images/kouyou/point/30148/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[35.78584862069152,  140.31825911752856,  '成田山新勝寺',  'https://tenki.jp/kouyou/3/15/30698.html',  'https://static.tenki.jp/static-images/kouyou/point/30698/square.jpg',  '紅葉の情報：モミジ、イチョウ、コナラ、クヌギ'], 
			[35.958544908874195,  139.85238407661737,  '清水公園',  'https://tenki.jp/kouyou/3/15/30706.html',  'https://static.tenki.jp/static-images/kouyou/point/30706/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ、ケヤキ'], 
			[35.219914467996205,  140.1821268648349,  '養老渓谷',  'https://tenki.jp/kouyou/3/15/34371.html',  'https://static.tenki.jp/static-images/kouyou/point/34371/square.jpg',  '紅葉の情報：モミジ、ウルシ、ケヤキ、クヌギ、ナラ'], 
			[35.229956444005275,  140.08632575313436,  '亀山湖',  'https://tenki.jp/kouyou/3/15/34373.html',  'https://static.tenki.jp/static-images/kouyou/point/34373/square.jpg',  '紅葉の情報：モミジ、イチョウ、コナラ、カエデ、ヤマウルシ'], 
			[35.84020157576661,  139.9287777637844,  '本土寺',  'https://tenki.jp/kouyou/3/15/34374.html',  'https://static.tenki.jp/static-images/kouyou/point/34374/square.jpg',  '紅葉の情報：ヤマモミジ、秋山紅、大盃'], 
			[35.81330203176505,  139.12820768556412,  '鳩ノ巣渓谷',  'https://tenki.jp/kouyou/3/16/30109.html',  'https://static.tenki.jp/static-images/kouyou/point/30109/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[35.62518818461589,  139.70367373361668,  '林試の森公園',  'https://tenki.jp/kouyou/3/16/30111.html',  'https://static.tenki.jp/static-images/kouyou/point/30111/square.jpg',  '紅葉の情報：ラクウショウ'], 
			[35.62885906823517,  139.62135882626626,  '砧公園',  'https://tenki.jp/kouyou/3/16/30112.html',  'https://static.tenki.jp/static-images/kouyou/point/30112/square.jpg',  '紅葉の情報：ケヤキ、イチョウ、サクラ、イロハモミジ'], 
			[35.62390324572731,  139.6601393805283,  '駒沢オリンピック公園',  'https://tenki.jp/kouyou/3/16/30113.html',  'https://static.tenki.jp/static-images/kouyou/point/30113/square.jpg',  '紅葉の情報：ケヤキ、イチョウ、サクラ'], 
			[35.68510766031387,  139.63971123560302,  '和田堀公園',  'https://tenki.jp/kouyou/3/16/30115.html',  'https://static.tenki.jp/static-images/kouyou/point/30115/square.jpg',  '紅葉の情報：トウカエデ、ケヤキ、イチョウ、サクラ、その他'], 
			[35.73894837263388,  139.5977414312915,  '石神井公園',  'https://tenki.jp/kouyou/3/16/30116.html',  'https://static.tenki.jp/static-images/kouyou/point/30116/square.jpg',  '紅葉の情報：イロハモミジ、ラクウショウ、ケヤキ、イチョウ'], 
			[35.76603724779363,  139.62946661012856,  '光が丘公園',  'https://tenki.jp/kouyou/3/16/30117.html',  'https://static.tenki.jp/static-images/kouyou/point/30117/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[35.66019857595499,  139.76351433668108,  '浜離宮恩賜庭園',  'https://tenki.jp/kouyou/3/16/30118.html',  'https://static.tenki.jp/static-images/kouyou/point/30118/square.jpg',  '紅葉の情報：イロハモミジ、ハゼノキ、サクラ、トウカエデ'], 
			[35.70476433531555,  139.74932176454527,  '小石川後楽園',  'https://tenki.jp/kouyou/3/16/30119.html',  'https://static.tenki.jp/static-images/kouyou/point/30119/square.jpg',  '紅葉の情報：イロハモミジ、ケヤキ、イチョウ、ミズキ、ハゼ'], 
			[35.73248824471894,  139.74836193145856,  '六義園',  'https://tenki.jp/kouyou/3/16/30125.html',  'https://static.tenki.jp/static-images/kouyou/point/30125/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ、ドウダンツツジ'], 
			[35.724141309401055,  139.81546208207973,  '向島百花園',  'https://tenki.jp/kouyou/3/16/30126.html',  'https://static.tenki.jp/static-images/kouyou/point/30126/square.jpg',  '紅葉の情報：モミジ、ハゼ、ニシキギ、イチョウ、ウメ'], 
			[35.741971965445515,  139.7465006712582,  '旧古河庭園',  'https://tenki.jp/kouyou/3/16/30127.html',  'https://static.tenki.jp/static-images/kouyou/point/30127/square.jpg',  '紅葉の情報：イロハカエデ、イチョウ、ハゼノキ、ヤマモミジ'], 
			[35.69883714981946,  139.48187591269414,  '殿ヶ谷戸庭園',  'https://tenki.jp/kouyou/3/16/30128.html',  'https://static.tenki.jp/static-images/kouyou/point/30128/square.jpg',  '紅葉の情報：イロハモミジ、ケヤキ、イチョウ'], 
			[35.73345564694472,  139.42477847495056,  '東大和南公園',  'https://tenki.jp/kouyou/3/16/30150.html',  'https://static.tenki.jp/static-images/kouyou/point/30150/square.jpg',  '紅葉の情報：コナラ、クヌギ、モミジ'], 
			[35.63792765362618,  139.46143688156036,  '桜ヶ丘公園',  'https://tenki.jp/kouyou/3/16/30151.html',  'https://static.tenki.jp/static-images/kouyou/point/30151/square.jpg',  '紅葉の情報：イロハモミジ、ケヤキ、メタセコイア'], 
			[35.714392405833784,  139.5184922104188,  '小金井公園',  'https://tenki.jp/kouyou/3/16/30152.html',  'https://static.tenki.jp/static-images/kouyou/point/30152/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ'], 
			[35.67515811560931,  139.49251195917967,  '府中の森公園',  'https://tenki.jp/kouyou/3/16/30153.html',  'https://static.tenki.jp/static-images/kouyou/point/30153/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[35.69042708992983,  139.51929113244867,  '武蔵野公園',  'https://tenki.jp/kouyou/3/16/30154.html',  'https://static.tenki.jp/static-images/kouyou/point/30154/square.jpg',  '紅葉の情報：モミジ、イチョウ、カエデ類、ケヤキ、サクラ類'], 
			[35.64929006484207,  139.29001001628794,  '陵南公園',  'https://tenki.jp/kouyou/3/16/30155.html',  'https://static.tenki.jp/static-images/kouyou/point/30155/square.jpg',  '紅葉の情報：ケヤキ、サクラ、イロハモミジ、ノムラモミジ、トウカエデ'], 
			[35.76596869686462,  139.37974532085678,  '野山北・六道山公園',  'https://tenki.jp/kouyou/3/16/30156.html',  'https://static.tenki.jp/static-images/kouyou/point/30156/square.jpg',  '紅葉の情報：コナラ、クヌギ、トチノキ、リョウブ、ヤマウルシ'], 
			[35.65817434632145,  139.74627284701702,  '芝公園',  'https://tenki.jp/kouyou/3/16/30157.html',  'https://static.tenki.jp/static-images/kouyou/point/30157/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.67456393687938,  139.71961857111566,  '明治神宮外苑',  'https://tenki.jp/kouyou/3/16/30688.html',  'https://static.tenki.jp/static-images/kouyou/point/30688/square.jpg',  '紅葉の情報：イチョウ、モミジ、トウカエデ'], 
			[35.8008933112906,  139.18300085343336,  '御岳渓谷',  'https://tenki.jp/kouyou/3/16/30766.html',  'https://static.tenki.jp/static-images/kouyou/point/30766/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.78643971756804,  139.86924177657247,  '水元公園',  'https://tenki.jp/kouyou/3/16/30835.html',  'https://static.tenki.jp/static-images/kouyou/point/30835/square.jpg',  '紅葉の情報：メタセコイア、ラクウショウ、ポプラ、モミジバフウ'], 
			[35.714062179049776,  139.77419484811853,  '上野恩賜公園',  'https://tenki.jp/kouyou/3/16/32201.html',  'https://static.tenki.jp/static-images/kouyou/point/32201/square.jpg',  '紅葉の情報：イチョウ、モミジ、サクラ、ケヤキ'], 
			[35.70084010613717,  139.57441284097965,  '井の頭恩賜公園',  'https://tenki.jp/kouyou/3/16/32202.html',  'https://static.tenki.jp/static-images/kouyou/point/32202/square.jpg',  '紅葉の情報：モミジ、サクラ、ケヤキ'], 
			[35.63600225158794,  139.7212728725008,  '国立科学博物館附属自然教育園',  'https://tenki.jp/kouyou/3/16/32203.html',  'https://static.tenki.jp/static-images/kouyou/point/32203/square.jpg',  '紅葉の情報：イロハモミジ、ムクロジ'], 
			[35.79269706875614,  139.04860938634286,  '奥多摩湖',  'https://tenki.jp/kouyou/3/16/34654.html',  'https://static.tenki.jp/static-images/kouyou/point/34654/square.jpg',  '紅葉の情報：モミジ、サクラ、イチョウ、カエデ'], 
			[35.62501495544488,  139.24321873237227,  '高尾山',  'https://tenki.jp/kouyou/3/16/34655.html',  'https://static.tenki.jp/static-images/kouyou/point/34655/square.jpg',  '紅葉の情報：イロハモミジ、カジカエデ、イヌブナ、イタヤカエデ、シラキ'], 
			[35.78288968818318,  139.14974426833447,  '御岳山',  'https://tenki.jp/kouyou/3/16/34665.html',  'https://static.tenki.jp/static-images/kouyou/point/34665/square.jpg',  '紅葉の情報：オオモミジ、カエデ、コナラ'], 
			[35.721825814240496,  139.21736915744154,  '秋川渓谷(広徳寺周辺)',  'https://tenki.jp/kouyou/3/16/34667.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ'], 
			[35.6940453439908,  139.74287075505444,  '靖国神社',  'https://tenki.jp/kouyou/3/16/34671.html',  'https://static.tenki.jp/static-images/kouyou/point/34671/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[35.636879121595705,  139.7194110145513,  '東京都庭園美術館',  'https://tenki.jp/kouyou/3/16/34673.html',  'https://static.tenki.jp/static-images/kouyou/point/34673/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.700793398872754,  139.62456880023308,  '大田黒公園',  'https://tenki.jp/kouyou/3/16/34674.html',  'https://static.tenki.jp/static-images/kouyou/point/34674/square.jpg',  '紅葉の情報：イチョウ、イロハモミジ、オオモミジ、ノムラモミジ、ハゼノキ'], 
			[35.164906416909176,  139.0605787497466,  '奥湯河原',  'https://tenki.jp/kouyou/3/17/30103.html',  'https://static.tenki.jp/static-images/kouyou/point/30103/square.jpg',  '紅葉の情報：モミジ'], 
			[35.325910403937506,  139.55630742330075,  '鶴岡八幡宮',  'https://tenki.jp/kouyou/3/17/30106.html',  'https://static.tenki.jp/static-images/kouyou/point/30106/square.jpg',  '紅葉の情報：イチョウ、ハゼ、モミジ、カエデ'], 
			[35.412267899075886,  139.04349898937082,  '丹沢湖',  'https://tenki.jp/kouyou/3/17/30108.html',  'https://static.tenki.jp/static-images/kouyou/point/30108/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.21412103167843,  139.10678220782543,  'アネスト岩田 ターンパイク箱根',  'https://tenki.jp/kouyou/3/17/30281.html',  'https://static.tenki.jp/static-images/kouyou/point/30281/square.jpg',  '紅葉の情報：モミジ'], 
			[35.36048866116401,  139.21159850363938,  '震生湖',  'https://tenki.jp/kouyou/3/17/30689.html',  'https://static.tenki.jp/static-images/kouyou/point/30689/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[35.375087818565106,  139.2500332406448,  '弘法山',  'https://tenki.jp/kouyou/3/17/30690.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハモミジ'], 
			[35.32595560911933,  139.5445776016869,  '源氏山公園',  'https://tenki.jp/kouyou/3/17/30755.html',  'https://static.tenki.jp/static-images/kouyou/point/30755/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ'], 
			[35.44302479149029,  139.0502855891477,  '中川温泉',  'https://tenki.jp/kouyou/3/17/30772.html',  'https://static.tenki.jp/static-images/kouyou/point/30772/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.24858759847576,  139.04512202964554,  '箱根強羅公園',  'https://tenki.jp/kouyou/3/17/30786.html',  'https://static.tenki.jp/static-images/kouyou/point/30786/square.jpg',  '紅葉の情報：モミジ'], 
			[35.24835956927379,  139.04320429354382,  '箱根美術館',  'https://tenki.jp/kouyou/3/17/30787.html',  'https://static.tenki.jp/static-images/kouyou/point/30787/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ'], 
			[35.20509702288502,  139.02040886432442,  '小田急 山のホテル',  'https://tenki.jp/kouyou/3/17/30790.html',  'https://static.tenki.jp/static-images/kouyou/point/30790/square.jpg',  '紅葉の情報：カエデ、モミジ'], 
			[35.349653721053556,  139.59764949594924,  '横浜市立金沢動物園',  'https://tenki.jp/kouyou/3/17/30806.html',  'https://static.tenki.jp/static-images/kouyou/point/30806/square.jpg',  '紅葉の情報：イチョウ、ナンキンハゼ、ケヤキ、メタセコイア、イロハモミジ'], 
			[35.60985517100118,  139.56249995518618,  '生田緑地',  'https://tenki.jp/kouyou/3/17/30830.html',  'https://static.tenki.jp/static-images/kouyou/point/30830/square.jpg',  '紅葉の情報：コナラ、クヌギ、イロハモミジ、メタセコイア'], 
			[35.611513240622585,  139.1986884438376,  '相模湖「嵐山」',  'https://tenki.jp/kouyou/3/17/34653.html',  'https://static.tenki.jp/static-images/kouyou/point/34653/square.jpg',  '紅葉の情報：ケヤキ、カエデ、モミジ、クヌギ'], 
			[35.4170068961834,  139.65739863625114,  '三溪園',  'https://tenki.jp/kouyou/3/17/34666.html',  'https://static.tenki.jp/static-images/kouyou/point/34666/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ(大木)'], 
			[37.15226247028957,  139.2470673979042,  '奥只見湖周辺',  'https://tenki.jp/kouyou/4/18/30096.html',  'https://static.tenki.jp/static-images/kouyou/point/30096/square.jpg',  '紅葉の情報：ブナ'], 
			[36.97343431670301,  138.7499971405239,  '清津峡',  'https://tenki.jp/kouyou/4/18/30098.html',  'https://static.tenki.jp/static-images/kouyou/point/30098/square.jpg',  '紅葉の情報：モミジ、ナラ、ウルシ、ナナカマド'], 
			[37.6702971507148,  138.81556058075418,  '国上山',  'https://tenki.jp/kouyou/4/18/30634.html',  'https://static.tenki.jp/static-images/kouyou/point/30634/square.jpg',  '紅葉の情報：モミジ'], 
			[37.42242129169414,  138.93441610671053,  '八方台いこいの森',  'https://tenki.jp/kouyou/4/18/30636.html',  'https://static.tenki.jp/static-images/kouyou/point/30636/square.jpg',  '紅葉の情報：イチョウ、モミジ、ナナカマド'], 
			[38.00413852340481,  139.40833793986837,  '大峰山',  'https://tenki.jp/kouyou/4/18/30638.html',  'https://static.tenki.jp/static-images/kouyou/point/30638/square.jpg',  '紅葉の情報：サクラ、モミジ、ナナカマド、ナラ、カエデ'], 
			[38.02796051888518,  139.43182204349938,  '櫛形山脈',  'https://tenki.jp/kouyou/4/18/30640.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ヤマモミジ'], 
			[38.081925870397455,  138.32988860871387,  '大佐渡スカイライン',  'https://tenki.jp/kouyou/4/18/30641.html',  'https://static.tenki.jp/static-images/kouyou/point/30641/square.jpg',  '紅葉の情報：ブナ、ナナカマド、ハウチワカエデ、ヤマモミジ'], 
			[37.736737200357375,  139.30641141959094,  '阿賀野川ライン遊覧船',  'https://tenki.jp/kouyou/4/18/30643.html',  'https://static.tenki.jp/static-images/kouyou/point/30643/square.jpg',  '紅葉の情報：カシ、ヤマザクラ、イヌブナ、カエデ、ナラ'], 
			[37.359252432174955,  138.5454630846091,  '松雲山荘',  'https://tenki.jp/kouyou/4/18/30653.html',  'https://static.tenki.jp/static-images/kouyou/point/30653/square.jpg',  '紅葉の情報：ツツジ、アカマツ、モミジ'], 
			[36.903705884778134,  138.1631785799822,  '大田切渓谷',  'https://tenki.jp/kouyou/4/18/30691.html',  'https://static.tenki.jp/static-images/kouyou/point/30691/square.jpg',  '紅葉の情報：モミジ、ヤマザクラ、ナラ、ブナ'], 
			[37.54132756906791,  139.12047157364668,  '八木ヶ鼻',  'https://tenki.jp/kouyou/4/18/30763.html',  'https://static.tenki.jp/static-images/kouyou/point/30763/square.jpg',  '紅葉の情報：モミジ、ケヤキ、ナラ'], 
			[37.494343721443165,  139.15435358812252,  '大谷ダム',  'https://tenki.jp/kouyou/4/18/30764.html',  'https://static.tenki.jp/static-images/kouyou/point/30764/square.jpg',  '紅葉の情報：ナラ、ケヤキ、モミジ'], 
			[36.85925230887877,  138.09445873298088,  '笹ヶ峰高原',  'https://tenki.jp/kouyou/4/18/30795.html',  'https://static.tenki.jp/static-images/kouyou/point/30795/square.jpg',  '紅葉の情報：ナナカマド、ツタウルシ、ヤマモミジ、ブナ、トチノキ'], 
			[36.85031874675535,  138.13293118340462,  '苗名滝',  'https://tenki.jp/kouyou/4/18/30796.html',  'https://static.tenki.jp/static-images/kouyou/point/30796/square.jpg',  '紅葉の情報：ナナカマド、ブナ'], 
			[37.698935127982445,  138.82884649210575,  '弥彦公園(もみじ谷)',  'https://tenki.jp/kouyou/4/18/33151.html',  'https://static.tenki.jp/static-images/kouyou/point/33151/square.jpg',  '紅葉の情報：モミジ、ケヤキ、ウルシ、ナナカマド'], 
			[36.940144655857836,  138.80408705974577,  '湯沢高原パノラマパーク(ロープウェイ・アルプの里)',  'https://tenki.jp/kouyou/4/18/33152.html',  'https://static.tenki.jp/static-images/kouyou/point/33152/square.jpg',  '紅葉の情報：ブナ、カエデ'], 
			[38.07095261299303,  139.5980869450977,  '荒川峡もみじライン',  'https://tenki.jp/kouyou/4/18/33153.html',  'https://static.tenki.jp/static-images/kouyou/point/33153/square.jpg',  '紅葉の情報：モミジ、ナナカマド、イチョウ、クヌギ'], 
			[37.39683115864578,  138.77696914366695,  'もみじ園',  'https://tenki.jp/kouyou/4/18/33155.html',  'https://static.tenki.jp/static-images/kouyou/point/33155/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ、オオモミジ'], 
			[37.656225664627904,  139.05389670643274,  '加茂山公園',  'https://tenki.jp/kouyou/4/18/33156.html',  'https://static.tenki.jp/static-images/kouyou/point/33156/square.jpg',  '紅葉の情報：モミジ'], 
			[37.10060467066746,  138.619089069563,  '美人林',  'https://tenki.jp/kouyou/4/18/33157.html',  'https://static.tenki.jp/static-images/kouyou/point/33157/square.jpg',  '紅葉の情報：ブナ'], 
			[36.790399067990656,  137.01691543834963,  '二上山公園',  'https://tenki.jp/kouyou/4/19/30307.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ニワウルシ、カエデ、ブナ'], 
			[36.56803869762614,  137.64028701994573,  '立山ロープウェイ',  'https://tenki.jp/kouyou/4/19/30312.html',  'https://static.tenki.jp/static-images/kouyou/point/30312/square.jpg',  '紅葉の情報：ナナカマド、ブナ、ダケカンバ、ミネカエデ'], 
			[36.58325788508177,  137.45922296670238,  '立山・美女平',  'https://tenki.jp/kouyou/4/19/30313.html',  'https://static.tenki.jp/static-images/kouyou/point/30313/square.jpg',  '紅葉の情報：ブナ、ダケカンバ、ナナカマド'], 
			[36.577430986389786,  137.59682073676518,  '立山・室堂平',  'https://tenki.jp/kouyou/4/19/30314.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ナナカマド、チングルマ、ミネカエデ、イワイチョウ'], 
			[36.49084489866003,  137.45603988209086,  '有峰森林文化村公園',  'https://tenki.jp/kouyou/4/19/30315.html',  'https://static.tenki.jp/static-images/kouyou/point/30315/square.jpg',  '紅葉の情報：ブナ、ミズナラ、カエデ、ナナカマド、カラマツ'], 
			[36.43434484556014,  137.0161959299504,  '瞑想の郷',  'https://tenki.jp/kouyou/4/19/30318.html',  'https://static.tenki.jp/static-images/kouyou/point/30318/square.jpg',  '紅葉の情報：モミジ、カエデ、ブナ、ナラ'], 
			[36.71025792127135,  137.1895027325607,  '富山市民俗民芸村',  'https://tenki.jp/kouyou/4/19/30319.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、ドウダンツツジ'], 
			[36.71383064670916,  136.84783675696787,  '稲葉山・宮島峡県定公園',  'https://tenki.jp/kouyou/4/19/30320.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、ツツジ'], 
			[36.4974174624818,  137.24309591926993,  '神通峡',  'https://tenki.jp/kouyou/4/19/30692.html',  'https://static.tenki.jp/static-images/kouyou/point/30692/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.815000823934035,  137.58595664743467,  '黒部峡谷トロッコ電車',  'https://tenki.jp/kouyou/4/19/30715.html',  'https://static.tenki.jp/static-images/kouyou/point/30715/square.jpg',  '紅葉の情報：ブナ、イタヤカエデ、メグスリノキ、ヤマモミジ、タカノツメ'], 
			[36.11451176813092,  136.70063615028164,  '白山市白峰県道白山公園線沿線',  'https://tenki.jp/kouyou/4/20/30301.html',  'https://static.tenki.jp/static-images/kouyou/point/30301/square.jpg',  '紅葉の情報：ブナ、モミジ・カエデ類、カツラ、ツタウルシ、ナラ類'], 
			[36.56203252704098,  136.66266459852758,  '特別名勝兼六園',  'https://tenki.jp/kouyou/4/20/30303.html',  'https://static.tenki.jp/static-images/kouyou/point/30303/square.jpg',  '紅葉の情報：モミジ、サクラ、ケヤキ'], 
			[36.30557316909421,  136.48641951708,  '荒俣峡',  'https://tenki.jp/kouyou/4/20/30304.html',  'https://static.tenki.jp/static-images/kouyou/point/30304/square.jpg',  '紅葉の情報：モミジ'], 
			[36.31206819361747,  136.42076983067236,  '那谷寺',  'https://tenki.jp/kouyou/4/20/30305.html',  'https://static.tenki.jp/static-images/kouyou/point/30305/square.jpg',  '紅葉の情報：モミジ、カエデ、ニシキギ、ツツジ、ドウダンツツジ'], 
			[36.24456126686391,  136.37605056946978,  '鶴仙渓',  'https://tenki.jp/kouyou/4/20/30306.html',  'https://static.tenki.jp/static-images/kouyou/point/30306/square.jpg',  '紅葉の情報：モミジ'], 
			[36.781977516134816,  136.81282038989127,  '宝達山',  'https://tenki.jp/kouyou/4/20/30716.html',  'https://static.tenki.jp/static-images/kouyou/point/30716/square.jpg',  '紅葉の情報：ブナ、モミジ、ナナカマド、コシアブラ、ウリハダカエデ'], 
			[35.65704701826381,  136.03182492189876,  '大原山・西福寺',  'https://tenki.jp/kouyou/4/21/30309.html',  'https://static.tenki.jp/static-images/kouyou/point/30309/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[35.941028949731226,  136.6398604122275,  '九頭竜峡',  'https://tenki.jp/kouyou/4/21/30310.html',  'https://static.tenki.jp/static-images/kouyou/point/30310/square.jpg',  '紅葉の情報：モミジ、イチョウ、ブナ、ナラ'], 
			[35.934939398525636,  136.05976353644357,  '越前陶芸公園',  'https://tenki.jp/kouyou/4/21/30316.html',  'https://static.tenki.jp/static-images/kouyou/point/30316/square.jpg',  '紅葉の情報：モミジ、サクラ、イチョウ'], 
			[35.950572879236866,  136.182286370117,  '西山公園',  'https://tenki.jp/kouyou/4/21/30694.html',  'https://static.tenki.jp/static-images/kouyou/point/30694/square.jpg',  '紅葉の情報：モミジ'], 
			[36.05527960400818,  136.3545297401155,  '曹洞宗大本山永平寺',  'https://tenki.jp/kouyou/4/21/30699.html',  'https://static.tenki.jp/static-images/kouyou/point/30699/square.jpg',  '紅葉の情報：モミジ'], 
			[35.46917921542507,  135.78480160006293,  '萬徳寺',  'https://tenki.jp/kouyou/4/21/30717.html',  'https://static.tenki.jp/static-images/kouyou/point/30717/square.jpg',  '紅葉の情報：モミジ、ヤマモミジ'], 
			[35.888814194600826,  136.68961616972126,  '九頭竜湖',  'https://tenki.jp/kouyou/4/21/30773.html',  'https://static.tenki.jp/static-images/kouyou/point/30773/square.jpg',  '紅葉の情報：ブナ、ナラ'], 
			[35.99749105346991,  136.2945562223517,  '諏訪館跡庭園',  'https://tenki.jp/kouyou/4/21/36101.html',  'https://static.tenki.jp/static-images/kouyou/point/36101/square.jpg',  '紅葉の情報：モミジ'], 
			[36.068423079708865,  136.22487402099765,  '国名勝 養浩館庭園',  'https://tenki.jp/kouyou/4/21/36102.html',  'https://static.tenki.jp/static-images/kouyou/point/36102/square.jpg',  '紅葉の情報：モミジ、ヤマザクラ、ヌルデ、ドウダンツツジ、ニシキギ'], 
			[35.79502886845278,  138.8832082911302,  '丹波渓谷',  'https://tenki.jp/kouyou/3/22/30140.html',  'https://static.tenki.jp/static-images/kouyou/point/30140/square.jpg',  '紅葉の情報：ブナ、ミズナラ、カエデ、モミジ'], 
			[35.483991790684875,  138.67922176178453,  '紅葉台',  'https://tenki.jp/kouyou/3/22/30141.html',  'https://static.tenki.jp/static-images/kouyou/point/30141/square.jpg',  '紅葉の情報：モミジ'], 
			[35.44160442761749,  138.76998128817172,  '富士山吉田口登山道中ノ茶屋',  'https://tenki.jp/kouyou/3/22/30142.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ナナカマド、カラマツ'], 
			[35.21961360446982,  138.42139771619273,  '福士川渓谷',  'https://tenki.jp/kouyou/3/22/30143.html',  'https://static.tenki.jp/static-images/kouyou/point/30143/square.jpg',  '紅葉の情報：モミジ、イチョウ、ブナ'], 
			[35.41379283235395,  138.44076243751655,  '下山のオハツキイチョウ群',  'https://tenki.jp/kouyou/3/22/30184.html',  'https://static.tenki.jp/static-images/kouyou/point/30184/square.jpg',  '紅葉の情報：オハツキイチョウ'], 
			[35.3816033694685,  138.41893139917968,  '身延山西谷',  'https://tenki.jp/kouyou/3/22/30185.html',  'https://static.tenki.jp/static-images/kouyou/point/30185/square.jpg',  '紅葉の情報：カエデ'], 
			[35.60015956281197,  138.4116829720191,  '南伊奈ヶ湖周辺',  'https://tenki.jp/kouyou/3/22/30189.html',  'https://static.tenki.jp/static-images/kouyou/point/30189/square.jpg',  '紅葉の情報：カエデ、ミズナラ、カツラ'], 
			[35.52591135411612,  138.76220940244843,  '河口湖畔(もみじ回廊)',  'https://tenki.jp/kouyou/3/22/30584.html',  'https://static.tenki.jp/static-images/kouyou/point/30584/square.jpg',  '紅葉の情報：モミジ'], 
			[35.53043931725086,  138.51873469805602,  '四尾連湖',  'https://tenki.jp/kouyou/3/22/30718.html',  'https://static.tenki.jp/static-images/kouyou/point/30718/square.jpg',  '紅葉の情報：カエデ、ミズナラ、ヤマモミジ'], 
			[35.74957574921415,  138.56605516214645,  '昇仙峡(仙娥滝周辺)',  'https://tenki.jp/kouyou/3/22/34651.html',  'https://static.tenki.jp/static-images/kouyou/point/34651/square.jpg',  '紅葉の情報：モミジ、サクラ、ナラ、ドウダンツツジ、ウルシ'], 
			[35.86802454278096,  138.7461432413925,  '西沢渓谷',  'https://tenki.jp/kouyou/3/22/34652.html',  'https://static.tenki.jp/static-images/kouyou/point/34652/square.jpg',  '紅葉の情報：イロハモミジ、ハウチワカエデ、ブナ、トチノキ、ミズナラ'], 
			[35.615582957878395,  138.98004344616473,  '猿橋',  'https://tenki.jp/kouyou/3/22/34662.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ケヤキ、モミジ'], 
			[35.856703064899605,  138.50278804010867,  'みずがき湖周辺',  'https://tenki.jp/kouyou/3/22/34663.html',  'https://static.tenki.jp/static-images/kouyou/point/34663/square.jpg',  '紅葉の情報：モミジ、ミズナラ、ウルシ'], 
			[35.648155836964705,  138.81176211021594,  '日川渓谷・竜門峡',  'https://tenki.jp/kouyou/3/22/34664.html',  'https://static.tenki.jp/static-images/kouyou/point/34664/square.jpg',  '紅葉の情報：モミジ、コナラ、イヌブナ、ケヤキ、クリ'], 
			[35.440743260735175,  137.81775426285682,  '名勝天龍峡',  'https://tenki.jp/kouyou/3/23/30102.html',  'https://static.tenki.jp/static-images/kouyou/point/30102/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ、ミツバツツジ、クヌギ'], 
			[36.05061567567986,  138.45754665697993,  '松原湖',  'https://tenki.jp/kouyou/3/23/30635.html',  'https://static.tenki.jp/static-images/kouyou/point/30635/square.jpg',  '紅葉の情報：カラマツ、サラサドウダン、モミジ、カエデ、ミズナラ'], 
			[35.97379280854513,  137.9021502468562,  '横川渓谷',  'https://tenki.jp/kouyou/3/23/30637.html',  'https://static.tenki.jp/static-images/kouyou/point/30637/square.jpg',  '紅葉の情報：カエデ、ミズナラ、ブナ、トチ、ヤマウルシ'], 
			[35.99933398478989,  138.60960607355995,  '相木渓谷',  'https://tenki.jp/kouyou/3/23/30647.html',  'https://static.tenki.jp/static-images/kouyou/point/30647/square.jpg',  '紅葉の情報：カラマツ、シラカバ、モミジ、カエデ、ツツジ'], 
			[36.13411149623006,  138.269902847731,  '白樺高原',  'https://tenki.jp/kouyou/3/23/30661.html',  'https://static.tenki.jp/static-images/kouyou/point/30661/square.jpg',  '紅葉の情報：シラカバ、カエデ、ナナカマド、マユミ、カラマツ'], 
			[36.45103585544176,  137.89376568080812,  '大峰高原七色大カエデ',  'https://tenki.jp/kouyou/3/23/30662.html',  'https://static.tenki.jp/static-images/kouyou/point/30662/square.jpg',  '紅葉の情報：七色大カエデ'], 
			[36.327278028929804,  138.4200417400262,  '小諸城址懐古園',  'https://tenki.jp/kouyou/3/23/30666.html',  'https://static.tenki.jp/static-images/kouyou/point/30666/square.jpg',  '紅葉の情報：サクラ、ケヤキ、モミジ、イチョウ、カエデ'], 
			[35.89632460417448,  138.17172505926115,  '入笠山',  'https://tenki.jp/kouyou/3/23/30670.html',  'https://static.tenki.jp/static-images/kouyou/point/30670/square.jpg',  '紅葉の情報：カラマツ'], 
			[35.77778850245109,  137.8137060700114,  '中央アルプス千畳敷',  'https://tenki.jp/kouyou/3/23/30696.html',  'https://static.tenki.jp/static-images/kouyou/point/30696/square.jpg',  '紅葉の情報：ウラジロナナカマド、ダケカンバ、タカネナナカマド'], 
			[36.36772485355344,  138.6561415831777,  '旧碓氷峠見晴台',  'https://tenki.jp/kouyou/3/23/30720.html',  'https://static.tenki.jp/static-images/kouyou/point/30720/square.jpg',  '紅葉の情報：モミジ'], 
			[36.793333734039784,  137.9894573881966,  '奥裾花自然園',  'https://tenki.jp/kouyou/3/23/30744.html',  'https://static.tenki.jp/static-images/kouyou/point/30744/square.jpg',  '紅葉の情報：カエデ、ブナ、ミズナラ、ナラ、ナナカマド'], 
			[36.00636502024998,  138.65440342518534,  '南相木ダム',  'https://tenki.jp/kouyou/3/23/30748.html',  'https://static.tenki.jp/static-images/kouyou/point/30748/square.jpg',  '紅葉の情報：カラマツ'], 
			[36.33681903156223,  138.63308469227817,  '軽井沢プリンスホテル',  'https://tenki.jp/kouyou/3/23/30769.html',  'https://static.tenki.jp/static-images/kouyou/point/30769/square.jpg',  '紅葉の情報：モミジ、ニシキギ、ドウダンツツジ、ナラ'], 
			[35.833771892717266,  138.06327972160278,  '高遠城址公園',  'https://tenki.jp/kouyou/3/23/30800.html',  'https://static.tenki.jp/static-images/kouyou/point/30800/square.jpg',  '紅葉の情報：カエデ'], 
			[35.45521140080089,  137.6687626534089,  '富士見台高原ロープウェイ ヘブンスそのはら',  'https://tenki.jp/kouyou/3/23/30819.html',  'https://static.tenki.jp/static-images/kouyou/point/30819/square.jpg',  '紅葉の情報：カエデ、ミズナラ、ブナ、キハダ、ダケカンバ、シラカバ、ナナカマド、カラマツ'], 
			[36.72768540172374,  137.9673320557954,  '奥裾花渓谷',  'https://tenki.jp/kouyou/3/23/30821.html',  'https://static.tenki.jp/static-images/kouyou/point/30821/square.jpg',  '紅葉の情報：カエデ、ブナ、ミズナラ、ナラ、ナナカマド'], 
			[36.05172734966497,  138.25701108827312,  '蓼科高原',  'https://tenki.jp/kouyou/3/23/35118.html',  'https://static.tenki.jp/static-images/kouyou/point/35118/square.jpg',  '紅葉の情報：モミジ、カラマツ、シラカバ、サクラ、ナナカマド'], 
			[35.93676842536806,  137.5868938186727,  '開田高原',  'https://tenki.jp/kouyou/3/23/35119.html',  'https://static.tenki.jp/static-images/kouyou/point/35119/square.jpg',  '紅葉の情報：カラマツ、ナラ'], 
			[35.73395760397015,  137.62483161545518,  '赤沢自然休養林',  'https://tenki.jp/kouyou/3/23/35120.html',  'https://static.tenki.jp/static-images/kouyou/point/35120/square.jpg',  '紅葉の情報：マルバノキ、シロモジ、コハウチワカエデ、アカヤシオ'], 
			[36.23398391094678,  138.1059089032621,  '美ケ原高原',  'https://tenki.jp/kouyou/3/23/35122.html',  'https://static.tenki.jp/static-images/kouyou/point/35122/square.jpg',  '紅葉の情報：カラマツ、レンゲツツジ、シラカバ'], 
			[36.2464650955504,  137.63563193868467,  '上高地',  'https://tenki.jp/kouyou/3/23/35124.html',  'https://static.tenki.jp/static-images/kouyou/point/35124/square.jpg',  '紅葉の情報：カラマツ、サクラ、カエデ、ヤナギ、ハンノキ'], 
			[36.450303301491005,  137.97857996462244,  '県立自然公園 差切峡',  'https://tenki.jp/kouyou/3/23/35126.html',  'https://static.tenki.jp/static-images/kouyou/point/35126/square.jpg',  '紅葉の情報：ヤマモミジ、サクラ'], 
			[36.48877274843442,  138.068807996938,  '聖高原',  'https://tenki.jp/kouyou/3/23/35127.html',  'https://static.tenki.jp/static-images/kouyou/point/35127/square.jpg',  '紅葉の情報：カラマツ、モミジ、カエデ、サクラ、シラカバ'], 
			[36.49149333183071,  137.74375168855974,  '高瀬渓谷',  'https://tenki.jp/kouyou/3/23/35129.html',  'https://static.tenki.jp/static-images/kouyou/point/35129/square.jpg',  '紅葉の情報：サクラ、カエデ、ブナ、ナナカマド'], 
			[36.70207199405511,  137.83695855071656,  '八方アルペンライン',  'https://tenki.jp/kouyou/3/23/35131.html',  'https://static.tenki.jp/static-images/kouyou/point/35131/square.jpg',  '紅葉の情報：ダケカンバ、ナナカマド'], 
			[36.77395423018179,  137.81805814990926,  '栂池自然園',  'https://tenki.jp/kouyou/3/23/35132.html',  'https://static.tenki.jp/static-images/kouyou/point/35132/square.jpg',  '紅葉の情報：ダケカンバ、ナナカマド'], 
			[36.22901087203099,  138.52936041583658,  '内山峡',  'https://tenki.jp/kouyou/3/23/35134.html',  'https://static.tenki.jp/static-images/kouyou/point/35134/square.jpg',  '紅葉の情報：カラマツ'], 
			[36.404265026051725,  138.46880603435417,  '高峰高原',  'https://tenki.jp/kouyou/3/23/35136.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ナナカマド、レンゲツツジ、ダケカンバ、カラマツ'], 
			[36.42710532794716,  138.41929364304224,  '湯の丸高原',  'https://tenki.jp/kouyou/3/23/35137.html',  'https://static.tenki.jp/static-images/kouyou/point/35137/square.jpg',  '紅葉の情報：カラマツ、レンゲツツジ、シラカバ、モミジ、ナナカマド'], 
			[36.56744359664244,  138.03433666707346,  '久米路峡',  'https://tenki.jp/kouyou/3/23/35139.html',  'https://static.tenki.jp/static-images/kouyou/point/35139/square.jpg',  '紅葉の情報：カエデ、モミジ、サクラ'], 
			[36.749750325726744,  138.06335575866882,  '戸隠高原 鏡池',  'https://tenki.jp/kouyou/3/23/35141.html',  'https://static.tenki.jp/static-images/kouyou/point/35141/square.jpg',  '紅葉の情報：ミズナラ、シラカバ、モミジ、カエデ、ウルシ'], 
			[36.82157863052629,  138.16791378267848,  '黒姫高原',  'https://tenki.jp/kouyou/3/23/35142.html',  'https://static.tenki.jp/static-images/kouyou/point/35142/square.jpg',  '紅葉の情報：モミジ、ウルシ、ナナカマド'], 
			[36.66007865301422,  138.45145725415352,  '松川渓谷',  'https://tenki.jp/kouyou/3/23/35143.html',  'https://static.tenki.jp/static-images/kouyou/point/35143/square.jpg',  '紅葉の情報：イロハモミジ、ウチワカエデ、ミネカエデ'], 
			[36.719625717175056,  138.49103823919728,  '志賀高原',  'https://tenki.jp/kouyou/3/23/35144.html',  'https://static.tenki.jp/static-images/kouyou/point/35144/square.jpg',  '紅葉の情報：ダケカンバ、シラカバ、カエデ、ヤマウルシ'], 
			[36.8335357159504,  138.49918982569167,  'カヤの平高原',  'https://tenki.jp/kouyou/3/23/35145.html',  'https://static.tenki.jp/static-images/kouyou/point/35145/square.jpg',  '紅葉の情報：ブナ、ナナカマド、カエデ、ウルシ'], 
			[36.85522610043271,  138.29694307040305,  '斑尾高原',  'https://tenki.jp/kouyou/3/23/35146.html',  'https://static.tenki.jp/static-images/kouyou/point/35146/square.jpg',  '紅葉の情報：ブナ、カラマツ、シラカバ'], 
			[36.915891248419314,  138.48573180120115,  '野沢温泉上ノ平高原',  'https://tenki.jp/kouyou/3/23/35147.html',  'https://static.tenki.jp/static-images/kouyou/point/35147/square.jpg',  '紅葉の情報：ブナ'], 
			[36.8099063058642,  138.61950102443973,  '秋山郷',  'https://tenki.jp/kouyou/3/23/35148.html',  'https://static.tenki.jp/static-images/kouyou/point/35148/square.jpg',  '紅葉の情報：ブナ、ナラ、カエデ'], 
			[37.01978413336187,  138.52524590150446,  '野々海高原',  'https://tenki.jp/kouyou/3/23/35150.html',  'https://static.tenki.jp/static-images/kouyou/point/35150/square.jpg',  '紅葉の情報：ブナ、ウルシ、ガマズミ、カエデ'], 
			[36.11236484648065,  138.31958890073165,  '大河原峠',  'https://tenki.jp/kouyou/3/23/35151.html',  'https://static.tenki.jp/static-images/kouyou/point/35151/square.jpg',  '紅葉の情報：モミジ、シラカバ、カラマツ'], 
			[36.83465633415616,  138.20810433823917,  '野尻湖',  'https://tenki.jp/kouyou/3/23/35152.html',  'https://static.tenki.jp/static-images/kouyou/point/35152/square.jpg',  '紅葉の情報：モミジ、ナナカマド、ウルシ'], 
			[36.155195307088704,  137.62543091697793,  '白骨温泉',  'https://tenki.jp/kouyou/3/23/35154.html',  'https://static.tenki.jp/static-images/kouyou/point/35154/square.jpg',  '紅葉の情報：カツラ、カエデ、ヤマザクラ、ミズナラ、カラマツ'], 
			[36.74162267554471,  138.41485300402172,  '湯田中駅前温泉 楓の湯',  'https://tenki.jp/kouyou/3/23/35155.html',  'https://static.tenki.jp/static-images/kouyou/point/35155/square.jpg',  '紅葉の情報：カエデ、サクラ'], 
			[36.987086505030184,  138.44558481763167,  'なべくら高原・森の家',  'https://tenki.jp/kouyou/3/23/35156.html',  'https://static.tenki.jp/static-images/kouyou/point/35156/square.jpg',  '紅葉の情報：ブナ、カエデ'], 
			[36.66198832623539,  137.81707608047205,  '白馬五竜アルプス平',  'https://tenki.jp/kouyou/3/23/35158.html',  'https://static.tenki.jp/static-images/kouyou/point/35158/square.jpg',  '紅葉の情報：ブナ、ナナカマド、カエデ類'], 
			[35.236600069586174,  137.44858131022616,  '奥矢作湖',  'https://tenki.jp/kouyou/5/24/30213.html',  'https://static.tenki.jp/static-images/kouyou/point/30213/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、ハナノキ'], 
			[35.54262705935928,  137.1314819197691,  '飛水峡',  'https://tenki.jp/kouyou/5/24/30214.html',  'https://static.tenki.jp/static-images/kouyou/point/30214/square.jpg',  '紅葉の情報：ヤマザクラ、モミジ、ケヤキ'], 
			[35.70464404400022,  137.18403018621072,  '中山七里',  'https://tenki.jp/kouyou/5/24/30215.html',  'https://static.tenki.jp/static-images/kouyou/point/30215/square.jpg',  '紅葉の情報：サクラ、モミジ、カエデ、コブシ'], 
			[35.55580665754003,  136.8683696538489,  '大矢田神社もみじ谷',  'https://tenki.jp/kouyou/5/24/30216.html',  'https://static.tenki.jp/static-images/kouyou/point/30216/square.jpg',  '紅葉の情報：ヤマモミジ'], 
			[35.284460660503825,  136.55208003157227,  '養老公園',  'https://tenki.jp/kouyou/5/24/30217.html',  'https://static.tenki.jp/static-images/kouyou/point/30217/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[36.10320617360128,  137.1179394271547,  '飛騨・美濃せせらぎ街道',  'https://tenki.jp/kouyou/5/24/30218.html',  'https://static.tenki.jp/static-images/kouyou/point/30218/square.jpg',  '紅葉の情報：ミズナラ、カラマツ、カツラ、ブナ、ヤマモミジ'], 
			[36.26182349164132,  136.90681742294484,  '白川郷',  'https://tenki.jp/kouyou/5/24/30220.html',  'https://static.tenki.jp/static-images/kouyou/point/30220/square.jpg',  '紅葉の情報：ブナ、ナナカマド、クリ、ミズナラ、カエデ'], 
			[35.47993198259147,  137.40677217552525,  '恵那峡',  'https://tenki.jp/kouyou/5/24/30223.html',  'https://static.tenki.jp/static-images/kouyou/point/30223/square.jpg',  '紅葉の情報：モミジ、カエデ、クヌギ、ツツジ、ブナ'], 
			[35.52969225040081,  136.52888749508145,  '揖斐峡',  'https://tenki.jp/kouyou/5/24/30234.html',  'https://static.tenki.jp/static-images/kouyou/point/30234/square.jpg',  '紅葉の情報：モミジ、ケヤキ、カシ、ブナ'], 
			[36.26799925077804,  137.57679263778053,  '新穂高温泉',  'https://tenki.jp/kouyou/5/24/30235.html',  'https://static.tenki.jp/static-images/kouyou/point/30235/square.jpg',  '紅葉の情報：ナナカマド、カエデ、シラカバ、ブナ、ミズナラ'], 
			[36.25708868038333,  136.8743524855529,  '白山白川郷ホワイトロード',  'https://tenki.jp/kouyou/5/24/30236.html',  'https://static.tenki.jp/static-images/kouyou/point/30236/square.jpg',  '紅葉の情報：ブナ、ナナカマド、ヤマウルシ、カエデ、ダケカンバ'], 
			[35.69910584335303,  137.42607897685437,  '付知峡',  'https://tenki.jp/kouyou/5/24/30237.html',  'https://static.tenki.jp/static-images/kouyou/point/30237/square.jpg',  '紅葉の情報：カエデ、ドウダンツツジ、ブナ、モミジ、クヌギ'], 
			[36.13251286153743,  137.23508846279898,  '飛騨の里',  'https://tenki.jp/kouyou/5/24/30258.html',  'https://static.tenki.jp/static-images/kouyou/point/30258/square.jpg',  '紅葉の情報：カエデ、モミジ、サクラ、ブナ'], 
			[35.99220072456623,  137.27521470655077,  '女男滝公園',  'https://tenki.jp/kouyou/5/24/30260.html',  'https://static.tenki.jp/static-images/kouyou/point/30260/square.jpg',  '紅葉の情報：カエデ、モミジ、クヌギ、クルミ、ケヤキ'], 
			[35.81183706089099,  136.92418117016922,  '古今伝授の里フィールドミュージアム',  'https://tenki.jp/kouyou/5/24/30261.html',  'https://static.tenki.jp/static-images/kouyou/point/30261/square.jpg',  '紅葉の情報：モミジ、カツラ、ケヤキ、ラクウショウ'], 
			[35.6774128868274,  137.13630669486497,  '横谷峡(四つの滝)',  'https://tenki.jp/kouyou/5/24/30262.html',  'https://static.tenki.jp/static-images/kouyou/point/30262/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ、サツキツツジ'], 
			[35.969513678181634,  137.52280185903578,  '日和田高原',  'https://tenki.jp/kouyou/5/24/30270.html',  'https://static.tenki.jp/static-images/kouyou/point/30270/square.jpg',  '紅葉の情報：カエデ、ナラ、ナナカマド、シラカバ、カラマツ'], 
			[35.37173616058529,  136.44872787132383,  '伊吹山ドライブウェイ',  'https://tenki.jp/kouyou/5/24/30279.html',  'https://static.tenki.jp/static-images/kouyou/point/30279/square.jpg',  '紅葉の情報：ブナ、ナラ、オオイタヤメイゲツ、カエデ、ヤマモミジ'], 
			[35.91396579970139,  137.32958200663174,  'がんだて公園',  'https://tenki.jp/kouyou/5/24/30743.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、ヤマウルシ、ヤマザクラ'], 
			[35.09592864494282,  138.8750957274261,  '香貫山',  'https://tenki.jp/kouyou/5/25/30195.html',  'https://static.tenki.jp/static-images/kouyou/point/30195/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ、ハゼノキ、ドウダンツツジ'], 
			[34.97132463052519,  139.08177015830964,  '丸山公園',  'https://tenki.jp/kouyou/5/25/30197.html',  'https://static.tenki.jp/static-images/kouyou/point/30197/square.jpg',  '紅葉の情報：モミジ'], 
			[34.92962340745847,  139.102119327407,  '一碧湖',  'https://tenki.jp/kouyou/5/25/30198.html',  'https://static.tenki.jp/static-images/kouyou/point/30198/square.jpg',  '紅葉の情報：モミジ'], 
			[35.17133994080373,  138.87379251023796,  '駿河平大通り',  'https://tenki.jp/kouyou/5/25/30199.html',  'https://static.tenki.jp/static-images/kouyou/point/30199/square.jpg',  '紅葉の情報：イチョウ'], 
			[34.84692617386229,  137.90006847945958,  '小國神社',  'https://tenki.jp/kouyou/5/25/30200.html',  'https://static.tenki.jp/static-images/kouyou/point/30200/square.jpg',  '紅葉の情報：モミジ'], 
			[34.85555839961515,  137.9153373952464,  '大洞院',  'https://tenki.jp/kouyou/5/25/30201.html',  'https://static.tenki.jp/static-images/kouyou/point/30201/square.jpg',  '紅葉の情報：モミジ'], 
			[34.99119357099224,  137.78077267836508,  '白倉峡',  'https://tenki.jp/kouyou/5/25/30202.html',  'https://static.tenki.jp/static-images/kouyou/point/30202/square.jpg',  '紅葉の情報：モミジ'], 
			[35.30606575061794,  138.33738365206793,  '梅ヶ島温泉',  'https://tenki.jp/kouyou/5/25/30204.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、ウルシ、ブナ'], 
			[34.79840543496871,  138.93271829299843,  '河津七滝',  'https://tenki.jp/kouyou/5/25/30206.html',  'https://static.tenki.jp/static-images/kouyou/point/30206/square.jpg',  '紅葉の情報：カエデ、ウルシ、モミジ'], 
			[34.88447468449159,  138.15585946817637,  '千葉山ハイキングコース',  'https://tenki.jp/kouyou/5/25/30207.html',  'https://static.tenki.jp/static-images/kouyou/point/30207/square.jpg',  '紅葉の情報：ドウダンツツジ'], 
			[34.97697456434053,  138.90828528850483,  '修善寺虹の郷',  'https://tenki.jp/kouyou/5/25/30224.html',  'https://static.tenki.jp/static-images/kouyou/point/30224/square.jpg',  '紅葉の情報：モミジ、ラクウショウ、アメリカフウ'], 
			[35.17660280813837,  138.118040944914,  '寸又峡',  'https://tenki.jp/kouyou/5/25/30226.html',  'https://static.tenki.jp/static-images/kouyou/point/30226/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[35.09761289587248,  139.05945288421637,  '熱海梅園',  'https://tenki.jp/kouyou/5/25/30238.html',  'https://static.tenki.jp/static-images/kouyou/point/30238/square.jpg',  '紅葉の情報：イロハモミジ、ムサシノ、イチジョウ'], 
			[34.78470993953364,  137.93613083882994,  '油山寺',  'https://tenki.jp/kouyou/5/25/30271.html',  'https://static.tenki.jp/static-images/kouyou/point/30271/square.jpg',  '紅葉の情報：モミジ'], 
			[34.85532498963663,  138.92143577783287,  '昭和の森会館',  'https://tenki.jp/kouyou/5/25/30722.html',  'https://static.tenki.jp/static-images/kouyou/point/30722/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ、ケヤキ'], 
			[34.978070401560196,  138.9133943348501,  '修善寺自然公園(もみじ林)',  'https://tenki.jp/kouyou/5/25/30833.html',  'https://static.tenki.jp/static-images/kouyou/point/30833/square.jpg',  '紅葉の情報：モミジ'], 
			[35.22154641032611,  137.65565539715712,  '茶臼山高原',  'https://tenki.jp/kouyou/5/26/30208.html',  'https://static.tenki.jp/static-images/kouyou/point/30208/square.jpg',  '紅葉の情報：ナナカマド、ダケカンバ、モミジ、ブナ、カエデ'], 
			[34.939337993269234,  137.399105250233,  'くらがり渓谷',  'https://tenki.jp/kouyou/5/26/30228.html',  'https://static.tenki.jp/static-images/kouyou/point/30228/square.jpg',  '紅葉の情報：カエデ、ケヤキ、クヌギ'], 
			[35.13994037078632,  136.9624841894881,  '八事山興正寺',  'https://tenki.jp/kouyou/5/26/30229.html',  'https://static.tenki.jp/static-images/kouyou/point/30229/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.119498531429024,  137.47562771176527,  '段戸裏谷原生林きららの森',  'https://tenki.jp/kouyou/5/26/30245.html',  'https://static.tenki.jp/static-images/kouyou/point/30245/square.jpg',  '紅葉の情報：ブナ、ミズナラ、カエデ、モミジ'], 
			[35.280424227843,  137.090713325998,  '定光寺・定光寺公園',  'https://tenki.jp/kouyou/5/26/30251.html',  'https://static.tenki.jp/static-images/kouyou/point/30251/square.jpg',  '紅葉の情報：カエデ、ヤマモミジ'], 
			[35.230085530224166,  137.28430907236512,  '小原(四季桜と紅葉)',  'https://tenki.jp/kouyou/5/26/30252.html',  'https://static.tenki.jp/static-images/kouyou/point/30252/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.396104138147244,  136.962279779186,  '犬山寂光院',  'https://tenki.jp/kouyou/5/26/30253.html',  'https://static.tenki.jp/static-images/kouyou/point/30253/square.jpg',  '紅葉の情報：イロハモミジ、カエデ'], 
			[35.20976763463377,  137.50926699821252,  '大井平公園',  'https://tenki.jp/kouyou/5/26/30274.html',  'https://static.tenki.jp/static-images/kouyou/point/30274/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ、ドウダンツツジ'], 
			[34.9947004289816,  137.62641525709225,  '愛知県民の森',  'https://tenki.jp/kouyou/5/26/30277.html',  'https://static.tenki.jp/static-images/kouyou/point/30277/square.jpg',  '紅葉の情報：ハナノキ、モミジ、カエデ'], 
			[35.15426071832698,  136.98151011968068,  '東山動植物園',  'https://tenki.jp/kouyou/5/26/30285.html',  'https://static.tenki.jp/static-images/kouyou/point/30285/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ、コハウチワカエデ、ハナノキ、メグスリノキ'], 
			[35.188499403724485,  137.4670964186378,  'タカドヤ湿地',  'https://tenki.jp/kouyou/5/26/30827.html',  'https://static.tenki.jp/static-images/kouyou/point/30827/square.jpg',  '紅葉の情報：オオモミジ、イロハモミジ'], 
			[34.56330960248447,  136.08564550608685,  '赤目四十八滝',  'https://tenki.jp/kouyou/5/27/30210.html',  'https://static.tenki.jp/static-images/kouyou/point/30210/square.jpg',  '紅葉の情報：モミジ、カエデ、ウルシ、ブナ'], 
			[35.01537068967379,  136.44718253966423,  '湯の山温泉',  'https://tenki.jp/kouyou/5/27/30232.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ツツジ科(40数種)'], 
			[34.56842703475941,  136.11628757882326,  '香落渓',  'https://tenki.jp/kouyou/5/27/30239.html',  'https://static.tenki.jp/static-images/kouyou/point/30239/square.jpg',  '紅葉の情報：モミジ、カエデ、ウルシ、イチョウ、ヤマザクラ'], 
			[34.857280076422434,  136.45030884323234,  '亀山公園',  'https://tenki.jp/kouyou/5/27/30263.html',  'https://static.tenki.jp/static-images/kouyou/point/30263/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[34.77152302290525,  136.1284254410071,  '上野公園',  'https://tenki.jp/kouyou/5/27/30264.html',  'https://static.tenki.jp/static-images/kouyou/point/30264/square.jpg',  '紅葉の情報：モミジ、その他'], 
			[34.45462883947459,  136.72297197536807,  '伊勢神宮内宮神苑・風日祈宮橋周辺',  'https://tenki.jp/kouyou/5/27/30265.html',  'https://static.tenki.jp/static-images/kouyou/point/30265/square.jpg',  '紅葉の情報：モミジ'], 
			[35.01968946892575,  136.42458792644388,  '御在所(山上)',  'https://tenki.jp/kouyou/5/27/30700.html',  'https://static.tenki.jp/static-images/kouyou/point/30700/square.jpg',  '紅葉の情報：ベニドウダン、アカヤシオ、シロヤシオ、シロモジ、サラサドウダン'], 
			[35.01842890872491,  136.4341149191671,  '御在所(中腹)',  'https://tenki.jp/kouyou/5/27/30753.html',  'https://static.tenki.jp/static-images/kouyou/point/30753/square.jpg',  '紅葉の情報：アカヤシオ、シロヤシオ、ベニドウダン、シロモジ、マンサク'], 
			[35.01685251601373,  136.44660857489455,  '御在所(山麓)',  'https://tenki.jp/kouyou/5/27/30754.html',  'https://static.tenki.jp/static-images/kouyou/point/30754/square.jpg',  '紅葉の情報：ヤマモミジ、アカシデ、シロモジ、コアジサイ、クロモジ'], 
			[35.277903028620095,  136.25396050040737,  '彦根城・名勝 玄宮楽々園',  'https://tenki.jp/kouyou/6/28/30240.html',  'https://static.tenki.jp/static-images/kouyou/point/30240/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[35.37512171917188,  136.35859127480418,  '三島池',  'https://tenki.jp/kouyou/6/28/30241.html',  'https://static.tenki.jp/static-images/kouyou/point/30241/square.jpg',  '紅葉の情報：サクラ、ヤナギ、モミジ、マテバシイ、サンゴジュ'], 
			[34.983937172451824,  136.17198809339266,  '大池寺',  'https://tenki.jp/kouyou/6/28/30244.html',  'https://static.tenki.jp/static-images/kouyou/point/30244/square.jpg',  '紅葉の情報：モミジ'], 
			[35.300276542203676,  136.33975635716803,  '醒井養鱒場',  'https://tenki.jp/kouyou/6/28/30275.html',  'https://static.tenki.jp/static-images/kouyou/point/30275/square.jpg',  '紅葉の情報：モミジ'], 
			[35.1180232737549,  136.18168649059925,  '太郎坊宮',  'https://tenki.jp/kouyou/6/28/30286.html',  'https://static.tenki.jp/static-images/kouyou/point/30286/square.jpg',  '紅葉の情報：モミジ、カエデ、クスノキ'], 
			[35.161632003463865,  136.16444812306932,  '石馬寺',  'https://tenki.jp/kouyou/6/28/30287.html',  'https://static.tenki.jp/static-images/kouyou/point/30287/square.jpg',  '紅葉の情報：モミジ'], 
			[35.00644165850044,  136.11255494676917,  '善水寺(湖南三山)',  'https://tenki.jp/kouyou/6/28/30289.html',  'https://static.tenki.jp/static-images/kouyou/point/30289/square.jpg',  '紅葉の情報：モミジ、イチョウ、ドウダンツツジ、タカノツメ'], 
			[34.96063785297199,  135.9059962134685,  '石山寺',  'https://tenki.jp/kouyou/6/28/36103.html',  'https://static.tenki.jp/static-images/kouyou/point/36103/square.jpg',  '紅葉の情報：ヤマモミジ、オオモミジ、イロハモミジ'], 
			[35.161262437303364,  136.28308001404807,  '金剛輪寺(湖東三山)',  'https://tenki.jp/kouyou/6/28/36547.html',  'https://static.tenki.jp/static-images/kouyou/point/36547/square.jpg',  '紅葉の情報：モミジ'], 
			[35.12659265795029,  136.28897334324222,  '「国史跡」釈迦山 百済寺(湖東三山)',  'https://tenki.jp/kouyou/6/28/36548.html',  'https://static.tenki.jp/static-images/kouyou/point/36548/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ、ハナノキ、ミツマタ、ドウダンツツジ'], 
			[35.18329152950194,  136.28547563625344,  '西明寺(湖東三山)',  'https://tenki.jp/kouyou/6/28/36552.html',  'https://static.tenki.jp/static-images/kouyou/point/36552/square.jpg',  '紅葉の情報：カエデ、ドウダンツツジ'], 
			[35.08049541149188,  136.3199423798025,  '永源寺',  'https://tenki.jp/kouyou/6/28/36553.html',  'https://static.tenki.jp/static-images/kouyou/point/36553/square.jpg',  '紅葉の情報：ヤマモミジ'], 
			[35.071375426597925,  135.86388318160795,  '日吉大社',  'https://tenki.jp/kouyou/6/28/36554.html',  'https://static.tenki.jp/static-images/kouyou/point/36554/square.jpg',  '紅葉の情報：モミジ、カツラ'], 
			[35.070456998497185,  135.84091762813682,  '奥比叡・延暦寺境内',  'https://tenki.jp/kouyou/6/28/36565.html',  'https://static.tenki.jp/static-images/kouyou/point/36565/square.jpg',  '紅葉の情報：モミジ、カエデ、ノムラ'], 
			[35.19370330255315,  135.91648865175634,  'びわ湖バレイ',  'https://tenki.jp/kouyou/6/28/36587.html',  'https://static.tenki.jp/static-images/kouyou/point/36587/square.jpg',  '紅葉の情報：カエデ、ミズナラ、ナラ、ブナ'], 
			[35.01338722342586,  135.85285160161365,  '三井寺(園城寺)',  'https://tenki.jp/kouyou/6/28/36668.html',  'https://static.tenki.jp/static-images/kouyou/point/36668/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.98530867211467,  136.05989084193516,  '長寿寺(湖南三山)',  'https://tenki.jp/kouyou/6/28/36669.html',  'https://static.tenki.jp/static-images/kouyou/point/36669/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.08116126831561,  135.86638079324484,  '西教寺',  'https://tenki.jp/kouyou/6/28/36674.html',  'https://static.tenki.jp/static-images/kouyou/point/36674/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[35.02089033979284,  135.6137872673461,  '保津渓谷',  'https://tenki.jp/kouyou/6/29/30342.html',  'https://static.tenki.jp/static-images/kouyou/point/30342/square.jpg',  '紅葉の情報：モミジ'], 
			[35.476224002793764,  135.44732357499882,  '金剛院(舞鶴)',  'https://tenki.jp/kouyou/6/29/30343.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハモミジ'], 
			[34.94414020175325,  135.69711012210965,  '向日神社',  'https://tenki.jp/kouyou/6/29/30346.html',  'https://static.tenki.jp/static-images/kouyou/point/30346/square.jpg',  '紅葉の情報：サクラ、モミジ'], 
			[34.79270764977685,  135.90290845044862,  '正法寺',  'https://tenki.jp/kouyou/6/29/30347.html',  'https://static.tenki.jp/static-images/kouyou/point/30347/square.jpg',  '紅葉の情報：ヤマモミジ、イチョウ'], 
			[34.74775521490388,  135.77853314427384,  '京都府立関西文化学術研究都市記念公園(けいはんな記念公園)',  'https://tenki.jp/kouyou/6/29/30707.html',  'https://static.tenki.jp/static-images/kouyou/point/30707/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、オオモミジ'], 
			[35.13628707150309,  135.7088870728849,  '志明院',  'https://tenki.jp/kouyou/6/29/30752.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ヤマモミジ、ナラ類、イチョウ、その他'], 
			[35.03119964329375,  135.73509617226537,  '北野天満宮「史跡 御土居もみじ苑」',  'https://tenki.jp/kouyou/6/29/30757.html',  'https://static.tenki.jp/static-images/kouyou/point/30757/square.jpg',  '紅葉の情報：イロハモミジ、ハウチワカエデ、ノムラ、オオモミジ、イチギョウジ'], 
			[35.04506948068972,  135.79693541798898,  '圓光寺',  'https://tenki.jp/kouyou/6/29/30777.html',  'https://static.tenki.jp/static-images/kouyou/point/30777/square.jpg',  '紅葉の情報：モミジ'], 
			[35.01538170796921,  135.7957697128551,  '哲学の道',  'https://tenki.jp/kouyou/6/29/30778.html',  'https://static.tenki.jp/static-images/kouyou/point/30778/square.jpg',  '紅葉の情報：サクラ、イロハモミジ'], 
			[35.028234483243196,  135.7138040864849,  '仁和寺',  'https://tenki.jp/kouyou/6/29/30779.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、サクラ'], 
			[35.03428692278012,  135.7183906414444,  '龍安寺',  'https://tenki.jp/kouyou/6/29/30780.html',  'https://static.tenki.jp/static-images/kouyou/point/30780/square.jpg',  '紅葉の情報：モミジ'], 
			[34.95107926690187,  135.82459874103876,  '醍醐寺',  'https://tenki.jp/kouyou/6/29/30781.html',  'https://static.tenki.jp/static-images/kouyou/point/30781/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ、イチョウ、ハゼ'], 
			[34.97817716981376,  135.78128364369528,  '泉涌寺',  'https://tenki.jp/kouyou/6/29/30799.html',  'https://static.tenki.jp/static-images/kouyou/point/30799/square.jpg',  '紅葉の情報：モミジ'], 
			[34.93805449983097,  135.64456843516206,  '善峯寺',  'https://tenki.jp/kouyou/6/29/30807.html',  'https://static.tenki.jp/static-images/kouyou/point/30807/square.jpg',  '紅葉の情報：オオモミジ、ノムラモミジ、イロハモミジ、ヤマモミジ'], 
			[34.87964993446346,  135.70005386187864,  '石清水八幡宮',  'https://tenki.jp/kouyou/6/29/30811.html',  'https://static.tenki.jp/static-images/kouyou/point/30811/square.jpg',  '紅葉の情報：カエデ、ノムラカエデ、ショウジョウカエデ、イチョウ、モミジ'], 
			[34.95949031611885,  135.81630746584858,  '隨心院',  'https://tenki.jp/kouyou/6/29/30825.html',  'https://static.tenki.jp/static-images/kouyou/point/30825/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[34.98707858604429,  135.74421217733544,  '梅小路公園',  'https://tenki.jp/kouyou/6/29/30826.html',  'https://static.tenki.jp/static-images/kouyou/point/30826/square.jpg',  '紅葉の情報：イロハモミジ、モミジ、ニシキギ、ドウダンツツジ'], 
			[35.0195969438078,  135.66979474957122,  '常寂光寺',  'https://tenki.jp/kouyou/6/29/36549.html',  'https://static.tenki.jp/static-images/kouyou/point/36549/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ、ノムラモミジ'], 
			[35.0215652829921,  135.71902373469186,  '妙心寺退蔵院(余香苑)',  'https://tenki.jp/kouyou/6/29/36550.html',  'https://static.tenki.jp/static-images/kouyou/point/36550/square.jpg',  '紅葉の情報：モミジ、ノムラモミジ、ドウダンツツジ'], 
			[35.00069776318436,  135.78107525716447,  '高台寺',  'https://tenki.jp/kouyou/6/29/36551.html',  'https://static.tenki.jp/static-images/kouyou/point/36551/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.99633344352561,  135.57725411432284,  '鍬山神社',  'https://tenki.jp/kouyou/6/29/36555.html',  'https://static.tenki.jp/static-images/kouyou/point/36555/square.jpg',  '紅葉の情報：モミジ、イロハモミジ、ノムラ、ドウダンツツジ'], 
			[34.889506551010335,  135.8130152820502,  '興聖寺',  'https://tenki.jp/kouyou/6/29/36556.html',  'https://static.tenki.jp/static-images/kouyou/point/36556/square.jpg',  '紅葉の情報：モミジ'], 
			[34.96141595652518,  135.80715043664958,  '勧修寺',  'https://tenki.jp/kouyou/6/29/36557.html',  'https://static.tenki.jp/static-images/kouyou/point/36557/square.jpg',  '紅葉の情報：モミジ、ハゼ、イチョウ'], 
			[35.01449576972309,  135.79529077012612,  '永観堂',  'https://tenki.jp/kouyou/6/29/36558.html',  'https://static.tenki.jp/static-images/kouyou/point/36558/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ、ノムラモミジ'], 
			[35.11965528475855,  135.83441159086826,  '三千院門跡',  'https://tenki.jp/kouyou/6/29/36559.html',  'https://static.tenki.jp/static-images/kouyou/point/36559/square.jpg',  '紅葉の情報：モミジ'], 
			[34.977354042022206,  135.77347256684604,  '東福寺通天橋',  'https://tenki.jp/kouyou/6/29/36560.html',  'https://static.tenki.jp/static-images/kouyou/point/36560/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、トウカエデ、ノムラモミジ'], 
			[35.05477367006383,  135.6696772748594,  '高雄山神護寺',  'https://tenki.jp/kouyou/6/29/36561.html',  'https://static.tenki.jp/static-images/kouyou/point/36561/square.jpg',  '紅葉の情報：モミジ'], 
			[35.011482224409086,  135.67492196942996,  '嵐山',  'https://tenki.jp/kouyou/6/29/36562.html',  'https://static.tenki.jp/static-images/kouyou/point/36562/square.jpg',  '紅葉の情報：モミジ'], 
			[34.93891653118061,  135.67860769714395,  '光明寺',  'https://tenki.jp/kouyou/6/29/36563.html',  'https://static.tenki.jp/static-images/kouyou/point/36563/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ'], 
			[35.07886060118436,  135.78168815229083,  '岩倉実相院門跡',  'https://tenki.jp/kouyou/6/29/36564.html',  'https://static.tenki.jp/static-images/kouyou/point/36564/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ'], 
			[34.9949983094245,  135.78504190913418,  '清水寺',  'https://tenki.jp/kouyou/6/29/36567.html',  'https://static.tenki.jp/static-images/kouyou/point/36567/square.jpg',  '紅葉の情報：ヤマモミジ'], 
			[35.04695304051926,  135.76301684352734,  '京都府立植物園',  'https://tenki.jp/kouyou/6/29/36568.html',  'https://static.tenki.jp/static-images/kouyou/point/36568/square.jpg',  '紅葉の情報：イロハモミジ、メタセコイア、ニシキギ、フウ、ランシンボク'], 
			[35.05946570519471,  135.75246737723666,  '賀茂別雷神社(上賀茂神社)',  'https://tenki.jp/kouyou/6/29/36569.html',  'https://static.tenki.jp/static-images/kouyou/point/36569/square.jpg',  '紅葉の情報：モミジ、イチョウ、エノキ'], 
			[35.03730310642086,  135.77257499552283,  '下鴨神社',  'https://tenki.jp/kouyou/6/29/36570.html',  'https://static.tenki.jp/static-images/kouyou/point/36570/square.jpg',  '紅葉の情報：ニレ、モミジ'], 
			[34.75468679339082,  135.94221690498995,  '笠置山もみじ公園',  'https://tenki.jp/kouyou/6/29/36571.html',  'https://static.tenki.jp/static-images/kouyou/point/36571/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.71553067557642,  135.87270972430326,  '浄瑠璃寺',  'https://tenki.jp/kouyou/6/29/36572.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ'], 
			[35.00132462455622,  135.81870367160008,  '毘沙門堂',  'https://tenki.jp/kouyou/6/29/36577.html',  'https://static.tenki.jp/static-images/kouyou/point/36577/square.jpg',  '紅葉の情報：モミジ、カエデ、ドウダンツツジ'], 
			[35.00344750633747,  135.7813481936334,  '円山公園',  'https://tenki.jp/kouyou/6/29/36580.html',  'https://static.tenki.jp/static-images/kouyou/point/36580/square.jpg',  '紅葉の情報：モミジ'], 
			[35.004332434181755,  135.78150915623567,  '浄土宗 総本山知恩院',  'https://tenki.jp/kouyou/6/29/36588.html',  'https://static.tenki.jp/static-images/kouyou/point/36588/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[34.950525793339516,  135.74663642430505,  '城南宮 神苑 楽水苑',  'https://tenki.jp/kouyou/6/29/36589.html',  'https://static.tenki.jp/static-images/kouyou/point/36589/square.jpg',  '紅葉の情報：イロハカエデ'], 
			[35.01575861792289,  135.67360379758335,  '天龍寺',  'https://tenki.jp/kouyou/6/29/36590.html',  'https://static.tenki.jp/static-images/kouyou/point/36590/square.jpg',  '紅葉の情報：カエデ、ドウダンツツジ、ハナミズキ、サクラ'], 
			[35.02240769781443,  135.6737904406283,  '宝筐院',  'https://tenki.jp/kouyou/6/29/36591.html',  'https://static.tenki.jp/static-images/kouyou/point/36591/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ、オオモミジ、ドウダンツツジ'], 
			[35.02153357989473,  135.66750177138746,  '二尊院',  'https://tenki.jp/kouyou/6/29/36596.html',  'https://static.tenki.jp/static-images/kouyou/point/36596/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[35.02809903006111,  135.67916489365888,  '旧嵯峨御所 大本山大覚寺',  'https://tenki.jp/kouyou/6/29/36598.html',  'https://static.tenki.jp/static-images/kouyou/point/36598/square.jpg',  '紅葉の情報：サクラ、モミジ'], 
			[34.900616368511,  135.8192544927542,  '三室戸寺',  'https://tenki.jp/kouyou/6/29/36670.html',  'https://static.tenki.jp/static-images/kouyou/point/36670/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ、クヌギ'], 
			[34.37121506845887,  135.44868496202568,  '牛滝山 大威徳寺',  'https://tenki.jp/kouyou/6/30/30351.html',  'https://static.tenki.jp/static-images/kouyou/point/30351/square.jpg',  '紅葉の情報：カエデ、イチョウ'], 
			[34.80819879411408,  135.53236257680413,  '万博記念公園',  'https://tenki.jp/kouyou/6/30/30352.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、プラタナス、ケヤキ'], 
			[34.87553571495881,  135.58659782018407,  '摂津峡公園',  'https://tenki.jp/kouyou/6/30/30353.html',  'https://static.tenki.jp/static-images/kouyou/point/30353/square.jpg',  '紅葉の情報：モミジ、サクラ'], 
			[34.47479230778939,  135.6525888889658,  '弘川寺',  'https://tenki.jp/kouyou/6/30/30750.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハモミジ、ヤマモミジ、サクラ、コナラ、クヌギ、ドウダンツツジ'], 
			[34.68470552044342,  135.5333138379077,  '大阪城公園',  'https://tenki.jp/kouyou/6/30/36600.html',  'https://static.tenki.jp/static-images/kouyou/point/36600/square.jpg',  '紅葉の情報：イチョウ、サクラ、ケヤキ、ハゼ'], 
			[34.865830126180704,  135.4911054262025,  '勝運の寺 勝尾寺',  'https://tenki.jp/kouyou/6/30/36602.html',  'https://static.tenki.jp/static-images/kouyou/point/36602/square.jpg',  '紅葉の情報：モミジ、イロハカエデ、イチョウ、ドウダンツツジ、サクラ'], 
			[35.460817834095295,  134.87418195263112,  '出石城跡',  'https://tenki.jp/kouyou/6/31/30338.html',  'https://static.tenki.jp/static-images/kouyou/point/30338/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.217094720057645,  134.51206038644702,  '赤西渓谷',  'https://tenki.jp/kouyou/6/31/30339.html',  'https://static.tenki.jp/static-images/kouyou/point/30339/square.jpg',  '紅葉の情報：カエデ、ケヤキ'], 
			[35.236363121259096,  134.51846249989893,  '音水渓谷',  'https://tenki.jp/kouyou/6/31/30340.html',  'https://static.tenki.jp/static-images/kouyou/point/30340/square.jpg',  '紅葉の情報：カエデ、ブナ、ミズナラ'], 
			[35.553462106146334,  134.48891688771528,  '清正公園',  'https://tenki.jp/kouyou/6/31/30341.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[35.11265052958273,  135.14479982695246,  '高蔵寺',  'https://tenki.jp/kouyou/6/31/30355.html',  'https://static.tenki.jp/static-images/kouyou/point/30355/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[35.00803174118179,  134.537978165957,  '最上山公園もみじ山',  'https://tenki.jp/kouyou/6/31/30366.html',  'https://static.tenki.jp/static-images/kouyou/point/30366/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、ユリノキ、ノムラカエデ、シュガーメープル(サトウカエデ)、トウカエデ'], 
			[35.35397525709282,  134.51393905819714,  '氷ノ山',  'https://tenki.jp/kouyou/6/31/30369.html',  'https://static.tenki.jp/static-images/kouyou/point/30369/square.jpg',  '紅葉の情報：ブナ、カエデ、ナナカマド、ミズナラ、ツツジ'], 
			[35.10014515306882,  135.0256898008599,  '石龕寺',  'https://tenki.jp/kouyou/6/31/30370.html',  'https://static.tenki.jp/static-images/kouyou/point/30370/square.jpg',  '紅葉の情報：ヤマモミジ'], 
			[35.19804705982447,  134.50183885526624,  '原不動滝',  'https://tenki.jp/kouyou/6/31/30371.html',  'https://static.tenki.jp/static-images/kouyou/point/30371/square.jpg',  '紅葉の情報：ブナ、カエデ'], 
			[35.2454633697203,  134.97265357745636,  '高源寺',  'https://tenki.jp/kouyou/6/31/30372.html',  'https://static.tenki.jp/static-images/kouyou/point/30372/square.jpg',  '紅葉の情報：イロハカエデ、モミジ、テンモクカエデ'], 
			[35.1587291901266,  134.65955242383652,  '福知渓谷',  'https://tenki.jp/kouyou/6/31/30373.html',  'https://static.tenki.jp/static-images/kouyou/point/30373/square.jpg',  '紅葉の情報：モミジ、クヌギ'], 
			[35.62805639929106,  134.81467335884818,  '城崎温泉東山公園',  'https://tenki.jp/kouyou/6/31/30726.html',  'https://static.tenki.jp/static-images/kouyou/point/30726/square.jpg',  '紅葉の情報：モミジ'], 
			[35.19607869832185,  135.0938133370177,  '白毫寺',  'https://tenki.jp/kouyou/6/31/30759.html',  'https://static.tenki.jp/static-images/kouyou/point/30759/square.jpg',  '紅葉の情報：ノムラモミジ(大小)、ムクロジ(大)、ヤマモミジ'], 
			[35.07749571524189,  134.92471962477316,  '多可町余暇村公園',  'https://tenki.jp/kouyou/6/31/30820.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハカエデ、トウカエデ、ソメイヨシノ、ケヤキ、コブシ 他'], 
			[35.07290441267749,  135.22857932941122,  '王地山公園',  'https://tenki.jp/kouyou/6/31/30822.html',  'https://static.tenki.jp/static-images/kouyou/point/30822/square.jpg',  '紅葉の情報：モミジ'], 
			[35.29936098666762,  134.83556494729478,  '竹田寺町通り',  'https://tenki.jp/kouyou/6/31/30832.html',  'https://static.tenki.jp/static-images/kouyou/point/30832/square.jpg',  '紅葉の情報：モミジ'], 
			[34.85469509009971,  135.30109098975564,  '武田尾温泉',  'https://tenki.jp/kouyou/6/31/36576.html',  'https://static.tenki.jp/static-images/kouyou/point/36576/square.jpg',  '紅葉の情報：カエデ'], 
			[34.79489723962035,  135.25609109297426,  '瑞宝寺公園',  'https://tenki.jp/kouyou/6/31/36581.html',  'https://static.tenki.jp/static-images/kouyou/point/36581/square.jpg',  '紅葉の情報：カエデ、イチョウ、サクラ'], 
			[34.76632234301109,  135.2470595942246,  '六甲有馬ロープウェー(六甲山)',  'https://tenki.jp/kouyou/6/31/36582.html',  'https://static.tenki.jp/static-images/kouyou/point/36582/square.jpg',  '紅葉の情報：カエデ、ブナ、コブシ、モミジ、ウルシ'], 
			[34.73732769741765,  135.18089581535722,  '神戸市立森林植物園',  'https://tenki.jp/kouyou/6/31/36583.html',  'https://static.tenki.jp/static-images/kouyou/point/36583/square.jpg',  '紅葉の情報：イロハモミジ、ウリハダカエデ、モミジバフウ、ハナノキ、オオモミジ'], 
			[34.89112932746886,  134.65750020702546,  '書寫山圓教寺',  'https://tenki.jp/kouyou/6/31/36584.html',  'https://static.tenki.jp/static-images/kouyou/point/36584/square.jpg',  '紅葉の情報：モミジバフウ、タカオモミジ、オオモミジ、イチョウ'], 
			[34.70421459328203,  135.19391631618265,  '神戸布引ハーブ園/ロープウェイ',  'https://tenki.jp/kouyou/6/31/36593.html',  'https://static.tenki.jp/static-images/kouyou/point/36593/square.jpg',  '紅葉の情報：ヤマモミジ、ヤマザクラ、ヤマハゼ、コナラ、ウルシ'], 
			[34.65319343347237,  135.12070241536836,  '神戸市立須磨離宮公園',  'https://tenki.jp/kouyou/6/31/36594.html',  'https://static.tenki.jp/static-images/kouyou/point/36594/square.jpg',  '紅葉の情報：イロハモミジ、メタセコイア、ハゼノキ、タイワンフウ、カツラ'], 
			[34.83786893119824,  134.6899501923796,  '姫路城西御屋敷跡庭園 好古園',  'https://tenki.jp/kouyou/6/31/36599.html',  'https://static.tenki.jp/static-images/kouyou/point/36599/square.jpg',  '紅葉の情報：イタヤカエデ、ヤマモミジ、ハウチワカエデ、サクラ'], 
			[34.76181071671194,  135.24010732643677,  '六甲高山植物園',  'https://tenki.jp/kouyou/6/31/36603.html',  'https://static.tenki.jp/static-images/kouyou/point/36603/square.jpg',  '紅葉の情報：カエデ類、コアジサイ、ドウダンツツジ、カラマツ、ブナ'], 
			[34.6497246628153,  135.1118002751285,  '須磨寺',  'https://tenki.jp/kouyou/6/31/36675.html',  'https://static.tenki.jp/static-images/kouyou/point/36675/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[34.53587553412015,  135.90681552106588,  '長谷寺',  'https://tenki.jp/kouyou/6/32/30360.html',  'https://static.tenki.jp/static-images/kouyou/point/30360/square.jpg',  '紅葉の情報：モミジ'], 
			[34.42917135668299,  135.82723426308888,  '高取城跡',  'https://tenki.jp/kouyou/6/32/30361.html',  'https://static.tenki.jp/static-images/kouyou/point/30361/square.jpg',  '紅葉の情報：モミジ、クヌギ、ブナ、カエデ'], 
			[34.536588734928735,  136.0399103721283,  '室生寺',  'https://tenki.jp/kouyou/6/32/30363.html',  'https://static.tenki.jp/static-images/kouyou/point/30363/square.jpg',  '紅葉の情報：モミジ'], 
			[34.544662355077385,  135.94305526842993,  '鳥見山公園',  'https://tenki.jp/kouyou/6/32/30727.html',  'https://static.tenki.jp/static-images/kouyou/point/30727/square.jpg',  '紅葉の情報：モミジ'], 
			[34.35047468147016,  135.87787064424214,  '吉野山(上千本)',  'https://tenki.jp/kouyou/6/32/30808.html',  'https://static.tenki.jp/static-images/kouyou/point/30808/square.jpg',  '紅葉の情報：シロヤマザクラ、カエデ'], 
			[34.37327284368743,  135.8542802619185,  '吉野山(下千本)',  'https://tenki.jp/kouyou/6/32/30809.html',  'https://static.tenki.jp/static-images/kouyou/point/30809/square.jpg',  '紅葉の情報：シロヤマザクラ、カエデ'], 
			[34.68558533503582,  135.83753991998577,  '名勝依水園',  'https://tenki.jp/kouyou/6/32/30824.html',  'https://static.tenki.jp/static-images/kouyou/point/30824/square.jpg',  '紅葉の情報：ハゼノキ、ドウダンツツジ、モミジ、カエデ'], 
			[34.604401777702584,  135.71781382995533,  '奈良県立竜田公園',  'https://tenki.jp/kouyou/6/32/36573.html',  'https://static.tenki.jp/static-images/kouyou/point/36573/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、トウカエデ'], 
			[34.684554520619855,  135.8415785946575,  '奈良公園',  'https://tenki.jp/kouyou/6/32/36574.html',  'https://static.tenki.jp/static-images/kouyou/point/36574/square.jpg',  '紅葉の情報：イチョウ、モミジ、サクラ'], 
			[34.46597419341618,  135.8617016489922,  '談山神社',  'https://tenki.jp/kouyou/6/32/36575.html',  'https://static.tenki.jp/static-images/kouyou/point/36575/square.jpg',  '紅葉の情報：カエデ、サクラ、ドウダンツツジ'], 
			[34.644540755921774,  135.86847262400045,  '正暦寺',  'https://tenki.jp/kouyou/6/32/36592.html',  'https://static.tenki.jp/static-images/kouyou/point/36592/square.jpg',  '紅葉の情報：カエデ、キハダ、ケヤキ、クヌギ'], 
			[34.5608602089596,  135.85203156647265,  '長岳寺',  'https://tenki.jp/kouyou/6/32/36595.html',  'https://static.tenki.jp/static-images/kouyou/point/36595/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.60917779100359,  135.66978741729872,  '信貴山 朝護孫子寺',  'https://tenki.jp/kouyou/6/32/36606.html',  'https://static.tenki.jp/static-images/kouyou/point/36606/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[34.36784453492947,  135.85905309901244,  '吉野山(中千本)',  'https://tenki.jp/kouyou/6/32/36607.html',  'https://static.tenki.jp/static-images/kouyou/point/36607/square.jpg',  '紅葉の情報：シロヤマザクラ、カエデ'], 
			[34.256981628986054,  135.65123720986358,  '玉川峡',  'https://tenki.jp/kouyou/6/33/30382.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イチョウ、ブナ、クヌギ、カシ'], 
			[33.781422223330736,  135.41255395372397,  '奇絶峡',  'https://tenki.jp/kouyou/6/33/30470.html',  'https://static.tenki.jp/static-images/kouyou/point/30470/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.287206847467885,  135.31643575366837,  '根來寺',  'https://tenki.jp/kouyou/6/33/30471.html',  'https://static.tenki.jp/static-images/kouyou/point/30471/square.jpg',  '紅葉の情報：モミジ'], 
			[34.061561833146634,  135.56424404064407,  '高野龍神スカイライン',  'https://tenki.jp/kouyou/6/33/30473.html',  'https://static.tenki.jp/static-images/kouyou/point/30473/square.jpg',  '紅葉の情報：ブナ、ミズナラ、モミジ、サワグルミ、ツツジ'], 
			[34.22873062522006,  135.17045010753714,  '紅葉渓庭園',  'https://tenki.jp/kouyou/6/33/36608.html',  'https://static.tenki.jp/static-images/kouyou/point/36608/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[34.216230387707725,  135.6054505757515,  '高野山',  'https://tenki.jp/kouyou/6/33/36609.html',  'https://static.tenki.jp/static-images/kouyou/point/36609/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[33.81979251439049,  135.56254634208335,  '福定の大銀杏',  'https://tenki.jp/kouyou/6/33/36676.html',  'https://static.tenki.jp/static-images/kouyou/point/36676/square.jpg',  '紅葉の情報：イチョウ'], 
			[35.27109378928138,  134.23139721773597,  '諏訪神社',  'https://tenki.jp/kouyou/7/34/30462.html',  'https://static.tenki.jp/static-images/kouyou/point/30462/square.jpg',  '紅葉の情報：モミジ'], 
			[35.291112255479085,  134.2488699416612,  '板井原集落',  'https://tenki.jp/kouyou/7/34/30463.html',  'https://static.tenki.jp/static-images/kouyou/point/30463/square.jpg',  '紅葉の情報：モミジ'], 
			[35.27171120034493,  134.33245213950119,  '芦津渓谷',  'https://tenki.jp/kouyou/7/34/36651.html',  'https://static.tenki.jp/static-images/kouyou/point/36651/square.jpg',  '紅葉の情報：カエデ、ブナ、トチ、モミジ'], 
			[35.39928476701455,  133.95596659174166,  '三徳山三佛寺',  'https://tenki.jp/kouyou/7/34/36652.html',  'https://static.tenki.jp/static-images/kouyou/point/36652/square.jpg',  '紅葉の情報：ナナカマド、ブナ、シラカシ、ミズナラ、モミジ'], 
			[35.37753480289281,  133.53856701196042,  '大山',  'https://tenki.jp/kouyou/7/34/36656.html',  'https://static.tenki.jp/static-images/kouyou/point/36656/square.jpg',  '紅葉の情報：ブナ、ミズナラ、カエデ、ナナカマド'], 
			[35.17491890813931,  133.03531513927393,  '絲原記念館 庭園',  'https://tenki.jp/kouyou/7/35/30326.html',  'https://static.tenki.jp/static-images/kouyou/point/30326/square.jpg',  '紅葉の情報：モミジ'], 
			[35.0956672330754,  133.1271728321049,  '奥出雲おろちループ',  'https://tenki.jp/kouyou/7/35/30327.html',  'https://static.tenki.jp/static-images/kouyou/point/30327/square.jpg',  '紅葉の情報：ナナカマド、ハゼ、モミジ'], 
			[35.380422777681375,  133.19467054381656,  '足立美術館',  'https://tenki.jp/kouyou/7/35/30384.html',  'https://static.tenki.jp/static-images/kouyou/point/30384/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ、その他'], 
			[34.49615571809999,  131.72311793073172,  '旧堀氏庭園',  'https://tenki.jp/kouyou/7/35/30385.html',  'https://static.tenki.jp/static-images/kouyou/point/30385/square.jpg',  '紅葉の情報：イロハカエデ、イロハモミジ、イチョウ'], 
			[35.26417356438988,  133.04627966452196,  'かみくの桃源郷',  'https://tenki.jp/kouyou/7/35/30469.html',  'https://static.tenki.jp/static-images/kouyou/point/30469/square.jpg',  '紅葉の情報：モミジ、ハナモモ、サクラ、クリ、イチョウ'], 
			[35.108596097524945,  132.94107642830545,  '櫻井家住宅・日本庭園',  'https://tenki.jp/kouyou/7/35/30762.html',  'https://static.tenki.jp/static-images/kouyou/point/30762/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ'], 
			[35.49058953739488,  133.17589553533503,  '由志園',  'https://tenki.jp/kouyou/7/35/30829.html',  'https://static.tenki.jp/static-images/kouyou/point/30829/square.jpg',  '紅葉の情報：モミジ'], 
			[35.401509839371705,  133.2812537701331,  '清水公園',  'https://tenki.jp/kouyou/7/35/36658.html',  'https://static.tenki.jp/static-images/kouyou/point/36658/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[35.17474468385899,  133.01605208727352,  '鬼の舌震',  'https://tenki.jp/kouyou/7/35/36662.html',  'https://static.tenki.jp/static-images/kouyou/point/36662/square.jpg',  '紅葉の情報：モミジ、ハゼ、ナラ'], 
			[34.92842779539363,  132.47148121987402,  '断魚渓',  'https://tenki.jp/kouyou/7/35/36664.html',  'https://static.tenki.jp/static-images/kouyou/point/36664/square.jpg',  '紅葉の情報：モミジ、ハゼ、ウルシ'], 
			[34.54968982991732,  132.0342690707328,  '匹見峡',  'https://tenki.jp/kouyou/7/35/36665.html',  'https://static.tenki.jp/static-images/kouyou/point/36665/square.jpg',  '紅葉の情報：ナラ、クリ、カエデ、ケヤキ、ブナ'], 
			[35.06323894922004,  134.00487830896247,  '鶴山公園',  'https://tenki.jp/kouyou/7/36/30387.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：オオモミジ、イロハモミジ'], 
			[34.79650524693195,  134.21991473948074,  '特別史跡旧閑谷学校',  'https://tenki.jp/kouyou/7/36/30388.html',  'https://static.tenki.jp/static-images/kouyou/point/30388/square.jpg',  '紅葉の情報：楷の木、モミジ、イチョウ'], 
			[35.112947554842634,  133.68168744235012,  '神庭の滝自然公園',  'https://tenki.jp/kouyou/7/36/30389.html',  'https://static.tenki.jp/static-images/kouyou/point/30389/square.jpg',  '紅葉の情報：カエデ、カツラ'], 
			[35.211016728458205,  133.9145726951395,  '奥津渓',  'https://tenki.jp/kouyou/7/36/30399.html',  'https://static.tenki.jp/static-images/kouyou/point/30399/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[35.305730072884074,  133.98739824966083,  '恩原高原',  'https://tenki.jp/kouyou/7/36/30400.html',  'https://static.tenki.jp/static-images/kouyou/point/30400/square.jpg',  '紅葉の情報：カラマツ、シラカバ、カエデ'], 
			[35.30969155687169,  133.94895502067973,  '赤和瀬渓谷',  'https://tenki.jp/kouyou/7/36/30401.html',  'https://static.tenki.jp/static-images/kouyou/point/30401/square.jpg',  '紅葉の情報：モミジ、ヤマボウシ、カエデ、ブナ、コシアブラ'], 
			[35.28628233784096,  133.87544169830338,  '岡山県立森林公園',  'https://tenki.jp/kouyou/7/36/30402.html',  'https://static.tenki.jp/static-images/kouyou/point/30402/square.jpg',  '紅葉の情報：カラマツ、ブナ、ミズナラ、マユミ、ツノハシバミ'], 
			[34.59850833823532,  133.46417684992042,  '田中苑 楷の木',  'https://tenki.jp/kouyou/7/36/30403.html',  'https://static.tenki.jp/static-images/kouyou/point/30403/square.jpg',  '紅葉の情報：楷の木'], 
			[34.66747257019867,  133.93574556362242,  '岡山後楽園',  'https://tenki.jp/kouyou/7/36/30405.html',  'https://static.tenki.jp/static-images/kouyou/point/30405/square.jpg',  '紅葉の情報：イロハモミジ、トウカエデ'], 
			[35.24925517957613,  133.7880700617846,  '山乗渓谷',  'https://tenki.jp/kouyou/7/36/30445.html',  'https://static.tenki.jp/static-images/kouyou/point/30445/square.jpg',  '紅葉の情報：ナラ、モミジ、コナラ、ブナ'], 
			[34.51750980283408,  133.92818902633059,  'みやま公園',  'https://tenki.jp/kouyou/7/36/30455.html',  'https://static.tenki.jp/static-images/kouyou/point/30455/square.jpg',  '紅葉の情報：サクラ、モミジ、カエデ、コナラ、ケヤキ、ドウダンツツジ'], 
			[35.325653880639805,  133.58872001803073,  '鬼女台展望休憩所',  'https://tenki.jp/kouyou/7/36/30480.html',  'https://static.tenki.jp/static-images/kouyou/point/30480/square.jpg',  '紅葉の情報：ブナ、ナラ、カエデ、モミジ'], 
			[35.318701065129,  133.67568263027255,  '蒜山三座',  'https://tenki.jp/kouyou/7/36/30481.html',  'https://static.tenki.jp/static-images/kouyou/point/30481/square.jpg',  '紅葉の情報：ブナ、コナラ、カエデ、ナナカマド'], 
			[35.26443380317678,  133.79024921580577,  '津黒高原',  'https://tenki.jp/kouyou/7/36/30482.html',  'https://static.tenki.jp/static-images/kouyou/point/30482/square.jpg',  '紅葉の情報：ブナ、ミズナラ'], 
			[34.73126791498127,  133.8012115638781,  '近水園',  'https://tenki.jp/kouyou/7/36/37001.html',  'https://static.tenki.jp/static-images/kouyou/point/37001/square.jpg',  '紅葉の情報：モミジ'], 
			[34.92765902873009,  133.52499976241782,  '井倉峡',  'https://tenki.jp/kouyou/7/36/37002.html',  'https://static.tenki.jp/static-images/kouyou/point/37002/square.jpg',  '紅葉の情報：モミジ、イチョウ、カエデ'], 
			[34.8485241586442,  133.8337893855004,  '宇甘溪',  'https://tenki.jp/kouyou/7/36/37003.html',  'https://static.tenki.jp/static-images/kouyou/point/37003/square.jpg',  '紅葉の情報：モミジ、カエデ、ウルシ'], 
			[35.316057516744756,  133.6092540218774,  '蒜山高原',  'https://tenki.jp/kouyou/7/36/37005.html',  'https://static.tenki.jp/static-images/kouyou/point/37005/square.jpg',  '紅葉の情報：ブナ、カエデ、ミズナラ、カシワ、コナラ'], 
			[34.66225648483952,  132.6175658631866,  '八千代湖',  'https://tenki.jp/kouyou/7/37/30328.html',  'https://static.tenki.jp/static-images/kouyou/point/30328/square.jpg',  '紅葉の情報：モミジ'], 
			[34.66479172329397,  133.10652327891262,  '矢野温泉公園 四季の里',  'https://tenki.jp/kouyou/7/37/30329.html',  'https://static.tenki.jp/static-images/kouyou/point/30329/square.jpg',  '紅葉の情報：カエデ、ドウダンツツジ、モミジ'], 
			[34.55046092079875,  132.2526479053573,  '交流の森「龍頭峡」',  'https://tenki.jp/kouyou/7/37/30398.html',  'https://static.tenki.jp/static-images/kouyou/point/30398/square.jpg',  '紅葉の情報：モミジ、クヌギ、トチ'], 
			[35.011577045089616,  132.92192216026376,  '雄滝・雌滝',  'https://tenki.jp/kouyou/7/37/30446.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、ハゼ'], 
			[35.03533886614087,  132.92473829414814,  '上高野山の乳下りイチョウ',  'https://tenki.jp/kouyou/7/37/30447.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ'], 
			[34.38732580126383,  132.31793698387304,  '瀬戸内海国立公園 極楽寺山',  'https://tenki.jp/kouyou/7/37/30449.html',  'https://static.tenki.jp/static-images/kouyou/point/30449/square.jpg',  '紅葉の情報：モミジ、アカガシ'], 
			[34.3045158306889,  133.09018917713027,  '耕三寺博物館(耕三寺)',  'https://tenki.jp/kouyou/7/37/30453.html',  'https://static.tenki.jp/static-images/kouyou/point/30453/square.jpg',  '紅葉の情報：カエデ、イチョウ'], 
			[34.63303495549339,  132.29789226088985,  '温井ダム(龍姫湖)周辺',  'https://tenki.jp/kouyou/7/37/30814.html',  'https://static.tenki.jp/static-images/kouyou/point/30814/square.jpg',  '紅葉の情報：カエデ、ナラ'], 
			[34.61285541430405,  132.30883253507423,  '深山峡',  'https://tenki.jp/kouyou/7/37/38051.html',  'https://static.tenki.jp/static-images/kouyou/point/38051/square.jpg',  '紅葉の情報：モミジ'], 
			[34.599733189855144,  132.20821386468748,  '三段峡',  'https://tenki.jp/kouyou/7/37/38052.html',  'https://static.tenki.jp/static-images/kouyou/point/38052/square.jpg',  '紅葉の情報：カエデ、ナラ、ケヤキ'], 
			[34.86334419295047,  132.72606961418487,  '常清滝',  'https://tenki.jp/kouyou/7/37/38053.html',  'https://static.tenki.jp/static-images/kouyou/point/38053/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.294427622745346,  132.32301330118412,  '宮島(紅葉谷公園)',  'https://tenki.jp/kouyou/7/37/38054.html',  'https://static.tenki.jp/static-images/kouyou/point/38054/square.jpg',  '紅葉の情報：イロハカエデ、ウリハダカエデ、ヤマモミジ、オオモミジ'], 
			[34.84355471308553,  133.22542334708245,  '国定公園帝釈峡',  'https://tenki.jp/kouyou/7/37/38068.html',  'https://static.tenki.jp/static-images/kouyou/point/38068/square.jpg',  '紅葉の情報：カエデ、イチョウ'], 
			[34.16853303054151,  132.17310220167286,  '紅葉谷公園',  'https://tenki.jp/kouyou/7/38/30390.html',  'https://static.tenki.jp/static-images/kouyou/point/30390/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[34.32818698474833,  131.16294520740152,  '大寧寺',  'https://tenki.jp/kouyou/7/38/30397.html',  'https://static.tenki.jp/static-images/kouyou/point/30397/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ'], 
			[34.4130842924629,  131.42590932996814,  '東光寺',  'https://tenki.jp/kouyou/7/38/30465.html',  'https://static.tenki.jp/static-images/kouyou/point/30465/square.jpg',  '紅葉の情報：イロハカエデ'], 
			[34.39516480089629,  131.39140725636275,  '大照院',  'https://tenki.jp/kouyou/7/38/30467.html',  'https://static.tenki.jp/static-images/kouyou/point/30467/square.jpg',  '紅葉の情報：イロハカエデ'], 
			[34.167814759497645,  131.41219842915464,  '龍蔵寺',  'https://tenki.jp/kouyou/7/38/30730.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、オオイチョウ(天然記念物)'], 
			[34.42829374317305,  132.0564592500461,  '寂地峡',  'https://tenki.jp/kouyou/7/38/38056.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[33.996060084631246,  130.9823596820665,  '功山寺',  'https://tenki.jp/kouyou/7/38/38067.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハモミジ'], 
			[34.06295041084348,  131.5873385310252,  '毛利氏庭園',  'https://tenki.jp/kouyou/7/38/38069.html',  'https://static.tenki.jp/static-images/kouyou/point/38069/square.jpg',  '紅葉の情報：イロハモミジ、ハゼ'], 
			[34.27357784728034,  131.90763306286712,  '木谷峡',  'https://tenki.jp/kouyou/7/38/38071.html',  'https://static.tenki.jp/static-images/kouyou/point/38071/square.jpg',  '紅葉の情報：モミジ'], 
			[34.000380700684374,  130.98224961084063,  '覚苑寺',  'https://tenki.jp/kouyou/7/38/38072.html',  'https://static.tenki.jp/static-images/kouyou/point/38072/square.jpg',  '紅葉の情報：モミジ'], 
			[33.990745720619785,  130.99012889581454,  '長府庭園',  'https://tenki.jp/kouyou/7/38/38073.html',  'https://static.tenki.jp/static-images/kouyou/point/38073/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[34.0478434192767,  133.84098479690095,  '箸蔵寺',  'https://tenki.jp/kouyou/8/39/30407.html',  'https://static.tenki.jp/static-images/kouyou/point/30407/square.jpg',  '紅葉の情報：モミジ、サクラ'], 
			[33.78306221904067,  134.0788940706407,  '高の瀬峡',  'https://tenki.jp/kouyou/8/39/30408.html',  'https://static.tenki.jp/static-images/kouyou/point/30408/square.jpg',  '紅葉の情報：ヤマモミジ、ハウチワカエデ'], 
			[33.86718761157009,  134.0898555925794,  '剣山',  'https://tenki.jp/kouyou/8/39/30429.html',  'https://static.tenki.jp/static-images/kouyou/point/30429/square.jpg',  '紅葉の情報：カエデ、ブナ、ナナカマド、モミジ'], 
			[34.03531183688632,  133.72373703014622,  '雲辺寺',  'https://tenki.jp/kouyou/8/39/37501.html',  'https://static.tenki.jp/static-images/kouyou/point/37501/square.jpg',  '紅葉の情報：モミジ'], 
			[34.19106198415722,  134.206639674354,  '大窪寺',  'https://tenki.jp/kouyou/8/40/30424.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イチョウ、カエデ'], 
			[34.15851435690241,  133.9816055051066,  '柏原渓谷',  'https://tenki.jp/kouyou/8/40/30425.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：現地問合せ'], 
			[34.512111156840334,  134.29851820825505,  '寒霞渓',  'https://tenki.jp/kouyou/8/40/30434.html',  'https://static.tenki.jp/static-images/kouyou/point/30434/square.jpg',  '紅葉の情報：イロハカエデ、ヤマモミジ、イタヤカエデ、ウリハダカエデ、アカシデ'], 
			[34.327192270382824,  134.04278241735324,  '特別名勝 栗林公園',  'https://tenki.jp/kouyou/8/40/30435.html',  'https://static.tenki.jp/static-images/kouyou/point/30435/square.jpg',  '紅葉の情報：カエデ、ハゼノキ'], 
			[34.183996841162575,  133.80954364033667,  '金刀比羅宮',  'https://tenki.jp/kouyou/8/40/30731.html',  'https://static.tenki.jp/static-images/kouyou/point/30731/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[33.90545138115981,  133.02535617988983,  '西山興隆寺',  'https://tenki.jp/kouyou/8/41/30419.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イロハカエデ'], 
			[33.974853039327385,  132.9393849320014,  '鈍川渓谷',  'https://tenki.jp/kouyou/8/41/30421.html',  'https://static.tenki.jp/static-images/kouyou/point/30421/square.jpg',  '紅葉の情報：モミジ、ヤマブキ'], 
			[33.890432972881,  133.48196131570455,  '富郷渓谷',  'https://tenki.jp/kouyou/8/41/30422.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[33.71520795114403,  133.0945077405736,  '面河渓',  'https://tenki.jp/kouyou/8/41/30436.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：シロモジ、イロハモミジ、イタヤカエデ、シラキ、ケヤキ'], 
			[33.886135753607896,  133.30494258536655,  '別子ライン沿い',  'https://tenki.jp/kouyou/8/41/30442.html',  'https://static.tenki.jp/static-images/kouyou/point/30442/square.jpg',  '紅葉の情報：モミジ、カエデ、ツタ'], 
			[33.66765751277688,  132.97321432438432,  '国民宿舎「古岩屋荘」・岩屋寺周辺',  'https://tenki.jp/kouyou/8/41/30479.html',  'https://static.tenki.jp/static-images/kouyou/point/30479/square.jpg',  '紅葉の情報：ドウダンツツジ、カエデ、モミジ、ブナ、ナナカマド'], 
			[33.84432190984131,  132.76661565820783,  '松山城',  'https://tenki.jp/kouyou/8/41/30733.html',  'https://static.tenki.jp/static-images/kouyou/point/30733/square.jpg',  '紅葉の情報：カエデ'], 
			[33.20392905258438,  132.65894757993155,  '滑床渓谷',  'https://tenki.jp/kouyou/8/41/30810.html',  'https://static.tenki.jp/static-images/kouyou/point/30810/square.jpg',  '紅葉の情報：モミジ、ヒメシャラ'], 
			[33.72536855756741,  133.40017895555297,  '瀬戸川渓谷',  'https://tenki.jp/kouyou/8/42/30438.html',  'https://static.tenki.jp/static-images/kouyou/point/30438/square.jpg',  '紅葉の情報：カエデ、ケヤキ、ハゼ、モミジ'], 
			[33.653702634398506,  134.08676309444058,  '魚梁瀬周辺(西川渓谷)',  'https://tenki.jp/kouyou/8/42/30439.html',  'https://static.tenki.jp/static-images/kouyou/point/30439/square.jpg',  '紅葉の情報：モミジ、ハゼ、ケヤキ'], 
			[33.56109783788744,  133.12967653644066,  '中津渓谷',  'https://tenki.jp/kouyou/8/42/30440.html',  'https://static.tenki.jp/static-images/kouyou/point/30440/square.jpg',  '紅葉の情報：モミジ'], 
			[33.47726591499748,  133.00427641098653,  '天狗高原',  'https://tenki.jp/kouyou/8/42/30464.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハカエデ、イタヤカエデ、エンコウカエデ'], 
			[33.772930023512416,  134.03041306023962,  'べふ峡',  'https://tenki.jp/kouyou/8/42/30701.html',  'https://static.tenki.jp/static-images/kouyou/point/30701/square.jpg',  '紅葉の情報：モミジ、カエデ、ヤマザクラ、シデ、ケヤキ'], 
			[33.93651532233294,  131.0035618859928,  '白野江植物公園',  'https://tenki.jp/kouyou/9/43/30492.html',  'https://static.tenki.jp/static-images/kouyou/point/30492/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[33.88443719570166,  130.87357106293186,  '勝山公園(小倉城)',  'https://tenki.jp/kouyou/9/43/30494.html',  'https://static.tenki.jp/static-images/kouyou/point/30494/square.jpg',  '紅葉の情報：ハゼノキ、イチョウ、ケヤキ、モミジ、サクラ'], 
			[33.46540117816144,  130.69518865855366,  '秋月城跡',  'https://tenki.jp/kouyou/9/43/30502.html',  'https://static.tenki.jp/static-images/kouyou/point/30502/square.jpg',  '紅葉の情報：カエデ'], 
			[33.17305472877387,  130.77920317161565,  '日向神峡',  'https://tenki.jp/kouyou/9/43/30504.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ'], 
			[33.49461555738723,  130.22861362542173,  '雷山千如寺大悲王院',  'https://tenki.jp/kouyou/9/43/30510.html',  'https://static.tenki.jp/static-images/kouyou/point/30510/square.jpg',  '紅葉の情報：大カエデ(天然記念物)、カエデ'], 
			[33.658827790066255,  130.5682359291995,  '呑山観音寺',  'https://tenki.jp/kouyou/9/43/30512.html',  'https://static.tenki.jp/static-images/kouyou/point/30512/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、ドウダンツツジ、ヤマザクラ、その他'], 
			[33.152587795409666,  130.51872395976667,  '清水寺本坊庭園',  'https://tenki.jp/kouyou/9/43/30561.html',  'https://static.tenki.jp/static-images/kouyou/point/30561/square.jpg',  '紅葉の情報：イロハカエデ、イチョウ'], 
			[33.528841580817854,  130.55248691887826,  '宝満宮竈門神社',  'https://tenki.jp/kouyou/9/43/30563.html',  'https://static.tenki.jp/static-images/kouyou/point/30563/square.jpg',  '紅葉の情報：モミジ'], 
			[33.47631852970188,  130.92575795624398,  '英彦山',  'https://tenki.jp/kouyou/9/43/30565.html',  'https://static.tenki.jp/static-images/kouyou/point/30565/square.jpg',  '紅葉の情報：モミジ、イロハカエデ、イチョウ'], 
			[33.53402313953504,  130.51914922579522,  '福岡県立四王寺県民の森',  'https://tenki.jp/kouyou/9/43/30595.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハカエデ'], 
			[33.30331703204794,  130.59209077643766,  '永勝寺',  'https://tenki.jp/kouyou/9/43/30596.html',  'https://static.tenki.jp/static-images/kouyou/point/30596/square.jpg',  '紅葉の情報：モミジ、イチョウ、ケンポナシ、オオクスノキ、スギ'], 
			[33.311965080917695,  130.59132661108106,  '柳坂曽根の櫨並木',  'https://tenki.jp/kouyou/9/43/30597.html',  'https://static.tenki.jp/static-images/kouyou/point/30597/square.jpg',  '紅葉の情報：伊吉ハゼ、松山ハゼ'], 
			[33.188923746314394,  129.89930497683991,  '陶山神社',  'https://tenki.jp/kouyou/9/44/30569.html',  'https://static.tenki.jp/static-images/kouyou/point/30569/square.jpg',  '紅葉の情報：モミジ'], 
			[33.42906371402198,  130.49584801444576,  '大興善寺',  'https://tenki.jp/kouyou/9/44/30585.html',  'https://static.tenki.jp/static-images/kouyou/point/30585/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[33.17423786603279,  130.2702115301482,  'シチメンソウ群生地',  'https://tenki.jp/kouyou/9/44/30588.html',  'https://static.tenki.jp/static-images/kouyou/point/30588/square.jpg',  '紅葉の情報：シチメンソウ'], 
			[32.75059986955763,  130.2858500873359,  '雲仙仁田峠',  'https://tenki.jp/kouyou/9/45/30560.html',  'https://static.tenki.jp/static-images/kouyou/point/30560/square.jpg',  '紅葉の情報：コミネカエデ、コハウチワカエデ、ウリカエデ、ウリハダカエデ、ヤマボウシ'], 
			[32.2339523864382,  130.45979480100553,  '舞鶴城公園',  'https://tenki.jp/kouyou/9/46/30514.html',  'https://static.tenki.jp/static-images/kouyou/point/30514/square.jpg',  '紅葉の情報：ハゼ、イチョウ、モミジ'], 
			[32.62679350323772,  131.09067944434028,  '緑仙峡キャンプ場',  'https://tenki.jp/kouyou/9/46/30515.html',  'https://static.tenki.jp/static-images/kouyou/point/30515/square.jpg',  '紅葉の情報：コハウチワカエデ、ナナカマド、イロハモミジ、ドウダンツツジ、カマツカ'], 
			[32.55011537449013,  130.70839028047004,  '立神峡',  'https://tenki.jp/kouyou/9/46/30516.html',  'https://static.tenki.jp/static-images/kouyou/point/30516/square.jpg',  '紅葉の情報：カエデ、モミジ'], 
			[32.71944697335432,  131.184778516551,  '蘇陽峡',  'https://tenki.jp/kouyou/9/46/30522.html',  'https://static.tenki.jp/static-images/kouyou/point/30522/square.jpg',  '紅葉の情報：モミジ、ケヤキ'], 
			[32.50529686530471,  130.9643908472503,  '五家荘',  'https://tenki.jp/kouyou/9/46/30575.html',  'https://static.tenki.jp/static-images/kouyou/point/30575/square.jpg',  '紅葉の情報：モミジ、カエデ、ブナ、ドウダンツツジ'], 
			[33.602529254108056,  131.61389372833534,  '文殊仙寺',  'https://tenki.jp/kouyou/9/47/30526.html',  'https://static.tenki.jp/static-images/kouyou/point/30526/square.jpg',  '紅葉の情報：モミジ、イチョウ、ケヤキ'], 
			[32.9692820062035,  131.40770837285,  '岡城跡',  'https://tenki.jp/kouyou/9/47/30528.html',  'https://static.tenki.jp/static-images/kouyou/point/30528/square.jpg',  '紅葉の情報：モミジ'], 
			[33.3435405309001,  131.1151332472684,  '立羽田の景',  'https://tenki.jp/kouyou/9/47/30529.html',  'https://static.tenki.jp/static-images/kouyou/point/30529/square.jpg',  '紅葉の情報：モミジ、ハゼ、カエデ'], 
			[33.17570508753838,  131.21571599928802,  '九酔渓',  'https://tenki.jp/kouyou/9/47/30530.html',  'https://static.tenki.jp/static-images/kouyou/point/30530/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[32.78699959430126,  131.55463977299527,  '藤河内渓谷',  'https://tenki.jp/kouyou/9/47/30533.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、クヌギ、ケヤキ'], 
			[33.440177816599586,  131.13898002629674,  '耶馬溪',  'https://tenki.jp/kouyou/9/47/30534.html',  'https://static.tenki.jp/static-images/kouyou/point/30534/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[32.8825301664315,  131.27795232238932,  '陽目渓谷',  'https://tenki.jp/kouyou/9/47/30536.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ハゼノキ、ケヤキ'], 
			[33.371206768813686,  131.16461026610514,  '深耶馬溪',  'https://tenki.jp/kouyou/9/47/30598.html',  'https://static.tenki.jp/static-images/kouyou/point/30598/square.jpg',  '紅葉の情報：モミジ、ホウノキ、ハゼ、イチョウ'], 
			[33.62902004303132,  131.59682485947704,  '六郷満山ふれあい森林公園',  'https://tenki.jp/kouyou/9/47/30599.html',  'https://static.tenki.jp/static-images/kouyou/point/30599/square.jpg',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[33.25829482297197,  131.53216364970825,  '高崎山自然動物園',  'https://tenki.jp/kouyou/9/47/30739.html',  'https://static.tenki.jp/static-images/kouyou/point/30739/square.jpg',  '紅葉の情報：イロハモミジ、カエデ'], 
			[33.57398882174896,  131.60326349698454,  '両子寺',  'https://tenki.jp/kouyou/9/47/30761.html',  'https://static.tenki.jp/static-images/kouyou/point/30761/square.jpg',  '紅葉の情報：カエデ'], 
			[33.24137417939033,  130.98624572583597,  'ひびき渓谷',  'https://tenki.jp/kouyou/9/47/30801.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[32.702770924966444,  131.30083934883086,  '高千穂峡',  'https://tenki.jp/kouyou/9/48/30537.html',  'https://static.tenki.jp/static-images/kouyou/point/30537/square.jpg',  '紅葉の情報：カエデ、ツタ、ナラ、ケヤキ、モミジ'], 
			[32.607872739801785,  131.1562979358593,  '五ヶ瀬渓谷',  'https://tenki.jp/kouyou/9/48/30539.html',  'https://static.tenki.jp/static-images/kouyou/point/30539/square.jpg',  '紅葉の情報：モミジ、カエデ、ケヤキ'], 
			[32.79883280353479,  131.47317852117996,  '見立渓谷',  'https://tenki.jp/kouyou/9/48/30540.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、ハゼ'], 
			[31.946658499325494,  130.8432846605512,  'えびの高原',  'https://tenki.jp/kouyou/9/48/30582.html',  'https://static.tenki.jp/static-images/kouyou/point/30582/square.jpg',  '紅葉の情報：コハウチワカエデ、ドウダンツツジ、コミネカエデ、ミズナラ、シロモジ'], 
			[31.74313864090214,  130.3500092693321,  '冠岳',  'https://tenki.jp/kouyou/9/49/30549.html',  'https://static.tenki.jp/static-images/kouyou/point/30549/square.jpg',  '紅葉の情報：ヤマモミジ、イチョウ'], 
			[32.01133008338247,  130.57595346334168,  '曽木の滝公園',  'https://tenki.jp/kouyou/9/49/30583.html',  'https://static.tenki.jp/static-images/kouyou/point/30583/square.jpg',  '紅葉の情報：モミジ、イチョウ、ナンキンハゼ'], 
			[31.899861755538083,  130.85242769222822,  '県道1号線(丸尾-大浪池登山口)',  'https://tenki.jp/kouyou/9/49/30783.html',  'https://static.tenki.jp/static-images/kouyou/point/30783/square.jpg',  '紅葉の情報：モミジ'], 
			[35.66924511921175,  139.55045208683507,  '都立神代植物公園',  'https://tenki.jp/kouyou/3/16/30836.html',  'https://static.tenki.jp/static-images/kouyou/point/30836/square.jpg',  '紅葉の情報：カエデ'], 
			[36.41038603422963,  137.8977341090226,  '長福寺',  'https://tenki.jp/kouyou/3/23/30837.html',  'https://static.tenki.jp/static-images/kouyou/point/30837/square.jpg',  '紅葉の情報：オオイチョウ'], 
			[35.594006804433825,  135.1872782118222,  '成相寺',  'https://tenki.jp/kouyou/6/29/36681.html',  'https://static.tenki.jp/static-images/kouyou/point/36681/square.jpg',  '紅葉の情報：モミジ'], 
			[35.31414279383155,  135.08442341508956,  '長安寺',  'https://tenki.jp/kouyou/6/29/36682.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ヤマモミジ、ノムラモミジ'], 
			[35.38754293184676,  134.80378904789282,  '養父神社',  'https://tenki.jp/kouyou/6/31/36678.html',  'https://static.tenki.jp/static-images/kouyou/point/36678/square.jpg',  '紅葉の情報：モミジ'], 
			[35.0660890615155,  135.14763606180702,  '大國寺',  'https://tenki.jp/kouyou/6/31/36680.html',  'https://static.tenki.jp/static-images/kouyou/point/36680/square.jpg',  '紅葉の情報：オオモミジ、ヤマモミジ、ノムラモミジ、イチョウ'], 
			[39.44656469028566,  141.51927489429679,  '重湍渓',  'https://tenki.jp/kouyou/2/6/30841.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ナラ、ブナ'], 
			[40.126608434299584,  140.67798684297048,  '大館市ベニヤマ自然パーク',  'https://tenki.jp/kouyou/2/8/30751.html',  'https://static.tenki.jp/static-images/kouyou/point/30751/square.jpg',  '紅葉の情報：イタヤカエデ、ヤマザクラ、モミジ、ナナカマド、ドウダンツツジ'], 
			[37.06699939420371,  139.92387531182354,  '板室温泉街',  'https://tenki.jp/kouyou/3/12/34156.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：現地問合せ'], 
			[36.62890622944373,  138.58613800503215,  '草津天狗山',  'https://tenki.jp/kouyou/3/13/30840.html',  'https://static.tenki.jp/static-images/kouyou/point/30840/square.jpg',  '紅葉の情報：ナナカマド、ヤマウルシ、カラマツ'], 
			[35.654540058211005,  139.7584889306951,  '旧芝離宮恩賜庭園',  'https://tenki.jp/kouyou/3/16/34683.html',  'https://static.tenki.jp/static-images/kouyou/point/34683/square.jpg',  '紅葉の情報：モミジ'], 
			[35.709373393129745,  139.76749635020897,  '旧岩崎邸庭園',  'https://tenki.jp/kouyou/3/16/34684.html',  'https://static.tenki.jp/static-images/kouyou/point/34684/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[35.68067439518297,  139.79778085977324,  '清澄庭園',  'https://tenki.jp/kouyou/3/16/34685.html',  'https://static.tenki.jp/static-images/kouyou/point/34685/square.jpg',  '紅葉の情報：ハゼノキ、イチョウ、モミジ'], 
			[33.00456099168235,  130.94124404988202,  '菊池渓谷',  'https://tenki.jp/kouyou/9/46/30520.html',  'https://static.tenki.jp/static-images/kouyou/point/30520/square.jpg',  '紅葉の情報：カエデ、シラキ、ケヤキ、モミジ'], 
			[39.841974003180546,  140.94470544430945,  '犬倉山',  'https://tenki.jp/kouyou/2/6/30293.html',  'https://static.tenki.jp/static-images/kouyou/point/30293/square.jpg',  '紅葉の情報：ミネカエデ、ミネザクラ、ナナカマド'], 
			[38.22328605410134,  140.73019118312618,  '磊々峡',  'https://tenki.jp/kouyou/2/7/32587.html',  'https://static.tenki.jp/static-images/kouyou/point/32587/square.jpg',  '紅葉の情報：シラキ、クヌギ、ヤマザクラ、ナラ、シデ'], 
			[38.245682276988276,  140.34455339628087,  'もみじ公園',  'https://tenki.jp/kouyou/2/9/32589.html',  'https://static.tenki.jp/static-images/kouyou/point/32589/square.jpg',  '紅葉の情報：モミジ、ケヤキ'], 
			[38.12510017547084,  140.40916406849874,  '蔵王エコーライン',  'https://tenki.jp/kouyou/2/9/32590.html',  'https://static.tenki.jp/static-images/kouyou/point/32590/square.jpg',  '紅葉の情報：ブナ、カエデ、ミズナラ'], 
			[37.47821731309846,  139.67152253971452,  '第一只見川橋梁',  'https://tenki.jp/kouyou/2/10/32588.html',  'https://static.tenki.jp/static-images/kouyou/point/32588/square.jpg',  '紅葉の情報：現地問合せ'], 
			[37.33375925999849,  139.8609047478061,  '大内宿',  'https://tenki.jp/kouyou/2/10/32591.html',  'https://static.tenki.jp/static-images/kouyou/point/32591/square.jpg',  '紅葉の情報：イチョウ、ドウダンツツジ、モミジ'], 
			[36.973293140376335,  140.35977383821523,  '山本不動尊',  'https://tenki.jp/kouyou/2/10/34264.html',  'https://static.tenki.jp/static-images/kouyou/point/34264/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ、カエデ'], 
			[37.036507296293955,  140.83727080937223,  '国宝白水阿弥陀堂',  'https://tenki.jp/kouyou/2/10/34265.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ノムラモミジ、オオイチョウ、ヤマモミジ、ニシキギ'], 
			[36.37911241248715,  140.44978365045017,  '茨城県立歴史館',  'https://tenki.jp/kouyou/3/11/34263.html',  'https://static.tenki.jp/static-images/kouyou/point/34263/square.jpg',  '紅葉の情報：イチョウ'], 
			[35.47206172961931,  136.03636291872687,  'メタセコイア並木',  'https://tenki.jp/kouyou/6/28/30292.html',  'https://static.tenki.jp/static-images/kouyou/point/30292/square.jpg',  '紅葉の情報：メタセコイア'], 
			[34.88884756884173,  135.80807375072726,  '平等院',  'https://tenki.jp/kouyou/6/29/30842.html',  'https://static.tenki.jp/static-images/kouyou/point/30842/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ'], 
			[35.01475342716166,  135.7498549637443,  '元離宮二条城',  'https://tenki.jp/kouyou/6/29/36683.html',  'https://static.tenki.jp/static-images/kouyou/point/36683/square.jpg',  '紅葉の情報：イロハモミジ、イチョウ'], 
			[34.51870272941239,  133.92941092573258,  'みやま公園(深山イギリス庭園)',  'https://tenki.jp/kouyou/7/36/30843.html',  'https://static.tenki.jp/static-images/kouyou/point/30843/square.jpg',  '紅葉の情報：フウ、ジューンベリー、ハナミズキ、ニシキギ、オオデマリ'], 
			[34.455721809280284,  133.02668075992142,  '佛通寺',  'https://tenki.jp/kouyou/7/37/38050.html',  'https://static.tenki.jp/static-images/kouyou/point/38050/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[32.80576779751785,  130.70645841792708,  '熊本城',  'https://tenki.jp/kouyou/9/46/30738.html',  'https://static.tenki.jp/static-images/kouyou/point/30738/square.jpg',  '紅葉の情報：イチョウ、モミジ'], 
			[38.18045275396343,  140.66721392974614,  'みちのく杜の湖畔公園',  'https://tenki.jp/kouyou/2/7/34689.html',  'https://static.tenki.jp/static-images/kouyou/point/34689/square.jpg',  '紅葉の情報：コキア(ホウキグサ)'], 
			[38.30847146239257,  140.0556496255643,  '空気神社',  'https://tenki.jp/kouyou/2/9/34687.html',  'https://static.tenki.jp/static-images/kouyou/point/34687/square.jpg',  '紅葉の情報：ブナ、ナラ'], 
			[38.49998815406893,  140.00026178401495,  '地蔵沼',  'https://tenki.jp/kouyou/2/9/34690.html',  'https://static.tenki.jp/static-images/kouyou/point/34690/square.jpg',  '紅葉の情報：ブナ、カラマツ'], 
			[37.203920676385884,  139.6105642012915,  '駒止峠',  'https://tenki.jp/kouyou/2/10/30093.html',  'https://static.tenki.jp/static-images/kouyou/point/30093/square.jpg',  '紅葉の情報：モミジ、ケヤキ、ナラ、ウルシ、ブナ'], 
			[37.319604880776026,  139.6477065845197,  '「喰丸小」の大銀杏',  'https://tenki.jp/kouyou/2/10/30849.html',  'https://static.tenki.jp/static-images/kouyou/point/30849/square.jpg',  '紅葉の情報：イチョウ'], 
			[37.719520312176506,  140.35891191814466,  'あづま総合運動公園',  'https://tenki.jp/kouyou/2/10/34688.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ'], 
			[36.45288695497025,  139.3173913727247,  '宝徳寺',  'https://tenki.jp/kouyou/3/13/34686.html',  'https://static.tenki.jp/static-images/kouyou/point/34686/square.jpg',  '紅葉の情報：モミジ'], 
			[36.80273401518315,  138.78078708270246,  '苗場ドラゴンドラ',  'https://tenki.jp/kouyou/4/18/30845.html',  'https://static.tenki.jp/static-images/kouyou/point/30845/square.jpg',  '紅葉の情報：カエデ、ウルシ、ブナ、カラマツ、イチョウ'], 
			[35.36197828655379,  136.51605637175604,  '朝倉山真禅院',  'https://tenki.jp/kouyou/5/24/30848.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[34.73772987122743,  137.97720250584527,  '法多山',  'https://tenki.jp/kouyou/5/25/30846.html',  'https://static.tenki.jp/static-images/kouyou/point/30846/square.jpg',  '紅葉の情報：モミジ、イチョウ'], 
			[34.77485024642467,  137.92001677323967,  '可睡齋',  'https://tenki.jp/kouyou/5/25/30847.html',  'https://static.tenki.jp/static-images/kouyou/point/30847/square.jpg',  '紅葉の情報：モミジ'], 
			[35.34155386748377,  135.3069379558249,  '安国寺',  'https://tenki.jp/kouyou/6/29/36679.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[34.994690531508084,  135.8268128070269,  '山科疏水',  'https://tenki.jp/kouyou/6/29/36684.html',  'https://static.tenki.jp/static-images/kouyou/point/36684/square.jpg',  '紅葉の情報：イチョウ、カエデ'], 
			[35.430384603364,  133.60841445177888,  '船上山',  'https://tenki.jp/kouyou/7/34/36655.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ブナ、ナラ、ミズナラ、ナナカマド'], 
			[34.48056342982398,  132.89778915973315,  '深山峡(東広島)',  'https://tenki.jp/kouyou/7/37/38074.html',  'https://static.tenki.jp/static-images/kouyou/point/38074/square.jpg',  '紅葉の情報：モミジ'], 
			[37.65611618888797,  140.08929359365615,  '五色沼湖沼群',  'https://tenki.jp/kouyou/2/10/32560.html',  'https://static.tenki.jp/static-images/kouyou/point/32560/square.jpg',  '紅葉の情報：モミジ、カラマツ、ナナカマド'], 
			[41.79199743409062,  140.80284402452574,  '香雪園(見晴公園内)',  'https://tenki.jp/kouyou/1/4/31001.html',  'https://static.tenki.jp/static-images/kouyou/point/31001/square.jpg',  '紅葉の情報：ヤマモミジ、イロハモミジ、イタヤカエデ、オオサカズキ、ハウチワカエデ'], 
			[38.65952098267395,  141.2803166731979,  '伝統芸能伝承館「森舞台」',  'https://tenki.jp/kouyou/2/7/38077.html',  'https://static.tenki.jp/static-images/kouyou/point/38077/square.jpg',  '紅葉の情報：イロハモミジ、トネリコバノカエデ、ノルウェーカエデ、ヨーロッパブナ、アカガシ'], 
			[36.733347120258344,  140.61765229921136,  '花貫渓谷',  'https://tenki.jp/kouyou/3/11/34254.html',  'https://static.tenki.jp/static-images/kouyou/point/34254/square.jpg',  '紅葉の情報：モミジ、カエデ、ヤマザクラ、クヌギ、ナラ'], 
			[36.82065291616365,  139.70837863196905,  '鬼怒川温泉郷',  'https://tenki.jp/kouyou/3/12/34691.html',  'https://static.tenki.jp/static-images/kouyou/point/34691/square.jpg',  '紅葉の情報：現地問合せ'], 
			[36.89341215756691,  139.70498513514212,  '川治温泉郷',  'https://tenki.jp/kouyou/3/12/34692.html',  'https://static.tenki.jp/static-images/kouyou/point/34692/square.jpg',  '紅葉の情報：現地問合せ'], 
			[35.14528025523802,  139.07447367123703,  '万葉公園(湯河原)',  'https://tenki.jp/kouyou/3/17/30714.html',  'https://static.tenki.jp/static-images/kouyou/point/30714/square.jpg',  '紅葉の情報：モミジ'], 
			[36.40415268284933,  136.88660588055552,  '五箇山菅沼合掌造り集落',  'https://tenki.jp/kouyou/4/19/35160.html',  'https://static.tenki.jp/static-images/kouyou/point/35160/square.jpg',  '紅葉の情報：ブナ、ナラ、モミジ、ケヤキ、トチ'], 
			[35.453366422199416,  135.8046356985289,  '明通寺',  'https://tenki.jp/kouyou/4/21/36104.html',  'https://static.tenki.jp/static-images/kouyou/point/36104/square.jpg',  '紅葉の情報：ヤマモミジ、ノムラ、メグスリノキ、チシオモミジ'], 
			[35.82186786482076,  138.3535968762275,  '清春芸術村',  'https://tenki.jp/kouyou/3/22/30145.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：サクラ、カエデ'], 
			[35.69712756960536,  138.271180393338,  '南アルプス白鳳渓谷',  'https://tenki.jp/kouyou/3/22/30719.html',  'https://static.tenki.jp/static-images/kouyou/point/30719/square.jpg',  '紅葉の情報：ブナ、カエデ、カラマツ、カツラ、ダケカンバ'], 
			[35.54660803194707,  138.73182529139498,  '新道峠(FUJIYAMAツインテラス)',  'https://tenki.jp/kouyou/3/22/38076.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミ、カエデ、ナラ、クヌギ、ブナ'], 
			[35.94647941186013,  138.04067664553617,  'もみじ湖(箕輪ダム)',  'https://tenki.jp/kouyou/3/23/30852.html',  'https://static.tenki.jp/static-images/kouyou/point/30852/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ'], 
			[36.7286694881281,  137.84026173687784,  '白馬岩岳マウンテンリゾート',  'https://tenki.jp/kouyou/3/23/30854.html',  'https://static.tenki.jp/static-images/kouyou/point/30854/square.jpg',  '紅葉の情報：カエデ、ブナ、ナラ'], 
			[35.94089380801527,  137.36250766067988,  '御嶽パノラマライン',  'https://tenki.jp/kouyou/5/24/30742.html',  'https://static.tenki.jp/static-images/kouyou/point/30742/square.jpg',  '紅葉の情報：ナラ、シラカバ、カラマツ'], 
			[35.22412375208211,  138.2433974489879,  '井川湖周辺',  'https://tenki.jp/kouyou/5/25/30205.html',  'https://static.tenki.jp/static-images/kouyou/point/30205/square.jpg',  '紅葉の情報：モミジ、カエデ、ウルシ'], 
			[34.98276149215888,  137.58256977595477,  '鳳来寺山',  'https://tenki.jp/kouyou/5/26/30209.html',  'https://static.tenki.jp/static-images/kouyou/point/30209/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ、カキノキ、トウカエデ、ソメイヨシノ'], 
			[34.99017391780221,  136.04864307712535,  '常楽寺(湖南三山)',  'https://tenki.jp/kouyou/6/28/30290.html',  'https://static.tenki.jp/static-images/kouyou/point/30290/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ'], 
			[35.105993342375506,  135.76381584692936,  '貴船周辺',  'https://tenki.jp/kouyou/6/29/36579.html',  'https://static.tenki.jp/static-images/kouyou/point/36579/square.jpg',  '紅葉の情報：イロハモミジ、オオモミジ、ヤマモミジ'], 
			[35.45546106603374,  134.95954817969093,  '但馬安国禅寺のドウダンツツジ',  'https://tenki.jp/kouyou/6/31/30365.html',  'https://static.tenki.jp/static-images/kouyou/point/30365/square.jpg',  '紅葉の情報：ドウダンツツジ'], 
			[34.338393919119625,  135.8805414173281,  '吉野山(奥千本)',  'https://tenki.jp/kouyou/6/32/30855.html',  'https://static.tenki.jp/static-images/kouyou/point/30855/square.jpg',  '紅葉の情報：シロヤマザクラ、カエデ'], 
			[33.54765881202394,  135.719612402159,  '古座川峡(一枚岩)',  'https://tenki.jp/kouyou/6/33/36610.html',  'https://static.tenki.jp/static-images/kouyou/point/36610/square.jpg',  '紅葉の情報：モミジ'], 
			[33.53343195709272,  132.891981186774,  '小田深山渓谷',  'https://tenki.jp/kouyou/8/41/30853.html',  'https://static.tenki.jp/static-images/kouyou/point/30853/square.jpg',  '紅葉の情報：モミジ、ケヤキ、シオジ、サワグルミ'], 
			[33.25722682817378,  130.08934901875728,  '西渓公園',  'https://tenki.jp/kouyou/9/44/30828.html',  'https://static.tenki.jp/static-images/kouyou/point/30828/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[38.10275997482328,  139.9547526568426,  '長井ダム・ながい百秋湖',  'https://tenki.jp/kouyou/2/9/32593.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：現地問合せ'], 
			[37.31100521812947,  139.28467385656603,  '田子倉ダム',  'https://tenki.jp/kouyou/2/10/32594.html',  'https://static.tenki.jp/static-images/kouyou/point/32594/square.jpg',  '紅葉の情報：ブナ、ナラ、カエデ'], 
			[36.566316986536265,  137.66453338155316,  '黒部ダム',  'https://tenki.jp/kouyou/4/19/30857.html',  'https://static.tenki.jp/static-images/kouyou/point/30857/square.jpg',  '紅葉の情報：現地問合せ'], 
			[36.45372278688115,  138.36348461723713,  '角間渓谷',  'https://tenki.jp/kouyou/3/23/35138.html',  'https://static.tenki.jp/static-images/kouyou/point/35138/square.jpg',  '紅葉の情報：カエデ'], 
			[35.15618726727464,  132.80868985065268,  '県立自然公園 八重滝',  'https://tenki.jp/kouyou/7/35/30325.html',  'https://static.tenki.jp/static-images/kouyou/point/30325/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[34.814273298762636,  132.84002695195326,  '尾関山公園',  'https://tenki.jp/kouyou/7/37/38080.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イロハモミジ、カエデ'], 
			[34.303055772790735,  131.5762487204016,  '長門峡',  'https://tenki.jp/kouyou/7/38/38057.html',  'https://static.tenki.jp/static-images/kouyou/point/38057/square.jpg',  '紅葉の情報：カエデ、ケヤキ、モミジ、ハゼノキ'], 
			[33.35717640877109,  130.36384860850467,  '九年庵',  'https://tenki.jp/kouyou/9/44/30586.html',  'https://static.tenki.jp/static-images/kouyou/point/30586/square.jpg',  '紅葉の情報：モミジ、ドウダンツツジ'], 
			[32.27690781672568,  130.61443914455683,  '球磨川',  'https://tenki.jp/kouyou/9/46/30523.html',  'https://static.tenki.jp/static-images/kouyou/point/30523/square.jpg',  '紅葉の情報：ハゼ、モミジ、イチョウ'], 
			[40.52108594243495,  140.15831849383596,  '白神山地 暗門の滝',  'https://tenki.jp/kouyou/2/5/32368.html',  'https://static.tenki.jp/static-images/kouyou/point/32368/square.jpg',  '紅葉の情報：ブナ'], 
			[38.95574130806674,  140.54122716788896,  '秋の宮温泉郷',  'https://tenki.jp/kouyou/2/8/30607.html',  'https://static.tenki.jp/static-images/kouyou/point/30607/square.jpg',  '紅葉の情報：モミジ、ウルシ、イチョウ'], 
			[38.076521127942144,  139.7138937508425,  '赤芝峡',  'https://tenki.jp/kouyou/2/9/32564.html',  'https://static.tenki.jp/static-images/kouyou/point/32564/square.jpg',  '紅葉の情報：ヤマモミジ、ヤマウルシ'], 
			[36.92776583175901,  140.48284426025026,  '那倉川渓谷',  'https://tenki.jp/kouyou/2/10/30859.html',  'https://static.tenki.jp/static-images/kouyou/point/30859/square.jpg',  '紅葉の情報：モミジ'], 
			[36.98518792475426,  140.73088055236255,  '龍神峡(いわき市)',  'https://tenki.jp/kouyou/2/10/34266.html',  'https://static.tenki.jp/static-images/kouyou/point/34266/square.jpg',  '紅葉の情報：モミジ'], 
			[35.30240093393896,  139.07619704008317,  '大雄山最乗寺',  'https://tenki.jp/kouyou/3/17/30107.html',  'https://static.tenki.jp/static-images/kouyou/point/30107/square.jpg',  '紅葉の情報：モミジ'], 
			[35.335147668309496,  139.16051907788892,  'BIOTOPIA',  'https://tenki.jp/kouyou/3/17/30858.html',  'https://static.tenki.jp/static-images/kouyou/point/30858/square.jpg',  '紅葉の情報：イチョウ、イロハモミジ'], 
			[36.17372997839399,  136.6255865588275,  '白峰集落一帯',  'https://tenki.jp/kouyou/4/20/30300.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[36.56695034962996,  138.40413674343395,  '米子大瀑布',  'https://tenki.jp/kouyou/3/23/30649.html',  'https://static.tenki.jp/static-images/kouyou/point/30649/square.jpg',  '紅葉の情報：モミジ、コナラ、ブナ'], 
			[36.05174387503415,  137.60458433823163,  '野麦峠',  'https://tenki.jp/kouyou/5/24/30269.html',  'https://static.tenki.jp/static-images/kouyou/point/30269/square.jpg',  '紅葉の情報：ナラ、カエデ、カラマツ、ヤマザクラ、ナナカマド'], 
			[35.47757349921611,  137.18218450848576,  'めい想の森',  'https://tenki.jp/kouyou/5/24/30860.html',  'https://static.tenki.jp/static-images/kouyou/point/30860/square.jpg',  '紅葉の情報：メタセコイア'], 
			[35.13189947232165,  137.31316838192805,  '香嵐渓',  'https://tenki.jp/kouyou/5/26/30227.html',  'https://static.tenki.jp/static-images/kouyou/point/30227/square.jpg',  '紅葉の情報：イロハカエデ、ヤマモミジ、ウラゲエンコウカエデ'], 
			[34.88921378487772,  136.16267490557243,  '明王寺',  'https://tenki.jp/kouyou/6/28/30294.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、ドウダンツツジ、ナンキンハゼ'], 
			[35.50600837149777,  136.25785169497144,  '鶏足寺(旧飯福寺)',  'https://tenki.jp/kouyou/6/28/36546.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[35.33528012135179,  134.6081447630522,  '天滝',  'https://tenki.jp/kouyou/6/31/36677.html',  'https://static.tenki.jp/static-images/kouyou/point/36677/square.jpg',  '紅葉の情報：モミジ'], 
			[34.83266124432478,  133.75886452678486,  '吉備中央公園',  'https://tenki.jp/kouyou/7/36/30861.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[33.79310658181889,  133.76919472861204,  '定福寺',  'https://tenki.jp/kouyou/8/42/30483.html',  'https://static.tenki.jp/static-images/kouyou/point/30483/square.jpg',  '紅葉の情報：イロハモミジ'], 
			[38.987218994013126,  141.10815216276592,  '毛越寺',  'https://tenki.jp/kouyou/2/6/30603.html',  'https://static.tenki.jp/static-images/kouyou/point/30603/square.jpg',  '紅葉の情報：モミジ、カエデ'], 
			[38.36757544901324,  141.06016498342117,  '宮城県松島離宮',  'https://tenki.jp/kouyou/2/7/30862.html',  'https://static.tenki.jp/static-images/kouyou/point/30862/square.jpg',  '紅葉の情報：イロハモミジ、ヤマモミジ、ノムラモミジ、コハウチワカエデ、エンコウカエデ'], 
			[38.365125892462345,  140.66782134208088,  '定義さん',  'https://tenki.jp/kouyou/2/7/34693.html',  'https://static.tenki.jp/static-images/kouyou/point/34693/square.jpg',  '紅葉の情報：モミジ、ナナカマド、ナラ、その他'], 
			[38.37136301447158,  141.0596908409305,  '円通院',  'https://tenki.jp/kouyou/2/7/34694.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ヤマモミジ、イロハモミジ'], 
			[38.31238777893237,  139.98123073360003,  '古寺渓谷神通峡',  'https://tenki.jp/kouyou/2/9/32576.html',  'https://static.tenki.jp/static-images/kouyou/point/32576/square.jpg',  '紅葉の情報：ブナ、ナラ'], 
			[36.7729521862796,  140.34460530506954,  '永源寺',  'https://tenki.jp/kouyou/3/11/34695.html',  'https://static.tenki.jp/static-images/kouyou/point/34695/square.jpg',  '紅葉の情報：モミジ、ケヤキ、カエデ'], 
			[36.93822234984926,  139.7539184403112,  'ハンターマウンテン塩原',  'https://tenki.jp/kouyou/3/12/30177.html',  'https://static.tenki.jp/static-images/kouyou/point/30177/square.jpg',  '紅葉の情報：カエデ、カラマツ、ミズナラ、ブナ、その他'], 
			[36.55406618215239,  137.00884443158532,  '庄川峡',  'https://tenki.jp/kouyou/4/19/35161.html',  'https://static.tenki.jp/static-images/kouyou/point/35161/square.jpg',  '紅葉の情報：ブナ、イチョウ、トチノキ、モミジ'], 
			[36.74947685980317,  137.022608406264,  '高岡古城公園',  'https://tenki.jp/kouyou/4/19/35162.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、スダジイ、エノキ、ケヤキ'], 
			[36.86540386075674,  138.44661133474037,  '馬曲温泉',  'https://tenki.jp/kouyou/3/23/35157.html',  'https://static.tenki.jp/static-images/kouyou/point/35157/square.jpg',  '紅葉の情報：モミジ、ナラ、ウルシ'], 
			[36.180845638825126,  137.53052075619357,  '乗鞍スカイライン',  'https://tenki.jp/kouyou/5/24/30721.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ナナカマド、ダケカンバ、カエデ'], 
			[35.24004900232067,  137.14497894572102,  '岩屋堂公園',  'https://tenki.jp/kouyou/5/26/30250.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、ヤマモミジ'], 
			[35.29365843405118,  135.26049476413775,  '大本神苑',  'https://tenki.jp/kouyou/6/29/36611.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：現地問合せ'], 
			[34.43739481074968,  135.59856919184094,  '観心寺',  'https://tenki.jp/kouyou/6/30/36612.html',  'https://static.tenki.jp/static-images/kouyou/point/36612/square.jpg',  '紅葉の情報：モミジ'], 
			[34.75212335516779,  135.68811723109636,  '府民の森ほしだ園地',  'https://tenki.jp/kouyou/6/30/36613.html',  'https://static.tenki.jp/static-images/kouyou/point/36613/square.jpg',  '紅葉の情報：カエデ、コナラ'], 
			[34.42928886235634,  135.52953489820163,  '天野山金剛寺',  'https://tenki.jp/kouyou/6/30/36616.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ、イチョウ'], 
			[34.55972256734982,  135.48055727341534,  '大仙公園日本庭園',  'https://tenki.jp/kouyou/6/30/36672.html',  'https://static.tenki.jp/static-images/kouyou/point/36672/square.jpg',  '紅葉の情報：イロハモミジ、ドウダンツツジ、トウカエデ'], 
			[35.21071720267329,  135.02694415248996,  '円通寺',  'https://tenki.jp/kouyou/6/31/30374.html',  'https://static.tenki.jp/static-images/kouyou/point/30374/square.jpg',  '紅葉の情報：イロハモミジ、ドウダンツツジ'], 
			[34.23556487574106,  131.8150793360021,  '漢陽寺',  'https://tenki.jp/kouyou/7/38/36615.html',  'https://static.tenki.jp/static-images/kouyou/point/36615/square.jpg',  '紅葉の情報：モミジ'], 
			[32.945050971792114,  130.11025223494443,  '轟峡',  'https://tenki.jp/kouyou/9/45/30571.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、カエデ'], 
			[42.497594624832374,  141.1486532543898,  '登別温泉地獄谷',  'https://tenki.jp/kouyou/1/4/30017.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ナナカマド、ヤマウルシ、モミジ'], 
			[35.70925651856981,  139.39101628360947,  '国営昭和記念公園',  'https://tenki.jp/kouyou/3/16/30110.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イチョウ、モミジ、ハナミズキ、ナンキンハゼ、メタセコイア'], 
			[36.88692794990225,  138.17739441146156,  '妙高高原スカイケーブル',  'https://tenki.jp/kouyou/4/18/30797.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：ブナ'], 
			[35.08928219250374,  137.91501823767015,  '明神峡',  'https://tenki.jp/kouyou/5/25/30225.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：カエデ、モミジ'], 
			[34.90175518935986,  136.22951850794246,  '鹿深夢の森',  'https://tenki.jp/kouyou/6/28/30865.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：メタセコイア、イチョウ'], 
			[34.64950412079511,  135.51044444432716,  '慶沢園',  'https://tenki.jp/kouyou/6/30/30866.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：イロハモミジ'], 
			[34.2118800371593,  131.7100684623598,  '重源の郷',  'https://tenki.jp/kouyou/7/38/30475.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イチョウ、ケヤキ、ドウダンツツジ、ミズキ'], 
			[33.03220814474162,  130.4970483407483,  '普光寺',  'https://tenki.jp/kouyou/9/43/30863.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ、イチョウ'], 
			[32.20177166337472,  130.9190526862259,  '麓城跡',  'https://tenki.jp/kouyou/9/46/30513.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
			[33.31438829520039,  130.92840162057917,  '亀山公園',  'https://tenki.jp/kouyou/9/47/30864.html',  'https://static.tenki.jp/images/icon/kouyou/noimage-square.png',  '紅葉の情報：モミジ'], 
		];

		const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
		koyoMap = L.map('kouyou-map-wrap', {
			fullscreenControl: true,
			fullscreenControlOptions: { position: 'topleft' },
			minZoom: 4,
			maxZoom: 18
		}).fitBounds(bounds.pad(0.25));

		L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: '<a href="https://maps.gsi.go.jp/development/index.html" target="_blank" rel="noopener">国土地理院</a>'
		}).addTo(koyoMap);

		L.control.scale({ imperial: true }).addTo(koyoMap);

		points.forEach(([lat, lng, name, href, img, info]) => {
			L.marker([lat, lng]).addTo(koyoMap).bindPopup(
				'<div class="clearfix">' +
				'<div class="map-point-kouyou-name" style="width:215px;"><a href="' + href + '" target="_blank" rel="noopener">' + name + '</a></div>' +
				'<div class="map-point-kouyou-img"><a href="' + href + '" target="_blank" rel="noopener"><img src="' + img + '" width="60" height="60" alt="' + name + '" title="' + name + '"></a></div>' +
				'<div class="map-point-kouyou-info"><span class="map-point-kouyou-kind">' + info + '</span></div>' +
				'</div>'
			);
		});

		setTimeout(() => koyoMap.invalidateSize(), 150);
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
		if (tabId === 'koyo') initKoyoMap();
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