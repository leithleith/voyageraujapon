// Voyager au Japon - logique de navigation (onglets, menu mobile, accordéon natif) et applicative - Contrôle plein écran Leaflet (ex Control.FullScreen.js) : basé sur le paquet 'screenfull' — v5.2.0 — (c) Sindre Sorhus — Licence MIT
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
	document.addEventListener('click', (event) => {
		if (!siteNav.classList.contains('is-open')) return;
		if (siteNav.contains(event.target) || navToggle.contains(event.target)) return;
		closeMenu();
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeMenu();
	});
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
		const pointsKouyou = [
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
		const bounds = L.latLngBounds(pointsKouyou.map(([lat, lng]) => [lat, lng]));
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
		var kouyouIcon = L.icon({
    		iconUrl: 'kouyou-icon.png',
			iconSize:     [32, 32],
    		iconAnchor:   [32, 32],
    		popupAnchor:  [-5, -10]
		});
		var kouyouIcon2 = L.icon({
    		iconUrl: 'kouyou2-icon.png',
			iconSize:     [32, 32],
    		iconAnchor:   [32, 32],
    		popupAnchor:  [-5, -10]
		});
		pointsKouyou.forEach(([lat, lng, name, href, img, info]) => {
			const icon = Math.random() < 0.5 ? kouyouIcon : kouyouIcon2;
			L.marker([lat, lng], { icon: icon }).addTo(koyoMap).bindPopup(
				'<div class="clearfix">' +
				'<div class="map-point-kouyou-name" style="width:215px;"><a href="' + href + '" target="_blank" rel="noopener">' + name + '</a></div>' +
				'<div class="map-point-kouyou-img"><a href="' + href + '" target="_blank" rel="noopener"><img src="' + img + '" width="60" height="60" alt="' + name + '" title="' + name + '"></a></div>' +
				'<div class="map-point-kouyou-info"><span class="map-point-kouyou-kind">' + info + '</span></div>' +
				'</div>'
			);
		});
		setTimeout(() => koyoMap.invalidateSize(), 150);
	};
let sakuraMap = null;
	const initSakuraMap = () => {
		if (sakuraMap) return;
		const container = document.getElementById('sakura-map-wrap');
		if (!container || !window.L) return;
		const pointsSakura = [
			[44.00071993974363, 144.2410741131389, '天都山桜公園', 'https://tenki.jp/sakura/1/3/50009.html', 'https://static.tenki.jp/static-images/sakura/point/50009/square.jpg', '桜の種類：エゾヤマザクラ'],
			[42.99454472643735, 144.45891174348722, '別保公園', 'https://tenki.jp/sakura/1/3/50017.html', 'https://static.tenki.jp/static-images/sakura/point/50017/square.jpg', '桜の種類：エゾヤマザクラ、チシマザクラ、クシロヤエザクラ'],
			[43.33912819529309, 141.8999637173856, '美唄市東明公園', 'https://tenki.jp/sakura/1/2/50033.html', 'https://static.tenki.jp/static-images/sakura/point/50033/square.jpg', '桜の種類：エゾヤマザクラ、ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[43.52021858749597, 142.20082989148568, '芦別市旭ケ丘公園', 'https://tenki.jp/sakura/1/2/50034.html', 'https://static.tenki.jp/static-images/sakura/point/50034/square.jpg', '桜の種類：エゾヤマザクラ'],
			[41.797064856532955, 140.75573929888753, '五稜郭公園', 'https://tenki.jp/sakura/1/4/50036.html', 'https://static.tenki.jp/static-images/sakura/point/50036/square.jpg', '桜の種類：ソメイヨシノ'],
			[41.4297455103088, 140.10896256769334, '松前公園', 'https://tenki.jp/sakura/1/4/50037.html', 'https://static.tenki.jp/static-images/sakura/point/50037/square.jpg', '桜の種類：ナデン、オオヤマザクラ、カンザン、オオシマザクラ、イトククリ'],
			[42.10262605892158, 140.57560998208274, '青葉ヶ丘公園', 'https://tenki.jp/sakura/1/4/50039.html', 'https://static.tenki.jp/static-images/sakura/point/50039/square.jpg', '桜の種類：ソメイヨシノ、カンザン、アオバシダレ、ギョイコウ、モリコマチ'],
			[42.52297325126996, 140.7806693110323, '有珠善光寺自然公園', 'https://tenki.jp/sakura/1/4/50043.html', 'https://static.tenki.jp/static-images/sakura/point/50043/square.jpg', '桜の種類：エゾヤマザクラ、ソメイヨシノ、オオシマザクラ、シダレザクラ、ヒガンザクラ'],
			[42.044650193881, 143.29238205641218, 'えりも町庶野さくら公園', 'https://tenki.jp/sakura/1/4/50046.html', 'https://static.tenki.jp/static-images/sakura/point/50046/square.jpg', '桜の種類：エゾヤマザクラ、ヤエベニシダレ、ソメイヨシノ、カスミザクラ、カンザン'],
			[43.42661022007961, 141.92012281812734, '奈井江町にわ山森林自然公園', 'https://tenki.jp/sakura/1/2/50047.html', 'https://static.tenki.jp/static-images/sakura/point/50047/square.jpg', '桜の種類：エゾヤマザクラ、ヤエザクラ'],
			[42.56623276391969, 140.82121009839776, '洞爺湖温泉', 'https://tenki.jp/sakura/1/4/50055.html', 'https://static.tenki.jp/static-images/sakura/point/50055/square.jpg', '桜の種類：ヤエザクラ'],
			[42.87418698984601, 141.80615804430562, '安平町鹿公園', 'https://tenki.jp/sakura/1/4/50060.html', 'https://static.tenki.jp/static-images/sakura/point/50060/square.jpg', '桜の種類：エゾヤマザクラ'],
			[42.256642001311256, 140.25498651099434, 'さらんべ公園', 'https://tenki.jp/sakura/1/4/50063.html', 'https://static.tenki.jp/static-images/sakura/point/50063/square.jpg', '桜の種類：ソメイヨシノ、エゾヤマザクラ'],
			[42.88443061521995, 142.4353104086654, '神楽岡公園', 'https://tenki.jp/sakura/1/4/50064.html', 'https://static.tenki.jp/static-images/sakura/point/50064/square.jpg', '桜の種類：エゾヤマザクラ'],
			[41.43147822229874, 140.1059197811636, '光善寺(血脈桜)', 'https://tenki.jp/sakura/1/4/50065.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：血脈桜、光善寺シロヤエザクラ'],
			[42.97309411939561, 144.4040694594395, '春採公園', 'https://tenki.jp/sakura/1/3/50067.html', 'https://static.tenki.jp/static-images/sakura/point/50067/square.jpg', '桜の種類：エゾヤマザクラ、ウワミズザクラ、クシロヤエザクラ、ミヤマザクラ、シウリザクラ'],
			[42.10132097708607, 140.56841786368827, 'オニウシ公園', 'https://tenki.jp/sakura/1/4/50069.html', 'https://static.tenki.jp/static-images/sakura/point/50069/square.jpg', '桜の種類：ソメイヨシノ、堀井緋桜(ホリイヒザクラ)、駒見桜(コマミザクラ)、カンザン'],
			[40.61665123113539, 140.56482952916488, '猿賀公園', 'https://tenki.jp/sakura/2/5/50143.html', 'https://static.tenki.jp/static-images/sakura/point/50143/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[40.47568012013909, 141.5132901864156, '八戸公園', 'https://tenki.jp/sakura/2/5/50144.html', 'https://static.tenki.jp/static-images/sakura/point/50144/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[40.60881190728642, 141.43786620720633, 'いちょう公園', 'https://tenki.jp/sakura/2/5/50251.html', 'https://static.tenki.jp/static-images/sakura/point/50251/square.jpg', '桜の種類：ソメイヨシノ、カンザクラ、ヤエザクラ、ヤマザクラ、オオヤマザクラ'],
			[39.21030511180859, 141.87782839596443, '唐丹町本郷桜並木', 'https://tenki.jp/sakura/2/6/50198.html', 'https://static.tenki.jp/static-images/sakura/point/50198/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.70387379223076, 141.15104014606823, '石割桜', 'https://tenki.jp/sakura/2/6/50200.html', 'https://static.tenki.jp/static-images/sakura/point/50200/square.jpg', '桜の種類：エドヒガン'],
			[38.99012002220807, 141.74184093798337, '碁石海岸', 'https://tenki.jp/sakura/2/6/50217.html', 'https://static.tenki.jp/static-images/sakura/point/50217/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.3262027099392, 141.52731974610646, '鍋倉公園', 'https://tenki.jp/sakura/2/6/50258.html', 'https://static.tenki.jp/static-images/sakura/point/50258/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.925240288341875, 141.12916840975868, '釣山公園', 'https://tenki.jp/sakura/2/6/50719.html', 'https://static.tenki.jp/static-images/sakura/point/50719/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.003579291403575, 141.15474813165608, '西行桜の森', 'https://tenki.jp/sakura/2/6/51004.html', 'https://static.tenki.jp/static-images/sakura/point/51004/square.jpg', '桜の種類：オオヤマザクラ、カスミザクラ、エドヒガン、ソメイヨシノ'],
			[38.943887459684476, 141.04789021957714, '厳美渓', 'https://tenki.jp/sakura/2/6/52101.html', 'https://static.tenki.jp/static-images/sakura/point/52101/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.05017088319177, 141.1189519808489, 'お物見公園', 'https://tenki.jp/sakura/2/6/52106.html', 'https://static.tenki.jp/static-images/sakura/point/52106/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、オオシマザクラ、シダレヒガン、ベニヤマザクラ'],
			[39.13582719702648, 141.140061025514, '水沢公園', 'https://tenki.jp/sakura/2/6/52107.html', 'https://static.tenki.jp/static-images/sakura/point/52107/square.jpg', '桜の種類：ヒガンザクラ、ソメイヨシノ、シダレザクラ、ヒガン系古木'],
			[39.41786498518116, 141.01294435442432, '花巻南温泉峡', 'https://tenki.jp/sakura/2/6/52110.html', 'https://static.tenki.jp/static-images/sakura/point/52110/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.70038817698931, 141.15140220877066, '盛岡城跡公園(岩手公園)', 'https://tenki.jp/sakura/2/6/52114.html', 'https://static.tenki.jp/static-images/sakura/point/52114/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン'],
			[39.72354203199058, 141.14283843962855, '高松の池', 'https://tenki.jp/sakura/2/6/52115.html', 'https://static.tenki.jp/static-images/sakura/point/52115/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[39.37197969315124, 141.5631196727507, '遠野福泉寺', 'https://tenki.jp/sakura/2/6/52125.html', 'https://static.tenki.jp/static-images/sakura/point/52125/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.46178016210375, 140.8802784140591, '大衡城跡公園', 'https://tenki.jp/sakura/2/7/50134.html', 'https://static.tenki.jp/static-images/sakura/point/50134/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.473581712042076, 140.87484754710562, '大衡中央公園', 'https://tenki.jp/sakura/2/7/50135.html', 'https://static.tenki.jp/static-images/sakura/point/50135/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.57187015782314, 140.718455132914, '薬莱山', 'https://tenki.jp/sakura/2/7/50172.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[38.00230282579128, 140.61738975971423, '白石城本丸広場', 'https://tenki.jp/sakura/2/7/52511.html', 'https://static.tenki.jp/static-images/sakura/point/52511/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、ウバヒガンザクラ'],
			[38.055086272427964, 140.7593154962645, '船岡城址公園', 'https://tenki.jp/sakura/2/7/52513.html', 'https://static.tenki.jp/static-images/sakura/point/52513/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[38.31917026202287, 141.01467547734805, '志波彦神社 鹽竈神社', 'https://tenki.jp/sakura/2/7/52515.html', 'https://static.tenki.jp/static-images/sakura/point/52515/square.jpg', '桜の種類：鹽竈桜、シダレザクラ、シキザクラ、ソメイヨシノ、ヤマザクラ'],
			[38.423370306625706, 141.30696296247996, '日和山公園', 'https://tenki.jp/sakura/2/7/52517.html', 'https://static.tenki.jp/static-images/sakura/point/52517/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ'],
			[38.29734389664884, 141.55192642238543, '牡鹿半島 金華山', 'https://tenki.jp/sakura/2/7/52518.html', 'https://static.tenki.jp/static-images/sakura/point/52518/square.jpg', '桜の種類：ソメイヨシノ、シオガマザクラ、ヤエザクラ、シダレザクラ'],
			[38.545234999325636, 141.13131423613993, '城山公園', 'https://tenki.jp/sakura/2/7/52519.html', 'https://static.tenki.jp/static-images/sakura/point/52519/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤマザクラ、ヤエザクラ、ココノエザクラ'],
			[39.262498511976226, 140.24003885817976, '八塩いこいの森', 'https://tenki.jp/sakura/2/8/50245.html', 'https://static.tenki.jp/static-images/sakura/point/50245/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、キザクラ'],
			[40.38867262580059, 139.9851856618673, '御所の台ふれあいパーク', 'https://tenki.jp/sakura/2/8/50257.html', 'https://static.tenki.jp/static-images/sakura/point/50257/square.jpg', '桜の種類：ソメイヨシノ、ベニヤマザクラ'],
			[39.42849878239581, 140.18924132441333, 'かすみ温泉(かすみ桜)', 'https://tenki.jp/sakura/2/8/50260.html', 'https://static.tenki.jp/static-images/sakura/point/50260/square.jpg', '桜の種類：ヤマザクラ'],
			[40.21491843035429, 140.37935152067823, '鷹巣中央公園', 'https://tenki.jp/sakura/2/8/50265.html', 'https://static.tenki.jp/static-images/sakura/point/50265/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、シダレザクラ'],
			[39.173865534661545, 140.49314767383305, '前森公園', 'https://tenki.jp/sakura/2/8/52310.html', 'https://static.tenki.jp/static-images/sakura/point/52310/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[39.20963782498646, 140.57249506828992, '真人公園', 'https://tenki.jp/sakura/2/8/52311.html', 'https://static.tenki.jp/static-images/sakura/point/52311/square.jpg', '桜の種類：ソメイヨシノ、ベニヤマザクラ'],
			[39.32053757719743, 140.5698513330496, '横手公園', 'https://tenki.jp/sakura/2/8/52312.html', 'https://static.tenki.jp/static-images/sakura/point/52312/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[40.22130879032637, 140.25625083118055, 'きみまち阪公園', 'https://tenki.jp/sakura/2/8/52315.html', 'https://static.tenki.jp/static-images/sakura/point/52315/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、シダレザクラ、ギョイコウ'],
			[39.265520863026325, 139.92362248274637, '勢至公園', 'https://tenki.jp/sakura/2/8/52316.html', 'https://static.tenki.jp/static-images/sakura/point/52316/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.38469658920461, 140.04749223836467, '本荘公園', 'https://tenki.jp/sakura/2/8/52317.html', 'https://static.tenki.jp/static-images/sakura/point/52317/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.534815317470965, 140.51945725623438, '八乙女公園', 'https://tenki.jp/sakura/2/8/52318.html', 'https://static.tenki.jp/static-images/sakura/point/52318/square.jpg', '桜の種類：ソメイヨシノ'],
			[40.21265594985668, 140.01878360965867, '能代公園', 'https://tenki.jp/sakura/2/8/52320.html', 'https://static.tenki.jp/static-images/sakura/point/52320/square.jpg', '桜の種類：ヨシノザクラ'],
			[39.938944028826874, 140.12371590089677, '雀舘公園(五城目町)', 'https://tenki.jp/sakura/2/8/52324.html', 'https://static.tenki.jp/static-images/sakura/point/52324/square.jpg', '桜の種類：ソメイヨシノ、カスミザクラ、オオヤマザクラ、コマツオトメ、シダレザクラ'],
			[38.44671858957981, 140.3714067972016, '白水川堤防桜並木', 'https://tenki.jp/sakura/2/9/50136.html', 'https://static.tenki.jp/static-images/sakura/point/50136/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.451615658381236, 140.40177861876364, '堂ノ前公園', 'https://tenki.jp/sakura/2/9/50137.html', 'https://static.tenki.jp/static-images/sakura/point/50137/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ'],
			[38.09399784940181, 140.0669760094968, '伊佐沢の久保ザクラ', 'https://tenki.jp/sakura/2/9/50138.html', 'https://static.tenki.jp/static-images/sakura/point/50138/square.jpg', '桜の種類：エドヒガン、ソメイヨシノ'],
			[38.0792813989066, 140.13965197019022, '双松公園', 'https://tenki.jp/sakura/2/9/50193.html', 'https://static.tenki.jp/static-images/sakura/point/50193/square.jpg', '桜の種類：シダレザクラ、エドヒガン、ソメイヨシノ'],
			[38.247380616346, 140.3598159539295, '馬見ヶ崎さくらライン', 'https://tenki.jp/sakura/2/9/50722.html', 'https://static.tenki.jp/static-images/sakura/point/50722/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.1023985194065, 140.04394465637876, '最上川堤防千本桜', 'https://tenki.jp/sakura/2/9/50761.html', 'https://static.tenki.jp/static-images/sakura/point/50761/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.13552087861732, 140.00815496987477, '草岡の大明神ザクラ', 'https://tenki.jp/sakura/2/9/50817.html', 'https://static.tenki.jp/static-images/sakura/point/50817/square.jpg', '桜の種類：エドヒガン、ソメイヨシノ'],
			[38.361496904392794, 140.37954620106, '倉津川枝垂桜', 'https://tenki.jp/sakura/2/9/50996.html', 'https://static.tenki.jp/static-images/sakura/point/50996/square.jpg', '桜の種類：シダレザクラ'],
			[37.909143317759124, 140.10473272941755, '松が岬公園', 'https://tenki.jp/sakura/2/9/52530.html', 'https://static.tenki.jp/static-images/sakura/point/52530/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.050673157278176, 140.16493557924983, '烏帽子山公園', 'https://tenki.jp/sakura/2/9/52531.html', 'https://static.tenki.jp/static-images/sakura/point/52531/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、カスミザクラ、エドヒガン'],
			[38.15804247942046, 140.27670817043807, '上山城・月岡公園', 'https://tenki.jp/sakura/2/9/52532.html', 'https://static.tenki.jp/static-images/sakura/point/52532/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[38.172194239595264, 140.2991856591782, 'みゆき公園', 'https://tenki.jp/sakura/2/9/52533.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[38.25542986318693, 140.3295544865908, '霞城公園', 'https://tenki.jp/sakura/2/9/52534.html', 'https://static.tenki.jp/static-images/sakura/point/52534/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、サトザクラ、エドヒガン、シダレザクラ'],
			[38.3541605593565, 140.3755976983708, '天童公園(舞鶴山)', 'https://tenki.jp/sakura/2/9/52535.html', 'https://static.tenki.jp/static-images/sakura/point/52535/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、シダレザクラ、ヤエザクラ'],
			[38.76656358767796, 140.29358956428433, '最上公園', 'https://tenki.jp/sakura/2/9/52537.html', 'https://static.tenki.jp/static-images/sakura/point/52537/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[38.3848080303165, 140.26805389571672, '寒河江公園', 'https://tenki.jp/sakura/2/9/52538.html', 'https://static.tenki.jp/static-images/sakura/point/52538/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ベニヤマザクラ、オオシマザクラ'],
			[38.75373365080276, 139.75911271661536, '大山公園', 'https://tenki.jp/sakura/2/9/53103.html', 'https://static.tenki.jp/static-images/sakura/point/53103/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.72940896435925, 139.82426768832931, '鶴岡公園', 'https://tenki.jp/sakura/2/9/53104.html', 'https://static.tenki.jp/static-images/sakura/point/53104/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、オオヤマザクラ、オオシマザクラ'],
			[38.615294334945084, 139.60858832925115, 'あつみ温泉 温海川河畔', 'https://tenki.jp/sakura/2/9/53105.html', 'https://static.tenki.jp/static-images/sakura/point/53105/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.919909219753826, 139.82743006716186, '日和山公園', 'https://tenki.jp/sakura/2/9/53124.html', 'https://static.tenki.jp/static-images/sakura/point/53124/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.99374843106444, 140.15320427277578, 'まほろばの緑道', 'https://tenki.jp/sakura/2/9/55162.html', 'https://static.tenki.jp/static-images/sakura/point/55162/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[37.4885757479582, 140.46627521430653, '塩ノ崎の大桜', 'https://tenki.jp/sakura/2/10/50128.html', 'https://static.tenki.jp/static-images/sakura/point/50128/square.jpg', '桜の種類：エドヒガン'],
			[36.95598983062286, 140.40885276187376, '久慈川河川敷の桜並木', 'https://tenki.jp/sakura/2/10/50129.html', 'https://static.tenki.jp/static-images/sakura/point/50129/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.87680886972168, 140.54259866757116, '観月台公園', 'https://tenki.jp/sakura/2/10/50130.html', 'https://static.tenki.jp/static-images/sakura/point/50130/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[37.25680989864603, 140.6535506417352, '夏井千本桜', 'https://tenki.jp/sakura/2/10/50151.html', 'https://static.tenki.jp/static-images/sakura/point/50151/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.11216345308669, 140.21873799208007, '南湖公園・楽翁桜', 'https://tenki.jp/sakura/2/10/50155.html', 'https://static.tenki.jp/static-images/sakura/point/50155/square.jpg', '桜の種類：ヨシノザクラ、ヤマザクラ、ベニシダレザクラ'],
			[37.125471645216244, 140.2089923721439, '妙関寺の乙姫桜', 'https://tenki.jp/sakura/2/10/50156.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ベニシダレザクラ'],
			[37.15831876538201, 140.29355812397847, '昌建寺', 'https://tenki.jp/sakura/2/10/50157.html', 'https://static.tenki.jp/static-images/sakura/point/50157/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ'],
			[36.85080848559306, 140.39472377023256, '矢祭山公園', 'https://tenki.jp/sakura/2/10/50158.html', 'https://static.tenki.jp/static-images/sakura/point/50158/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ボタンザクラ、シダレザクラ'],
			[37.49411162248762, 139.81682370870215, '米沢の千歳桜', 'https://tenki.jp/sakura/2/10/50189.html', 'https://static.tenki.jp/static-images/sakura/point/50189/square.jpg', '桜の種類：ベニヒガンザクラ'],
			[37.24948873699354, 140.35387075157686, '鳥見山公園', 'https://tenki.jp/sakura/2/10/50190.html', 'https://static.tenki.jp/static-images/sakura/point/50190/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[37.35733185793986, 140.60395631284717, '永泉寺のサクラ', 'https://tenki.jp/sakura/2/10/50191.html', 'https://static.tenki.jp/static-images/sakura/point/50191/square.jpg', '桜の種類：ベニシダレザクラ'],
			[37.407685804583956, 140.50003873379902, '三春滝桜', 'https://tenki.jp/sakura/2/10/50221.html', 'https://static.tenki.jp/static-images/sakura/point/50221/square.jpg', '桜の種類：ベニシダレザクラ'],
			[37.53791148751447, 140.57973500737526, '合戦場のしだれ桜', 'https://tenki.jp/sakura/2/10/50241.html', 'https://static.tenki.jp/static-images/sakura/point/50241/square.jpg', '桜の種類：ベニシダレザクラ'],
			[37.62536040599361, 140.4571451208378, '円東寺', 'https://tenki.jp/sakura/2/10/50262.html', 'https://static.tenki.jp/static-images/sakura/point/50262/square.jpg', '桜の種類：シダレザクラ'],
			[37.146598891225665, 140.4591705208203, 'いしかわ桜谷', 'https://tenki.jp/sakura/2/10/50782.html', 'https://static.tenki.jp/static-images/sakura/point/50782/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、カンザン、ベニシダレザクラ'],
			[37.055138224124605, 140.23379379547697, '庄司戻しの桜', 'https://tenki.jp/sakura/2/10/50791.html', 'https://static.tenki.jp/static-images/sakura/point/50791/square.jpg', '桜の種類：マメザクラ'],
			[36.91843647326465, 140.41908861441692, '戸津辺の桜', 'https://tenki.jp/sakura/2/10/50876.html', 'https://static.tenki.jp/static-images/sakura/point/50876/square.jpg', '桜の種類：エドヒガン'],
			[37.51377781489284, 140.37536565113894, '花と歴史の郷 蛇の鼻', 'https://tenki.jp/sakura/2/10/52503.html', 'https://static.tenki.jp/static-images/sakura/point/52503/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[37.59791939608222, 140.43044111716654, '霞ヶ城公園', 'https://tenki.jp/sakura/2/10/52504.html', 'https://static.tenki.jp/static-images/sakura/point/52504/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.60586960216608, 140.3573332320022, '岳温泉', 'https://tenki.jp/sakura/2/10/52505.html', 'https://static.tenki.jp/static-images/sakura/point/52505/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.45673193572314, 139.84362666412952, '宮川千本桜', 'https://tenki.jp/sakura/2/10/52507.html', 'https://static.tenki.jp/static-images/sakura/point/52507/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.487733092964085, 139.92975392808412, '鶴ヶ城公園', 'https://tenki.jp/sakura/2/10/52509.html', 'https://static.tenki.jp/static-images/sakura/point/52509/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、コヒガンザクラ'],
			[37.53302408202118, 139.724628805187, '福満虚空藏菩薩 圓藏寺', 'https://tenki.jp/sakura/2/10/52539.html', 'https://static.tenki.jp/static-images/sakura/point/52539/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.149520269950244, 140.45213391449414, '高田桜', 'https://tenki.jp/sakura/2/10/52540.html', 'https://static.tenki.jp/static-images/sakura/point/52540/square.jpg', '桜の種類：エドヒガン'],
			[37.79769151715591, 140.91498238399342, '中村城跡公園 馬陵公園', 'https://tenki.jp/sakura/2/10/54201.html', 'https://static.tenki.jp/static-images/sakura/point/54201/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.86633473127446, 140.78024449644602, '勿来関跡', 'https://tenki.jp/sakura/2/10/54212.html', 'https://static.tenki.jp/static-images/sakura/point/54212/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[37.05062484669226, 140.88922043804612, '平中央公園', 'https://tenki.jp/sakura/2/10/54214.html', 'https://static.tenki.jp/static-images/sakura/point/54214/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.071346410447916, 140.43752620278528, '西蓮寺', 'https://tenki.jp/sakura/3/11/50246.html', 'https://static.tenki.jp/static-images/sakura/point/50246/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.04406603451021, 139.9760906649155, '弘経寺', 'https://tenki.jp/sakura/3/11/50272.html', 'https://static.tenki.jp/static-images/sakura/point/50272/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.005140990411626, 139.92287804096597, '水海道あすなろの里', 'https://tenki.jp/sakura/3/11/50273.html', 'https://static.tenki.jp/static-images/sakura/point/50273/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.07515005023973, 140.0008596803691, '吉野公園', 'https://tenki.jp/sakura/3/11/50274.html', 'https://static.tenki.jp/static-images/sakura/point/50274/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.54820074074454, 140.4211736798974, '宇留野展望台', 'https://tenki.jp/sakura/3/11/50288.html', 'https://static.tenki.jp/static-images/sakura/point/50288/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.59165312694557, 140.4204730603212, '辰ノ口親水公園', 'https://tenki.jp/sakura/3/11/50289.html', 'https://static.tenki.jp/static-images/sakura/point/50289/square.jpg', '桜の種類：ソメイヨシノ、センダイヤザクラ'],
			[36.368096684462856, 140.45624853294362, '千波公園', 'https://tenki.jp/sakura/3/11/50792.html', 'https://static.tenki.jp/static-images/sakura/point/50792/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ'],
			[36.38417488585783, 140.2596630979162, '佐白山麓公園', 'https://tenki.jp/sakura/3/11/50793.html', 'https://static.tenki.jp/static-images/sakura/point/50793/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.89154926675523, 140.66240615581125, '神之池緑地公園', 'https://tenki.jp/sakura/3/11/50794.html', 'https://static.tenki.jp/static-images/sakura/point/50794/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.04019276617644, 140.02847711444184, '福岡堰桜並木', 'https://tenki.jp/sakura/3/11/50795.html', 'https://static.tenki.jp/static-images/sakura/point/50795/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.99027197192768, 140.48030140486514, '羽黒山公園', 'https://tenki.jp/sakura/3/11/50829.html', 'https://static.tenki.jp/static-images/sakura/point/50829/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ボタンザクラ'],
			[36.595756239972005, 140.65410642017912, '平和通り', 'https://tenki.jp/sakura/3/11/51010.html', 'https://static.tenki.jp/static-images/sakura/point/51010/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.608708952091746, 140.65733568582388, 'かみね公園', 'https://tenki.jp/sakura/3/11/54203.html', 'https://static.tenki.jp/static-images/sakura/point/54203/square.jpg', '桜の種類：ソメイヨシノ、その他'],
			[36.084681494204126, 140.1984983954982, '亀城公園(土浦城址)', 'https://tenki.jp/sakura/3/11/54205.html', 'https://static.tenki.jp/static-images/sakura/point/54205/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.17619483869418, 140.10423955239966, '北条大池', 'https://tenki.jp/sakura/3/11/54206.html', 'https://static.tenki.jp/static-images/sakura/point/54206/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.29046994434064, 140.2526416986636, '愛宕山', 'https://tenki.jp/sakura/3/11/54207.html', 'https://static.tenki.jp/static-images/sakura/point/54207/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ、カンヒザクラ、オオシマザクラ'],
			[36.37526272339699, 140.44782491139216, '桜山公園', 'https://tenki.jp/sakura/3/11/54208.html', 'https://static.tenki.jp/static-images/sakura/point/54208/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ'],
			[36.542405639379126, 140.5140961198542, '西山公園', 'https://tenki.jp/sakura/3/11/54210.html', 'https://static.tenki.jp/static-images/sakura/point/54210/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.30793952616851, 139.8853810754318, '城跡歴史公園', 'https://tenki.jp/sakura/3/11/54211.html', 'https://static.tenki.jp/static-images/sakura/point/54211/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.813624303476246, 140.41781033621496, '外大野のしだれ桜', 'https://tenki.jp/sakura/3/11/54213.html', 'https://static.tenki.jp/static-images/sakura/point/54213/square.jpg', '桜の種類：シダレザクラ'],
			[36.59259155889031, 139.86217434173085, '日光街道桜並木', 'https://tenki.jp/sakura/3/12/50101.html', 'https://static.tenki.jp/static-images/sakura/point/50101/square.jpg', '桜の種類：ヤマザクラ'],
			[36.46146571245805, 139.8094063951413, '壬生町総合公園', 'https://tenki.jp/sakura/3/12/50160.html', 'https://static.tenki.jp/static-images/sakura/point/50160/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[36.889836446358274, 139.96382186844588, '烏ケ森公園', 'https://tenki.jp/sakura/3/12/50185.html', 'https://static.tenki.jp/static-images/sakura/point/50185/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.31867842859455, 139.79985746439547, '城山公園', 'https://tenki.jp/sakura/3/12/50226.html', 'https://static.tenki.jp/static-images/sakura/point/50226/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.81129397063997, 139.9377485663492, '長峰公園', 'https://tenki.jp/sakura/3/12/50227.html', 'https://static.tenki.jp/static-images/sakura/point/50227/square.jpg', '桜の種類：ソメイヨシノ、シバザクラ'],
			[36.57282769472189, 139.74441825651948, '千手山公園', 'https://tenki.jp/sakura/3/12/50228.html', 'https://static.tenki.jp/static-images/sakura/point/50228/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.42848328069449, 139.80613559304942, '東雲公園', 'https://tenki.jp/sakura/3/12/50298.html', 'https://static.tenki.jp/static-images/sakura/point/50298/square.jpg', '桜の種類：オオヤマザクラ、オオシマザクラ、ソメイヨシノ、オモイガワ、サトザクラ'],
			[36.86845948402405, 140.03442804249948, '龍城公園', 'https://tenki.jp/sakura/3/12/50730.html', 'https://static.tenki.jp/static-images/sakura/point/50730/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[36.644923499555766, 140.13977429636972, '龍門の滝', 'https://tenki.jp/sakura/3/12/50865.html', 'https://static.tenki.jp/static-images/sakura/point/50865/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.89952330389992, 139.98907990444238, '三和住宅にしなすのスポーツプラザ', 'https://tenki.jp/sakura/3/12/51040.html', 'https://static.tenki.jp/static-images/sakura/point/51040/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.886835266679874, 140.00184718265734, '乃木参道', 'https://tenki.jp/sakura/3/12/51041.html', 'https://static.tenki.jp/static-images/sakura/point/51041/square.jpg', '桜の種類：ソメイヨシノ、オオヤマザクラ'],
			[36.36008838813129, 139.69633210187274, '太平山', 'https://tenki.jp/sakura/3/12/54106.html', 'https://static.tenki.jp/static-images/sakura/point/54106/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.976591392177234, 140.0537981498488, '黒磯公園', 'https://tenki.jp/sakura/3/12/54405.html', 'https://static.tenki.jp/static-images/sakura/point/54405/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.165788243329736, 139.02152205173212, '桜山公園', 'https://tenki.jp/sakura/3/13/50102.html', 'https://static.tenki.jp/static-images/sakura/point/50102/square.jpg', '桜の種類：ソメイヨシノ、フユザクラ'],
			[36.300938496713414, 138.76413768845072, '妙義神社しだれ桜', 'https://tenki.jp/sakura/3/13/50108.html', 'https://static.tenki.jp/static-images/sakura/point/50108/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ウコン'],
			[36.32403571595916, 139.00407465459054, '高崎城址公園', 'https://tenki.jp/sakura/3/13/50224.html', 'https://static.tenki.jp/static-images/sakura/point/50224/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.26187395293232, 139.4141555047623, '城之内公園', 'https://tenki.jp/sakura/3/13/50254.html', 'https://static.tenki.jp/static-images/sakura/point/50254/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.64831832978393, 139.0382352704436, '沼田公園(沼田城址)', 'https://tenki.jp/sakura/3/13/50268.html', 'https://static.tenki.jp/static-images/sakura/point/50268/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、シダレザクラ'],
			[36.31094343048613, 138.98105041145203, '高崎観音山', 'https://tenki.jp/sakura/3/13/54104.html', 'https://static.tenki.jp/static-images/sakura/point/54104/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.671097215959634, 139.20962580516394, '老神温泉', 'https://tenki.jp/sakura/3/13/54113.html', 'https://static.tenki.jp/static-images/sakura/point/54113/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.34254466865744, 139.1989690787533, '華蔵寺公園', 'https://tenki.jp/sakura/3/13/54154.html', 'https://static.tenki.jp/static-images/sakura/point/54154/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.006560900255415, 139.51275336413892, '石戸蒲ザクラ', 'https://tenki.jp/sakura/3/14/50247.html', 'https://static.tenki.jp/static-images/sakura/point/50247/square.jpg', '桜の種類：カバザクラ'],
			[35.99007766243547, 139.52535216060014, '城山公園', 'https://tenki.jp/sakura/3/14/50276.html', 'https://static.tenki.jp/static-images/sakura/point/50276/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[35.87526297927712, 139.16788110598046, '飯能市名栗湖', 'https://tenki.jp/sakura/3/14/50277.html', 'https://static.tenki.jp/static-images/sakura/point/50277/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.84571864886967, 139.39842713230314, '県営狭山稲荷山公園', 'https://tenki.jp/sakura/3/14/50278.html', 'https://static.tenki.jp/static-images/sakura/point/50278/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[36.032625946278024, 139.3243182049295, '都幾川桜堤', 'https://tenki.jp/sakura/3/14/50297.html', 'https://static.tenki.jp/static-images/sakura/point/50297/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.18212020464844, 139.13878485011608, 'こだま千本桜', 'https://tenki.jp/sakura/3/14/50835.html', 'https://static.tenki.jp/static-images/sakura/point/50835/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.025039987306165, 139.50650809619486, '高尾さくら公園', 'https://tenki.jp/sakura/3/14/50840.html', 'https://static.tenki.jp/static-images/sakura/point/50840/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[36.01006549528848, 139.50564390225148, '城ヶ谷堤', 'https://tenki.jp/sakura/3/14/50841.html', 'https://static.tenki.jp/static-images/sakura/point/50841/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.95091344802328, 139.7117801633437, '岩槻城址公園', 'https://tenki.jp/sakura/3/14/50844.html', 'https://static.tenki.jp/static-images/sakura/point/50844/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.858614521164405, 139.31077772276268, '天覧山・中央公園', 'https://tenki.jp/sakura/3/14/50849.html', 'https://static.tenki.jp/static-images/sakura/point/50849/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.24392357428256, 139.18392092819798, '若泉公園', 'https://tenki.jp/sakura/3/14/50850.html', 'https://static.tenki.jp/static-images/sakura/point/50850/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.89161595257193, 139.8581590540558, '沼辺公園', 'https://tenki.jp/sakura/3/14/50851.html', 'https://static.tenki.jp/static-images/sakura/point/50851/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.9637772441083, 139.29264269437238, 'さくらの山公園', 'https://tenki.jp/sakura/3/14/50854.html', 'https://static.tenki.jp/static-images/sakura/point/50854/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.0562457448513, 139.1139503120034, '美の山公園のソメイヨシノ', 'https://tenki.jp/sakura/3/14/50857.html', 'https://static.tenki.jp/static-images/sakura/point/50857/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、ギョイコウ、ウコン'],
			[36.24384204130874, 139.19222884932697, '城山稲荷神社', 'https://tenki.jp/sakura/3/14/50860.html', 'https://static.tenki.jp/static-images/sakura/point/50860/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.78688060185171, 139.87270153572032, '埼玉県営みさと公園', 'https://tenki.jp/sakura/3/14/50861.html', 'https://static.tenki.jp/static-images/sakura/point/50861/square.jpg', '桜の種類：カンザクラ、カワヅザクラ、ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[35.922698795888856, 139.39911335215186, '鶴ヶ島市運動公園', 'https://tenki.jp/sakura/3/14/51028.html', 'https://static.tenki.jp/static-images/sakura/point/51028/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.916349086687724, 139.29155020386932, '鎌北湖', 'https://tenki.jp/sakura/3/14/54101.html', 'https://static.tenki.jp/static-images/sakura/point/54101/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.13602811842584, 139.38576902984076, '熊谷桜堤', 'https://tenki.jp/sakura/3/14/54102.html', 'https://static.tenki.jp/static-images/sakura/point/54102/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.099531636593944, 139.1117068365534, '長瀞', 'https://tenki.jp/sakura/3/14/54103.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、カンザン(ヤエザクラ)'],
			[36.19295560623753, 139.12776163610587, '城山公園', 'https://tenki.jp/sakura/3/14/54110.html', 'https://static.tenki.jp/static-images/sakura/point/54110/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.88141410673696, 139.84676344716036, 'さくら通り', 'https://tenki.jp/sakura/3/14/54408.html', 'https://static.tenki.jp/static-images/sakura/point/54408/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.577117349013655, 140.22502043698486, '泉自然公園', 'https://tenki.jp/sakura/3/15/50103.html', 'https://static.tenki.jp/static-images/sakura/point/50103/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、オオシマザクラ、サトザクラ、シダレザクラ'],
			[35.782178490496875, 140.0081150068675, '市制記念公園', 'https://tenki.jp/sakura/3/15/50177.html', 'https://static.tenki.jp/static-images/sakura/point/50177/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ'],
			[35.515943396203575, 140.28736508030585, '小中池公園', 'https://tenki.jp/sakura/3/15/50178.html', 'https://static.tenki.jp/static-images/sakura/point/50178/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.84020157576661, 139.9287777637844, '本土寺', 'https://tenki.jp/sakura/3/15/50206.html', 'https://static.tenki.jp/static-images/sakura/point/50206/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.60480373676441, 140.12638550666293, '亥鼻公園', 'https://tenki.jp/sakura/3/15/50235.html', 'https://static.tenki.jp/static-images/sakura/point/50235/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.74831638174131, 140.53443183894007, '黄門桜', 'https://tenki.jp/sakura/3/15/50266.html', 'https://static.tenki.jp/static-images/sakura/point/50266/square.jpg', '桜の種類：ヤマザクラ'],
			[34.962518809877544, 139.9495784497923, '高家神社', 'https://tenki.jp/sakura/3/15/50284.html', 'https://static.tenki.jp/static-images/sakura/point/50284/square.jpg', '桜の種類：ヤエザクラ、ソメイヨシノ、ヤマザクラ、カワヅザクラ、オオシマザクラ'],
			[34.972271632068136, 139.94518348493077, '南房総市千倉総合運動公園', 'https://tenki.jp/sakura/3/15/50285.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ヤエザクラ、ソメイヨシノ'],
			[35.86929686627871, 140.39545995117368, '成田ゆめ牧場', 'https://tenki.jp/sakura/3/15/51008.html', 'https://static.tenki.jp/static-images/sakura/point/51008/square.jpg', '桜の種類：ソメイヨシノ、カワヅザクラ、ヤエザクラ'],
			[35.78585365468061, 140.32199877942278, '成田山公園', 'https://tenki.jp/sakura/3/15/54301.html', 'https://static.tenki.jp/static-images/sakura/point/54301/square.jpg', '桜の種類：ソメイヨシノ、カワヅザクラ、シダレザクラ'],
			[35.43031180543216, 140.28456949514006, '茂原公園', 'https://tenki.jp/sakura/3/15/54303.html', 'https://static.tenki.jp/static-images/sakura/point/54303/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、フユザクラ'],
			[35.72209223669461, 140.21614701632646, '佐倉城址公園', 'https://tenki.jp/sakura/3/15/54304.html', 'https://static.tenki.jp/static-images/sakura/point/54304/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、カワヅザクラ'],
			[35.56114148501002, 140.35720938983962, '八鶴湖畔', 'https://tenki.jp/sakura/3/15/54305.html', 'https://static.tenki.jp/static-images/sakura/point/54305/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.98240280566911, 139.85724790273224, '城山公園', 'https://tenki.jp/sakura/3/15/54306.html', 'https://static.tenki.jp/static-images/sakura/point/54306/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、オオシマザクラ'],
			[35.85938629695207, 140.59366626635025, '小見川城山公園', 'https://tenki.jp/sakura/3/15/54307.html', 'https://static.tenki.jp/static-images/sakura/point/54307/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.886058026954046, 140.5286759633705, '香取神宮', 'https://tenki.jp/sakura/3/15/54309.html', 'https://static.tenki.jp/static-images/sakura/point/54309/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ'],
			[35.37972594168028, 139.93792904365054, '太田山公園', 'https://tenki.jp/sakura/3/15/54310.html', 'https://static.tenki.jp/static-images/sakura/point/54310/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、オオシマザクラ、カマタリザクラ'],
			[35.489503510159935, 140.13267800894786, '千葉こどもの国 KidsDom', 'https://tenki.jp/sakura/3/15/54311.html', 'https://static.tenki.jp/static-images/sakura/point/54311/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.618747365399, 140.11687427045248, '千葉公園', 'https://tenki.jp/sakura/3/15/54312.html', 'https://static.tenki.jp/static-images/sakura/point/54312/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、シダレザクラ、カワヅザクラ'],
			[35.958276965317374, 139.85301901776478, '清水公園', 'https://tenki.jp/sakura/3/15/54403.html', 'https://static.tenki.jp/static-images/sakura/point/54403/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.78015567331821, 139.77997302691378, '西新井大師', 'https://tenki.jp/sakura/3/16/50207.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、カンザクラ、ベニシダレザクラ'],
			[35.739784397590476, 139.2590505501651, '塩田耕地堤の桜', 'https://tenki.jp/sakura/3/16/50281.html', 'https://static.tenki.jp/static-images/sakura/point/50281/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.62576643848165, 139.51788288767085, 'よみうりランド', 'https://tenki.jp/sakura/3/17/50619.html', 'https://static.tenki.jp/static-images/sakura/point/50619/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、シバザクラ、多摩緋桜'],
			[35.578224785645155, 139.705858290752, '池上本門寺', 'https://tenki.jp/sakura/3/16/50731.html', 'https://static.tenki.jp/static-images/sakura/point/50731/square.jpg', '桜の種類：ソメイヨシノ、ササベザクラ'],
			[35.64636848427231, 139.81470322170557, '辰巳の森緑道公園', 'https://tenki.jp/sakura/3/16/50800.html', 'https://static.tenki.jp/static-images/sakura/point/50800/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、サトザクラ、シダレザクラ'],
			[35.71152087171955, 139.80312133262035, '隅田公園', 'https://tenki.jp/sakura/3/16/54308.html', 'https://static.tenki.jp/static-images/sakura/point/54308/square.jpg', '桜の種類：ソメイヨシノ、ヤエベニシダレ'],
			[35.76316963127265, 139.4426047984606, '狭山公園', 'https://tenki.jp/sakura/3/16/54604.html', 'https://static.tenki.jp/static-images/sakura/point/54604/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[35.79258808470357, 139.04799848480093, '奥多摩湖', 'https://tenki.jp/sakura/3/16/54606.html', 'https://static.tenki.jp/static-images/sakura/point/54606/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、オオヤマザクラ、オオシマザクラ'],
			[35.791190446813125, 139.25560265528344, '梅岩寺', 'https://tenki.jp/sakura/3/16/54615.html', 'https://static.tenki.jp/static-images/sakura/point/54615/square.jpg', '桜の種類：シダレザクラ'],
			[35.64593669755308, 139.69856254359792, '目黒川', 'https://tenki.jp/sakura/3/16/54616.html', 'https://static.tenki.jp/static-images/sakura/point/54616/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、シダレザクラ'],
			[35.724400222350404, 139.71376515071034, '法明寺', 'https://tenki.jp/sakura/3/16/54625.html', 'https://static.tenki.jp/static-images/sakura/point/54625/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[35.67875642916828, 139.71761558145556, '明治神宮外苑', 'https://tenki.jp/sakura/3/16/54627.html', 'https://static.tenki.jp/static-images/sakura/point/54627/square.jpg', '桜の種類：ヤエザクラ、シダレザクラ、ソメイヨシノ、その他'],
			[35.52306427236178, 139.66068984844642, '県立三ツ池公園', 'https://tenki.jp/sakura/3/17/50104.html', 'https://static.tenki.jp/static-images/sakura/point/50104/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、カンザン、フゲンゾウ'],
			[35.5086005782129, 139.42382160377218, '相模が丘仲よし小道 さくら百華の道', 'https://tenki.jp/sakura/3/17/50165.html', 'https://static.tenki.jp/static-images/sakura/point/50165/square.jpg', '桜の種類：カワヅザクラ、オモイガワ、アマノガワ、ヤエベニシダレ'],
			[35.438379522268946, 139.41983977463062, '城山公園', 'https://tenki.jp/sakura/3/17/50292.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、春めき'],
			[35.43405985435735, 139.40936070189812, '綾西緑地', 'https://tenki.jp/sakura/3/17/50294.html', 'https://static.tenki.jp/static-images/sakura/point/50294/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.37947265597641, 139.38279594154633, '寒川神社の表参道と境内', 'https://tenki.jp/sakura/3/17/50733.html', 'https://static.tenki.jp/static-images/sakura/point/50733/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ボタンザクラ'],
			[35.60482440223457, 139.20113844391668, 'さがみ湖MORI MORI', 'https://tenki.jp/sakura/3/17/50872.html', 'https://static.tenki.jp/static-images/sakura/point/50872/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、カワヅザクラ'],
			[35.219577817444424, 139.11560439537826, 'アネスト岩田ターンパイク箱根 御所の入駐車場付近', 'https://tenki.jp/sakura/3/17/50883.html', 'https://static.tenki.jp/static-images/sakura/point/50883/square.jpg', '桜の種類：ソメイヨシノ、ハコネザクラ'],
			[35.42339925751899, 139.60030321171698, '大岡川プロムナード', 'https://tenki.jp/sakura/3/17/50889.html', 'https://static.tenki.jp/static-images/sakura/point/50889/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ、その他'],
			[35.325775621780544, 139.54492256595597, '源氏山公園', 'https://tenki.jp/sakura/3/17/50893.html', 'https://static.tenki.jp/static-images/sakura/point/50893/square.jpg', '桜の種類：ヤマザクラ、オオシマザクラ、ヤエザクラ、ソメイヨシノ'],
			[35.372076018085835, 139.24273778507288, '弘法山公園', 'https://tenki.jp/sakura/3/17/50895.html', 'https://static.tenki.jp/static-images/sakura/point/50895/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.34863299557202, 139.59943834061167, '横浜市立金沢動物園(金沢自然公園)', 'https://tenki.jp/sakura/3/17/50997.html', 'https://static.tenki.jp/static-images/sakura/point/50997/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、カンヒザクラ、ヤエザクラ'],
			[35.24858759847576, 139.04512202964554, '箱根強羅公園', 'https://tenki.jp/sakura/3/17/51005.html', 'https://static.tenki.jp/static-images/sakura/point/51005/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヒガンザクラ、シダレザクラ、カワヅザクラ'],
			[35.19623166800055, 139.02607340785067, '恩賜箱根公園', 'https://tenki.jp/sakura/3/17/51006.html', 'https://static.tenki.jp/static-images/sakura/point/51006/square.jpg', '桜の種類：マメザクラ、ソメイヨシノ、オオシマザクラ、シダレザクラ、ゴテンバザクラ'],
			[35.2508788797886, 139.15396648000632, '小田原城址公園', 'https://tenki.jp/sakura/3/17/54503.html', 'https://static.tenki.jp/static-images/sakura/point/54503/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.32581541640392, 139.55627642601303, '鶴岡八幡宮', 'https://tenki.jp/sakura/3/17/54505.html', 'https://static.tenki.jp/static-images/sakura/point/54505/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[35.41733881754982, 139.66044036434553, '三溪園', 'https://tenki.jp/sakura/3/17/54507.html', 'https://static.tenki.jp/static-images/sakura/point/54507/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、シダレザクラ'],
			[35.15440017661482, 139.1344210288637, '荒井城址公園(しだれ桜)', 'https://tenki.jp/sakura/3/17/55164.html', 'https://static.tenki.jp/static-images/sakura/point/55164/square.jpg', '桜の種類：シダレザクラ'],
			[35.360317722495736, 139.07833390468573, '山北鉄道公園(御殿場線沿い桜並木の通り)', 'https://tenki.jp/sakura/3/17/55315.html', 'https://static.tenki.jp/static-images/sakura/point/55315/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.003321694826106, 139.41029276320023, '橡平サクラ樹林', 'https://tenki.jp/sakura/4/18/50111.html', 'https://static.tenki.jp/static-images/sakura/point/50111/square.jpg', '桜の種類：オオヤマザクラ、カスミザクラ、オクチョウジザクラ'],
			[37.96377655079779, 139.26115275424633, '弁天潟風致公園', 'https://tenki.jp/sakura/4/18/50114.html', 'https://static.tenki.jp/static-images/sakura/point/50114/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[37.84611284840766, 139.02208592502268, '鷲ノ木桜遊歩道公園', 'https://tenki.jp/sakura/4/18/50115.html', 'https://static.tenki.jp/static-images/sakura/point/50115/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.93544646131609, 138.82181762203808, '湯沢中央公園', 'https://tenki.jp/sakura/4/18/50116.html', 'https://static.tenki.jp/static-images/sakura/point/50116/square.jpg', '桜の種類：ベニヤマザクラ、ソメイヨシノ、シダレザクラ'],
			[37.21926554693641, 138.9582684605137, '魚野川桜づつみ', 'https://tenki.jp/sakura/4/18/50117.html', 'https://static.tenki.jp/static-images/sakura/point/50117/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[37.2269895725645, 138.95284485843243, '小出公園', 'https://tenki.jp/sakura/4/18/50118.html', 'https://static.tenki.jp/static-images/sakura/point/50118/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.83673130245398, 139.23690316362794, '瓢湖水きん公園', 'https://tenki.jp/sakura/4/18/50119.html', 'https://static.tenki.jp/static-images/sakura/point/50119/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[37.91183066630831, 139.0400515157817, '信濃川やすらぎ堤緑地', 'https://tenki.jp/sakura/4/18/50149.html', 'https://static.tenki.jp/static-images/sakura/point/50149/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[38.01884435107289, 139.3959264549717, '桜公園', 'https://tenki.jp/sakura/4/18/50774.html', 'https://static.tenki.jp/static-images/sakura/point/50774/square.jpg', '桜の種類：ヤマザクラ、三波川の冬桜、エドヒガン、ギョイコウ、ウコン'],
			[37.69240448296568, 139.1886094885184, '村松公園', 'https://tenki.jp/sakura/4/18/53102.html', 'https://static.tenki.jp/static-images/sakura/point/53102/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ、オオシマザクラ、オオヤマザクラ、ホザキヒガンヤエザクラ'],
			[37.877487533328924, 139.04226475110198, '新潟県立鳥屋野潟公園', 'https://tenki.jp/sakura/4/18/53107.html', 'https://static.tenki.jp/static-images/sakura/point/53107/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[37.615553392719306, 138.84079563729995, '大河津分水桜並木', 'https://tenki.jp/sakura/4/18/53108.html', 'https://static.tenki.jp/static-images/sakura/point/53108/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.69867816109822, 138.82903449259973, '弥彦公園(早咲き)', 'https://tenki.jp/sakura/4/18/53109.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[37.69867816109822, 138.82903449259973, '弥彦公園(遅咲き)', 'https://tenki.jp/sakura/4/18/53110.html', 'https://static.tenki.jp/static-images/sakura/point/53110/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[37.01406186412076, 138.2539102519586, '経塚山公園', 'https://tenki.jp/sakura/4/18/53111.html', 'https://static.tenki.jp/static-images/sakura/point/53111/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.91416637927173, 139.038304633845, '白山公園', 'https://tenki.jp/sakura/4/18/53114.html', 'https://static.tenki.jp/static-images/sakura/point/53114/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.109667360640486, 138.25671315319363, '高田城址公園', 'https://tenki.jp/sakura/4/18/53121.html', 'https://static.tenki.jp/static-images/sakura/point/53121/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.35861940782017, 138.54190566833452, '赤坂山公園', 'https://tenki.jp/sakura/4/18/53122.html', 'https://static.tenki.jp/static-images/sakura/point/53122/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[37.43076014106747, 138.88141284751865, '悠久山公園', 'https://tenki.jp/sakura/4/18/53123.html', 'https://static.tenki.jp/static-images/sakura/point/53123/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、ウコン、ギョイコウ'],
			[36.778413855290474, 137.0909864713843, '内川周辺の桜並木', 'https://tenki.jp/sakura/4/19/50122.html', 'https://static.tenki.jp/static-images/sakura/point/50122/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.692733522535896, 137.28301646166818, '富山県常願寺川公園', 'https://tenki.jp/sakura/4/19/50123.html', 'https://static.tenki.jp/static-images/sakura/point/50123/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[36.66181599619998, 136.81851622942642, '倶利伽羅県定公園', 'https://tenki.jp/sakura/4/19/50124.html', 'https://static.tenki.jp/static-images/sakura/point/50124/square.jpg', '桜の種類：ヤエザクラ'],
			[36.60179026743902, 136.88533957309426, '安居寺公園', 'https://tenki.jp/sakura/4/19/50127.html', 'https://static.tenki.jp/static-images/sakura/point/50127/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.557572370022335, 136.87499255428332, '小矢部川公園千本桜', 'https://tenki.jp/sakura/4/19/50188.html', 'https://static.tenki.jp/static-images/sakura/point/50188/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.737775180654666, 137.04951833754288, '東洋紡(株) 富山事業所 庄川工場', 'https://tenki.jp/sakura/4/19/50825.html', 'https://static.tenki.jp/static-images/sakura/point/50825/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.700337198524295, 137.08619632084884, '薬勝寺池公園', 'https://tenki.jp/sakura/4/19/50826.html', 'https://static.tenki.jp/static-images/sakura/point/50826/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.7221904345196, 137.10012637638215, '下条川千本桜', 'https://tenki.jp/sakura/4/19/50827.html', 'https://static.tenki.jp/static-images/sakura/point/50827/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.6960679936711, 137.10138896903774, '県民公園太閤山ランド', 'https://tenki.jp/sakura/4/19/50828.html', 'https://static.tenki.jp/static-images/sakura/point/50828/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.573727333532894, 136.99446316543774, '庄川水記念公園', 'https://tenki.jp/sakura/4/19/50995.html', 'https://static.tenki.jp/static-images/sakura/point/50995/square.jpg', '桜の種類：ソメイヨシノ、コヒガンザクラ、エドヒガン、カンザン、フゲンゾウ'],
			[36.6815638225397, 136.86226872801322, '城山公園', 'https://tenki.jp/sakura/4/19/55828.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[36.711926522152794, 136.93051648364636, '岸渡川堤', 'https://tenki.jp/sakura/4/19/55829.html', 'https://static.tenki.jp/static-images/sakura/point/55829/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.74929187494749, 137.02348036464423, '高岡古城公園', 'https://tenki.jp/sakura/4/19/55830.html', 'https://static.tenki.jp/static-images/sakura/point/55830/square.jpg', '桜の種類：ソメイヨシノ、コシノヒガン、ヤマザクラ、イヌザクラ、ウワミズザクラ'],
			[36.85447260041429, 136.98273319653887, '朝日山公園', 'https://tenki.jp/sakura/4/19/55832.html', 'https://static.tenki.jp/static-images/sakura/point/55832/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.7088800362531, 137.1853463214436, '呉羽山公園', 'https://tenki.jp/sakura/4/19/55842.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[36.61173074964274, 137.30450942503296, '常西用水 プロムナード公園', 'https://tenki.jp/sakura/4/19/55843.html', 'https://static.tenki.jp/static-images/sakura/point/55843/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.86651647112237, 137.4763409572154, '宮野運動公園', 'https://tenki.jp/sakura/4/19/55844.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[36.69444334962021, 137.2126425319164, '松川公園', 'https://tenki.jp/sakura/4/19/55846.html', 'https://static.tenki.jp/static-images/sakura/point/55846/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、コシノヒガン、エドヒガン'],
			[36.573885026957434, 137.13305969955866, '城ケ山公園', 'https://tenki.jp/sakura/4/19/55849.html', 'https://static.tenki.jp/static-images/sakura/point/55849/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、ギョイコウ、オカメザクラ'],
			[36.660319532104474, 137.1822741109711, '富山県中央植物園', 'https://tenki.jp/sakura/4/19/55850.html', 'https://static.tenki.jp/static-images/sakura/point/55850/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[36.430554142628395, 136.64076495678668, '石川県農林総合研究センター 林業試験場 樹木公園', 'https://tenki.jp/sakura/4/20/50121.html', 'https://static.tenki.jp/static-images/sakura/point/50121/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオヤマザクラ、オオシマザクラ、オモイガワ'],
			[36.71381301192093, 136.7249089011514, '喜多家しだれ桜', 'https://tenki.jp/sakura/4/20/50897.html', 'https://static.tenki.jp/static-images/sakura/point/50897/square.jpg', '桜の種類：シダレザクラ'],
			[36.28617042031068, 136.3518346116217, '大堰宮公園', 'https://tenki.jp/sakura/4/20/55822.html', 'https://static.tenki.jp/static-images/sakura/point/55822/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.561956534624684, 136.66250361435806, '特別名勝兼六園', 'https://tenki.jp/sakura/4/20/55824.html', 'https://static.tenki.jp/static-images/sakura/point/55824/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、サトザクラ'],
			[36.56896391501816, 136.68018296681439, '卯辰山公園', 'https://tenki.jp/sakura/4/20/55825.html', 'https://static.tenki.jp/static-images/sakura/point/55825/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[36.856404228774586, 136.81602158990395, '志乎・桜の里 古墳公園', 'https://tenki.jp/sakura/4/20/55848.html', 'https://static.tenki.jp/static-images/sakura/point/55848/square.jpg', '桜の種類：ソメイヨシノ、イチヨウ、カンザン'],
			[35.93650124532701, 136.06074537893147, '越前陶芸村', 'https://tenki.jp/sakura/4/21/50125.html', 'https://static.tenki.jp/static-images/sakura/point/50125/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.875919386500186, 136.74925192703307, '九頭竜湖', 'https://tenki.jp/sakura/4/21/50244.html', 'https://static.tenki.jp/static-images/sakura/point/50244/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.614959016296496, 135.83902620613978, '神子の山桜', 'https://tenki.jp/sakura/4/21/50738.html', 'https://static.tenki.jp/static-images/sakura/point/50738/square.jpg', '桜の種類：ヤマザクラ'],
			[35.88534937209061, 136.23766284458856, '万葉の里 味真野苑', 'https://tenki.jp/sakura/4/21/50777.html', 'https://static.tenki.jp/static-images/sakura/point/50777/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ヒガンザクラ'],
			[35.45320659325352, 135.70636781319521, '妙祐寺の「しだれ桜」', 'https://tenki.jp/sakura/4/21/50818.html', 'https://static.tenki.jp/static-images/sakura/point/50818/square.jpg', '桜の種類：シダレザクラ'],
			[36.06363512967642, 136.20586885669815, '足羽川桜並木', 'https://tenki.jp/sakura/4/21/50902.html', 'https://static.tenki.jp/static-images/sakura/point/50902/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.49242841076948, 135.73399927465917, '小浜公園', 'https://tenki.jp/sakura/4/21/55802.html', 'https://static.tenki.jp/static-images/sakura/point/55802/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.66447458576341, 136.07407686232273, '金崎宮(金ヶ崎公園)', 'https://tenki.jp/sakura/4/21/55803.html', 'https://static.tenki.jp/static-images/sakura/point/55803/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.051056685732334, 136.2019419245291, '足羽山公園', 'https://tenki.jp/sakura/4/21/55807.html', 'https://static.tenki.jp/static-images/sakura/point/55807/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.05830020483047, 136.49662743165607, '勝山弁天桜(九頭竜河畔)', 'https://tenki.jp/sakura/4/21/55808.html', 'https://static.tenki.jp/static-images/sakura/point/55808/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.1523848886797, 136.27212682456147, '丸岡城(霞ヶ城公園)', 'https://tenki.jp/sakura/4/21/55809.html', 'https://static.tenki.jp/static-images/sakura/point/55809/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.986796973404275, 136.48371558322575, '亀山公園', 'https://tenki.jp/sakura/4/21/55810.html', 'https://static.tenki.jp/static-images/sakura/point/55810/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.7082419594194, 138.4257853808362, 'わに塚のサクラ', 'https://tenki.jp/sakura/3/22/50161.html', 'https://static.tenki.jp/static-images/sakura/point/50161/square.jpg', '桜の種類：エドヒガン'],
			[35.65578391318348, 138.74323562305787, '大善寺', 'https://tenki.jp/sakura/3/22/50213.html', 'https://static.tenki.jp/static-images/sakura/point/50213/square.jpg', '桜の種類：ソメイヨシノ、シキザクラ、シダレザクラ、コヒガンザクラ、オオヤマザクラ'],
			[35.55923420071527, 138.56046798526117, '山の神千本桜', 'https://tenki.jp/sakura/3/22/50256.html', 'https://static.tenki.jp/static-images/sakura/point/50256/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.60548137555422, 138.43830018141085, '妙了寺の桜', 'https://tenki.jp/sakura/3/22/50299.html', 'https://static.tenki.jp/static-images/sakura/point/50299/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.780336945542565, 138.3677377797788, '山高神代桜', 'https://tenki.jp/sakura/3/22/50300.html', 'https://static.tenki.jp/static-images/sakura/point/50300/square.jpg', '桜の種類：エドヒガン、ヒガンザクラ、ソメイヨシノ'],
			[35.66435446286139, 138.5716594602748, '舞鶴城公園', 'https://tenki.jp/sakura/3/22/50304.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、太白、カワヅザクラ'],
			[35.523535712157106, 138.76481623064348, '河口湖畔(北岸)', 'https://tenki.jp/sakura/3/22/50306.html', 'https://static.tenki.jp/static-images/sakura/point/50306/square.jpg', '桜の種類：ソメイヨシノ、フジザクラ'],
			[35.303546740294955, 138.4347433229944, '本郷の千年桜', 'https://tenki.jp/sakura/3/22/50318.html', 'https://static.tenki.jp/static-images/sakura/point/50318/square.jpg', '桜の種類：エドヒガン'],
			[35.67349172252155, 138.74318541785934, '甚六桜', 'https://tenki.jp/sakura/3/22/50319.html', 'https://static.tenki.jp/static-images/sakura/point/50319/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.299858094019804, 138.44153371903437, '原間のイトザクラ', 'https://tenki.jp/sakura/3/22/50880.html', 'https://static.tenki.jp/static-images/sakura/point/50880/square.jpg', '桜の種類：イトザクラ'],
			[35.619160585842614, 138.94928392948398, '岩殿山丸山公園', 'https://tenki.jp/sakura/3/22/54610.html', 'https://static.tenki.jp/static-images/sakura/point/54610/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[35.82247581147788, 138.35301293202133, '清春芸術村', 'https://tenki.jp/sakura/3/22/54611.html', 'https://static.tenki.jp/static-images/sakura/point/54611/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.50996872100818, 138.74595001932857, '冨士御室浅間神社', 'https://tenki.jp/sakura/3/22/54613.html', 'https://static.tenki.jp/static-images/sakura/point/54613/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.686685603752274, 138.57737553531769, '武田神社', 'https://tenki.jp/sakura/3/22/54614.html', 'https://static.tenki.jp/static-images/sakura/point/54614/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.38183552678278, 138.42533272960583, '身延山久遠寺', 'https://tenki.jp/sakura/3/22/55312.html', 'https://static.tenki.jp/static-images/sakura/point/55312/square.jpg', '桜の種類：シダレザクラ'],
			[35.545962338799825, 138.45527043032766, '大法師公園', 'https://tenki.jp/sakura/3/22/55313.html', 'https://static.tenki.jp/static-images/sakura/point/55313/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.77619948009244, 138.39528661032955, '宇木のエドヒガン(千歳桜)', 'https://tenki.jp/sakura/3/23/50109.html', 'https://static.tenki.jp/static-images/sakura/point/50109/square.jpg', '桜の種類：エドヒガン'],
			[36.26092941995542, 138.33934492065137, '福王寺', 'https://tenki.jp/sakura/3/23/50146.html', 'https://static.tenki.jp/static-images/sakura/point/50146/square.jpg', '桜の種類：エドヒガン(シダレザクラ)、ソメイヨシノ'],
			[36.40818886428611, 137.90984985733144, '東山夢の郷公園(夢農場)', 'https://tenki.jp/sakura/3/23/50147.html', 'https://static.tenki.jp/static-images/sakura/point/50147/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ'],
			[35.809681168637375, 137.5520930580972, '鳳泉寺', 'https://tenki.jp/sakura/3/23/50148.html', 'https://static.tenki.jp/static-images/sakura/point/50148/square.jpg', '桜の種類：シダレザクラ'],
			[35.25459643090714, 137.76735983110188, '愛宕様の小彼岸桜', 'https://tenki.jp/sakura/3/23/50171.html', 'https://static.tenki.jp/static-images/sakura/point/50171/square.jpg', '桜の種類：コヒガンザクラ'],
			[35.5607841306741, 138.03521179937667, '大西公園', 'https://tenki.jp/sakura/3/23/50237.html', 'https://static.tenki.jp/static-images/sakura/point/50237/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ'],
			[35.90682715619084, 137.94644884613007, '中曽根のエドヒガン', 'https://tenki.jp/sakura/3/23/50279.html', 'https://static.tenki.jp/static-images/sakura/point/50279/square.jpg', '桜の種類：エドヒガン'],
			[36.49492234649426, 138.15667551147396, '戸倉宿サクラケアパーク', 'https://tenki.jp/sakura/3/23/50863.html', 'https://static.tenki.jp/static-images/sakura/point/50863/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.27907759482051, 138.51113369485938, '平尾山公園', 'https://tenki.jp/sakura/3/23/51025.html', 'https://static.tenki.jp/static-images/sakura/point/51025/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.38272784489952, 137.89605856316828, 'あづみ野池田クラフトパーク', 'https://tenki.jp/sakura/3/23/51031.html', 'https://static.tenki.jp/static-images/sakura/point/51031/square.jpg', '桜の種類：ヤエザクラ、ヨコハマヒザクラ、オオヤマザクラ、岐阜山桜、その他'],
			[36.40307357378881, 138.2452680027947, '上田城跡公園', 'https://tenki.jp/sakura/3/23/55102.html', 'https://static.tenki.jp/static-images/sakura/point/55102/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ヤエザクラ、ヒガンザクラ'],
			[36.6703175345889, 138.18867061653697, '雲上殿', 'https://tenki.jp/sakura/3/23/55104.html', 'https://static.tenki.jp/static-images/sakura/point/55104/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.66364291832943, 138.1914981472196, '長野市城山公園', 'https://tenki.jp/sakura/3/23/55105.html', 'https://static.tenki.jp/static-images/sakura/point/55105/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.25560259787695, 138.49136903944674, '茨城牧場 長野支場', 'https://tenki.jp/sakura/3/23/55107.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.193635944611344, 138.48188744339365, '稲荷山公園', 'https://tenki.jp/sakura/3/23/55108.html', 'https://static.tenki.jp/static-images/sakura/point/55108/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.85658358655525, 138.36687731500757, '飯山城址', 'https://tenki.jp/sakura/3/23/55109.html', 'https://static.tenki.jp/static-images/sakura/point/55109/square.jpg', '桜の種類：ソメイヨシノ、オオヤマザクラ、シダレザクラ'],
			[36.23951101102236, 137.96917747914853, '国宝松本城', 'https://tenki.jp/sakura/3/23/55110.html', 'https://static.tenki.jp/static-images/sakura/point/55110/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[36.24676035466138, 137.95512584266376, '松本市城山公園', 'https://tenki.jp/sakura/3/23/55111.html', 'https://static.tenki.jp/static-images/sakura/point/55111/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.50512512666211, 137.8698041655501, '大町公園', 'https://tenki.jp/sakura/3/23/55112.html', 'https://static.tenki.jp/static-images/sakura/point/55112/square.jpg', '桜の種類：ソメイヨシノ、オオヤマザクラ'],
			[36.08460529933973, 138.0863870278769, '水月公園', 'https://tenki.jp/sakura/3/23/55113.html', 'https://static.tenki.jp/static-images/sakura/point/55113/square.jpg', '桜の種類：ソメイヨシノ、コヒガンザクラ'],
			[36.03884576883554, 138.112394530796, '高島公園', 'https://tenki.jp/sakura/3/23/55114.html', 'https://static.tenki.jp/static-images/sakura/point/55114/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヒガンザクラ'],
			[36.64454944182624, 138.312120892849, '臥竜公園', 'https://tenki.jp/sakura/3/23/55153.html', 'https://static.tenki.jp/static-images/sakura/point/55153/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ、コヒガンザクラ、カンザン'],
			[36.19642912917552, 138.50202662031856, '龍岡城五稜郭', 'https://tenki.jp/sakura/3/23/55155.html', 'https://static.tenki.jp/static-images/sakura/point/55155/square.jpg', '桜の種類：ベニヤマザクラ'],
			[36.320850923465805, 137.93433472247145, '光城山', 'https://tenki.jp/sakura/3/23/55157.html', 'https://static.tenki.jp/static-images/sakura/point/55157/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.565987073718595, 138.19600372948398, '松代城跡', 'https://tenki.jp/sakura/3/23/55158.html', 'https://static.tenki.jp/static-images/sakura/point/55158/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.21287918711977, 137.98268421066038, '弘法山古墳', 'https://tenki.jp/sakura/3/23/55159.html', 'https://static.tenki.jp/static-images/sakura/point/55159/square.jpg', '桜の種類：ソメイヨシノ、オオヤマザクラ、エドヒガン、ヤエザクラ'],
			[36.977828466945155, 138.484683836836, '飯山西大滝ダム', 'https://tenki.jp/sakura/3/23/55160.html', 'https://static.tenki.jp/static-images/sakura/point/55160/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.83336590319892, 138.06246380650882, '高遠城址公園', 'https://tenki.jp/sakura/3/23/55626.html', 'https://static.tenki.jp/static-images/sakura/point/55626/square.jpg', '桜の種類：タカトオコヒガンザクラ'],
			[35.520624200839414, 137.827595208803, '飯田市大宮通り桜並木', 'https://tenki.jp/sakura/3/23/55632.html', 'https://static.tenki.jp/static-images/sakura/point/55632/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、コヒガンザクラ、シダレザクラ'],
			[35.23684503845493, 137.4485233032338, '奥矢作湖畔桜並木', 'https://tenki.jp/sakura/5/24/50162.html', 'https://static.tenki.jp/static-images/sakura/point/50162/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.36704765943975, 136.68758333092427, '墨俣一夜城址・犀川堤', 'https://tenki.jp/sakura/5/24/50240.html', 'https://static.tenki.jp/static-images/sakura/point/50240/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.26797102371078, 136.6450513375623, '平田公園と大榑川桜並木', 'https://tenki.jp/sakura/5/24/50346.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[35.48187685005, 136.91569156762637, '関川の桜', 'https://tenki.jp/sakura/5/24/50347.html', 'https://static.tenki.jp/static-images/sakura/point/50347/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.75058291977904, 136.965366508365, '愛宕公園', 'https://tenki.jp/sakura/5/24/50351.html', 'https://static.tenki.jp/static-images/sakura/point/50351/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン'],
			[35.43153298315157, 136.55149885283274, '霞間ヶ渓', 'https://tenki.jp/sakura/5/24/50372.html', 'https://static.tenki.jp/static-images/sakura/point/50372/square.jpg', '桜の種類：ヤマザクラ、オオヤマザクラ、エドヒガン、ソメイヨシノ'],
			[35.453018126323144, 136.62223460591403, '揖斐二度ザクラ公園', 'https://tenki.jp/sakura/5/24/50373.html', 'https://static.tenki.jp/static-images/sakura/point/50373/square.jpg', '桜の種類：二度ザクラ、二度ザクラ(天然記念物)'],
			[35.41460882411548, 137.12597607529977, '生活環境保全林みたけの森', 'https://tenki.jp/sakura/5/24/50379.html', 'https://static.tenki.jp/static-images/sakura/point/50379/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ'],
			[35.410462142387594, 137.19630247609462, '鬼岩公園', 'https://tenki.jp/sakura/5/24/50380.html', 'https://static.tenki.jp/static-images/sakura/point/50380/square.jpg', '桜の種類：ヤマザクラ'],
			[35.39931807486254, 136.84083551688218, '新境川堤「百十郎桜」', 'https://tenki.jp/sakura/5/24/50740.html', 'https://static.tenki.jp/static-images/sakura/point/50740/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.30655167813812, 137.50364485214035, '新田の桜', 'https://tenki.jp/sakura/5/24/50741.html', 'https://static.tenki.jp/static-images/sakura/point/50741/square.jpg', '桜の種類：エドヒガン'],
			[35.37152319629688, 136.4489828501529, '伊吹山ドライブウェイ', 'https://tenki.jp/sakura/5/24/50779.html', 'https://static.tenki.jp/static-images/sakura/point/50779/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カスミザクラ'],
			[35.48087283324586, 137.40676917824564, '恵那峡', 'https://tenki.jp/sakura/5/24/55604.html', 'https://static.tenki.jp/static-images/sakura/point/55604/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.49602214299184, 137.4996590746714, '本町公園', 'https://tenki.jp/sakura/5/24/55605.html', 'https://static.tenki.jp/static-images/sakura/point/55605/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.5165813428695, 137.48451103182805, '苗木さくら公園', 'https://tenki.jp/sakura/5/24/55606.html', 'https://static.tenki.jp/static-images/sakura/point/55606/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.710258516599765, 137.20799525052843, '苗代桜', 'https://tenki.jp/sakura/5/24/55610.html', 'https://static.tenki.jp/static-images/sakura/point/55610/square.jpg', '桜の種類：エドヒガン'],
			[35.43825368557832, 136.7769543379758, '岐阜公園長良川堤', 'https://tenki.jp/sakura/5/24/55613.html', 'https://static.tenki.jp/static-images/sakura/point/55613/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.283273746330906, 136.5494933592913, '養老公園', 'https://tenki.jp/sakura/5/24/55614.html', 'https://static.tenki.jp/static-images/sakura/point/55614/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、ヤエザクラ、ヤマザクラ'],
			[35.53723580685838, 136.60788853521132, '谷汲山華厳寺', 'https://tenki.jp/sakura/5/24/55615.html', 'https://static.tenki.jp/static-images/sakura/point/55615/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.373140126579536, 136.528036354542, '相川水辺公園', 'https://tenki.jp/sakura/5/24/55616.html', 'https://static.tenki.jp/static-images/sakura/point/55616/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.6322311699021, 136.6087803673682, '淡墨公園', 'https://tenki.jp/sakura/5/24/55629.html', 'https://static.tenki.jp/static-images/sakura/point/55629/square.jpg', '桜の種類：ウスズミザクラ(ヒガンザクラ)、ヒガンザクラ'],
			[35.36734710624258, 138.90841118887647, '冨士霊園', 'https://tenki.jp/sakura/5/25/50303.html', 'https://static.tenki.jp/static-images/sakura/point/50303/square.jpg', '桜の種類：ソメイヨシノ、フジザクラ'],
			[34.90728425937725, 139.09077956675802, 'さくらの里', 'https://tenki.jp/sakura/5/25/50307.html', 'https://static.tenki.jp/static-images/sakura/point/50307/square.jpg', '桜の種類：ソメイヨシノ、イトウザクラ、オオシマザクラ、オモイガワ、ショウゲツ'],
			[35.04728101722901, 138.9361949394275, '狩野川さくら公園', 'https://tenki.jp/sakura/5/25/50308.html', 'https://static.tenki.jp/static-images/sakura/point/50308/square.jpg', '桜の種類：カワヅザクラ、ソメイヨシノ、シダレザクラ、イズノクニザクラ、ボタンザクラ'],
			[34.8418199636555, 138.7629225716184, '黄金崎公園', 'https://tenki.jp/sakura/5/25/50316.html', 'https://static.tenki.jp/static-images/sakura/point/50316/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ'],
			[34.97216601219036, 137.82976403569438, '秋葉ダム千本桜', 'https://tenki.jp/sakura/5/25/50339.html', 'https://static.tenki.jp/static-images/sakura/point/50339/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.84509644034865, 137.89998851888137, '小國神社', 'https://tenki.jp/sakura/5/25/50340.html', 'https://static.tenki.jp/static-images/sakura/point/50340/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.8425246596153, 137.93615679706437, '太田川桜堤', 'https://tenki.jp/sakura/5/25/50341.html', 'https://static.tenki.jp/static-images/sakura/point/50341/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[35.17241373567671, 138.8700568015472, '駿河平自然公園', 'https://tenki.jp/sakura/5/25/50359.html', 'https://static.tenki.jp/static-images/sakura/point/50359/square.jpg', '桜の種類：オオシマザクラ、ソメイヨシノ、サトザクラ'],
			[34.76187818583402, 137.63444886225125, 'はままつフラワーパーク', 'https://tenki.jp/sakura/5/25/50366.html', 'https://static.tenki.jp/static-images/sakura/point/50366/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[34.832009303544595, 138.32136404759447, '木屋川堤', 'https://tenki.jp/sakura/5/25/50367.html', 'https://static.tenki.jp/static-images/sakura/point/50367/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.3012896965062, 138.58853975626266, '狩宿の下馬ザクラ', 'https://tenki.jp/sakura/5/25/50368.html', 'https://static.tenki.jp/static-images/sakura/point/50368/square.jpg', '桜の種類：ヤマザクラ'],
			[35.281357772215685, 138.58592216357334, '大石寺', 'https://tenki.jp/sakura/5/25/50369.html', 'https://static.tenki.jp/static-images/sakura/point/50369/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ'],
			[34.840100000956454, 137.73276166760465, 'はままつフルーツパーク時之栖', 'https://tenki.jp/sakura/5/25/50824.html', 'https://static.tenki.jp/static-images/sakura/point/50824/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、オオシマザクラ、ミナトザクラ'],
			[34.831956815763704, 138.1539449515044, '河原町旧堤防', 'https://tenki.jp/sakura/5/25/50907.html', 'https://static.tenki.jp/static-images/sakura/point/50907/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.94077818054865, 138.07225661714602, '野守の池', 'https://tenki.jp/sakura/5/25/50908.html', 'https://static.tenki.jp/static-images/sakura/point/50908/square.jpg', '桜の種類：シダレザクラ、カンヒザクラ'],
			[34.653808583563034, 138.09291791139853, '高松神社', 'https://tenki.jp/sakura/5/25/50910.html', 'https://static.tenki.jp/static-images/sakura/point/50910/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.738691973158794, 138.21939326615794, '勝間田川沿い', 'https://tenki.jp/sakura/5/25/50911.html', 'https://static.tenki.jp/static-images/sakura/point/50911/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.75390902977775, 138.79518812734403, '那賀川沿いの桜並木', 'https://tenki.jp/sakura/5/25/50912.html', 'https://static.tenki.jp/static-images/sakura/point/50912/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.911608249911005, 137.9369108574336, '戦国夢街道ハイキングコース', 'https://tenki.jp/sakura/5/25/50913.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ヤマザクラ'],
			[35.14055104360549, 139.0887879189965, '千歳川沿い', 'https://tenki.jp/sakura/5/25/51012.html', 'https://static.tenki.jp/static-images/sakura/point/51012/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ'],
			[34.888254986790166, 139.10414259427216, '伊豆高原桜並木', 'https://tenki.jp/sakura/5/25/54501.html', 'https://static.tenki.jp/static-images/sakura/point/54501/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.121309631826904, 138.91900160166284, '三嶋大社', 'https://tenki.jp/sakura/5/25/55302.html', 'https://static.tenki.jp/static-images/sakura/point/55302/square.jpg', '桜の種類：シダレザクラ、ミシマザクラ、ソメイヨシノ、カワヅザクラ、ヤエザクラ'],
			[35.12121147499575, 138.60637541007117, '御殿山', 'https://tenki.jp/sakura/5/25/55304.html', 'https://static.tenki.jp/static-images/sakura/point/55304/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ'],
			[34.9833392033966, 138.3757876544901, '静岡浅間神社', 'https://tenki.jp/sakura/5/25/55305.html', 'https://static.tenki.jp/static-images/sakura/point/55305/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ'],
			[34.73573010342074, 137.9757036299467, '法多山', 'https://tenki.jp/sakura/5/25/55309.html', 'https://static.tenki.jp/static-images/sakura/point/55309/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ、シダレザクラ'],
			[34.711852011083884, 137.72545548502012, '浜松城公園', 'https://tenki.jp/sakura/5/25/55310.html', 'https://static.tenki.jp/static-images/sakura/point/55310/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[34.847374065627434, 137.61760437072323, '奥山公園', 'https://tenki.jp/sakura/5/25/55314.html', 'https://static.tenki.jp/static-images/sakura/point/55314/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カワヅザクラ'],
			[35.15437884822752, 136.91941485174357, '鶴舞公園', 'https://tenki.jp/sakura/5/26/50233.html', 'https://static.tenki.jp/static-images/sakura/point/50233/square.jpg', '桜の種類：ソメイヨシノ、その他'],
			[35.256093982654825, 136.80513425750752, '尾張大國霊神社(国府宮)', 'https://tenki.jp/sakura/5/26/50342.html', 'https://static.tenki.jp/static-images/sakura/point/50342/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.93368242608223, 136.9856191585594, '大山緑地', 'https://tenki.jp/sakura/5/26/50361.html', 'https://static.tenki.jp/static-images/sakura/point/50361/square.jpg', '桜の種類：ソメイヨシノ、ウスズミザクラ'],
			[35.3303069172476, 136.9073048050671, '五条川の桜並木(大口町)', 'https://tenki.jp/sakura/5/26/50363.html', 'https://static.tenki.jp/static-images/sakura/point/50363/square.jpg', '桜の種類：ソメイヨシノ、おおぐち観鋭桜'],
			[35.21723081805503, 136.84075266701188, '清洲公園', 'https://tenki.jp/sakura/5/26/50375.html', 'https://static.tenki.jp/static-images/sakura/point/50375/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、オオシマザクラ、ヤマザクラ、シダレザクラ'],
			[35.049059858967, 137.1793413319528, '水源公園', 'https://tenki.jp/sakura/5/26/50707.html', 'https://static.tenki.jp/static-images/sakura/point/50707/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.018271878840736, 137.18692024260548, '奥山田のしだれ桜', 'https://tenki.jp/sakura/5/26/50743.html', 'https://static.tenki.jp/static-images/sakura/point/50743/square.jpg', '桜の種類：エドヒガン'],
			[35.21419721695237, 137.50982378298318, '瑞龍寺のしだれ桜', 'https://tenki.jp/sakura/5/26/50745.html', 'https://static.tenki.jp/static-images/sakura/point/50745/square.jpg', '桜の種類：シダレザクラ'],
			[35.251620474200884, 137.04836507531724, '東谷山フルーツパーク', 'https://tenki.jp/sakura/5/26/50746.html', 'https://static.tenki.jp/static-images/sakura/point/50746/square.jpg', '桜の種類：ヤエベニシダレ、ベニシダレザクラ、ソメイヨシノ'],
			[35.33998781909479, 136.9882019803881, '博物館 明治村', 'https://tenki.jp/sakura/5/26/50749.html', 'https://static.tenki.jp/static-images/sakura/point/50749/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[35.13064408971754, 136.94317445651214, '山崎川 四季の道', 'https://tenki.jp/sakura/5/26/50764.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[35.20507894700885, 136.74001210034317, '桜ネックレス', 'https://tenki.jp/sakura/5/26/50772.html', 'https://static.tenki.jp/static-images/sakura/point/50772/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、オオカンザクラ、ギョイコウ、ケンロクエンキクザクラ'],
			[35.155880490705314, 137.19164368946704, '愛知県緑化センター', 'https://tenki.jp/sakura/5/26/50862.html', 'https://static.tenki.jp/static-images/sakura/point/50862/square.jpg', '桜の種類：ソメイヨシノ、カンザン'],
			[34.956554437388846, 137.15882468331333, '岡崎城公園', 'https://tenki.jp/sakura/5/26/55601.html', 'https://static.tenki.jp/static-images/sakura/point/55601/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.277884528309514, 137.091094497193, '定光寺公園', 'https://tenki.jp/sakura/5/26/55603.html', 'https://static.tenki.jp/static-images/sakura/point/55603/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.35664753883255, 136.8067129007108, '木曽川堤', 'https://tenki.jp/sakura/5/26/55624.html', 'https://static.tenki.jp/static-images/sakura/point/55624/square.jpg', '桜の種類：ヒガンザクラ、シダレザクラ、ヤマザクラ、ソメイヨシノ'],
			[34.99468242800363, 137.62635326260525, '愛知県民の森', 'https://tenki.jp/sakura/5/26/55628.html', 'https://static.tenki.jp/static-images/sakura/point/55628/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.08211499001488, 136.74674574643248, '鍋田川堤桜並木', 'https://tenki.jp/sakura/5/27/50370.html', 'https://static.tenki.jp/static-images/sakura/point/50370/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.85663615787796, 136.45041084202407, '亀山公園', 'https://tenki.jp/sakura/5/27/50384.html', 'https://static.tenki.jp/static-images/sakura/point/50384/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.43723209548557, 136.37451312356401, '春谷寺エドヒガン桜', 'https://tenki.jp/sakura/5/27/50703.html', 'https://static.tenki.jp/static-images/sakura/point/50703/square.jpg', '桜の種類：エドヒガン、エドヒガン(幼木)'],
			[34.48260967797858, 136.84357913660284, '鳥羽城跡 城山公園', 'https://tenki.jp/sakura/5/27/51017.html', 'https://static.tenki.jp/static-images/sakura/point/51017/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.01537868098612, 136.4469355670671, '湯の山温泉', 'https://tenki.jp/sakura/5/27/55608.html', 'https://static.tenki.jp/static-images/sakura/point/55608/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[34.57557222928447, 136.5255133250958, '松坂城跡(松阪公園)', 'https://tenki.jp/sakura/5/27/55618.html', 'https://static.tenki.jp/static-images/sakura/point/55618/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.49079189265475, 136.63102942250225, '田丸城跡', 'https://tenki.jp/sakura/5/27/55621.html', 'https://static.tenki.jp/static-images/sakura/point/55621/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.49389217634065, 136.68609731719343, '宮川堤', 'https://tenki.jp/sakura/5/27/55622.html', 'https://static.tenki.jp/static-images/sakura/point/55622/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.77037212616702, 136.12856046076138, '上野公園', 'https://tenki.jp/sakura/5/27/56434.html', 'https://static.tenki.jp/static-images/sakura/point/56434/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.16123843770746, 136.2829660258678, '金剛輪寺', 'https://tenki.jp/sakura/6/28/50402.html', 'https://static.tenki.jp/static-images/sakura/point/50402/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カスミザクラ、ベニシダレザクラ、ヒガンザクラ'],
			[35.18380045208311, 136.2840817627465, '湖東三山 西明寺', 'https://tenki.jp/sakura/6/28/50403.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、フダンザクラ、オカメフジザクラ、シダレザクラ'],
			[35.052616417259465, 136.0462362419536, '滋賀県立近江富士花緑公園', 'https://tenki.jp/sakura/6/28/50481.html', 'https://static.tenki.jp/static-images/sakura/point/50481/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、カンヒザクラ、サトザクラ'],
			[35.471288750529396, 136.07856126260492, '清水の桜', 'https://tenki.jp/sakura/6/28/50750.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：アズマヒガンザクラ'],
			[35.00376413036162, 136.1234469055187, 'にごり池自然公園', 'https://tenki.jp/sakura/6/28/50928.html', 'https://static.tenki.jp/static-images/sakura/point/50928/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.003460959272566, 136.04533757679175, '雨山文化運動公園', 'https://tenki.jp/sakura/6/28/50929.html', 'https://static.tenki.jp/static-images/sakura/point/50929/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.98831823020213, 136.05950885787678, 'じゅらくの里', 'https://tenki.jp/sakura/6/28/51039.html', 'https://static.tenki.jp/static-images/sakura/point/51039/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.29978061905301, 136.33929640700825, '醒井養鱒場', 'https://tenki.jp/sakura/6/28/55617.html', 'https://static.tenki.jp/static-images/sakura/point/55617/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.27629520620908, 136.25224475671664, '国宝・彦根城', 'https://tenki.jp/sakura/6/28/56101.html', 'https://static.tenki.jp/static-images/sakura/point/56101/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.960499859965346, 135.90583823407164, '石山寺', 'https://tenki.jp/sakura/6/28/56103.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、シダレザクラ、ヤマザクラ'],
			[35.46384748466117, 136.0796532569755, '海津大崎', 'https://tenki.jp/sakura/6/28/56104.html', 'https://static.tenki.jp/static-images/sakura/point/56104/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.013354226690026, 135.85284460266874, '三井寺(園城寺)', 'https://tenki.jp/sakura/6/28/56106.html', 'https://static.tenki.jp/static-images/sakura/point/56106/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[35.37720703350374, 136.2612975721273, '豊公園(長浜城)', 'https://tenki.jp/sakura/6/28/56148.html', 'https://static.tenki.jp/static-images/sakura/point/56148/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.939329108184225, 135.9121219822655, '南郷水産センター', 'https://tenki.jp/sakura/6/28/56150.html', 'https://static.tenki.jp/static-images/sakura/point/56150/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.070442004977636, 135.84110261136587, '奥比叡・延暦寺境内', 'https://tenki.jp/sakura/6/28/56172.html', 'https://static.tenki.jp/static-images/sakura/point/56172/square.jpg', '桜の種類：ショウゲツ、カンザン、オオシマザクラ、フゲンゾウ、キリンザクラ'],
			[34.803924336641614, 135.81923260290972, '地蔵禅院', 'https://tenki.jp/sakura/6/29/50324.html', 'https://static.tenki.jp/static-images/sakura/point/50324/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤエザクラ、ボタンザクラ、ヒョウタンザクラ'],
			[34.798444795952264, 135.80943254657186, '玉川の桜', 'https://tenki.jp/sakura/6/29/50329.html', 'https://static.tenki.jp/static-images/sakura/point/50329/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.47581942492121, 135.36492066866367, '共楽公園', 'https://tenki.jp/sakura/6/29/50334.html', 'https://static.tenki.jp/static-images/sakura/point/50334/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.48152161883177, 135.31664807247472, '吉田のしだれ桜', 'https://tenki.jp/sakura/6/29/50338.html', 'https://static.tenki.jp/static-images/sakura/point/50338/square.jpg', '桜の種類：シダレザクラ'],
			[35.59873494576437, 135.08467800015092, '峯空園', 'https://tenki.jp/sakura/6/29/50388.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ、シダレザクラ'],
			[34.92297517280323, 135.68868567227202, '長岡天満宮八条ヶ池の桜', 'https://tenki.jp/sakura/6/29/50397.html', 'https://static.tenki.jp/static-images/sakura/point/50397/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.93806449942452, 135.64457443469144, '善峯寺', 'https://tenki.jp/sakura/6/29/50405.html', 'https://static.tenki.jp/static-images/sakura/point/50405/square.jpg', '桜の種類：シダレザクラ、ヤマザクラ、ボタンザクラ、ソメイヨシノ、ヒガンザクラ'],
			[35.021138661751294, 135.66816775618508, '二尊院', 'https://tenki.jp/sakura/6/29/50407.html', 'https://static.tenki.jp/static-images/sakura/point/50407/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、フゲンゾウ、シダレザクラ'],
			[35.045489366361835, 135.58337312823343, '和らぎの道(七谷川沿い)', 'https://tenki.jp/sakura/6/29/50468.html', 'https://static.tenki.jp/static-images/sakura/point/50468/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ(古木)、シダレザクラ'],
			[34.94415320002456, 135.69733110218576, '向日神社', 'https://tenki.jp/sakura/6/29/50710.html', 'https://static.tenki.jp/static-images/sakura/point/50710/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ、ヨウキヒ'],
			[35.26551208427431, 135.39801507684803, 'わち山野草の森', 'https://tenki.jp/sakura/6/29/50715.html', 'https://static.tenki.jp/static-images/sakura/point/50715/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、ウコン、キンキマメザクラ'],
			[35.018733526001945, 135.7157590339057, '法金剛院', 'https://tenki.jp/sakura/6/29/50754.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、待賢門院桜'],
			[34.74573236923764, 135.7752765014041, '京都府立関西文化学術研究都市記念公園(けいはんな記念公園)', 'https://tenki.jp/sakura/6/29/50775.html', 'https://static.tenki.jp/static-images/sakura/point/50775/square.jpg', '桜の種類：現地問合せ'],
			[35.05846681484294, 135.75270137961394, '賀茂別雷神社(上賀茂神社)', 'https://tenki.jp/sakura/6/29/50874.html', 'https://static.tenki.jp/static-images/sakura/point/50874/square.jpg', '桜の種類：ベニシダレザクラ、シロシダレザクラ、ソメイヨシノ、ヤマザクラ'],
			[35.339294719867226, 134.92121522960286, '京都府・緑化センター', 'https://tenki.jp/sakura/6/29/50930.html', 'https://static.tenki.jp/static-images/sakura/point/50930/square.jpg', '桜の種類：ヤエベニシダレ、ソメイヨシノ、シダレザクラ、ウコン、ギョイコウ'],
			[35.0209973274447, 135.61347429220345, '保津峡', 'https://tenki.jp/sakura/6/29/50931.html', 'https://static.tenki.jp/static-images/sakura/point/50931/square.jpg', '桜の種類：ヤマザクラ'],
			[34.85578996526463, 135.79577664161667, '鴻ノ巣山', 'https://tenki.jp/sakura/6/29/50932.html', 'https://static.tenki.jp/static-images/sakura/point/50932/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.56493198664689, 135.13617556227973, '大内峠一字観公園', 'https://tenki.jp/sakura/6/29/50938.html', 'https://static.tenki.jp/static-images/sakura/point/50938/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.571436885121635, 135.15187324428385, '板列公園', 'https://tenki.jp/sakura/6/29/50939.html', 'https://static.tenki.jp/static-images/sakura/point/50939/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[34.95148213840889, 135.8196041977578, '醍醐寺', 'https://tenki.jp/sakura/6/29/56107.html', 'https://static.tenki.jp/static-images/sakura/point/56107/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[35.001478614140886, 135.8188446597576, '毘沙門堂', 'https://tenki.jp/sakura/6/29/56108.html', 'https://static.tenki.jp/static-images/sakura/point/56108/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ(大)、シダレザクラ(小)、ヤエザクラ、ヒガンザクラ'],
			[34.995037312716725, 135.78471293160297, '清水寺', 'https://tenki.jp/sakura/6/29/56110.html', 'https://static.tenki.jp/static-images/sakura/point/56110/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ'],
			[35.01608544338336, 135.78246678346775, '平安神宮 神苑', 'https://tenki.jp/sakura/6/29/56111.html', 'https://static.tenki.jp/static-images/sakura/point/56111/square.jpg', '桜の種類：ベニシダレザクラ、ヤエザクラ、ソメイヨシノ'],
			[35.04909781796803, 135.7617798711289, '京都府立植物園', 'https://tenki.jp/sakura/6/29/56112.html', 'https://static.tenki.jp/static-images/sakura/point/56112/square.jpg', '桜の種類：ソメイヨシノ、ベニシダレザクラ、サトザクラ'],
			[35.02988429596891, 135.71337909289457, '仁和寺(御室桜)', 'https://tenki.jp/sakura/6/29/56114.html', 'https://static.tenki.jp/static-images/sakura/point/56114/square.jpg', '桜の種類：オムロザクラ、ヤマザクラ、カンザン'],
			[35.01955494616337, 135.66972275486305, '常寂光寺', 'https://tenki.jp/sakura/6/29/56115.html', 'https://static.tenki.jp/static-images/sakura/point/56115/square.jpg', '桜の種類：ヤマザクラ、ヒガンシダレザクラ、ベニシダレザクラ'],
			[35.01114726873953, 135.674491017913, '嵐山', 'https://tenki.jp/sakura/6/29/56116.html', 'https://static.tenki.jp/static-images/sakura/point/56116/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.00387398244876, 135.6946329585513, '梅宮大社', 'https://tenki.jp/sakura/6/29/56118.html', 'https://static.tenki.jp/static-images/sakura/point/56118/square.jpg', '桜の種類：ショウゲツ、オオテマリ、フゲンゾウ、カンザン、オオチョウチン'],
			[34.87966293309244, 135.70005286109878, '石清水八幡宮', 'https://tenki.jp/sakura/6/29/56122.html', 'https://static.tenki.jp/static-images/sakura/point/56122/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ'],
			[34.88909856226147, 135.80955262559897, '宇治橋上流', 'https://tenki.jp/sakura/6/29/56146.html', 'https://static.tenki.jp/static-images/sakura/point/56146/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.05566264398939, 135.67392695956116, '高雄・三尾一帯', 'https://tenki.jp/sakura/6/29/56149.html', 'https://static.tenki.jp/static-images/sakura/point/56149/square.jpg', '桜の種類：ヤマザクラ'],
			[35.02481585794082, 135.7963525030921, '哲学の道', 'https://tenki.jp/sakura/6/29/56160.html', 'https://static.tenki.jp/static-images/sakura/point/56160/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、ヤエザクラ、シダレザクラ'],
			[35.119699279624086, 135.8344375876064, '三千院門跡', 'https://tenki.jp/sakura/6/29/56162.html', 'https://static.tenki.jp/static-images/sakura/point/56162/square.jpg', '桜の種類：シダレザクラ、ヤマザクラ'],
			[35.00363549152813, 135.78028129058146, '円山公園', 'https://tenki.jp/sakura/6/29/56163.html', 'https://static.tenki.jp/static-images/sakura/point/56163/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤエザクラ'],
			[35.000766756704465, 135.78111025280384, '高台寺', 'https://tenki.jp/sakura/6/29/56164.html', 'https://static.tenki.jp/static-images/sakura/point/56164/square.jpg', '桜の種類：コウダイジザクラ、シダレザクラ、ヤマザクラ'],
			[35.03429391868391, 135.71822665365968, '龍安寺', 'https://tenki.jp/sakura/6/29/56165.html', 'https://static.tenki.jp/static-images/sakura/point/56165/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ベニシダレザクラ、ヤエザクラ'],
			[35.02154028556335, 135.71902373497304, '退蔵院(妙心寺山内)', 'https://tenki.jp/sakura/6/29/56166.html', 'https://static.tenki.jp/static-images/sakura/point/56166/square.jpg', '桜の種類：ベニシダレザクラ'],
			[35.01576662099786, 135.67401677501852, '天龍寺', 'https://tenki.jp/sakura/6/29/56167.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[34.99469855240305, 135.82775472315743, '山科疏水', 'https://tenki.jp/sakura/6/29/56173.html', 'https://static.tenki.jp/static-images/sakura/point/56173/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ'],
			[35.00482239436875, 135.78302999947545, '浄土宗 総本山知恩院', 'https://tenki.jp/sakura/6/29/56175.html', 'https://static.tenki.jp/static-images/sakura/point/56175/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、シキザクラ、カンザクラ'],
			[34.95056079172278, 135.74667142413927, '城南宮 神苑 楽水苑', 'https://tenki.jp/sakura/6/29/56176.html', 'https://static.tenki.jp/static-images/sakura/point/56176/square.jpg', '桜の種類：ベニシダレザクラ、ヒガンザクラ'],
			[34.86956660996885, 135.80521442611214, '山城総合運動公園', 'https://tenki.jp/sakura/6/29/56180.html', 'https://static.tenki.jp/static-images/sakura/point/56180/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ'],
			[35.0007767283064, 135.76946442141485, '木屋町通り', 'https://tenki.jp/sakura/6/29/56184.html', 'https://static.tenki.jp/static-images/sakura/point/56184/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.758745224770855, 135.9356087237237, '笠置山自然公園(木津川畔)', 'https://tenki.jp/sakura/6/29/56419.html', 'https://static.tenki.jp/static-images/sakura/point/56419/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.29681889304991, 135.12970665675056, '福知山城', 'https://tenki.jp/sakura/6/29/56505.html', 'https://static.tenki.jp/static-images/sakura/point/56505/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.58683976890818, 135.1953397624848, '傘松公園', 'https://tenki.jp/sakura/6/29/56510.html', 'https://static.tenki.jp/static-images/sakura/point/56510/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.311011029099916, 135.13665891203755, '三段池公園', 'https://tenki.jp/sakura/6/29/56512.html', 'https://static.tenki.jp/static-images/sakura/point/56512/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[34.37237746993612, 135.37302889260926, '永楽ダム・永楽ダム周辺', 'https://tenki.jp/sakura/6/30/50385.html', 'https://static.tenki.jp/static-images/sakura/point/50385/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.37335918654042, 135.34377647066802, '大井関公園', 'https://tenki.jp/sakura/6/30/50465.html', 'https://static.tenki.jp/static-images/sakura/point/50465/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.474711327914704, 135.65502665883812, '弘川寺', 'https://tenki.jp/sakura/6/30/50482.html', 'https://static.tenki.jp/static-images/sakura/point/50482/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ、カスミザクラ、シダレザクラ'],
			[34.459458238368555, 135.36993970417896, '岸和田城周辺', 'https://tenki.jp/sakura/6/30/50709.html', 'https://static.tenki.jp/static-images/sakura/point/50709/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.86584812417888, 135.49112442412567, '勝ち運の寺 勝尾寺', 'https://tenki.jp/sakura/6/30/50781.html', 'https://static.tenki.jp/static-images/sakura/point/50781/square.jpg', '桜の種類：シダレザクラ、カンヒザクラ、カンザン、ソメイヨシノ、ヨウコウ'],
			[34.829440921617575, 135.42672581373466, '五月山公園', 'https://tenki.jp/sakura/6/30/50940.html', 'https://static.tenki.jp/static-images/sakura/point/50940/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ'],
			[34.875035818396086, 135.58851260556722, '摂津峡公園', 'https://tenki.jp/sakura/6/30/56119.html', 'https://static.tenki.jp/static-images/sakura/point/56119/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[34.686890229529325, 135.5242226382485, '大阪城公園', 'https://tenki.jp/sakura/6/30/56127.html', 'https://static.tenki.jp/static-images/sakura/point/56127/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、サトザクラ、シダレザクラ'],
			[34.50612737480275, 135.54766315880826, '狭山池公園', 'https://tenki.jp/sakura/6/30/56130.html', 'https://static.tenki.jp/static-images/sakura/point/56130/square.jpg', '桜の種類：コシノヒガン、ソメイヨシノ、ヤエベニヒガン、ウコン、その他'],
			[34.76033424293293, 135.67651114219467, '星田妙見宮(妙見河原)', 'https://tenki.jp/sakura/6/30/56178.html', 'https://static.tenki.jp/static-images/sakura/point/56178/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.55907967803057, 135.4824271223392, '大仙公園', 'https://tenki.jp/sakura/6/30/56433.html', 'https://static.tenki.jp/static-images/sakura/point/56433/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、シダレザクラ、ヤマザクラ、その他'],
			[34.486641307490665, 135.44475273241952, '黒鳥山公園', 'https://tenki.jp/sakura/6/30/56436.html', 'https://static.tenki.jp/static-images/sakura/point/56436/square.jpg', '桜の種類：ソメイヨシノ 他'],
			[34.32593721867579, 135.27013231927708, '山中渓の桜', 'https://tenki.jp/sakura/6/30/56440.html', 'https://static.tenki.jp/static-images/sakura/point/56440/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[34.503073107179226, 135.64359321037344, '大阪府立近つ飛鳥博物館', 'https://tenki.jp/sakura/6/30/56738.html', 'https://static.tenki.jp/static-images/sakura/point/56738/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.80884689048802, 135.34402233141674, '宝塚(花のみち)', 'https://tenki.jp/sakura/6/31/50312.html', 'https://static.tenki.jp/static-images/sakura/point/50312/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.287404818498366, 134.84146346766795, '立雲峡', 'https://tenki.jp/sakura/6/31/50378.html', 'https://static.tenki.jp/static-images/sakura/point/50378/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.24399736213558, 134.54913071770497, '音水湖(引原ダム)周辺', 'https://tenki.jp/sakura/6/31/50391.html', 'https://static.tenki.jp/static-images/sakura/point/50391/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.1508391922329, 135.07277260711328, '水分れ公園', 'https://tenki.jp/sakura/6/31/50712.html', 'https://static.tenki.jp/static-images/sakura/point/50712/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.739392749708294, 135.32817795652846, '夙川公園(夙川河川敷緑地)', 'https://tenki.jp/sakura/6/31/50767.html', 'https://static.tenki.jp/static-images/sakura/point/50767/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、カンザン、フゲンゾウ'],
			[35.348330318759146, 134.7110839343093, '樽見の大桜', 'https://tenki.jp/sakura/6/31/50776.html', 'https://static.tenki.jp/static-images/sakura/point/50776/square.jpg', '桜の種類：エドヒガン'],
			[34.68085361539162, 135.07675966615017, '神戸総合運動公園', 'https://tenki.jp/sakura/6/31/51032.html', 'https://static.tenki.jp/static-images/sakura/point/51032/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.63769382257235, 135.10005557741968, '須磨浦公園', 'https://tenki.jp/sakura/6/31/56133.html', 'https://static.tenki.jp/static-images/sakura/point/56133/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ'],
			[34.65207018880788, 134.99191829622626, '兵庫県立明石公園', 'https://tenki.jp/sakura/6/31/56134.html', 'https://static.tenki.jp/static-images/sakura/point/56134/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、カワヅザクラ、シダレザクラ'],
			[34.777637766812106, 134.86315334744285, '日岡山公園', 'https://tenki.jp/sakura/6/31/56140.html', 'https://static.tenki.jp/static-images/sakura/point/56140/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ、ヤエザクラ、オオシマザクラ'],
			[34.81196135190378, 134.7798089590027, '鹿島・扇平自然公園', 'https://tenki.jp/sakura/6/31/56141.html', 'https://static.tenki.jp/static-images/sakura/point/56141/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.836695101934595, 134.6929979720809, '姫路城', 'https://tenki.jp/sakura/6/31/56142.html', 'https://static.tenki.jp/static-images/sakura/point/56142/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ヤエザクラ'],
			[34.72902746076273, 134.41396433902975, '赤穂東御崎公園', 'https://tenki.jp/sakura/6/31/56145.html', 'https://static.tenki.jp/static-images/sakura/point/56145/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.7935226726343, 135.40079200751336, '伊丹・瑞ケ池', 'https://tenki.jp/sakura/6/31/56152.html', 'https://static.tenki.jp/static-images/sakura/point/56152/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、シダレザクラ'],
			[34.935703978555836, 134.94093254034993, '播磨中央公園 桜の園', 'https://tenki.jp/sakura/6/31/56174.html', 'https://static.tenki.jp/static-images/sakura/point/56174/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.0621636797058, 134.76216935311479, '神河町 桜華園', 'https://tenki.jp/sakura/6/31/56185.html', 'https://static.tenki.jp/static-images/sakura/point/56185/square.jpg', '桜の種類：オモイガワ、コマツオトメ、カワヅザクラ、ショウゲツ、アメリカ'],
			[35.07394321987775, 135.21737327581636, '篠山城跡・王地山公園', 'https://tenki.jp/sakura/6/31/56502.html', 'https://static.tenki.jp/static-images/sakura/point/56502/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[35.460424874051874, 134.87387399361054, '出石城跡', 'https://tenki.jp/sakura/6/31/56506.html', 'https://static.tenki.jp/static-images/sakura/point/56506/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[35.62582763661049, 134.8094078947387, '城崎温泉', 'https://tenki.jp/sakura/6/31/56507.html', 'https://static.tenki.jp/static-images/sakura/point/56507/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.476397172562514, 135.70583698971984, '葛城山麓公園', 'https://tenki.jp/sakura/6/32/50383.html', 'https://static.tenki.jp/static-images/sakura/point/50383/square.jpg', '桜の種類：ソメイヨシノ、ニドザキサクラ、チョウセンサクラ'],
			[34.69045202559673, 135.79813008574138, '平城宮跡', 'https://tenki.jp/sakura/6/32/50389.html', 'https://static.tenki.jp/static-images/sakura/point/50389/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ'],
			[34.36833347788908, 135.85879409850634, '金峯山寺蔵王堂', 'https://tenki.jp/sakura/6/32/50412.html', 'https://static.tenki.jp/static-images/sakura/point/50412/square.jpg', '桜の種類：シロヤマザクラ、ソメイヨシノ'],
			[34.706978272248115, 136.03160757120855, '月ヶ瀬湖畔', 'https://tenki.jp/sakura/6/32/50425.html', 'https://static.tenki.jp/static-images/sakura/point/50425/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.56296013469004, 136.0156520436427, '大野寺', 'https://tenki.jp/sakura/6/32/50428.html', 'https://static.tenki.jp/static-images/sakura/point/50428/square.jpg', '桜の種類：コイトシダレザクラ、ベニシダレザクラ'],
			[34.507321068846316, 136.0958610412228, '屏風岩公苑', 'https://tenki.jp/sakura/6/32/50467.html', 'https://static.tenki.jp/static-images/sakura/point/50467/square.jpg', '桜の種類：ヤマザクラ'],
			[34.514452337158374, 136.00977901623824, '佛隆寺千年桜(佛隆寺の古桜)', 'https://tenki.jp/sakura/6/32/50485.html', 'https://static.tenki.jp/static-images/sakura/point/50485/square.jpg', '桜の種類：モチヅキザクラ'],
			[34.47377021064024, 135.91789217225661, '又兵衛桜', 'https://tenki.jp/sakura/6/32/50877.html', 'https://static.tenki.jp/static-images/sakura/point/50877/square.jpg', '桜の種類：シダレザクラ'],
			[34.0432930396736, 135.9601081426894, '下北山スポーツ公園', 'https://tenki.jp/sakura/6/32/51016.html', 'https://static.tenki.jp/static-images/sakura/point/51016/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.52875060673409, 135.8526829480089, '大神神社', 'https://tenki.jp/sakura/6/32/56182.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ'],
			[34.68505347185051, 135.84194154523095, '奈良公園(ソメイヨシノ)', 'https://tenki.jp/sakura/6/32/56421.html', 'https://static.tenki.jp/static-images/sakura/point/56421/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.65175575585118, 135.77911150575054, '郡山城跡', 'https://tenki.jp/sakura/6/32/56423.html', 'https://static.tenki.jp/static-images/sakura/point/56423/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤエザクラ、ヤマザクラ、シダレザクラ'],
			[34.60921977461237, 135.67006038542806, '信貴山 朝護孫子寺', 'https://tenki.jp/sakura/6/32/56424.html', 'https://static.tenki.jp/static-images/sakura/point/56424/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ'],
			[34.60066018817384, 135.7154551337358, '三室山', 'https://tenki.jp/sakura/6/32/56425.html', 'https://static.tenki.jp/static-images/sakura/point/56425/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.511081920840994, 135.73698842389953, '高田千本桜', 'https://tenki.jp/sakura/6/32/56426.html', 'https://static.tenki.jp/static-images/sakura/point/56426/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヒガンザクラ、シダレザクラ、ヤエザクラ'],
			[34.35544802641157, 135.87195025914107, '吉野山(上千本)', 'https://tenki.jp/sakura/6/32/56429.html', 'https://static.tenki.jp/static-images/sakura/point/56429/square.jpg', '桜の種類：シロヤマザクラ'],
			[34.366972696826465, 135.86189586903947, '吉野山(中千本)', 'https://tenki.jp/sakura/6/32/56430.html', 'https://static.tenki.jp/static-images/sakura/point/56430/square.jpg', '桜の種類：シロヤマザクラ'],
			[34.37329984079111, 135.85428026081536, '吉野山(下千本)', 'https://tenki.jp/sakura/6/32/56431.html', 'https://static.tenki.jp/static-images/sakura/point/56431/square.jpg', '桜の種類：シロヤマザクラ'],
			[34.535803543116586, 135.90683851941787, '長谷寺', 'https://tenki.jp/sakura/6/32/56432.html', 'https://static.tenki.jp/static-images/sakura/point/56432/square.jpg', '桜の種類：シダレザクラ、ヤマザクラ、ソメイヨシノ、ナラノヤエザクラ、ハセザクラ'],
			[34.503658549944916, 135.84179412790792, '安倍文殊院', 'https://tenki.jp/sakura/6/32/56435.html', 'https://static.tenki.jp/static-images/sakura/point/56435/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.73093578021155, 135.9544522089526, '柳生芳徳禅寺周辺', 'https://tenki.jp/sakura/6/32/56441.html', 'https://static.tenki.jp/static-images/sakura/point/56441/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.465952195877314, 135.86169065065658, '談山神社', 'https://tenki.jp/sakura/6/32/56444.html', 'https://static.tenki.jp/static-images/sakura/point/56444/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ウスズミザクラ'],
			[33.59764335681182, 135.69642017194278, '七川ダム湖畔', 'https://tenki.jp/sakura/6/33/50321.html', 'https://static.tenki.jp/static-images/sakura/point/50321/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.15550938298002, 135.25949739231083, '亀池公園', 'https://tenki.jp/sakura/6/33/50941.html', 'https://static.tenki.jp/static-images/sakura/point/50941/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.227510754509844, 135.17163499035667, '和歌山城', 'https://tenki.jp/sakura/6/33/56401.html', 'https://static.tenki.jp/static-images/sakura/point/56401/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ヤマザクラ、エドヒガン'],
			[34.18486930778835, 135.18996959135964, '紀三井寺', 'https://tenki.jp/sakura/6/33/56404.html', 'https://static.tenki.jp/static-images/sakura/point/56404/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、ヤエザクラ、ヤマザクラ、その他'],
			[33.9142458257941, 135.1745033162427, '道成寺', 'https://tenki.jp/sakura/6/33/56405.html', 'https://static.tenki.jp/static-images/sakura/point/56405/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、入相桜(エドヒガン)'],
			[33.7602357213376, 135.38634467201388, '動鳴気峡', 'https://tenki.jp/sakura/6/33/56406.html', 'https://static.tenki.jp/static-images/sakura/point/56406/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[33.67101918618318, 135.34840237275384, '平草原公園', 'https://tenki.jp/sakura/6/33/56407.html', 'https://static.tenki.jp/static-images/sakura/point/56407/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、シダレザクラ、ヒガンザクラ'],
			[34.28710085784966, 135.31664872746833, '根來寺', 'https://tenki.jp/sakura/6/33/56415.html', 'https://static.tenki.jp/static-images/sakura/point/56415/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ネゴロザクラ、シダレザクラ'],
			[34.28084113172995, 135.40588376336436, '粉河寺', 'https://tenki.jp/sakura/6/33/56427.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[35.49897870318636, 134.22947147898086, '袋川桜土手', 'https://tenki.jp/sakura/7/34/50327.html', 'https://static.tenki.jp/static-images/sakura/point/50327/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.4526634389223, 133.593066022811, '萩原桜並木', 'https://tenki.jp/sakura/7/34/50946.html', 'https://static.tenki.jp/static-images/sakura/point/50946/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[35.51733532309372, 133.54982545223473, '木ノ根神社', 'https://tenki.jp/sakura/7/34/50947.html', 'https://static.tenki.jp/static-images/sakura/point/50947/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.50760478150216, 134.23632858130821, '鳥取城跡・久松公園', 'https://tenki.jp/sakura/7/34/56601.html', 'https://static.tenki.jp/static-images/sakura/point/56601/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.45933792068027, 134.06369464713507, '鹿野城跡公園', 'https://tenki.jp/sakura/7/34/56602.html', 'https://static.tenki.jp/static-images/sakura/point/56602/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.42991527083421, 133.8227330104337, '打吹公園', 'https://tenki.jp/sakura/7/34/56603.html', 'https://static.tenki.jp/static-images/sakura/point/56603/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.50688464399868, 133.49248573213737, '名和公園', 'https://tenki.jp/sakura/7/34/56607.html', 'https://static.tenki.jp/static-images/sakura/point/56607/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.546845056328834, 133.24275419141327, '境台場公園', 'https://tenki.jp/sakura/7/34/56609.html', 'https://static.tenki.jp/static-images/sakura/point/56609/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.42677174666462, 133.32124564582938, '湊山公園', 'https://tenki.jp/sakura/7/34/56610.html', 'https://static.tenki.jp/static-images/sakura/point/56610/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.33626153507801, 133.32630110480352, '城山公園・法勝寺川土手', 'https://tenki.jp/sakura/7/34/56611.html', 'https://static.tenki.jp/static-images/sakura/point/56611/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.26746007852149, 134.2304454011085, '智頭河畔 桜土手', 'https://tenki.jp/sakura/7/34/56624.html', 'https://static.tenki.jp/static-images/sakura/point/56624/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.57961027418999, 133.07461069741743, 'チェリーロード', 'https://tenki.jp/sakura/7/35/50464.html', 'https://static.tenki.jp/static-images/sakura/point/50464/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.73643472635363, 131.968719436753, '三隅大平桜', 'https://tenki.jp/sakura/7/35/50480.html', 'https://static.tenki.jp/static-images/sakura/point/50480/square.jpg', '桜の種類：三隅大平桜'],
			[35.292396261207436, 132.87713398049758, '三刀屋川河川敷', 'https://tenki.jp/sakura/7/35/50948.html', 'https://static.tenki.jp/static-images/sakura/point/50948/square.jpg', '桜の種類：ソメイヨシノ、ギョイコウ、ヤエザクラ'],
			[35.42512979918871, 133.25018338399005, '安来公園', 'https://tenki.jp/sakura/7/35/56612.html', 'https://static.tenki.jp/static-images/sakura/point/56612/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.40294864880579, 133.28074279914378, '清水公園', 'https://tenki.jp/sakura/7/35/56613.html', 'https://static.tenki.jp/static-images/sakura/point/56613/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.474981970079526, 133.05060564030407, '松江城山公園', 'https://tenki.jp/sakura/7/35/56615.html', 'https://static.tenki.jp/static-images/sakura/point/56615/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、シダレザクラ、ジンダイアケボノ'],
			[35.42652587636316, 133.0089140702384, '玉湯川堤', 'https://tenki.jp/sakura/7/35/56616.html', 'https://static.tenki.jp/static-images/sakura/point/56616/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.2950783917829, 132.90061338829204, '斐伊川堤防桜並木', 'https://tenki.jp/sakura/7/35/56617.html', 'https://static.tenki.jp/static-images/sakura/point/56617/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.44008675956152, 132.8175402928721, '愛宕山公園', 'https://tenki.jp/sakura/7/35/56618.html', 'https://static.tenki.jp/static-images/sakura/point/56618/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.90184513920974, 132.07452755812272, '城山公園', 'https://tenki.jp/sakura/7/35/56623.html', 'https://static.tenki.jp/static-images/sakura/point/56623/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.45341432603397, 131.75674029629707, '鷲原公園', 'https://tenki.jp/sakura/7/35/58024.html', 'https://static.tenki.jp/static-images/sakura/point/58024/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.15583081592553, 133.62276361274826, '美甘宿場桜', 'https://tenki.jp/sakura/7/36/50331.html', 'https://static.tenki.jp/static-images/sakura/point/50331/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.243958231706095, 134.107432533265, '尾所の桜', 'https://tenki.jp/sakura/7/36/50332.html', 'https://static.tenki.jp/static-images/sakura/point/50332/square.jpg', '桜の種類：ヤマザクラ'],
			[34.97156491102811, 133.82342318124415, '三休公園', 'https://tenki.jp/sakura/7/36/50440.html', 'https://static.tenki.jp/static-images/sakura/point/50440/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.79677823786032, 133.93206467104915, '金川桜並木', 'https://tenki.jp/sakura/7/36/50458.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[34.55576229590937, 133.6241636320677, '丸山公園', 'https://tenki.jp/sakura/7/36/50459.html', 'https://static.tenki.jp/static-images/sakura/point/50459/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.79547735576297, 134.21999576203646, '特別史跡旧閑谷学校', 'https://tenki.jp/sakura/7/36/50460.html', 'https://static.tenki.jp/static-images/sakura/point/50460/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.03226818622732, 133.62428339306817, '岩井畝の大桜', 'https://tenki.jp/sakura/7/36/50478.html', 'https://static.tenki.jp/static-images/sakura/point/50478/square.jpg', '桜の種類：アズマヒガンザクラ'],
			[34.54104839495358, 133.6224041060596, '里見川周辺緑地', 'https://tenki.jp/sakura/7/36/50723.html', 'https://static.tenki.jp/static-images/sakura/point/50723/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.66753055242229, 133.9355115895071, '岡山後楽園', 'https://tenki.jp/sakura/7/36/56701.html', 'https://static.tenki.jp/static-images/sakura/point/56701/square.jpg', '桜の種類：ソメイヨシノ、ヤエベニシダレ、ヤマザクラ'],
			[34.691748044830625, 133.93189364315091, '岡山市半田山植物園', 'https://tenki.jp/sakura/7/36/56703.html', 'https://static.tenki.jp/static-images/sakura/point/56703/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[34.504938265111605, 133.8500996857318, '由加山蓮台寺', 'https://tenki.jp/sakura/7/36/56705.html', 'https://static.tenki.jp/static-images/sakura/point/56705/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、ウコン'],
			[34.51760479144386, 133.92797703684332, 'みやま公園', 'https://tenki.jp/sakura/7/36/56707.html', 'https://static.tenki.jp/static-images/sakura/point/56707/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、ヒガンザクラ、カンヒザクラ'],
			[34.60648232606838, 133.82606252906638, '早島公園', 'https://tenki.jp/sakura/7/36/56708.html', 'https://static.tenki.jp/static-images/sakura/point/56708/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.50091508666925, 133.50668137913758, '古城山公園', 'https://tenki.jp/sakura/7/36/56711.html', 'https://static.tenki.jp/static-images/sakura/point/56711/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[35.06250104843637, 134.0053132866564, '津山城(鶴山公園)', 'https://tenki.jp/sakura/7/36/56717.html', 'https://static.tenki.jp/static-images/sakura/point/56717/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、オオヤマザクラ、ヒガンザクラ、ヤマザクラ'],
			[34.98613281699414, 133.46708895036926, '城山公園', 'https://tenki.jp/sakura/7/36/56718.html', 'https://static.tenki.jp/static-images/sakura/point/56718/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、サトザクラ'],
			[34.79649816542252, 133.6175257352309, '紺屋川美観地区', 'https://tenki.jp/sakura/7/36/56719.html', 'https://static.tenki.jp/static-images/sakura/point/56719/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[34.81889680670994, 134.17478697812612, '芳嵐園', 'https://tenki.jp/sakura/7/36/56727.html', 'https://static.tenki.jp/static-images/sakura/point/56727/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ、ヤエザクラ'],
			[35.02400499054923, 133.6472861974904, '醍醐桜', 'https://tenki.jp/sakura/7/36/56730.html', 'https://static.tenki.jp/static-images/sakura/point/56730/square.jpg', '桜の種類：エドヒガン(アズマヒガン)'],
			[34.85648156769616, 133.87416184004965, 'たけべの森公園', 'https://tenki.jp/sakura/7/36/56731.html', 'https://static.tenki.jp/static-images/sakura/point/56731/square.jpg', '桜の種類：カンヒザクラ、アマギヨシノ、ヤエベニシダレ、カンザン、アマノガワ'],
			[34.605045520004396, 133.4636147197184, '井原堤', 'https://tenki.jp/sakura/7/36/56732.html', 'https://static.tenki.jp/static-images/sakura/point/56732/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.57670083073134, 133.45338949265266, '相原公園', 'https://tenki.jp/sakura/7/36/56733.html', 'https://static.tenki.jp/static-images/sakura/point/56733/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.67461903424498, 133.90654398410373, '池田動物園', 'https://tenki.jp/sakura/7/36/56737.html', 'https://static.tenki.jp/static-images/sakura/point/56737/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.240848600943806, 132.21664555411058, '亀居公園', 'https://tenki.jp/sakura/7/37/50328.html', 'https://static.tenki.jp/static-images/sakura/point/50328/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.34880144898741, 132.3396109413721, '住吉堤防敷', 'https://tenki.jp/sakura/7/37/50461.html', 'https://static.tenki.jp/static-images/sakura/point/50461/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.20697253782102, 132.45365336175837, '真道山千本桜', 'https://tenki.jp/sakura/7/37/50479.html', 'https://static.tenki.jp/static-images/sakura/point/50479/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、タカトオザクラ'],
			[34.39173079884158, 132.34797039692833, '広島市植物公園', 'https://tenki.jp/sakura/7/37/50834.html', 'https://static.tenki.jp/static-images/sakura/point/50834/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、シダレザクラ、ヒロシマエバヤマザクラ'],
			[34.49081458051923, 133.36109605291233, '福山城公園', 'https://tenki.jp/sakura/7/37/56712.html', 'https://static.tenki.jp/static-images/sakura/point/56712/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.411162982724036, 133.1951519580946, '千光寺公園', 'https://tenki.jp/sakura/7/37/56715.html', 'https://static.tenki.jp/static-images/sakura/point/56715/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[34.63046162457821, 133.14735372715302, '世羅 甲山ふれあいの里', 'https://tenki.jp/sakura/7/37/56724.html', 'https://static.tenki.jp/static-images/sakura/point/56724/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤエベニシダレ、ヤエザクラ'],
			[34.375919672844866, 133.08134634009687, '筆影山山頂展望台', 'https://tenki.jp/sakura/7/37/58001.html', 'https://static.tenki.jp/static-images/sakura/point/58001/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.31821592368878, 132.82298265349425, '正福寺山公園', 'https://tenki.jp/sakura/7/37/58002.html', 'https://static.tenki.jp/static-images/sakura/point/58002/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.195408203644334, 132.53969810442916, '音戸の瀬戸公園', 'https://tenki.jp/sakura/7/37/58003.html', 'https://static.tenki.jp/static-images/sakura/point/58003/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、ヤエザクラ'],
			[34.39276028063288, 132.45224090473172, '平和記念公園', 'https://tenki.jp/sakura/7/37/58004.html', 'https://static.tenki.jp/static-images/sakura/point/58004/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.38459571905124, 132.47307667267359, '比治山公園', 'https://tenki.jp/sakura/7/37/58005.html', 'https://static.tenki.jp/static-images/sakura/point/58005/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.81425330099036, 132.84001795354152, '尾関山公園', 'https://tenki.jp/sakura/7/37/58007.html', 'https://static.tenki.jp/static-images/sakura/point/58007/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、エドヒガン、シダレザクラ、ヤマザクラ、オオシマザクラ'],
			[34.294517456120516, 132.3174337798338, '宮島', 'https://tenki.jp/sakura/7/37/58008.html', 'https://static.tenki.jp/static-images/sakura/point/58008/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.857968908714454, 133.02310582355358, '庄原上野公園', 'https://tenki.jp/sakura/7/37/58036.html', 'https://static.tenki.jp/static-images/sakura/point/58036/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.662052518256054, 132.61790683033107, '八千代湖周辺', 'https://tenki.jp/sakura/7/37/58041.html', 'https://static.tenki.jp/static-images/sakura/point/58041/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.33809140992788, 132.93012827742672, 'ピースリーホームバンブー総合公園', 'https://tenki.jp/sakura/7/37/58043.html', 'https://static.tenki.jp/static-images/sakura/point/58043/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.470548038193456, 133.08191012638312, '御調八幡宮', 'https://tenki.jp/sakura/7/37/58044.html', 'https://static.tenki.jp/static-images/sakura/point/58044/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、エドヒガン、ヤエザクラ、ヤマザクラ'],
			[34.06313146254124, 131.57415659871646, '防府天満宮', 'https://tenki.jp/sakura/7/38/50337.html', 'https://static.tenki.jp/static-images/sakura/point/50337/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.99594409249056, 130.982236698411, '功山寺', 'https://tenki.jp/sakura/7/38/50430.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ギョイコウ、ウコン'],
			[34.18178511581821, 131.47769732387454, '一の坂川', 'https://tenki.jp/sakura/7/38/50431.html', 'https://static.tenki.jp/static-images/sakura/point/50431/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.398891584983126, 131.19834703228693, '王子山公園', 'https://tenki.jp/sakura/7/38/50450.html', 'https://static.tenki.jp/static-images/sakura/point/50450/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[34.16651528650689, 131.20515604568996, '厚狭川河畔', 'https://tenki.jp/sakura/7/38/50451.html', 'https://static.tenki.jp/static-images/sakura/point/50451/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.231867325680334, 131.29431225196674, '秋吉台家族旅行村', 'https://tenki.jp/sakura/7/38/50453.html', 'https://static.tenki.jp/static-images/sakura/point/50453/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[34.07961114611621, 131.76876979356123, '永源山公園', 'https://tenki.jp/sakura/7/38/50490.html', 'https://static.tenki.jp/static-images/sakura/point/50490/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[33.98279964841912, 132.0842985913493, 'アデリーホシパーク', 'https://tenki.jp/sakura/7/38/50787.html', 'https://static.tenki.jp/static-images/sakura/point/50787/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.09267254683528, 131.25323735847246, '今富ダム公園', 'https://tenki.jp/sakura/7/38/50953.html', 'https://static.tenki.jp/static-images/sakura/point/50953/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.29807410138235, 131.68346804485003, '大原湖(佐波川ダム)', 'https://tenki.jp/sakura/7/38/50954.html', 'https://static.tenki.jp/static-images/sakura/point/50954/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.039357593879984, 131.87223454766, '花岡八幡宮', 'https://tenki.jp/sakura/7/38/50955.html', 'https://static.tenki.jp/static-images/sakura/point/50955/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.16835011883946, 132.17766481396902, '錦帯橋周辺', 'https://tenki.jp/sakura/7/38/58011.html', 'https://static.tenki.jp/static-images/sakura/point/58011/square.jpg', '桜の種類：ソメイヨシノ、カンザン、オオシマザクラ、ヤマザクラ'],
			[33.95529158612647, 132.0416949316039, '田布施川', 'https://tenki.jp/sakura/7/38/58013.html', 'https://static.tenki.jp/static-images/sakura/point/58013/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.06282743447177, 131.5873555293315, '毛利氏庭園', 'https://tenki.jp/sakura/7/38/58015.html', 'https://static.tenki.jp/static-images/sakura/point/58015/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、匂桜'],
			[34.39629920573906, 131.7262554219756, '徳佐八幡宮', 'https://tenki.jp/sakura/7/38/58023.html', 'https://static.tenki.jp/static-images/sakura/point/58023/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヒガンザクラ'],
			[33.94812145014499, 131.28790292315406, 'ときわ公園', 'https://tenki.jp/sakura/7/38/58025.html', 'https://static.tenki.jp/static-images/sakura/point/58025/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、カンヒザクラ、オオシマザクラ'],
			[34.4176604954226, 131.38357587213576, '萩城跡指月公園', 'https://tenki.jp/sakura/7/38/58035.html', 'https://static.tenki.jp/static-images/sakura/point/58035/square.jpg', '桜の種類：ソメイヨシノ、ミドリヨシノ'],
			[34.40127242586793, 131.40628093752545, '川島堤', 'https://tenki.jp/sakura/7/38/58037.html', 'https://static.tenki.jp/static-images/sakura/point/58037/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.44979165453148, 131.40176791984538, '笠山', 'https://tenki.jp/sakura/7/38/58038.html', 'https://static.tenki.jp/static-images/sakura/point/58038/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[34.32866593213049, 131.16303618023505, '大寧寺', 'https://tenki.jp/sakura/7/38/58042.html', 'https://static.tenki.jp/static-images/sakura/point/58042/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ'],
			[33.993613274865844, 134.07619866563516, '吉良のエドヒガン(桜)', 'https://tenki.jp/sakura/8/39/50325.html', 'https://static.tenki.jp/static-images/sakura/point/50325/square.jpg', '桜の種類：エドヒガン、シダレザクラ'],
			[34.02586886451544, 134.02492997532448, '於安パーク', 'https://tenki.jp/sakura/8/39/50326.html', 'https://static.tenki.jp/static-images/sakura/point/50326/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ウスズミザクラ、ヤエザクラ'],
			[34.067598116525424, 134.53635388080394, '眉山公園', 'https://tenki.jp/sakura/8/39/50416.html', 'https://static.tenki.jp/static-images/sakura/point/50416/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.06891063383854, 134.51458035359093, '西部公園', 'https://tenki.jp/sakura/8/39/50417.html', 'https://static.tenki.jp/static-images/sakura/point/50417/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.178850367573624, 134.6186257492756, '妙見山公園', 'https://tenki.jp/sakura/8/39/50419.html', 'https://static.tenki.jp/static-images/sakura/point/50419/square.jpg', '桜の種類：ソメイヨシノ、ハチスカザクラ、ヤマザクラ'],
			[34.13074240003101, 133.64428891743066, '県立琴弾公園', 'https://tenki.jp/sakura/8/40/50432.html', 'https://static.tenki.jp/static-images/sakura/point/50432/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.17999500220289, 133.75993751353082, '朝日山森林公園', 'https://tenki.jp/sakura/8/40/50433.html', 'https://static.tenki.jp/static-images/sakura/point/50433/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ボタンザクラ'],
			[34.28597560000645, 133.80043864197677, '丸亀城', 'https://tenki.jp/sakura/8/40/50434.html', 'https://static.tenki.jp/static-images/sakura/point/50434/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエベニオオシマザクラ'],
			[34.34909906862438, 134.05096708054208, '史跡高松城跡玉藻公園', 'https://tenki.jp/sakura/8/40/50495.html', 'https://static.tenki.jp/static-images/sakura/point/50495/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ハチスカザクラ、ヨウシュン、ヤエザクラ'],
			[34.267873725685575, 133.87054532060355, '飯山総合運動公園', 'https://tenki.jp/sakura/8/40/50608.html', 'https://static.tenki.jp/static-images/sakura/point/50608/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カンヒザクラ、ヤエザクラ'],
			[34.24240340176436, 133.59955868963408, '紫雲出山', 'https://tenki.jp/sakura/8/40/50783.html', 'https://static.tenki.jp/static-images/sakura/point/50783/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヨウコウ'],
			[34.14934762051271, 133.67334467631144, '不動の滝カントリーパーク', 'https://tenki.jp/sakura/8/40/50784.html', 'https://static.tenki.jp/static-images/sakura/point/50784/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ'],
			[34.10946395776731, 133.79752126463475, '戸川ダム公園', 'https://tenki.jp/sakura/8/40/50785.html', 'https://static.tenki.jp/static-images/sakura/point/50785/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.128750478188586, 133.71681056176715, '水辺公園', 'https://tenki.jp/sakura/8/40/50786.html', 'https://static.tenki.jp/static-images/sakura/point/50786/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.241352575030554, 134.1042646132691, '公渕森林公園', 'https://tenki.jp/sakura/8/40/50873.html', 'https://static.tenki.jp/static-images/sakura/point/50873/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、シダレザクラ'],
			[34.268490029047086, 133.7463964886289, '県立桃陵公園', 'https://tenki.jp/sakura/8/40/50963.html', 'https://static.tenki.jp/static-images/sakura/point/50963/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.33019798348504, 134.04440619891025, '特別名勝 栗林公園', 'https://tenki.jp/sakura/8/40/57001.html', 'https://static.tenki.jp/static-images/sakura/point/57001/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、ヤマザクラ、サトザクラ、ヒガンザクラ、シダレザクラ、その他'],
			[34.18402983658896, 133.80950164338267, '金刀比羅宮', 'https://tenki.jp/sakura/8/40/57008.html', 'https://static.tenki.jp/static-images/sakura/point/57008/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ボタンザクラ、カンヒザクラ'],
			[34.22914362328435, 133.06496361498895, '開山公園', 'https://tenki.jp/sakura/8/41/50323.html', 'https://static.tenki.jp/static-images/sakura/point/50323/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.90555337061153, 133.02535118014967, '西山興隆寺', 'https://tenki.jp/sakura/8/41/50501.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：シダレザクラ'],
			[33.89921635862627, 133.19311831272682, '武丈公園', 'https://tenki.jp/sakura/8/41/51011.html', 'https://static.tenki.jp/static-images/sakura/point/51011/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.13377654585448, 132.50535391414996, '南楽園(外堀)', 'https://tenki.jp/sakura/8/41/51021.html', 'https://static.tenki.jp/static-images/sakura/point/51021/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ'],
			[33.84429391249925, 132.7665816611607, '松山城', 'https://tenki.jp/sakura/8/41/57015.html', 'https://static.tenki.jp/static-images/sakura/point/57015/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ、ツバキカンザクラ'],
			[33.84809805448528, 132.78670479889817, '道後公園', 'https://tenki.jp/sakura/8/41/57016.html', 'https://static.tenki.jp/static-images/sakura/point/57016/square.jpg', '桜の種類：ソメイヨシノ、ツバキカンザクラ'],
			[33.56171307536681, 133.531335634299, '高知公園', 'https://tenki.jp/sakura/8/42/50421.html', 'https://static.tenki.jp/static-images/sakura/point/50421/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ボタンザクラ、オオシマザクラ'],
			[33.61811013488928, 133.7195213597961, '鏡野公園', 'https://tenki.jp/sakura/8/42/50424.html', 'https://static.tenki.jp/static-images/sakura/point/50424/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、センダイヤザクラ'],
			[33.322580780971606, 133.2246045684846, '久礼大坂谷川沿い', 'https://tenki.jp/sakura/8/42/50438.html', 'https://static.tenki.jp/static-images/sakura/point/50438/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.588097644803675, 133.16942927536783, 'ひょうたん桜公園', 'https://tenki.jp/sakura/8/42/50444.html', 'https://static.tenki.jp/static-images/sakura/point/50444/square.jpg', '桜の種類：エドヒガン'],
			[33.43808574431203, 134.0278373414767, '鮎乃瀬公園', 'https://tenki.jp/sakura/8/42/50446.html', 'https://static.tenki.jp/static-images/sakura/point/50446/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.53047392317334, 133.05405077422114, '中越家のしだれ桜', 'https://tenki.jp/sakura/8/42/50500.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：シダレザクラ'],
			[32.941758699792935, 132.7250383563715, '宿毛天満宮', 'https://tenki.jp/sakura/8/42/50971.html', 'https://static.tenki.jp/static-images/sakura/point/50971/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.99685869799593, 132.929121030011, '為松公園', 'https://tenki.jp/sakura/8/42/50972.html', 'https://static.tenki.jp/static-images/sakura/point/50972/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.16107029211076, 133.0712609269117, '家地川公園', 'https://tenki.jp/sakura/8/42/50975.html', 'https://static.tenki.jp/static-images/sakura/point/50975/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.42646775491701, 130.66606136063908, '甘木公園', 'https://tenki.jp/sakura/9/43/50437.html', 'https://static.tenki.jp/static-images/sakura/point/50437/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[33.884484190560855, 130.87356406211637, '勝山公園(小倉城)', 'https://tenki.jp/sakura/9/43/50504.html', 'https://static.tenki.jp/static-images/sakura/point/50504/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ、マイヒメ、シダレザクラ、ヤエベニシダレ'],
			[33.469115686351856, 130.69367971169783, '秋月杉の馬場通り', 'https://tenki.jp/sakura/9/43/50505.html', 'https://static.tenki.jp/static-images/sakura/point/50505/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.936391335290196, 131.00354189284255, '白野江植物公園', 'https://tenki.jp/sakura/9/43/50509.html', 'https://static.tenki.jp/static-images/sakura/point/50509/square.jpg', '桜の種類：カワヅザクラ、カンヒザクラ、ソメイヨシノ、ギョイコウ、オオシマザクラ'],
			[33.6430570432435, 130.67848851424006, '勝盛公園', 'https://tenki.jp/sakura/9/43/50511.html', 'https://static.tenki.jp/static-images/sakura/point/50511/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.15664677373711, 130.80793745424242, '日向神ダムの「千本桜」', 'https://tenki.jp/sakura/9/43/50513.html', 'https://static.tenki.jp/static-images/sakura/point/50513/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.31386689353247, 130.63706807406209, '発心公園', 'https://tenki.jp/sakura/9/43/50572.html', 'https://static.tenki.jp/static-images/sakura/point/50572/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[33.30708997619084, 130.61060326765775, '浅井の一本桜', 'https://tenki.jp/sakura/9/43/50573.html', 'https://static.tenki.jp/static-images/sakura/point/50573/square.jpg', '桜の種類：ヤマザクラ'],
			[33.57271718175949, 130.51022938805062, '宇美公園', 'https://tenki.jp/sakura/9/43/50582.html', 'https://static.tenki.jp/static-images/sakura/point/50582/square.jpg', '桜の種類：ソメイヨシノ、ヒガンザクラ'],
			[33.514442058188095, 130.51495057639727, '大宰府政庁跡', 'https://tenki.jp/sakura/9/43/50589.html', 'https://static.tenki.jp/static-images/sakura/point/50589/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.52089046537522, 130.51836435025618, '太宰府市民の森', 'https://tenki.jp/sakura/9/43/50591.html', 'https://static.tenki.jp/static-images/sakura/point/50591/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[33.528932571822374, 130.55241092014018, '宝満宮 竈門神社', 'https://tenki.jp/sakura/9/43/50592.html', 'https://static.tenki.jp/static-images/sakura/point/50592/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[33.32771547932209, 130.50817006141733, '久留米城跡', 'https://tenki.jp/sakura/9/43/50755.html', 'https://static.tenki.jp/static-images/sakura/point/50755/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ギョイコウ、ヨウコウ、ヤエザクラ'],
			[33.588108624881194, 130.38703886047801, '福岡城跡・舞鶴公園', 'https://tenki.jp/sakura/9/43/50759.html', 'https://static.tenki.jp/static-images/sakura/point/50759/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、サトザクラ、ヤマザクラ、その他'],
			[33.81629333895012, 130.69864346578134, '垣生公園', 'https://tenki.jp/sakura/9/43/50976.html', 'https://static.tenki.jp/static-images/sakura/point/50976/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[33.15113704694335, 130.52538457018625, '清水山', 'https://tenki.jp/sakura/9/43/50977.html', 'https://static.tenki.jp/static-images/sakura/point/50977/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.28828821851706, 130.19603523693883, '小城公園', 'https://tenki.jp/sakura/9/44/50514.html', 'https://static.tenki.jp/static-images/sakura/point/50514/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.10382022729992, 130.09364250574052, '旭ヶ岡公園', 'https://tenki.jp/sakura/9/44/50515.html', 'https://static.tenki.jp/static-images/sakura/point/50515/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.429459051508466, 130.02416354502, '鏡山', 'https://tenki.jp/sakura/9/44/50518.html', 'https://static.tenki.jp/static-images/sakura/point/50518/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.45350196908298, 129.97823266343732, '唐津城(舞鶴公園)', 'https://tenki.jp/sakura/9/44/50549.html', 'https://static.tenki.jp/static-images/sakura/point/50549/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ'],
			[33.364410367956495, 130.33841868264483, '桜街道', 'https://tenki.jp/sakura/9/44/50560.html', 'https://static.tenki.jp/static-images/sakura/point/50560/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.189076720235924, 129.898724019262, '陶山神社', 'https://tenki.jp/sakura/9/44/50570.html', 'https://static.tenki.jp/static-images/sakura/point/50570/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.52857440586561, 129.87018388416456, '名護屋城跡', 'https://tenki.jp/sakura/9/44/50576.html', 'https://static.tenki.jp/static-images/sakura/point/50576/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.256918858451115, 130.08962199778554, '西渓公園', 'https://tenki.jp/sakura/9/44/50585.html', 'https://static.tenki.jp/static-images/sakura/point/50585/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.3311205755839, 130.35268953365488, '日の隈公園', 'https://tenki.jp/sakura/9/44/50980.html', 'https://static.tenki.jp/static-images/sakura/point/50980/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.89658389919462, 129.95808739882185, '大村公園(二重馬場)', 'https://tenki.jp/sakura/9/45/50519.html', 'https://static.tenki.jp/static-images/sakura/point/50519/square.jpg', '桜の種類：ソメイヨシノ、オオムラザクラ、ヤエザクラ'],
			[33.05501424129265, 129.75943711122807, '西海橋公園', 'https://tenki.jp/sakura/9/45/50520.html', 'https://static.tenki.jp/static-images/sakura/point/50520/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.78921704480549, 130.36724602340254, '島原城', 'https://tenki.jp/sakura/9/45/50521.html', 'https://static.tenki.jp/static-images/sakura/point/50521/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.3678267515496, 129.5564572472626, '亀岡公園', 'https://tenki.jp/sakura/9/45/50522.html', 'https://static.tenki.jp/static-images/sakura/point/50522/square.jpg', '桜の種類：ソメイヨシノ、平戸ニドザキサクラ'],
			[33.38109566839522, 129.83000856499103, '大山公園', 'https://tenki.jp/sakura/9/45/50556.html', 'https://static.tenki.jp/static-images/sakura/point/50556/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、オオシマザクラ、その他'],
			[32.784701804500514, 130.20369482719983, '橘公園', 'https://tenki.jp/sakura/9/45/50565.html', 'https://static.tenki.jp/static-images/sakura/point/50565/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.62900934437755, 130.25419734530797, '原城跡', 'https://tenki.jp/sakura/9/45/50566.html', 'https://static.tenki.jp/static-images/sakura/point/50566/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.72583064691515, 130.21192090097628, 'とけん山公園', 'https://tenki.jp/sakura/9/45/50586.html', 'https://static.tenki.jp/static-images/sakura/point/50586/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[32.31948734324561, 131.02068588487677, '市房ダム湖周辺', 'https://tenki.jp/sakura/9/46/50523.html', 'https://static.tenki.jp/static-images/sakura/point/50523/square.jpg', '桜の種類：ソメイヨシノ、カンザン、ショウゲツ、ウコン、アマノガワ'],
			[32.230323610012746, 130.4070052636306, '湯の児チェリーライン', 'https://tenki.jp/sakura/9/46/50524.html', 'https://static.tenki.jp/static-images/sakura/point/50524/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ'],
			[32.67719325069621, 130.69347954150436, '立岡自然公園', 'https://tenki.jp/sakura/9/46/50527.html', 'https://static.tenki.jp/static-images/sakura/point/50527/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.79073651554598, 130.73558575538803, '水前寺成趣園', 'https://tenki.jp/sakura/9/46/50528.html', 'https://static.tenki.jp/static-images/sakura/point/50528/square.jpg', '桜の種類：ヨシノザクラ、ヤマザクラ、ヒガンザクラ、ソメイヨシノ、オオシマザクラ'],
			[32.94569585199293, 130.55006493368487, '蛇ヶ谷公園', 'https://tenki.jp/sakura/9/46/50529.html', 'https://static.tenki.jp/static-images/sakura/point/50529/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ'],
			[32.98562958347638, 130.81826216088677, '菊池公園', 'https://tenki.jp/sakura/9/46/50530.html', 'https://static.tenki.jp/static-images/sakura/point/50530/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ジュウガツザクラ、オオシマザクラ、カンヒザクラ'],
			[32.210838964738755, 130.76404950053706, '人吉城跡', 'https://tenki.jp/sakura/9/46/50552.html', 'https://static.tenki.jp/static-images/sakura/point/50552/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.65821161448826, 130.67904518545262, '岡岳公園', 'https://tenki.jp/sakura/9/46/50561.html', 'https://static.tenki.jp/static-images/sakura/point/50561/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.78255388346861, 130.76106229239824, '健軍自衛隊通り', 'https://tenki.jp/sakura/9/46/50563.html', 'https://static.tenki.jp/static-images/sakura/point/50563/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.068939705861546, 130.54948152028646, '大津山公園', 'https://tenki.jp/sakura/9/46/50583.html', 'https://static.tenki.jp/static-images/sakura/point/50583/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.551635531769016, 130.6851991320235, '桜ヶ丘グラウンド', 'https://tenki.jp/sakura/9/46/50587.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、サトザクラ、シダレザクラ'],
			[32.968994032379, 131.40734340959847, '岡城跡', 'https://tenki.jp/sakura/9/47/50532.html', 'https://static.tenki.jp/static-images/sakura/point/50532/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.36656472254899, 131.53150123221906, '城下公園', 'https://tenki.jp/sakura/9/47/50534.html', 'https://static.tenki.jp/static-images/sakura/point/50534/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.40016147740132, 131.5468181447688, 'サンリオキャラクターパーク ハーモニーランド', 'https://tenki.jp/sakura/9/47/50620.html', 'https://static.tenki.jp/static-images/sakura/point/50620/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ'],
			[33.315282218178375, 130.9283006149571, '亀山公園', 'https://tenki.jp/sakura/9/47/50760.html', 'https://static.tenki.jp/static-images/sakura/point/50760/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ'],
			[31.749688384721477, 131.01045179031303, '母智丘公園', 'https://tenki.jp/sakura/9/48/50540.html', 'https://static.tenki.jp/static-images/sakura/point/50540/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[32.671279803051995, 131.21302587659926, '浄専寺', 'https://tenki.jp/sakura/9/48/50542.html', 'https://static.tenki.jp/static-images/sakura/point/50542/square.jpg', '桜の種類：イトザクラ(シダレザクラ)'],
			[32.11890201901936, 131.38648964736487, '西都原古墳群', 'https://tenki.jp/sakura/9/48/50569.html', 'https://static.tenki.jp/static-images/sakura/point/50569/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.022007717280694, 131.46060914730737, '久峰総合公園', 'https://tenki.jp/sakura/9/48/50574.html', 'https://static.tenki.jp/static-images/sakura/point/50574/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、ヤエザクラ、カワヅザクラ'],
			[32.67215479463095, 131.212261888141, '原田家のしだれ桜', 'https://tenki.jp/sakura/9/48/50584.html', 'https://static.tenki.jp/static-images/sakura/point/50584/square.jpg', '桜の種類：イトザクラ'],
			[31.71283421652362, 131.35882124263767, '花立公園', 'https://tenki.jp/sakura/9/48/50600.html', 'https://static.tenki.jp/static-images/sakura/point/50600/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、カンザクラ、オオシマザクラ'],
			[32.029457792984545, 131.19430379265526, '綾の照葉大吊橋', 'https://tenki.jp/sakura/9/48/50604.html', 'https://static.tenki.jp/static-images/sakura/point/50604/square.jpg', '桜の種類：ヤマザクラ'],
			[31.82516601829527, 131.1357086806733, '観音池公園', 'https://tenki.jp/sakura/9/48/50613.html', 'https://static.tenki.jp/static-images/sakura/point/50613/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.58069382897363, 131.66294139648733, '延岡城跡 城山公園', 'https://tenki.jp/sakura/9/48/50725.html', 'https://static.tenki.jp/static-images/sakura/point/50725/square.jpg', '桜の種類：ソメイヨシノ'],
			[31.776716511499988, 131.48251469115314, '堀切峠', 'https://tenki.jp/sakura/9/48/50982.html', 'https://static.tenki.jp/static-images/sakura/point/50982/square.jpg', '桜の種類：ヤマザクラ'],
			[32.122962996226704, 131.5029584478628, '舞鶴公園(宮崎県)', 'https://tenki.jp/sakura/9/48/50985.html', 'https://static.tenki.jp/static-images/sakura/point/50985/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.4889745636182, 131.70732321862207, '遠見山', 'https://tenki.jp/sakura/9/48/50986.html', 'https://static.tenki.jp/static-images/sakura/point/50986/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.049337917710716, 130.61414103122172, '忠元公園', 'https://tenki.jp/sakura/9/49/50547.html', 'https://static.tenki.jp/static-images/sakura/point/50547/square.jpg', '桜の種類：ソメイヨシノ'],
			[31.857509048214776, 130.86998591658056, '霧島神宮', 'https://tenki.jp/sakura/9/49/50548.html', 'https://static.tenki.jp/static-images/sakura/point/50548/square.jpg', '桜の種類：ヨウコウ、キリンザクラ、シダレザクラ、ソメイヨシノ'],
			[31.741065605797225, 130.78199220334537, '城山公園', 'https://tenki.jp/sakura/9/49/50557.html', 'https://static.tenki.jp/static-images/sakura/point/50557/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[31.166172441773078, 130.8496743401552, '花瀬自然公園', 'https://tenki.jp/sakura/9/49/50568.html', 'https://static.tenki.jp/static-images/sakura/point/50568/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、シダレザクラ'],
			[31.86349526359461, 130.85124667981827, '霧島神話の里公園', 'https://tenki.jp/sakura/9/49/50597.html', 'https://static.tenki.jp/static-images/sakura/point/50597/square.jpg', '桜の種類：ソメイヨシノ'],
			[31.26196257504285, 130.6553491753132, '魚見岳', 'https://tenki.jp/sakura/9/49/50988.html', 'https://static.tenki.jp/static-images/sakura/point/50988/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.131523027320306, 140.2129398009344, '白河小峰城', 'https://tenki.jp/sakura/2/10/52542.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[37.133823318286375, 140.12171307525307, '親水公園', 'https://tenki.jp/sakura/2/10/52543.html', 'https://static.tenki.jp/static-images/sakura/point/52543/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.47192484020432, 140.33254660672566, '四季の里 緑水苑', 'https://tenki.jp/sakura/2/10/52545.html', 'https://static.tenki.jp/static-images/sakura/point/52545/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、カワヅザクラ、その他'],
			[37.419775613536736, 140.5840079750913, '小沢の桜', 'https://tenki.jp/sakura/2/10/52548.html', 'https://static.tenki.jp/static-images/sakura/point/52548/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.427799875256284, 140.58676323057114, '小沢・宮のしだれ桜', 'https://tenki.jp/sakura/2/10/52549.html', 'https://static.tenki.jp/static-images/sakura/point/52549/square.jpg', '桜の種類：シダレザクラ'],
			[36.31503261973936, 139.79417706258414, '思川桜堤 思川桜並木', 'https://tenki.jp/sakura/3/12/51053.html', 'https://static.tenki.jp/static-images/sakura/point/51053/square.jpg', '桜の種類：オモイガワ'],
			[36.057335611041886, 139.11327536841318, '美の山公園のヤマザクラ', 'https://tenki.jp/sakura/3/14/51044.html', 'https://static.tenki.jp/static-images/sakura/point/51044/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、サトザクラ、ギョイコウ、ウコン'],
			[35.61094108069469, 139.56067117860914, '生田緑地', 'https://tenki.jp/sakura/3/17/51047.html', 'https://static.tenki.jp/static-images/sakura/point/51047/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ'],
			[37.837436002179075, 139.2272129890842, '天朝山公園', 'https://tenki.jp/sakura/4/18/50120.html', 'https://static.tenki.jp/static-images/sakura/point/50120/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.77036871842112, 139.2215722064678, '新江の桜並木', 'https://tenki.jp/sakura/4/18/51051.html', 'https://static.tenki.jp/static-images/sakura/point/51051/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.82099264184056, 139.31183238587994, '五頭山麓いこいの森', 'https://tenki.jp/sakura/4/18/51052.html', 'https://static.tenki.jp/static-images/sakura/point/51052/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.93262397767022, 138.0772223763258, '家山の桜トンネル', 'https://tenki.jp/sakura/5/25/55307.html', 'https://static.tenki.jp/static-images/sakura/point/55307/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.644846629552, 135.82682252627376, '帯解寺', 'https://tenki.jp/sakura/6/32/50410.html', 'https://static.tenki.jp/static-images/sakura/point/50410/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、ヤエベニシダレ、シダレザクラ'],
			[33.72967468567252, 135.99222801995504, '丹鶴城公園(新宮城跡)', 'https://tenki.jp/sakura/6/33/56408.html', 'https://static.tenki.jp/static-images/sakura/point/56408/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ボタンザクラ、ヤマザクラ、カンヒザクラ'],
			[34.32796176988151, 133.104016903763, 'さぎしま 塔の峰千本桜', 'https://tenki.jp/sakura/7/37/56726.html', 'https://static.tenki.jp/static-images/sakura/point/56726/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、オオシマザクラ'],
			[33.49787982410539, 133.28923644618192, '牧野公園', 'https://tenki.jp/sakura/8/42/50423.html', 'https://static.tenki.jp/static-images/sakura/point/50423/square.jpg', '桜の種類：ソメイヨシノ、センダイヤザクラ、ウスズミザクラ、シュクガワマイザクラ'],
			[33.435711803400345, 130.6313402431553, '草場川の桜並木', 'https://tenki.jp/sakura/9/43/51043.html', 'https://static.tenki.jp/static-images/sakura/point/51043/square.jpg', '桜の種類：ソメイヨシノ'],
			[33.51185730427911, 130.52326014397087, '御笠川の桜並木', 'https://tenki.jp/sakura/9/43/51048.html', 'https://static.tenki.jp/static-images/sakura/point/51048/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.50721637995782, 141.05442454042793, '松山御本丸公園', 'https://tenki.jp/sakura/2/7/51063.html', 'https://static.tenki.jp/static-images/sakura/point/51063/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.789569404131484, 139.97478296657897, '楯山公園', 'https://tenki.jp/sakura/2/9/51054.html', 'https://static.tenki.jp/static-images/sakura/point/51054/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.04197536600966, 140.3843748520455, '花園しだれ桜', 'https://tenki.jp/sakura/2/10/51055.html', 'https://static.tenki.jp/static-images/sakura/point/51055/square.jpg', '桜の種類：シダレザクラ'],
			[37.02982796126647, 140.38564022958212, '棚倉城跡(亀ケ城公園)', 'https://tenki.jp/sakura/2/10/51056.html', 'https://static.tenki.jp/static-images/sakura/point/51056/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[34.85571495848615, 138.92183576677084, '昭和の森会館', 'https://tenki.jp/sakura/5/25/51058.html', 'https://static.tenki.jp/static-images/sakura/point/51058/square.jpg', '桜の種類：エドヒガン'],
			[34.87856057053413, 138.7631453448327, '最福寺', 'https://tenki.jp/sakura/5/25/51059.html', 'https://static.tenki.jp/static-images/sakura/point/51059/square.jpg', '桜の種類：伊豆最福寺シダレ'],
			[35.14532915784191, 138.90719095892268, '桜堤遊歩道', 'https://tenki.jp/sakura/5/25/51062.html', 'https://static.tenki.jp/static-images/sakura/point/51062/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.289527693919716, 138.95104133148945, '秩父宮記念公園', 'https://tenki.jp/sakura/5/25/51065.html', 'https://static.tenki.jp/static-images/sakura/point/51065/square.jpg', '桜の種類：シダレザクラ、ヤエベニシダレ、オオシマザクラ、フジザクラ、その他'],
			[34.89035088422288, 135.70055707227155, '淀川河川公園背割堤地区', 'https://tenki.jp/sakura/6/29/50429.html', 'https://static.tenki.jp/static-images/sakura/point/50429/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.53975013428455, 134.82072028869797, '神武山公園', 'https://tenki.jp/sakura/6/31/50713.html', 'https://static.tenki.jp/static-images/sakura/point/50713/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.16911085752988, 135.10161220204884, '黒井川の桜堤', 'https://tenki.jp/sakura/6/31/51067.html', 'https://static.tenki.jp/static-images/sakura/point/51067/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.0151997963831, 131.8678462795664, '切戸川', 'https://tenki.jp/sakura/7/38/58016.html', 'https://static.tenki.jp/static-images/sakura/point/58016/square.jpg', '桜の種類：ソメイヨシノ'],
			[31.19631422115782, 130.53426402210286, 'かいもん山麓ふれあい公園', 'https://tenki.jp/sakura/9/49/51061.html', 'https://static.tenki.jp/static-images/sakura/point/51061/square.jpg', '桜の種類：カワヅザクラ、ヒカンザクラ、ヤマザクラ、ソメイヨシノ、ヤエザクラ'],
			[37.05495409945177, 140.88279204927855, '松ヶ岡公園', 'https://tenki.jp/sakura/2/10/54202.html', 'https://static.tenki.jp/static-images/sakura/point/54202/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、マメザクラ、オオシマザクラ'],
			[36.73921745025173, 139.4968448448966, '奥日光・中禅寺湖付近', 'https://tenki.jp/sakura/3/12/54414.html', 'https://static.tenki.jp/static-images/sakura/point/54414/square.jpg', '桜の種類：オオヤマザクラ'],
			[36.65947897015112, 140.11087514824487, '大金桜づつみウォーキングトレイル', 'https://tenki.jp/sakura/3/12/54415.html', 'https://static.tenki.jp/static-images/sakura/point/54415/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.66745295123103, 139.7303868985696, '東京ミッドタウン ミッドタウン・ガーデン', 'https://tenki.jp/sakura/3/16/51007.html', 'https://static.tenki.jp/static-images/sakura/point/51007/square.jpg', '桜の種類：ソメイヨシノ、オオヤマザクラ、ヤエベニシダレ、ヤマザクラ'],
			[36.939056011356904, 137.54036203608385, 'あさひ舟川 春の四重奏', 'https://tenki.jp/sakura/4/19/51071.html', 'https://static.tenki.jp/static-images/sakura/point/51071/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.64973366178428, 135.11180027492549, '須磨寺', 'https://tenki.jp/sakura/6/31/56186.html', 'https://static.tenki.jp/static-images/sakura/point/56186/square.jpg', '桜の種類：ヤエザクラ、ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[33.65887978247423, 130.56814293620548, '呑山観音寺', 'https://tenki.jp/sakura/9/43/51068.html', 'https://static.tenki.jp/static-images/sakura/point/51068/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ、ヤエザクラ、ジンダイアケボノ'],
			[37.13272290165145, 140.21358969966104, '城山公園・おとめ桜', 'https://tenki.jp/sakura/2/10/50153.html', 'https://static.tenki.jp/static-images/sakura/point/50153/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.37417594918319, 140.45249759974135, '偕楽園', 'https://tenki.jp/sakura/3/11/54215.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ウスズミザクラ、ウワミズザクラ'],
			[36.107842242245155, 139.19598711585803, '氏邦桜(エドヒガンザクラ)', 'https://tenki.jp/sakura/3/14/51073.html', 'https://static.tenki.jp/static-images/sakura/point/51073/square.jpg', '桜の種類：エドヒガン'],
			[35.78476421891828, 139.25655060145849, '釜の淵公園', 'https://tenki.jp/sakura/3/16/54633.html', 'https://static.tenki.jp/static-images/sakura/point/54633/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ'],
			[35.723675512435435, 139.3300080520159, '福生市多摩川堤防', 'https://tenki.jp/sakura/3/16/54634.html', 'https://static.tenki.jp/static-images/sakura/point/54634/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.26001389950105, 137.533645458202, '大安寺のしだれ桜', 'https://tenki.jp/sakura/5/26/50765.html', 'https://static.tenki.jp/static-images/sakura/point/50765/square.jpg', '桜の種類：シダレザクラ'],
			[34.68566239662274, 135.84150456350292, '奈良公園(ヤエザクラ)', 'https://tenki.jp/sakura/6/32/56437.html', 'https://static.tenki.jp/static-images/sakura/point/56437/square.jpg', '桜の種類：ナラノヤエザクラ'],
			[40.75134254313509, 140.37377213113325, '富士見湖パーク', 'https://tenki.jp/sakura/2/5/52127.html', 'https://static.tenki.jp/static-images/sakura/point/52127/square.jpg', '桜の種類：ソメイヨシノ'],
			[40.26757524796593, 141.3033689861156, '九戸城跡', 'https://tenki.jp/sakura/2/6/52126.html', 'https://static.tenki.jp/static-images/sakura/point/52126/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[40.12673142110406, 140.67798683799006, '大館市ベニヤマ自然パーク', 'https://tenki.jp/sakura/2/8/50141.html', 'https://static.tenki.jp/static-images/sakura/point/50141/square.jpg', '桜の種類：ベニヤマザクラ、ソメイヨシノ'],
			[40.211687285604285, 140.02685394054996, '能代市役所さくら庭', 'https://tenki.jp/sakura/2/8/51081.html', 'https://static.tenki.jp/static-images/sakura/point/51081/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ'],
			[38.92202093802686, 139.85257690812136, '新橋緑地', 'https://tenki.jp/sakura/2/9/52128.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[39.05806147488796, 139.91147954349563, '中山河川公園', 'https://tenki.jp/sakura/2/9/52129.html', 'https://static.tenki.jp/static-images/sakura/point/52129/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.95539245793971, 139.6679977184714, '飯豊梅花皮荘桜公園', 'https://tenki.jp/sakura/2/9/52130.html', 'https://static.tenki.jp/static-images/sakura/point/52130/square.jpg', '桜の種類：現地問合せ'],
			[36.56896195154597, 136.6365580990235, '犀川緑地', 'https://tenki.jp/sakura/4/20/54635.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[32.80674673992335, 130.70183181454092, '熊本城', 'https://tenki.jp/sakura/9/46/50525.html', 'https://static.tenki.jp/static-images/sakura/point/50525/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、チハラザクラ'],
			[31.523898664902188, 130.8405659107126, '大隅湖 アジア・太平洋農村研修村 民族館', 'https://tenki.jp/sakura/9/49/50545.html', 'https://static.tenki.jp/static-images/sakura/point/50545/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[39.90468697213617, 140.09527961474907, '日本国花苑', 'https://tenki.jp/sakura/2/8/50216.html', 'https://static.tenki.jp/static-images/sakura/point/50216/square.jpg', '桜の種類：フゲンゾウ、ベニユタカ、イチヨウ、ヤエベニシダレ、カンザン'],
			[40.00161575978758, 140.40029861723593, '阿仁河川の桜', 'https://tenki.jp/sakura/2/8/51085.html', 'https://static.tenki.jp/static-images/sakura/point/51085/square.jpg', '桜の種類：ソメイヨシノ、その他'],
			[37.77704535079572, 140.90979063049073, '涼ヶ岡八幡神社', 'https://tenki.jp/sakura/2/10/52553.html', 'https://static.tenki.jp/static-images/sakura/point/52553/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、エドヒガン、シダレヤマザクラ、ショウゲツ'],
			[36.48702417312536, 140.51992205152803, '阿弥陀寺', 'https://tenki.jp/sakura/3/11/54636.html', 'https://static.tenki.jp/static-images/sakura/point/54636/square.jpg', '桜の種類：シダレザクラ'],
			[36.23796874443095, 139.40162965783907, '休泊川', 'https://tenki.jp/sakura/3/13/51083.html', 'https://static.tenki.jp/static-images/sakura/point/51083/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.089279332885546, 136.30101001362715, '松岡公園', 'https://tenki.jp/sakura/4/21/55811.html', 'https://static.tenki.jp/static-images/sakura/point/55811/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ、シダレザクラ'],
			[35.42200017049994, 137.12966850085255, '南山公園', 'https://tenki.jp/sakura/5/24/50621.html', 'https://static.tenki.jp/static-images/sakura/point/50621/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ'],
			[34.841887004073826, 138.06845009863497, '粟ヶ岳', 'https://tenki.jp/sakura/5/25/50360.html', 'https://static.tenki.jp/static-images/sakura/point/50360/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ'],
			[35.13995636804841, 136.9624541921822, '八事山 興正寺', 'https://tenki.jp/sakura/5/26/51084.html', 'https://static.tenki.jp/static-images/sakura/point/51084/square.jpg', '桜の種類：ヤマザクラ、シキザクラ、ギョイコウ、その他'],
			[35.163388381635016, 135.04368347930955, '氷上さくら公園', 'https://tenki.jp/sakura/6/31/50711.html', 'https://static.tenki.jp/static-images/sakura/point/50711/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[43.76763608241972, 142.4749824128469, '旭山公園', 'https://tenki.jp/sakura/1/1/50001.html', 'https://static.tenki.jp/static-images/sakura/point/50001/square.jpg', '桜の種類：エゾヤマザクラ'],
			[44.19810496660389, 143.0767287938315,  '芝ざくら滝上公園', 'https://tenki.jp/sakura/1/3/50014.html', 'https://static.tenki.jp/static-images/sakura/point/50014/square.jpg', '桜の種類：エゾヤマザクラ、シバザクラ'],
			[42.905486014261456, 143.18772308005413, '帯広市緑ヶ丘公園', 'https://tenki.jp/sakura/1/3/50016.html', 'https://static.tenki.jp/static-images/sakura/point/50016/square.jpg', '桜の種類：エゾヤマザクラ'],
			[43.06537574367865, 141.78019229860385, '栗山公園', 'https://tenki.jp/sakura/1/2/50030.html', 'https://static.tenki.jp/static-images/sakura/point/50030/square.jpg', '桜の種類：エゾヤマザクラ'],
			[42.40390384358081, 142.45235409804738, '二十間道路桜並木', 'https://tenki.jp/sakura/1/4/50045.html', 'https://static.tenki.jp/static-images/sakura/point/50045/square.jpg', '桜の種類：エゾヤマザクラ、カスミザクラ、ミヤマザクラ、ソメイヨシノ'],
			[43.124005697609036, 141.4333223942901, 'モエレ沼公園', 'https://tenki.jp/sakura/1/2/50048.html', 'https://static.tenki.jp/static-images/sakura/point/50048/square.jpg', '桜の種類：エゾヤマザクラ、カスミザクラ、カンザン、ソメイヨシノ、ミネザクラ'],
			[42.182441776668135, 142.85087852938142, '優駿さくらロード(西舎桜並木)', 'https://tenki.jp/sakura/1/4/50049.html', 'https://static.tenki.jp/static-images/sakura/point/50049/square.jpg', '桜の種類：エゾヤマザクラ'],
			[43.730745389842696, 141.85556521083583, '北竜町金比羅公園', 'https://tenki.jp/sakura/1/2/50066.html', 'https://static.tenki.jp/static-images/sakura/point/50066/square.jpg', '桜の種類：エゾヤマザクラ'],
			[41.75528366667383, 140.7163332952114, '函館公園', 'https://tenki.jp/sakura/1/4/50071.html', 'https://static.tenki.jp/static-images/sakura/point/50071/square.jpg', '桜の種類：ソメイヨシノ'],
			[40.61241829000892, 141.20628649162583, '十和田市官庁街通り(駒街道)', 'https://tenki.jp/sakura/2/5/50199.html', 'https://static.tenki.jp/static-images/sakura/point/50199/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ、カンザン、ヤマザクラ、シダレザクラ'],
			[40.8509751934242, 140.67712993513314, '野木和公園', 'https://tenki.jp/sakura/2/5/50215.html', 'https://static.tenki.jp/static-images/sakura/point/50215/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、オオヤマザクラ、シダレザクラ'],
			[40.63502766116176, 140.6104713600847, '東公園さくら山', 'https://tenki.jp/sakura/2/5/50617.html', 'https://static.tenki.jp/static-images/sakura/point/50617/square.jpg', '桜の種類：ソメイヨシノ'],
			[41.31412284904026, 141.2231579307016, '早掛沼公園', 'https://tenki.jp/sakura/2/5/50717.html', 'https://static.tenki.jp/static-images/sakura/point/50717/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ギョイコウ'],
			[40.61533962420507, 140.31812548973625, '岩木山の桜並木(オオヤマザクラ)', 'https://tenki.jp/sakura/2/5/51098.html', 'https://static.tenki.jp/static-images/sakura/point/51098/square.jpg', '桜の種類：オオヤマザクラ'],
			[40.730735572202214, 141.28113201148827, '小川原湖公園', 'https://tenki.jp/sakura/2/5/51099.html', 'https://static.tenki.jp/static-images/sakura/point/51099/square.jpg', '桜の種類：ソメイヨシノ、その他'],
			[40.38174624514473, 141.26554722085098, '国史跡三戸城跡 城山公園', 'https://tenki.jp/sakura/2/5/52118.html', 'https://static.tenki.jp/static-images/sakura/point/52118/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤエベニシダレ、ギョイコウ'],
			[40.86264172763961, 141.13355246043457, '愛宕公園', 'https://tenki.jp/sakura/2/5/52120.html', 'https://static.tenki.jp/static-images/sakura/point/52120/square.jpg', '桜の種類：ソメイヨシノ'],
			[40.82854027067287, 140.7804727316163, '合浦公園', 'https://tenki.jp/sakura/2/5/52122.html', 'https://static.tenki.jp/static-images/sakura/point/52122/square.jpg', '桜の種類：ソメイヨシノ、ヤエベニシダレ、カンザン、オオヤマザクラ、カンヒザクラ 他'],
			[40.609441070068534, 140.4676940850737, '弘前公園のソメイヨシノ', 'https://tenki.jp/sakura/2/5/52321.html', 'https://static.tenki.jp/static-images/sakura/point/52321/square.jpg', '桜の種類：ソメイヨシノ、ヤエベニシダレ、カンザン'],
			[40.913267408327805, 140.4516466001404, '芦野公園', 'https://tenki.jp/sakura/2/5/52322.html', 'https://static.tenki.jp/static-images/sakura/point/52322/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、サトザクラ'],
			[40.60945406911771, 140.46771308310434, '弘前公園のヤエベニシダレ', 'https://tenki.jp/sakura/2/5/52325.html', 'https://static.tenki.jp/static-images/sakura/point/52325/square.jpg', '桜の種類：ヤエベニシダレ、ソメイヨシノ、カンザン'],
			[40.18891613491658, 141.76742470710695, '巽山公園', 'https://tenki.jp/sakura/2/6/50718.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[39.7283806282248, 140.97585686644177, '弘法桜', 'https://tenki.jp/sakura/2/6/50789.html', 'https://static.tenki.jp/static-images/sakura/point/50789/square.jpg', '桜の種類：エドヒガン'],
			[39.001456121510145, 141.1025698847552, '中尊寺', 'https://tenki.jp/sakura/2/6/51001.html', 'https://static.tenki.jp/static-images/sakura/point/51001/square.jpg', '桜の種類：ヤマザクラ、シダレザクラ、ソメイヨシノ'],
			[39.68480340330853, 140.97384641699514, '雫石川園地', 'https://tenki.jp/sakura/2/6/51020.html', 'https://static.tenki.jp/static-images/sakura/point/51020/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.988989996629584, 141.11532048492487, '平泉町内 県道300号線の桜並木', 'https://tenki.jp/sakura/2/6/52105.html', 'https://static.tenki.jp/static-images/sakura/point/52105/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.27504398029324, 141.12666039033965, '北上展勝地', 'https://tenki.jp/sakura/2/6/52108.html', 'https://static.tenki.jp/static-images/sakura/point/52108/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、エドヒガン、シダレザクラ'],
			[39.4519702628121, 141.06900771059634, '花巻温泉', 'https://tenki.jp/sakura/2/6/52109.html', 'https://static.tenki.jp/static-images/sakura/point/52109/square.jpg', '桜の種類：ソメイヨシノ、ベニシダレザクラ、ヤエザクラ、ベニヤマザクラ'],
			[39.75073137361727, 141.01730282836203, '小岩井農場', 'https://tenki.jp/sakura/2/6/52116.html', 'https://static.tenki.jp/static-images/sakura/point/52116/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン'],
			[39.274539925585074, 141.87892934926268, '薬師公園', 'https://tenki.jp/sakura/2/6/52131.html', 'https://static.tenki.jp/static-images/sakura/point/52131/square.jpg', '桜の種類：現地問合せ'],
			[38.181009725134835, 140.6675168788827, '国営みちのく杜の湖畔公園(ソメイヨシノ)', 'https://tenki.jp/sakura/2/7/52525.html', 'https://static.tenki.jp/static-images/sakura/point/52525/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、オオヤマザクラ、ヒガンザクラ、シダレザクラ'],
			[38.18099072659186, 140.66751787962306, '国営みちのく杜の湖畔公園(ヤマザクラ)', 'https://tenki.jp/sakura/2/7/52526.html', 'https://static.tenki.jp/static-images/sakura/point/52526/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、オオヤマザクラ、ヒガンザクラ、シダレザクラ'],
			[40.272529354801776, 140.56477129657975, '桂城公園', 'https://tenki.jp/sakura/2/8/50721.html', 'https://static.tenki.jp/static-images/sakura/point/50721/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.99136893683389, 139.99903258409023, '桜・菜の花ロード', 'https://tenki.jp/sakura/2/8/51102.html', 'https://static.tenki.jp/static-images/sakura/point/51102/square.jpg', '桜の種類：ソメイヨシノ、ベニヤマザクラ、ヤエザクラ、シダレザクラ'],
			[39.59561969886506, 140.56021741723407, '桧木内川堤のソメイヨシノ', 'https://tenki.jp/sakura/2/8/52319.html', 'https://static.tenki.jp/static-images/sakura/point/52319/square.jpg', '桜の種類：ソメイヨシノ'],
			[39.599314216948656, 140.56141211217974, '武家屋敷のシダレザクラ', 'https://tenki.jp/sakura/2/8/52323.html', 'https://static.tenki.jp/static-images/sakura/point/52323/square.jpg', '桜の種類：シダレザクラ'],
			[38.16787890016147, 140.0365698427283, '釜の越農村公園の桜群・薬師ザクラ', 'https://tenki.jp/sakura/2/9/50194.html', 'https://static.tenki.jp/static-images/sakura/point/50194/square.jpg', '桜の種類：薬師ザクラ(エドヒガン)、勝弥桜(エドヒガン)、釜の越サクラ分身木(エドヒガン)'],
			[38.71094979143426, 139.94038840700205, '玉川寺', 'https://tenki.jp/sakura/2/9/50203.html', 'https://static.tenki.jp/static-images/sakura/point/50203/square.jpg', '桜の種類：シダレザクラ、ヤエザクラ、カスミザクラ、ヤマザクラ'],
			[38.48155417428202, 140.4039257879015, '東沢公園', 'https://tenki.jp/sakura/2/9/52536.html', 'https://static.tenki.jp/static-images/sakura/point/52536/square.jpg', '桜の種類：ソメイヨシノ'],
			[38.190863449915035, 140.04560578768246, '十二の桜', 'https://tenki.jp/sakura/2/9/52541.html', 'https://static.tenki.jp/static-images/sakura/point/52541/square.jpg', '桜の種類：エドヒガン'],
			[37.101151018953786, 140.61386281372089, '越代のサクラ', 'https://tenki.jp/sakura/2/10/50259.html', 'https://static.tenki.jp/static-images/sakura/point/50259/square.jpg', '桜の種類：ヤマザクラ'],
			[37.738108949462, 140.49592834969144, '花見山公園', 'https://tenki.jp/sakura/2/10/50726.html', 'https://static.tenki.jp/static-images/sakura/point/50726/square.jpg', '桜の種類：トウカイザクラ、ヒガンザクラ、ロトウザクラ、ソメイヨシノ、カンヒザクラ'],
			[37.4566038245403, 139.84045297768964, '薄墨桜', 'https://tenki.jp/sakura/2/10/51100.html', 'https://static.tenki.jp/static-images/sakura/point/51100/square.jpg', '桜の種類：オオシマザクラ系(サトザクラ)'],
			[37.48821104139411, 139.81434715620304, '虎の尾桜', 'https://tenki.jp/sakura/2/10/51101.html', 'https://static.tenki.jp/static-images/sakura/point/51101/square.jpg', '桜の種類：オオシマザクラ'],
			[37.65498991083705, 139.86599505746662, '日中線しだれ桜並木', 'https://tenki.jp/sakura/2/10/52510.html', 'https://static.tenki.jp/static-images/sakura/point/52510/square.jpg', '桜の種類：シダレザクラ'],
			[37.510199759545195, 139.95418467090568, '石部桜', 'https://tenki.jp/sakura/2/10/52551.html', 'https://static.tenki.jp/static-images/sakura/point/52551/square.jpg', '桜の種類：エドヒガン'],
			[36.207035402797395, 140.23976370716466, '常陸風土記の丘', 'https://tenki.jp/sakura/3/11/51009.html', 'https://static.tenki.jp/static-images/sakura/point/51009/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ボタンザクラ'],
			[36.501067385275576, 140.42012616055803, '静峰ふるさと公園', 'https://tenki.jp/sakura/3/11/54209.html', 'https://static.tenki.jp/static-images/sakura/point/54209/square.jpg', '桜の種類：ヤエザクラ、ソメイヨシノ'],
			[36.673031539227196, 139.95411298075078, 'ゆうゆうパーク', 'https://tenki.jp/sakura/3/12/54416.html', 'https://static.tenki.jp/static-images/sakura/point/54416/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.25628908293139, 138.8870223880724, '富岡製糸場', 'https://tenki.jp/sakura/3/13/51074.html', 'https://static.tenki.jp/static-images/sakura/point/51074/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[36.41987560935092, 139.3395419515729, '未来へはばたけ 山田製作所桐生が岡動物園', 'https://tenki.jp/sakura/3/13/54107.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[36.49877781582854, 138.94536376379534, '伊香保グリーン牧場のソメイヨシノ', 'https://tenki.jp/sakura/3/13/54112.html', 'https://static.tenki.jp/static-images/sakura/point/54112/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[36.49877781533511, 138.94534176581135, '伊香保グリーン牧場のヤエザクラ', 'https://tenki.jp/sakura/3/13/54115.html', 'https://static.tenki.jp/static-images/sakura/point/54115/square.jpg', '桜の種類：ヤエザクラ、ソメイヨシノ'],
			[36.069810563500745, 139.36683864427422, '国営武蔵丘陵森林公園', 'https://tenki.jp/sakura/3/14/50819.html', 'https://static.tenki.jp/static-images/sakura/point/50819/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、サトザクラ'],
			[35.986520913800355, 139.61841857577045, '伊奈町無線山桜並木', 'https://tenki.jp/sakura/3/14/50853.html', 'https://static.tenki.jp/static-images/sakura/point/50853/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.010387601629084, 139.23243730960004, '慈光山歴史公苑', 'https://tenki.jp/sakura/3/14/50856.html', 'https://static.tenki.jp/static-images/sakura/point/50856/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ミクルマガエシ、イチヨウ、ベニシグレ'],
			[36.0202672375808, 139.71874917467386, '東武動物公園', 'https://tenki.jp/sakura/3/14/51072.html', 'https://static.tenki.jp/static-images/sakura/point/51072/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、カワヅザクラ'],
			[36.02262620077601, 139.50749009933057, 'サンアメニティ北本キャンプフィールド', 'https://tenki.jp/sakura/3/14/51089.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.02582891890825, 139.50659404510836, '阿弥陀堂', 'https://tenki.jp/sakura/3/14/51091.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：エドヒガン'],
			[36.00687589972224, 139.5054250653119, '放光寺', 'https://tenki.jp/sakura/3/14/51092.html', 'https://static.tenki.jp/static-images/sakura/point/51092/square.jpg', '桜の種類：シダレザクラ'],
			[36.13792063968883, 139.45333609803566, '忍城', 'https://tenki.jp/sakura/3/14/51095.html', 'https://static.tenki.jp/static-images/sakura/point/51095/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ'],
			[36.12929075532645, 139.47848807661666, '丸墓山古墳', 'https://tenki.jp/sakura/3/14/51096.html', 'https://static.tenki.jp/static-images/sakura/point/51096/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.13081264165495, 139.5005444340001, '古代蓮の里', 'https://tenki.jp/sakura/3/14/51097.html', 'https://static.tenki.jp/static-images/sakura/point/51097/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン'],
			[35.9186401990553, 139.63045644827423, '大宮公園', 'https://tenki.jp/sakura/3/14/54402.html', 'https://static.tenki.jp/static-images/sakura/point/54402/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、カンヒザクラ'],
			[35.64542917193976, 140.12729194262073, '千葉市動物公園', 'https://tenki.jp/sakura/3/15/52552.html', 'https://static.tenki.jp/static-images/sakura/point/52552/square.jpg', '桜の種類：カワヅザクラ、ソメイヨシノ、ジンダイアケボノ、ギョイコウ、サトザクラ、カンザン、フゲンゾウ'],
			[35.694040344532986, 139.7428707552528, '靖国神社', 'https://tenki.jp/sakura/3/16/50769.html', 'https://static.tenki.jp/static-images/sakura/point/50769/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.689900135951525, 139.518851187852, '都立武蔵野公園', 'https://tenki.jp/sakura/3/16/50813.html', 'https://static.tenki.jp/static-images/sakura/point/50813/square.jpg', '桜の種類：ヤマザクラ、オオシマザクラ、ソメイヨシノ、サトザクラ'],
			[35.75262955052219, 139.7359751183189, '音無親水公園', 'https://tenki.jp/sakura/3/16/50859.html', 'https://static.tenki.jp/static-images/sakura/point/50859/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.71406417824467, 139.77416884963498, '上野恩賜公園', 'https://tenki.jp/sakura/3/16/54401.html', 'https://static.tenki.jp/static-images/sakura/point/54401/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カンザン、オオシマザクラ、カンヒザクラ'],
			[35.75036786686305, 139.7389989503131, '飛鳥山公園', 'https://tenki.jp/sakura/3/16/54411.html', 'https://static.tenki.jp/static-images/sakura/point/54411/square.jpg', '桜の種類：ソメイヨシノ、カンザン、シダレザクラ、ウコン、ギョイコウ'],
			[35.700832106892555, 139.57440684180483, '井の頭恩賜公園', 'https://tenki.jp/sakura/3/16/54602.html', 'https://static.tenki.jp/static-images/sakura/point/54602/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、ヤエベニシダレ、カワヅザクラ'],
			[35.79496704711585, 139.69355012822695, '浮間公園', 'https://tenki.jp/sakura/3/16/54620.html', 'https://static.tenki.jp/static-images/sakura/point/54620/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、オオシマザクラ'],
			[35.446645570057015, 139.62273462651186, '野毛山動物園・野毛山公園', 'https://tenki.jp/sakura/3/17/50724.html', 'https://static.tenki.jp/static-images/sakura/point/50724/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、オオシマザクラ'],
			[35.25366602157984, 139.04973743174594, '宮城野早川堤', 'https://tenki.jp/sakura/3/17/50831.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.24907052413834, 139.6600921738306, '衣笠山公園', 'https://tenki.jp/sakura/3/17/54506.html', 'https://static.tenki.jp/static-images/sakura/point/54506/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ、サトザクラ、ヒガンザクラ'],
			[36.70900706814443, 137.18820994800558, '富山市民俗民芸村', 'https://tenki.jp/sakura/4/19/50830.html', 'https://static.tenki.jp/static-images/sakura/point/50830/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.95057687865766, 136.18228636993007, '西山公園', 'https://tenki.jp/sakura/4/21/55806.html', 'https://static.tenki.jp/static-images/sakura/point/55806/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、シダレザクラ'],
			[35.49223496321918, 137.70277284449045, '黒船桜', 'https://tenki.jp/sakura/3/23/50110.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：シダレザクラ'],
			[35.73569929108133, 137.89756048732994, '光前寺のしだれ桜', 'https://tenki.jp/sakura/3/23/50252.html', 'https://static.tenki.jp/static-images/sakura/point/50252/square.jpg', '桜の種類：シダレザクラ(古木)'],
			[36.33688002470675, 138.6330806894117, '軽井沢プリンスホテル', 'https://tenki.jp/sakura/3/23/50618.html', 'https://static.tenki.jp/static-images/sakura/point/50618/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[36.656585595068336, 138.35626912286085, '水中のシダレ桜', 'https://tenki.jp/sakura/3/23/50763.html', 'https://static.tenki.jp/static-images/sakura/point/50763/square.jpg', '桜の種類：シダレザクラ'],
			[35.3711742650897, 137.69958292276306, '御所桜', 'https://tenki.jp/sakura/3/23/50882.html', 'https://static.tenki.jp/static-images/sakura/point/50882/square.jpg', '桜の種類：エドヒガン'],
			[36.32684106689884, 138.4172359685027, '小諸城址懐古園', 'https://tenki.jp/sakura/3/23/55101.html', 'https://static.tenki.jp/static-images/sakura/point/55101/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、コモロヤエベニシダレ、ヒガンザクラ、シダレザクラ'],
			[36.479003165371175, 138.13702439000173, '戸倉上山田温泉 城山の桜', 'https://tenki.jp/sakura/3/23/55103.html', 'https://static.tenki.jp/static-images/sakura/point/55103/square.jpg', '桜の種類：ベニヤマザクラ、ソメイヨシノ'],
			[35.965452411538614, 137.9925384521793, '荒神山公園', 'https://tenki.jp/sakura/3/23/55161.html', 'https://static.tenki.jp/static-images/sakura/point/55161/square.jpg', '桜の種類：コヒガンザクラ、ソメイヨシノ、ヤエザクラ、シダレザクラ、ヤマザクラ'],
			[36.09037599722804, 136.93913447813748, '荘川桜', 'https://tenki.jp/sakura/5/24/50255.html', 'https://static.tenki.jp/static-images/sakura/point/50255/square.jpg', '桜の種類：アズマヒガンザクラ'],
			[36.14000963440603, 137.26323953713623, '城山公園', 'https://tenki.jp/sakura/5/24/50352.html', 'https://static.tenki.jp/static-images/sakura/point/50352/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.14614674536694, 137.25865987297917, '江名子川沿い', 'https://tenki.jp/sakura/5/24/50355.html', 'https://static.tenki.jp/static-images/sakura/point/50355/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.15387366225166, 137.25537709204758, '宮川緑地公園', 'https://tenki.jp/sakura/5/24/50356.html', 'https://static.tenki.jp/static-images/sakura/point/50356/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.14008353505364, 137.25937090982765, '中橋周辺', 'https://tenki.jp/sakura/5/24/50358.html', 'https://static.tenki.jp/static-images/sakura/point/50358/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.08881789460083, 137.24783418379792, '臥龍桜', 'https://tenki.jp/sakura/5/24/55630.html', 'https://static.tenki.jp/static-images/sakura/point/55630/square.jpg', '桜の種類：エドヒガン'],
			[34.905430475428744, 136.9830225512631, '明石公園(愛知県)', 'https://tenki.jp/sakura/5/26/50915.html', 'https://static.tenki.jp/static-images/sakura/point/50915/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.510010539811205, 135.3957315471569, '引揚記念公園', 'https://tenki.jp/sakura/6/29/50333.html', 'https://static.tenki.jp/static-images/sakura/point/50333/square.jpg', '桜の種類：ヤエザクラ'],
			[34.871174358000275, 135.7961833220334, '宇治市植物公園(ヤエザクラ)', 'https://tenki.jp/sakura/6/29/51018.html', 'https://static.tenki.jp/static-images/sakura/point/51018/square.jpg', '桜の種類：シダレザクラ(樹齢80年)、シダレザクラ、ヤエザクラ、カワヅザクラ、その他'],
			[35.01490341254401, 135.74970097595025, '元離宮二条城(清流園)', 'https://tenki.jp/sakura/6/29/51024.html', 'https://static.tenki.jp/static-images/sakura/point/51024/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、シダレザクラ、その他'],
			[34.889291516068724, 135.80769277552, '平等院', 'https://tenki.jp/sakura/6/29/51080.html', 'https://static.tenki.jp/static-images/sakura/point/51080/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ、ヤエザクラ、エドヒガン'],
			[35.0282350369486, 135.68040081901077, '旧嵯峨御所 大本山大覚寺(大沢池エリア)', 'https://tenki.jp/sakura/6/29/51093.html', 'https://static.tenki.jp/static-images/sakura/point/51093/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[34.96161594125546, 135.80726942179797, '勧修寺', 'https://tenki.jp/sakura/6/29/56109.html', 'https://static.tenki.jp/static-images/sakura/point/56109/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ボタンザクラ'],
			[35.012718582164375, 135.74844015277444, '元離宮二条城(桜の園)', 'https://tenki.jp/sakura/6/29/56177.html', 'https://static.tenki.jp/static-images/sakura/point/56177/square.jpg', '桜の種類：サトザクラ、ヤマザクラ、ソメイヨシノ、シダレザクラ、その他'],
			[35.02778906150555, 135.678673935253, '旧嵯峨御所 大本山大覚寺(お堂エリア)', 'https://tenki.jp/sakura/6/29/56513.html', 'https://static.tenki.jp/static-images/sakura/point/56513/square.jpg', '桜の種類：ベニシダレザクラ'],
			[34.80993363720131, 135.53483431508332, '万博記念公園', 'https://tenki.jp/sakura/6/30/56124.html', 'https://static.tenki.jp/static-images/sakura/point/56124/square.jpg', '桜の種類：ソメイヨシノ、カワヅザクラ、サトザクラ、オオシマザクラ、シダレザクラ'],
			[35.10013026748484, 135.1943578732839, 'ユニトピアささやま', 'https://tenki.jp/sakura/6/31/51094.html', 'https://static.tenki.jp/static-images/sakura/point/51094/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ'],
			[34.709564312024646, 135.21500240295052, '神戸市立王子動物園', 'https://tenki.jp/sakura/6/31/56131.html', 'https://static.tenki.jp/static-images/sakura/point/56131/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.79741484041747, 135.24712879631187, '善福寺', 'https://tenki.jp/sakura/6/31/56132.html', 'https://static.tenki.jp/static-images/sakura/point/56132/square.jpg', '桜の種類：シダレザクラ'],
			[35.236531475051166, 134.05021961455952, 'レイクパーク加茂', 'https://tenki.jp/sakura/7/36/50442.html', 'https://static.tenki.jp/static-images/sakura/point/50442/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、シダレザクラ、カワヅザクラ'],
			[33.94402502095994, 133.27936252169962, '滝の宮公園', 'https://tenki.jp/sakura/8/41/50967.html', 'https://static.tenki.jp/static-images/sakura/point/50967/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヨウコウ'],
			[33.597514430737036, 130.37533461309235, '西公園', 'https://tenki.jp/sakura/9/43/50502.html', 'https://static.tenki.jp/static-images/sakura/point/50502/square.jpg', '桜の種類：ソメイヨシノ'],
			[32.897422816789344, 129.95732942452747, '大村公園(大村神社)', 'https://tenki.jp/sakura/9/45/51023.html', 'https://static.tenki.jp/static-images/sakura/point/51023/square.jpg', '桜の種類：オオムラザクラ、クシマザクラ'],
			[33.16397239108355, 131.5545448954232, '不動尊一心寺', 'https://tenki.jp/sakura/9/47/50538.html', 'https://static.tenki.jp/static-images/sakura/point/50538/square.jpg', '桜の種類：ギョイコウ、ウコン、ケンロクエンキクザクラ、シロタエ、カンザン、その他'],
			[31.990430365731417, 131.40512459771554, '垂水公園', 'https://tenki.jp/sakura/9/48/50541.html', 'https://static.tenki.jp/static-images/sakura/point/50541/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ヤマザクラ、ヒガンザクラ'],
			[32.72571610553798, 131.345179525378, '天岩戸の湯', 'https://tenki.jp/sakura/9/48/50605.html', 'https://static.tenki.jp/static-images/sakura/point/50605/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[38.260137462512745, 140.86198031877822, '西公園', 'https://tenki.jp/sakura/2/7/50234.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、エドヒガン、ヤエベニシダレ'],
			[38.04948103764641, 140.73814243190995, '白石川堤一目千本桜', 'https://tenki.jp/sakura/2/7/52512.html', 'https://static.tenki.jp/static-images/sakura/point/52512/square.jpg', '桜の種類：ソメイヨシノ、シロヤマザクラ、ヤエザクラ、センダイヨシノ'],
			[38.26078684864203, 140.89473780345295, '榴岡公園', 'https://tenki.jp/sakura/2/7/52524.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ヤエベニシダレ、シダレザクラ、エドヒガン、ソメイヨシノ、カンザン'],
			[38.654903470150536, 141.28141772140225, '寺池城址公園', 'https://tenki.jp/sakura/2/7/52527.html', 'https://static.tenki.jp/static-images/sakura/point/52527/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[39.72068237151846, 140.12458850578457, '千秋公園', 'https://tenki.jp/sakura/2/8/52313.html', 'https://static.tenki.jp/static-images/sakura/point/52313/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ、シダレザクラ、オオシマザクラ、ヤエザクラ'],
			[37.57782036791417, 140.60544654789308, '愛蔵寺の護摩桜', 'https://tenki.jp/sakura/2/10/50249.html', 'https://static.tenki.jp/static-images/sakura/point/50249/square.jpg', '桜の種類：ベニヒガンザクラ'],
			[37.48599845537463, 139.95240172440728, '会津武家屋敷', 'https://tenki.jp/sakura/2/10/51106.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[37.303636753803175, 139.89541344538637, '湯野上温泉駅の桜', 'https://tenki.jp/sakura/2/10/51107.html', 'https://static.tenki.jp/static-images/sakura/point/51107/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ'],
			[37.568876319432256, 140.99022487094211, '相馬小高神社', 'https://tenki.jp/sakura/2/10/52555.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、カワヅザクラ'],
			[37.8746332966814, 140.88861105011634, '右近清水', 'https://tenki.jp/sakura/2/10/52556.html', 'https://static.tenki.jp/static-images/sakura/point/52556/square.jpg', '桜の種類：ソメイヨシノ、カワヅザクラ、ヨウコウ、ウコン'],
			[37.08961140673513, 140.9026771456651, 'いわき市フラワーセンター', 'https://tenki.jp/sakura/2/10/52557.html', 'https://static.tenki.jp/static-images/sakura/point/52557/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.00618725441394, 140.84784035159552, '御幸山公園', 'https://tenki.jp/sakura/2/10/52559.html', 'https://static.tenki.jp/static-images/sakura/point/52559/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.36515570833346, 140.1364637428111, '磯部桜川公園', 'https://tenki.jp/sakura/3/11/50229.html', 'https://static.tenki.jp/static-images/sakura/point/50229/square.jpg', '桜の種類：ヤマザクラ、カスミザクラ、シダレザクラ'],
			[36.470454446966365, 139.1909411287371, '赤城南面千本桜', 'https://tenki.jp/sakura/3/13/54108.html', 'https://static.tenki.jp/static-images/sakura/point/54108/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カワヅザクラ、オオシマザクラ、ベニユタカ'],
			[36.02949427210605, 139.4840969644458, 'さくら堤公園', 'https://tenki.jp/sakura/3/14/50181.html', 'https://static.tenki.jp/static-images/sakura/point/50181/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.03966547115845, 139.42166625750886, '吉見百穴周辺', 'https://tenki.jp/sakura/3/14/50182.html', 'https://static.tenki.jp/static-images/sakura/point/50182/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.76937383484518, 139.44027880728984, '西武園ゆうえんち', 'https://tenki.jp/sakura/3/14/51057.html', 'https://static.tenki.jp/static-images/sakura/point/51057/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.70135020590912, 139.3291778454227, '滝山公園', 'https://tenki.jp/sakura/3/16/50814.html', 'https://static.tenki.jp/static-images/sakura/point/50814/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[35.712184924940026, 139.72560659030222, 'ホテル椿山荘東京', 'https://tenki.jp/sakura/3/16/51105.html', 'https://static.tenki.jp/static-images/sakura/point/51105/square.jpg', '桜の種類：カワヅザクラ、ソメイヨシノ、ケイオウザクラ、オカメザクラ、ミヤビザクラ'],
			[36.216176179810745, 136.2401522656569, 'あらた坂', 'https://tenki.jp/sakura/4/21/55812.html', 'https://static.tenki.jp/static-images/sakura/point/55812/square.jpg', '桜の種類：現地問合せ'],
			[34.98929823570488, 136.98460224863564, '亀城公園', 'https://tenki.jp/sakura/5/26/50916.html', 'https://static.tenki.jp/static-images/sakura/point/50916/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.89389087422937, 137.50519271574254, '桜淵公園', 'https://tenki.jp/sakura/5/26/55625.html', 'https://static.tenki.jp/static-images/sakura/point/55625/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.598838400857936, 136.3193375595413, '君ヶ野ダム公園', 'https://tenki.jp/sakura/5/27/50311.html', 'https://static.tenki.jp/static-images/sakura/point/50311/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.517342253901, 136.22217917838313, '三多気(駐車場付近)', 'https://tenki.jp/sakura/5/27/51087.html', 'https://static.tenki.jp/static-images/sakura/point/51087/square.jpg', '桜の種類：ヤマザクラ'],
			[34.513994827881355, 136.22557986652512, '三多気(山裾)', 'https://tenki.jp/sakura/5/27/51088.html', 'https://static.tenki.jp/static-images/sakura/point/51088/square.jpg', '桜の種類：ヤマザクラ'],
			[34.5205367272467, 136.22015337693043, '三多気(棚田付近)', 'https://tenki.jp/sakura/5/27/55619.html', 'https://static.tenki.jp/static-images/sakura/point/55619/square.jpg', '桜の種類：ヤマザクラ'],
			[34.731791911268516, 136.50651474266206, '津偕楽公園', 'https://tenki.jp/sakura/5/27/55620.html', 'https://static.tenki.jp/static-images/sakura/point/55620/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.82018838237834, 135.7762692173186, '馬坂川桜並木', 'https://tenki.jp/sakura/6/29/51104.html', 'https://static.tenki.jp/static-images/sakura/point/51104/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.69309142469177, 135.5203218233993, '造幣局 桜の通り抜け', 'https://tenki.jp/sakura/6/30/50766.html', 'https://static.tenki.jp/static-images/sakura/point/50766/square.jpg', '桜の種類：ギョイコウ'],
			[34.71414571058953, 135.56505436969024, '念法眞教 総本山 金剛寺', 'https://tenki.jp/sakura/6/30/51035.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、カワヅザクラ、ヤエザクラ'],
			[34.339094852012906, 135.88068039834852, '吉野山(奥千本)', 'https://tenki.jp/sakura/6/32/51108.html', 'https://static.tenki.jp/static-images/sakura/point/51108/square.jpg', '桜の種類：シロヤマザクラ'],
			[34.378148706424085, 132.35882990663242, '花のまわりみち-八重桜イン広島-', 'https://tenki.jp/sakura/7/37/50950.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：カンザン、フゲンゾウ、コウカ、ショウゲツ、シロタエ'],
			[33.9472972719871, 130.90417207488963, '老の山公園', 'https://tenki.jp/sakura/7/38/50770.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ'],
			[33.97553084017056, 130.93130016132363, '戦場ヶ原公園', 'https://tenki.jp/sakura/7/38/50771.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[33.95478884117634, 130.93099982074312, '日和山公園', 'https://tenki.jp/sakura/7/38/58033.html', 'https://static.tenki.jp/static-images/sakura/point/58033/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ、オオシマザクラ'],
			[33.070507730889624, 131.37048008479584, '長湯温泉 しだれ桜の里(早咲き)', 'https://tenki.jp/sakura/9/47/51109.html', 'https://static.tenki.jp/static-images/sakura/point/51109/square.jpg', '桜の種類：タイリョウザクラ、ヤエベニシダレ、コマツオトメ、ヨウコウ、オモイガワ'],
			[36.40943087740172, 136.44766316240353, '芦城公園', 'https://tenki.jp/sakura/4/20/55823.html', 'https://static.tenki.jp/static-images/sakura/point/55823/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、シダレザクラ、フジザクラ'],
			[39.744960183891756, 141.20237559094488, '米内浄水場', 'https://tenki.jp/sakura/2/6/52117.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ヤエベニシダレヒガンザクラ、ソメイヨシノ'],
			[36.699724027240435, 140.69826311761145, 'さくら宇宙公園', 'https://tenki.jp/sakura/3/11/54216.html', 'https://static.tenki.jp/static-images/sakura/point/54216/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[36.92436399381992, 139.93280076273456, '千本松牧場', 'https://tenki.jp/sakura/3/12/51112.html', 'https://static.tenki.jp/static-images/sakura/point/51112/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.384835917711214, 139.81134109840838, '天平の丘公園(八重桜)', 'https://tenki.jp/sakura/3/12/54406.html', 'https://static.tenki.jp/static-images/sakura/point/54406/square.jpg', '桜の種類：カンザン、フゲンゾウ、イチヨウ'],
			[36.09249301686229, 139.72319544763332, '幸手権現堂桜堤(県営権現堂公園)', 'https://tenki.jp/sakura/3/14/50231.html', 'https://static.tenki.jp/static-images/sakura/point/50231/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.795649552939636, 139.47335630222483, '所沢航空記念公園', 'https://tenki.jp/sakura/3/14/50848.html', 'https://static.tenki.jp/static-images/sakura/point/50848/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、シダレザクラ'],
			[35.038952538314554, 139.81324709427426, '大房岬自然公園', 'https://tenki.jp/sakura/3/15/51114.html', 'https://static.tenki.jp/static-images/sakura/point/51114/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、ヤエザクラ'],
			[35.671353797860235, 139.5459134402545, '神代植物公園', 'https://tenki.jp/sakura/3/16/50732.html', 'https://static.tenki.jp/static-images/sakura/point/50732/square.jpg', '桜の種類：ソメイヨシノ、ジンダイアケボノ、ヤエベニシダレ、ウコン、カンザン'],
			[35.65510467278654, 139.74606396902584, '芝公園', 'https://tenki.jp/sakura/3/16/50801.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、シダレザクラ、その他'],
			[35.62885906823517, 139.62135882626626, '砧公園', 'https://tenki.jp/sakura/3/16/50802.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、その他'],
			[35.76375846882916, 139.6281808115938, '都立光が丘公園', 'https://tenki.jp/sakura/3/16/50803.html', 'https://static.tenki.jp/static-images/sakura/point/50803/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、オオシマザクラ、シダレザクラ、サトザクラ'],
			[35.6608614669778, 139.7621084271023, '浜離宮恩賜庭園', 'https://tenki.jp/sakura/3/16/50804.html', 'https://static.tenki.jp/static-images/sakura/point/50804/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ウコン、センダイシダレ、ギョイコウ'],
			[35.65452006103196, 139.75851392924622, '旧芝離宮恩賜庭園', 'https://tenki.jp/sakura/3/16/50805.html', 'https://static.tenki.jp/static-images/sakura/point/50805/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、サトザクラ、ヤマザクラ'],
			[35.704947273638886, 139.74768189015973, '小石川後楽園', 'https://tenki.jp/sakura/3/16/50806.html', 'https://static.tenki.jp/static-images/sakura/point/50806/square.jpg', '桜の種類：シダレザクラ、ソメイヨシノ、ヤマザクラ、ウコン'],
			[35.709346400076704, 139.76760634672425, '旧岩崎邸庭園', 'https://tenki.jp/sakura/3/16/50807.html', 'https://static.tenki.jp/static-images/sakura/point/50807/square.jpg', '桜の種類：オオシマザクラ、ソメイヨシノ'],
			[35.73248824471894, 139.74836193145856, '六義園', 'https://tenki.jp/sakura/3/16/50808.html', 'https://static.tenki.jp/static-images/sakura/point/50808/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、エドヒガン、カンザン'],
			[35.72419529537317, 139.8149101798643, '向島百花園', 'https://tenki.jp/sakura/3/16/50809.html', 'https://static.tenki.jp/static-images/sakura/point/50809/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カンヒザクラ、エドヒガン、カンザン'],
			[35.680646397563784, 139.7976148820717, '清澄庭園', 'https://tenki.jp/sakura/3/16/50810.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、カンヒザクラ'],
			[35.74275186175907, 139.74640164501503, '旧古河庭園', 'https://tenki.jp/sakura/3/16/50811.html', 'https://static.tenki.jp/static-images/sakura/point/50811/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤマザクラ、オオシマザクラ'],
			[35.69066678704008, 139.63234863217815, '善福寺川緑地', 'https://tenki.jp/sakura/3/16/50815.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、ヤマザクラ、オオシマザクラ、その他'],
			[35.73926230577795, 139.59659251629427, '石神井公園', 'https://tenki.jp/sakura/3/16/50884.html', 'https://static.tenki.jp/static-images/sakura/point/50884/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ'],
			[35.66934297150711, 139.69516794437314, '都立代々木公園', 'https://tenki.jp/sakura/3/16/54314.html', 'https://static.tenki.jp/static-images/sakura/point/54314/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、サトザクラ、カワヅザクラ'],
			[35.786292735775326, 139.86947176485455, '水元公園', 'https://tenki.jp/sakura/3/16/54412.html', 'https://static.tenki.jp/static-images/sakura/point/54412/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、サトザクラ、シダレザクラ、その他'],
			[35.62404221916777, 139.65970441286822, '駒沢オリンピック公園', 'https://tenki.jp/sakura/3/16/54413.html', 'https://static.tenki.jp/static-images/sakura/point/54413/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ'],
			[35.714365411501845, 139.51857720493877, '小金井公園', 'https://tenki.jp/sakura/3/16/54603.html', 'https://static.tenki.jp/static-images/sakura/point/54603/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、カンヒザクラ、オオシマザクラ'],
			[35.705432105609205, 139.70455569640404, '戸山公園', 'https://tenki.jp/sakura/3/16/54623.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、シダレザクラ'],
			[35.79624641400094, 139.76736753485017, '都立舎人公園', 'https://tenki.jp/sakura/3/16/54624.html', 'https://static.tenki.jp/static-images/sakura/point/54624/square.jpg', '桜の種類：ソメイヨシノ、サトザクラ、カンザクラ'],
			[35.905472325071266, 136.15081948276898, '吉野瀬川の桜並木', 'https://tenki.jp/sakura/4/21/55813.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[35.76934194987206, 138.55602806317975, '金櫻神社', 'https://tenki.jp/sakura/3/22/50305.html', 'https://static.tenki.jp/static-images/sakura/point/50305/square.jpg', '桜の種類：ヤマザクラ、ソメイヨシノ、ヤエザクラ、シダレザクラ、ウコン'],
			[35.718393609122295, 138.7562812062163, '慈雲寺', 'https://tenki.jp/sakura/3/22/52561.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：イトザクラ、シダレザクラ、カワヅザクラ、ヤマザクラ'],
			[34.69949707937269, 135.49794637174688, '大阪ダイヤモンド地区', 'https://tenki.jp/sakura/6/30/51113.html', 'https://static.tenki.jp/static-images/sakura/point/51113/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ、ベニバスモモ'],
			[34.824562420889244, 135.55141937112958, '辯天宗冥應寺', 'https://tenki.jp/sakura/6/30/56125.html', 'https://static.tenki.jp/static-images/sakura/point/56125/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.17687049430971, 133.56900121553645, 'がいせん桜', 'https://tenki.jp/sakura/7/36/56734.html', 'https://static.tenki.jp/static-images/sakura/point/56734/square.jpg', '桜の種類：ソメイヨシノ、ヤエベニシダレ'],
			[34.9373553827009, 133.56168363543586, '羅生門さくら公園', 'https://tenki.jp/sakura/7/36/58045.html', 'https://static.tenki.jp/static-images/sakura/point/58045/square.jpg', '桜の種類：ソメイヨシノ、ヨウコウ、オオヤマザクラ、ギョイコウ、カンザン'],
			[39.56458020778491, 141.17319293774992, '紫波城山公園', 'https://tenki.jp/sakura/2/6/52113.html', 'https://static.tenki.jp/static-images/sakura/point/52113/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、エドヒガン'],
			[38.36655936114049, 141.0533828383624, '西行戻しの松公園', 'https://tenki.jp/sakura/2/7/52516.html', 'https://static.tenki.jp/static-images/sakura/point/52516/square.jpg', '桜の種類：ソメイヨシノ'],
			[36.38554885024239, 139.81221899129338, '天平の丘公園(淡墨桜)', 'https://tenki.jp/sakura/3/12/51116.html', 'https://static.tenki.jp/static-images/sakura/point/51116/square.jpg', '桜の種類：ウスズミザクラ'],
			[35.75727478247294, 139.30656374314879, '桜づつみ公園', 'https://tenki.jp/sakura/3/16/51115.html', 'https://static.tenki.jp/static-images/sakura/point/51115/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、春めき'],
			[35.33807026042846, 139.15842117855053, 'BIOTOPIA(ソメイヨシノ)', 'https://tenki.jp/sakura/3/17/51118.html', 'https://static.tenki.jp/static-images/sakura/point/51118/square.jpg', '桜の種類：カワヅザクラ、春めき、ソメイヨシノ、ギョイコウ、シダレザクラ'],
			[36.46389187477291, 136.54229626705757, 'コミュニティ&amp;スポーツ公園 桜づつみ', 'https://tenki.jp/sakura/4/20/55853.html', 'https://static.tenki.jp/static-images/sakura/point/55853/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ'],
			[35.91904451949598, 136.2384151504067, '花筐公園', 'https://tenki.jp/sakura/4/21/55805.html', 'https://static.tenki.jp/static-images/sakura/point/55805/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン'],
			[34.970066639386864, 136.16565207756048, '水口城跡', 'https://tenki.jp/sakura/6/28/51117.html', 'https://static.tenki.jp/static-images/sakura/point/51117/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.0282654795036, 135.7137860874384, '仁和寺(ソメイヨシノ)', 'https://tenki.jp/sakura/6/29/51121.html', 'https://static.tenki.jp/static-images/sakura/point/51121/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.02826148017501, 135.71379708660618, '仁和寺(ギョイコウ)', 'https://tenki.jp/sakura/6/29/51122.html', 'https://static.tenki.jp/static-images/sakura/point/51122/square.jpg', '桜の種類：ギョイコウ'],
			[34.80682229406277, 135.6399968821974, 'ひらかたパーク', 'https://tenki.jp/sakura/6/30/56123.html', 'https://static.tenki.jp/static-images/sakura/point/56123/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.02901857210176, 133.79557437749006, '丸山公園', 'https://tenki.jp/sakura/8/39/55854.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
			[33.79310658181889, 133.76919472861204, '定福寺', 'https://tenki.jp/sakura/8/42/51119.html', 'https://static.tenki.jp/static-images/sakura/point/51119/square.jpg', '桜の種類：ウスズミザクラ、オオシマザクラ'],
			[33.51656690139789, 130.37557803634317, 'ABURAYAMA FUKUOKA', 'https://tenki.jp/sakura/9/43/50510.html', 'https://static.tenki.jp/static-images/sakura/point/50510/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ、ヤエザクラ'],
			[33.34953415901602, 130.37052130413085, '宝珠寺のヒメシダレザクラ', 'https://tenki.jp/sakura/9/44/50571.html', 'https://static.tenki.jp/static-images/sakura/point/50571/square.jpg', '桜の種類：ヒメシダレザクラ'],
			[37.01249880866495, 140.84844112823782, 'いわき市石炭・化石館ほるる', 'https://tenki.jp/sakura/2/10/52558.html', 'https://static.tenki.jp/static-images/sakura/point/52558/square.jpg', '桜の種類：ソメイヨシノ、ヤマザクラ'],
			[36.36015934691628, 140.28899847082917, '北山公園', 'https://tenki.jp/sakura/3/11/54217.html', 'https://static.tenki.jp/static-images/sakura/point/54217/square.jpg', '桜の種類：ソメイヨシノ、ボタンザクラ、ギョイコウ'],
			[35.98305846691895, 139.08720777333647, '羊山公園', 'https://tenki.jp/sakura/3/14/50845.html', 'https://static.tenki.jp/static-images/sakura/point/50845/square.jpg', '桜の種類：ソメイヨシノ、ヤエザクラ、ベニシダレザクラ'],
			[35.47212693678235, 139.3045636341539, '飯山白山森林公園', 'https://tenki.jp/sakura/3/17/50230.html', 'https://static.tenki.jp/static-images/sakura/point/50230/square.jpg', '桜の種類：ソメイヨシノ'],
			[37.25414783126834, 136.73097377014784, '阿岸本誓寺', 'https://tenki.jp/sakura/4/20/50126.html', 'https://static.tenki.jp/static-images/sakura/point/50126/square.jpg', '桜の種類：アギシコギクザクラ'],
			[37.33458157857036, 137.13741718651104, '能登町柳田植物公園', 'https://tenki.jp/sakura/4/20/50816.html', 'https://static.tenki.jp/static-images/sakura/point/50816/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[37.03035096686954, 136.99031161647264, '七尾市希望の丘公園', 'https://tenki.jp/sakura/4/20/51029.html', 'https://static.tenki.jp/static-images/sakura/point/51029/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、シダレザクラ、サトザクラ、ヤマザクラ'],
			[37.04573207284541, 136.9602140580467, '小丸山城址公園', 'https://tenki.jp/sakura/4/20/55826.html', 'https://static.tenki.jp/static-images/sakura/point/55826/square.jpg', '桜の種類：ソメイヨシノ、シダレザクラ、ヤエザクラ'],
			[37.22864333305451, 136.89629293382086, '来迎寺菊桜', 'https://tenki.jp/sakura/4/20/55835.html', 'https://static.tenki.jp/static-images/sakura/point/55835/square.jpg', '桜の種類：ライコウジキクザクラ'],
			[37.180021259012825, 136.89804474287047, '能登さくら駅(能登鹿島駅)', 'https://tenki.jp/sakura/4/20/55847.html', 'https://static.tenki.jp/static-images/sakura/point/55847/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.460626299164026, 137.65972448517948, '駒つなぎの桜', 'https://tenki.jp/sakura/3/23/50881.html', 'https://static.tenki.jp/static-images/sakura/point/50881/square.jpg', '桜の種類：エドヒガン'],
			[34.3503216757283, 136.4014364940669, '大滝峡自然公園', 'https://tenki.jp/sakura/5/27/50315.html', 'https://static.tenki.jp/static-images/sakura/point/50315/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.90248011683184, 136.23084937509773, '鹿深夢の森', 'https://tenki.jp/sakura/6/28/51125.html', 'https://static.tenki.jp/static-images/sakura/point/51125/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.008144630507, 136.26449184567306, '日野川ダム(ソメイヨシノ)', 'https://tenki.jp/sakura/6/28/51128.html', 'https://static.tenki.jp/static-images/sakura/point/51128/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.005856138021436, 136.25999151262548, '日野川ダム(ヤエザクラ)', 'https://tenki.jp/sakura/6/28/51129.html', 'https://static.tenki.jp/static-images/sakura/point/51129/square.jpg', '桜の種類：ヤエザクラ'],
			[34.43600356121015, 135.55456460728973, '大阪府立花の文化園', 'https://tenki.jp/sakura/6/30/51124.html', 'https://static.tenki.jp/static-images/sakura/point/51124/square.jpg', '桜の種類：ソメイヨシノ、エドヒガン、ジュウガツザクラ、アーコレード、シダレザクラ'],
			[34.69846905399597, 134.22446104393364, '岡山いこいの村(エドヒガン)', 'https://tenki.jp/sakura/7/36/50949.html', 'https://static.tenki.jp/static-images/sakura/point/50949/square.jpg', '桜の種類：エドヒガン'],
			[34.69849505075295, 134.22447104148097, '岡山いこいの村(中庭)', 'https://tenki.jp/sakura/7/36/51086.html', 'https://static.tenki.jp/static-images/sakura/point/51086/square.jpg', '桜の種類：オオシマザクラ、ソメイヨシノ、ヤエザクラ、ヤマザクラ'],
			[34.65605529131254, 133.04509766884112, '世羅高原農場', 'https://tenki.jp/sakura/7/37/51123.html', 'https://static.tenki.jp/static-images/sakura/point/51123/square.jpg', '桜の種類：ベニシダレザクラ、ヤエベニシダレ、ジンダイアケボノ'],
			[33.07053272978735, 131.37054908011692, '長湯温泉 しだれ桜の里(中咲き)', 'https://tenki.jp/sakura/9/47/51126.html', 'https://static.tenki.jp/static-images/sakura/point/51126/square.jpg', '桜の種類：タイリョウザクラ、ヤエベニシダレ、コマツオトメ、ヨウコウ、オモイガワ'],
			[33.07048773486363, 131.37054907937318, '長湯温泉 しだれ桜の里(遅咲き)', 'https://tenki.jp/sakura/9/47/51127.html', 'https://static.tenki.jp/static-images/sakura/point/51127/square.jpg', '桜の種類：タイリョウザクラ、ヤエベニシダレ、コマツオトメ、ヨウコウ、オモイガワ'],
			[38.13753546059995, 139.99976552688204, '古代の丘八重桜', 'https://tenki.jp/sakura/2/9/51131.html', 'https://static.tenki.jp/static-images/sakura/point/51131/square.jpg', '桜の種類：ヤエザクラ'],
			[37.36691840604491, 140.99756946410776, '夜の森の桜のトンネル', 'https://tenki.jp/sakura/2/10/50220.html', 'https://static.tenki.jp/static-images/sakura/point/50220/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.712462268872684, 139.39485287051258, '国営昭和記念公園', 'https://tenki.jp/sakura/3/16/50106.html', 'https://static.tenki.jp/static-images/sakura/point/50106/square.jpg', '桜の種類：ソメイヨシノ、オオシマザクラ、ヤマザクラ、サトザクラ、シダレザクラ'],
			[37.8066861794946, 139.18775808353735, '梅護寺', 'https://tenki.jp/sakura/4/18/51132.html', 'https://static.tenki.jp/static-images/sakura/point/51132/square.jpg', '桜の種類：珠数掛ザクラ'],
			[36.65981347428582, 136.66014898415656, '河北潟の桜並木 母恋街道', 'https://tenki.jp/sakura/4/20/55834.html', 'https://static.tenki.jp/static-images/sakura/point/55834/square.jpg', '桜の種類：ソメイヨシノ'],
			[35.4371358544641, 136.7745736560438, '日中友好庭園', 'https://tenki.jp/sakura/5/24/51133.html', 'https://static.tenki.jp/static-images/sakura/point/51133/square.jpg', '桜の種類：ソメイヨシノ、コヒガンザクラ、シダレザクラ'],
			[35.2027900951313, 135.90750673000758, 'びわ湖バレイ/びわ湖テラス', 'https://tenki.jp/sakura/6/28/56105.html', 'https://static.tenki.jp/static-images/sakura/point/56105/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.87111136487783, 135.79616732563488, '宇治市植物公園(シダレザクラ)', 'https://tenki.jp/sakura/6/29/51130.html', 'https://static.tenki.jp/static-images/sakura/point/51130/square.jpg', '桜の種類：シダレザクラ(樹齢80年)、シダレザクラ、ヤエザクラ、カワヅザクラ、その他'],
			[34.96612082416994, 132.46959152406626, '因原堤防', 'https://tenki.jp/sakura/7/35/56625.html', 'https://static.tenki.jp/static-images/sakura/point/56625/square.jpg', '桜の種類：ソメイヨシノ'],
			[34.189630230755775, 131.47272978133432, '香山公園', 'https://tenki.jp/sakura/7/38/58021.html', 'https://static.tenki.jp/images/icon/noimage-square.jpg', '桜の種類：ソメイヨシノ'],
		];
		const bounds = L.latLngBounds(pointsSakura.map(([lat, lng]) => [lat, lng]));
		sakuraMap = L.map('sakura-map-wrap', {
			fullscreenControl: true,
			fullscreenControlOptions: { position: 'topleft' },
			minZoom: 4,
			maxZoom: 18
		}).fitBounds(bounds.pad(0.25));
		L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: '<a href="https://maps.gsi.go.jp/development/index.html" target="_blank" rel="noopener">国土地理院</a>'
		}).addTo(sakuraMap);
		L.control.scale({ imperial: true }).addTo(sakuraMap);
		var sakuraIcon = L.icon({
			iconUrl: 'sakura-icon.png',
			iconSize:     [32, 32],
			iconAnchor:   [32, 32],
			popupAnchor:  [-5, -10]
		});
		var sakuraIcon2 = L.icon({
			iconUrl: 'sakura2-icon.png',
			iconSize:     [32, 32],
			iconAnchor:   [32, 32],
			popupAnchor:  [-5, -10]
		});
		pointsSakura.forEach(([lat, lng, name, href, img, info]) => {
			const icon = Math.random() < 0.5 ? sakuraIcon : sakuraIcon2;
			L.marker([lat, lng], { icon }).addTo(sakuraMap).bindPopup(
				'<div class="clearfix">' +
				'<div class="map-point-sakura-name" style="width:215px;"><a href="' + href + '" target="_blank" rel="noopener">' + name + '</a></div>' +
				'<div class="map-point-sakura-img"><a href="' + href + '" target="_blank" rel="noopener"><img src="' + img + '" width="60" height="60" alt="' + name + '" title="' + name + '"></a></div>' +
				'<div class="map-point-sakura-info"><span class="map-point-sakura-kind">' + info + '</span></div>' +
				'</div>'
			);
		});
		setTimeout(() => sakuraMap.invalidateSize(), 150);
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
		if (tabId === 'kouyou') initKoyoMap();
		if (tabId === 'sakura') initSakuraMap();
		navLinks.forEach((link) => {
			link.setAttribute('aria-selected', link.getAttribute('data-tab') === tabId ? 'true' : 'false');
		});
		(tabId === 'home' ? homeHaikuSlot : footerHaikuSlot).appendChild(haikuEl);
	};
	navLinks.forEach((link) => {
		link.addEventListener('click', () => {
			activateTab(link.getAttribute('data-tab'));
			closeMenu();
		});
	});
	activateTab('home');
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('sw.js').catch(() => {});
		});
	}
})();
window.KOYO_DATA = {
  prefs: [
    { c:'JP-01', ja:'北海道',   r:'Hokkaidō',  lat:43.06, lon:141.35, alt:20,  peak:'10-28', jmc:1 },
    { c:'JP-02', ja:'青森県',   r:'Aomori',    lat:40.82, lon:140.75, alt:15,  peak:'11-13', jmc:1 },
    { c:'JP-03', ja:'岩手県',   r:'Iwate',     lat:39.70, lon:141.15, alt:130, peak:'11-13', jmc:1 },
    { c:'JP-04', ja:'宮城県',   r:'Miyagi',    lat:38.27, lon:140.87, alt:40,  peak:'11-21', jmc:1 },
    { c:'JP-05', ja:'秋田県',   r:'Akita',     lat:39.72, lon:140.10, alt:20,  peak:'11-12', jmc:1 },
    { c:'JP-06', ja:'山形県',   r:'Yamagata',  lat:38.24, lon:140.36, alt:150, peak:'11-25', jmc:1 },
    { c:'JP-07', ja:'福島県',   r:'Fukushima', lat:37.75, lon:140.47, alt:70,  peak:'11-17', jmc:1 },
    { c:'JP-08', ja:'茨城県',   r:'Ibaraki',   lat:36.37, lon:140.47, alt:30,  peak:'11-20', jmc:1 },
    { c:'JP-09', ja:'栃木県',   r:'Tochigi',   lat:36.56, lon:139.88, alt:120, peak:'11-20', jmc:1 },
    { c:'JP-10', ja:'群馬県',   r:'Gunma',     lat:36.39, lon:139.06, alt:110, peak:'12-08', jmc:1 },
    { c:'JP-11', ja:'埼玉県',   r:'Saitama',   lat:36.15, lon:139.39, alt:30,  peak:'12-01', jmc:1 },
    { c:'JP-12', ja:'千葉県',   r:'Chiba',     lat:35.73, lon:140.83, alt:20,  peak:'12-12', jmc:1 },
    { c:'JP-13', ja:'東京都',   r:'Tōkyō',     lat:35.69, lon:139.69, alt:20,  peak:'11-28', jmc:1 },
    { c:'JP-14', ja:'神奈川県', r:'Kanagawa',  lat:35.45, lon:139.64, alt:15,  peak:'12-14', jmc:1 },
    { c:'JP-15', ja:'新潟県',   r:'Niigata',   lat:37.90, lon:139.02, alt:10,  peak:'11-15', jmc:1 },
    { c:'JP-16', ja:'富山県',   r:'Toyama',    lat:36.70, lon:137.21, alt:10,  peak:'11-24', jmc:1 },
    { c:'JP-17', ja:'石川県',   r:'Ishikawa',  lat:36.56, lon:136.66, alt:30,  peak:'11-24', jmc:1 },
    { c:'JP-18', ja:'福井県',   r:'Fukui',     lat:36.06, lon:136.22, alt:15,  peak:'11-28', jmc:1 },
    { c:'JP-19', ja:'山梨県',   r:'Yamanashi', lat:35.66, lon:138.57, alt:270, peak:'11-29', jmc:1 },
    { c:'JP-20', ja:'長野県',   r:'Nagano',    lat:36.65, lon:138.18, alt:370, peak:'11-12', jmc:1 },
    { c:'JP-21', ja:'岐阜県',   r:'Gifu',      lat:35.42, lon:136.76, alt:15,  peak:'11-26', jmc:1 },
    { c:'JP-22', ja:'静岡県',   r:'Shizuoka',  lat:34.98, lon:138.38, alt:15,  peak:'12-05', jmc:1 },
    { c:'JP-23', ja:'愛知県',   r:'Aichi',     lat:35.18, lon:136.91, alt:15,  peak:'11-28', jmc:1 },
    { c:'JP-24', ja:'三重県',   r:'Mie',       lat:34.73, lon:136.51, alt:10,  peak:'11-25', jmc:1 },
    { c:'JP-25', ja:'滋賀県',   r:'Shiga',     lat:35.27, lon:136.24, alt:90,  peak:'11-28', jmc:1 },
    { c:'JP-26', ja:'京都府',   r:'Kyōto',     lat:35.01, lon:135.77, alt:50,  peak:'12-05', jmc:1 },
    { c:'JP-27', ja:'大阪府',   r:'Ōsaka',     lat:34.69, lon:135.50, alt:10,  peak:'12-01', jmc:1 },
    { c:'JP-28', ja:'兵庫県',   r:'Hyōgo',     lat:34.69, lon:135.20, alt:15,  peak:'12-01', jmc:1 },
    { c:'JP-29', ja:'奈良県',   r:'Nara',      lat:34.68, lon:135.83, alt:100, peak:'11-21', jmc:1 },
    { c:'JP-30', ja:'和歌山県', r:'Wakayama',  lat:34.23, lon:135.17, alt:15,  peak:'12-06', jmc:1 },
    { c:'JP-31', ja:'鳥取県',   r:'Tottori',   lat:35.50, lon:134.24, alt:10,  peak:'11-30', jmc:1 },
    { c:'JP-32', ja:'島根県',   r:'Shimane',   lat:35.47, lon:133.05, alt:10,  peak:'11-24' },
    { c:'JP-33', ja:'岡山県',   r:'Okayama',   lat:34.66, lon:133.93, alt:10,  peak:'11-26' },
    { c:'JP-34', ja:'広島県',   r:'Hiroshima', lat:34.39, lon:132.46, alt:10,  peak:'11-22', jmc:1 },
    { c:'JP-35', ja:'山口県',   r:'Yamaguchi', lat:34.19, lon:131.47, alt:20,  peak:'11-28' },
    { c:'JP-36', ja:'徳島県',   r:'Tokushima', lat:34.07, lon:134.55, alt:10,  peak:'11-30' },
    { c:'JP-37', ja:'香川県',   r:'Kagawa',    lat:34.34, lon:134.05, alt:10,  peak:'11-28' },
    { c:'JP-38', ja:'愛媛県',   r:'Ehime',     lat:33.84, lon:132.77, alt:30,  peak:'11-30' },
    { c:'JP-39', ja:'高知県',   r:'Kōchi',     lat:33.56, lon:133.53, alt:10,  peak:'12-02', jmc:1 },
    { c:'JP-40', ja:'福岡県',   r:'Fukuoka',   lat:33.59, lon:130.40, alt:10,  peak:'12-01', jmc:1 },
    { c:'JP-41', ja:'佐賀県',   r:'Saga',      lat:33.25, lon:130.30, alt:10,  peak:'12-01' },
    { c:'JP-42', ja:'長崎県',   r:'Nagasaki',  lat:32.75, lon:129.87, alt:20,  peak:'12-05' },
    { c:'JP-43', ja:'熊本県',   r:'Kumamoto',  lat:32.80, lon:130.71, alt:30,  peak:'12-03' },
    { c:'JP-44', ja:'大分県',   r:'Ōita',      lat:33.24, lon:131.61, alt:10,  peak:'11-28' },
    { c:'JP-45', ja:'宮崎県',   r:'Miyazaki',  lat:31.91, lon:131.42, alt:10,  peak:'12-08' },
    { c:'JP-46', ja:'鹿児島県', r:'Kagoshima', lat:31.60, lon:130.56, alt:10,  peak:'12-15', jmc:1 },
    { c:'JP-47', ja:'沖縄県',   r:'Okinawa',   lat:26.21, lon:127.68, alt:10,  peak:null }
  ],
  spots: [
    { n:'Asahikawa',            lat:43.77, lon:142.37, alt:110,  peak:'10-23', jmc:1 },
    { n:'Obihiro',              lat:42.92, lon:143.20, alt:40,   peak:'10-20', jmc:1 },
    { n:'Kushiro',              lat:42.98, lon:144.38, alt:30,   peak:'10-16', jmc:1 },
    { n:'Muroran',              lat:42.32, lon:140.97, alt:40,   peak:'11-07', jmc:1 },
    { n:'Hakodate',             lat:41.77, lon:140.73, alt:30,   peak:'11-02', jmc:1 },
    { n:'Daisetsuzan (Kurodake)', lat:43.71, lon:142.99, alt:1800, peak:'09-21' },
    { n:'Asahidake',            lat:43.66, lon:142.85, alt:1600, peak:'09-23' },
    { n:'Sōunkyō',              lat:43.71, lon:142.87, alt:670,  peak:'10-05' },
    { n:'Shiretoko',            lat:44.08, lon:145.09, alt:740,  peak:'10-03' },
    { n:'Akanko',               lat:43.45, lon:144.10, alt:420,  peak:'10-01' },
    { n:'Jōzankei',             lat:42.96, lon:141.16, alt:300,  peak:'10-17' },
    { n:'Hakkōda',              lat:40.66, lon:140.88, alt:1300, peak:'10-10' },
    { n:'Hachimantai',          lat:39.96, lon:140.85, alt:1400, peak:'10-09' },
    { n:'Towada / Oirase',      lat:40.47, lon:140.90, alt:400,  peak:'10-26' },
    { n:'Akita-Komagatake',     lat:39.76, lon:140.80, alt:1500, peak:'10-06' },
    { n:'Chōkai',               lat:39.10, lon:140.05, alt:1500, peak:'10-09' },
    { n:'Gassan',               lat:38.55, lon:140.03, alt:1600, peak:'10-07' },
    { n:'Zaō Onsen',            lat:38.16, lon:140.40, alt:900,  peak:'10-18' },
    { n:'Naruko-kyō',           lat:38.75, lon:140.72, alt:300,  peak:'11-02' },
    { n:'Bandai-Azuma',         lat:37.72, lon:140.25, alt:1500, peak:'10-08' },
    { n:'Urabandai',            lat:37.66, lon:140.07, alt:800,  peak:'10-27' },
    { n:'Oze-ga-hara',          lat:36.91, lon:139.24, alt:1400, peak:'10-02' },
    { n:'Tanigawa-dake',        lat:36.84, lon:138.93, alt:1300, peak:'10-13' },
    { n:'Nasu-dake',            lat:37.12, lon:139.97, alt:1500, peak:'10-08' },
    { n:'Nikkō / Irohazaka',    lat:36.74, lon:139.51, alt:1300, peak:'10-18' },
    { n:'Chūzenji',             lat:36.73, lon:139.48, alt:1270, peak:'10-20' },
    { n:'Kusatsu',              lat:36.62, lon:138.60, alt:1150, peak:'10-22' },
    { n:'Shiobara',             lat:36.98, lon:139.80, alt:600,  peak:'11-06' },
    { n:'Chichibu / Nagatoro',  lat:36.09, lon:139.11, alt:250,  peak:'11-22' },
    { n:'Takao-san',            lat:35.63, lon:139.24, alt:600,  peak:'11-24' },
    { n:'Okutama',              lat:35.81, lon:139.10, alt:600,  peak:'11-18' },
    { n:'Hakone / Ashi',        lat:35.21, lon:139.02, alt:730,  peak:'11-16' },
    { n:'Tanzawa',              lat:35.47, lon:139.15, alt:900,  peak:'11-12' },
    { n:'Tateyama / Murodō',    lat:36.58, lon:137.60, alt:2450, peak:'09-25' },
    { n:'Kurobe-daira',         lat:36.57, lon:137.65, alt:1830, peak:'10-07' },
    { n:'Senjōjiki',            lat:35.78, lon:137.81, alt:2610, peak:'09-27' },
    { n:'Tsugaike',             lat:36.76, lon:137.80, alt:1900, peak:'09-29' },
    { n:'Shin-Hotaka',          lat:36.24, lon:137.56, alt:2100, peak:'10-05' },
    { n:'Shiga Kōgen',          lat:36.72, lon:138.51, alt:1600, peak:'10-08' },
    { n:'Norikura',             lat:36.11, lon:137.62, alt:1500, peak:'10-10' },
    { n:'Kamikōchi',            lat:36.25, lon:137.63, alt:1500, peak:'10-22' },
    { n:'Karuizawa',            lat:36.35, lon:138.60, alt:940,  peak:'11-05' },
    { n:'Takayama / Hida',      lat:36.14, lon:137.25, alt:570,  peak:'11-06' },
    { n:'Naeba',                lat:36.79, lon:138.79, alt:1300, peak:'10-16' },
    { n:'Kiyotsu-kyō',          lat:37.02, lon:138.79, alt:400,  peak:'10-31' },
    { n:'Fuji 5e station',      lat:35.40, lon:138.73, alt:2300, peak:'10-05' },
    { n:'Kawaguchiko',          lat:35.51, lon:138.76, alt:840,  peak:'11-13' },
    { n:'Shōsenkyō',            lat:35.74, lon:138.53, alt:700,  peak:'11-14' },
    { n:'Kōrankei',             lat:35.15, lon:137.42, alt:300,  peak:'11-25' },
    { n:'Sunmata-kyō',          lat:35.22, lon:138.14, alt:600,  peak:'11-20' },
    { n:'Hakusan',              lat:36.15, lon:136.77, alt:1500, peak:'10-11' },
    { n:'Ōdaigahara',           lat:34.18, lon:136.10, alt:1600, peak:'10-28' },
    { n:'Kōyasan',              lat:34.21, lon:135.58, alt:850,  peak:'11-12' },
    { n:'Yoshino-yama',         lat:34.36, lon:135.86, alt:600,  peak:'11-17' },
    { n:'Hiei-zan',             lat:35.07, lon:135.83, alt:800,  peak:'11-18' },
    { n:'Ōhara',                lat:35.12, lon:135.83, alt:250,  peak:'11-27' },
    { n:'Arashiyama',           lat:35.01, lon:135.67, alt:50,   peak:'12-04' },
    { n:'Rokkō-san',            lat:34.78, lon:135.26, alt:900,  peak:'11-16' },
    { n:'Minoo',                lat:34.85, lon:135.47, alt:200,  peak:'11-27' },
    { n:'Daisen',               lat:35.37, lon:133.55, alt:900,  peak:'11-06' },
    { n:'Hiruzen',              lat:35.30, lon:133.63, alt:600,  peak:'11-13' },
    { n:'Sandan-kyō',           lat:34.62, lon:132.16, alt:400,  peak:'11-13' },
    { n:'Taishaku-kyō',         lat:34.85, lon:133.20, alt:400,  peak:'11-14' },
    { n:'Miyajima',             lat:34.28, lon:132.32, alt:50,   peak:'11-25' },
    { n:'Ishizuchi',            lat:33.77, lon:133.11, alt:1700, peak:'10-22' },
    { n:'Omogo-kei',            lat:33.68, lon:133.11, alt:700,  peak:'11-10' },
    { n:'Iya / Ōboke',          lat:33.87, lon:133.87, alt:600,  peak:'11-15' },
    { n:'Kankakei',             lat:34.50, lon:134.28, alt:600,  peak:'11-18' },
    { n:'Hikosan',              lat:33.48, lon:130.93, alt:1000, peak:'11-12' },
    { n:'Kujū',                 lat:33.08, lon:131.25, alt:1400, peak:'10-28' },
    { n:'Aso',                  lat:32.88, lon:131.10, alt:1000, peak:'11-05' },
    { n:'Kikuchi-keikoku',      lat:32.98, lon:130.90, alt:600,  peak:'11-14' },
    { n:'Kurokawa',             lat:33.08, lon:131.15, alt:700,  peak:'11-10' },
    { n:'Yabakei',              lat:33.46, lon:131.15, alt:200,  peak:'11-18' },
    { n:'Yufuin',               lat:33.26, lon:131.36, alt:450,  peak:'11-15' },
    { n:'Takachiho-kyō',        lat:32.71, lon:131.30, alt:400,  peak:'11-20' },
    { n:'Unzen',                lat:32.75, lon:130.26, alt:1100, peak:'11-07' },
    { n:'Ebino Kōgen',          lat:31.94, lon:130.85, alt:1200, peak:'11-08' },
    { n:'Kirishima',            lat:31.93, lon:130.86, alt:1000, peak:'11-12' }
  ],
  alias: {
    'JP-01':'hokkaido', 'JP-02':'aomori',   'JP-03':'iwate',    'JP-04':'miyagi',
    'JP-05':'akita',    'JP-06':'yamagata', 'JP-07':'fukushima','JP-08':'ibaraki',
    'JP-09':'tochigi',  'JP-10':'gunma',    'JP-11':'saitama',  'JP-12':'chiba',
    'JP-13':'tokyo',    'JP-14':'kanagawa', 'JP-15':'niigata',  'JP-16':'toyama',
    'JP-17':'ishikawa', 'JP-18':'fukui',    'JP-19':'yamanashi','JP-20':'nagano',
    'JP-21':'gifu',     'JP-22':'shizuoka', 'JP-23':'aichi',    'JP-24':'mie',
    'JP-25':'shiga',    'JP-26':'kyoto',    'JP-27':'osaka',    'JP-28':'hyogo',
    'JP-29':'nara',     'JP-30':'wakayama', 'JP-31':'tottori',  'JP-32':'shimane',
    'JP-33':'okayama',  'JP-34':'hiroshima','JP-35':'yamaguchi','JP-36':'tokushima',
    'JP-37':'kagawa',   'JP-38':'ehime',    'JP-39':'kochi',    'JP-40':'fukuoka',
    'JP-41':'saga',     'JP-42':'nagasaki', 'JP-43':'kumamoto', 'JP-44':'oita',
    'JP-45':'miyazaki', 'JP-46':'kagoshima','JP-47':'okinawa'
  }
};
window.KoyoMap = (function () {
  'use strict';
  const YEAR = 2026, DAY = 86400000, ORIGIN = Date.UTC(YEAR, 8, 1);
  const D0 = d('09-25'), D1 = d('12-10');
  const SPEED = 1.0;
  const STEP = 2;
  const K = 10, POW = 2.6, NOISE = 1.6;
  const KA = 4, PA = 3;
  const OFF = { start: -14, fade: 9, fall: 19 };
  const STAGES = [
    ['#2f7d32', '青葉',       'Pas encore de changement'],
    ['#e2a33c', '色づき始め', 'Début du changement'],
    ['#c62828', '紅葉見頃',   'Pic du kōyō'],
    ['#8d5524', '色あせ始め', 'Début de la fin'],
    ['#9e9e9e', '落葉',       'Plus de couleurs']
  ];
  function d(mmdd) {
    const [m, dd] = mmdd.split('-').map(Number);
    return Math.round((Date.UTC(m < 6 ? YEAR + 1 : YEAR, m - 1, dd) - ORIGIN) / DAY);
  }
  const fmt = n => new Date(ORIGIN + n * DAY)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const s2l = new Float32Array(256), l2s = new Uint8Array(4096);
  for (let i = 0; i < 256; i++) { const c = i / 255; s2l[i] = c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
  for (let i = 0; i < 4096; i++) { const c = i / 4095; l2s[i] = Math.round((c <= .0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - .055) * 255); }
  const LIN = STAGES.map(s => {
    const n = parseInt(s[0].slice(1), 16);
    return [s2l[n >> 16 & 255], s2l[n >> 8 & 255], s2l[n & 255]];
  });
  function rgb(s, o) {
    s = s < 0 ? 0 : s > 4 ? 4 : s;
    const i = s < 3.999 ? s | 0 : 3, t = s - i, a = LIN[i], b = LIN[i + 1];
    o[0] = l2s[(a[0] + (b[0] - a[0]) * t) * 4095 | 0];
    o[1] = l2s[(a[1] + (b[1] - a[1]) * t) * 4095 | 0];
    o[2] = l2s[(a[2] + (b[2] - a[2]) * t) * 4095 | 0];
  }
  const A = [];   // { lat, lon, alt, p (pic, en jours), res }
  KOYO_DATA.prefs.forEach(p => { if (p.peak) A.push({ lat: p.lat, lon: p.lon, alt: p.alt, p: d(p.peak) }); });
  KOYO_DATA.spots.forEach(s => A.push({ lat: s.lat, lon: s.lon, alt: s.alt, p: d(s.peak) }));
  const B = (function () {
    const M = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
    A.forEach(a => {
      const x = [1, a.lat, a.lon, a.alt / 100];
      for (let r = 0; r < 4; r++) { for (let c = 0; c < 4; c++) M[r][c] += x[r] * x[c]; M[r][4] += x[r] * a.p; }
    });
    for (let c = 0; c < 4; c++) {
      let pv = c;
      for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r;
      [M[c], M[pv]] = [M[pv], M[c]];
      const k = M[c][c] || 1e-9;
      for (let j = c; j < 5; j++) M[c][j] /= k;
      for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c]; for (let j = c; j < 5; j++) M[r][j] -= f * M[c][j]; }
    }
    return [M[0][4], M[1][4], M[2][4], M[3][4]];
  })();
  const trend = (lat, lon, alt) => B[0] + B[1] * lat + B[2] * lon + B[3] * alt / 100;
  A.forEach(a => { a.res = a.p - trend(a.lat, a.lon, a.alt); });
  function h2(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ h >> 13) * 1274126177; return ((h ^ h >> 16) >>> 0) / 2147483647.5 - 1; }
  function noise(lat, lon) {
    let v = 0, amp = .6, fx = 2.2;
    for (let o = 0; o < 3; o++) {
      const x = lon * fx, y = lat * fx, xi = Math.floor(x), yi = Math.floor(y);
      let tx = x - xi, ty = y - yi; tx *= tx * (3 - 2 * tx); ty *= ty * (3 - 2 * ty);
      const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), e = h2(xi + 1, yi + 1);
      v += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (e - c) * tx) * ty);
      amp *= .5; fx *= 2.5;
    }
    return v;
  }
  const nn = [];
  function peakAt(lat, lon) {
    nn.length = 0;
    const N = K > KA ? K : KA;
    for (let i = 0; i < A.length; i++) {
      const a = A[i], dx = (lon - a.lon) * .78, dy = lat - a.lat;
      const d2 = dx * dx + dy * dy + 1e-6;
      if (nn.length < N) { nn.push([d2, a]); nn.sort((u, v) => u[0] - v[0]); }
      else if (d2 < nn[N - 1][0]) { nn[N - 1] = [d2, a]; nn.sort((u, v) => u[0] - v[0]); }
    }
    let wa = 0, alt = 0;
    for (let i = 0; i < KA; i++) { const q = Math.pow(nn[i][0] + .0025, -PA / 2); wa += q; alt += q * nn[i][1].alt; }
    let w = 0, acc = 0;
    for (let i = 0; i < K; i++) { const q = Math.pow(nn[i][0] + .0025, -POW / 2); w += q; acc += q * nn[i][1].res; }
    return trend(lat, lon, alt / wa) + acc / w + noise(lat, lon) * NOISE;
  }
  function stage(p, t) {
    const s = p + OFF.start, f = p + OFF.fade, l = p + OFF.fall;
    if (t <= s) return 0;
    if (t < p) return (t - s) / (p - s);
    if (t < f) return 1 + (t - p) / (f - p);
    if (t < l) return 2 + (t - f) / (l - f);
    return t < l + 10 ? 3 + (t - l) / 10 : 4;
  }
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  const byId = new Map();
  Object.entries(KOYO_DATA.alias).forEach(([c, a]) => { byId.set(norm(c), c); byId.set(a, c); });
  KOYO_DATA.prefs.forEach(p => { byId.set(norm(p.r), p.c); byId.set(norm(p.ja), p.c); });
  function codeOf(el) {
    const t = el.querySelector && el.querySelector('title');
    for (const v of [el.id, el.getAttribute('data-id'), el.getAttribute('name'),
                     el.getAttribute('title'), t && t.textContent, el.getAttribute('class')]) {
      if (!v) continue;
      const n = norm(v);
      if (byId.has(n)) return byId.get(n);
      const m = n.match(/jp(\d{2})/);
      if (m && KOYO_DATA.alias['JP-' + m[1]]) return 'JP-' + m[1];
    }
    return null;
  }
  const mercY = l => Math.log(Math.tan(Math.PI / 4 + l * Math.PI / 360));
  function fallback() {
    const W = 700, H = 900, p = 36;
    const pts = KOYO_DATA.prefs.map(o => ({ o, x: o.lon, y: mercY(o.lat) }));
    const xs = pts.map(a => a.x), ys = pts.map(a => a.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const s = Math.min((W - 2 * p) / (x1 - x0), (H - 2 * p) / (y1 - y0)), R = 24;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` + pts.map(a => {
      const cx = p + (a.x - x0) * s, cy = H - p - (a.y - y0) * s, dd = [];
      for (let i = 0; i < 6; i++) {
        const t = Math.PI / 6 + i * Math.PI / 3;
        dd.push((i ? 'L' : 'M') + (cx + R * Math.cos(t)).toFixed(1) + ' ' + (cy + R * Math.sin(t)).toFixed(1));
      }
      return `<path id="${a.o.c}" d="${dd.join(' ')}Z"></path>`;
    }).join('') + '</svg>';
  }
  async function mount(target, opts) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error('KoyoMap : conteneur introuvable');
    const svgUrl = (opts && opts.svg) || 'map/japan.svg';
    let inline = root.querySelector('svg');
    let markup = inline ? inline.outerHTML : null;
    if (!markup) {
      try {
        const r = await fetch(svgUrl, { cache: 'no-store' });
        if (r.ok) { const t = await r.text(); if (/<svg[\s>]/i.test(t)) markup = t.slice(t.search(/<svg[\s>]/i)); }
      } catch (e) { /* fichier absent */ }
    }
    if (!markup) markup = fallback();
    root.classList.add('koyo');
    root.innerHTML =
      '<div class="koyo-stage">' +
        '<canvas class="koyo-canvas"></canvas>' +
        '<div class="koyo-svg">' + markup + '</div>' +
        '<div class="koyo-tip" hidden></div>' +
      '</div>' +
      '<div class="koyo-bar">' +
        '<button class="koyo-play" type="button" aria-label="Lecture">▶</button>' +
        '<div class="koyo-track"><input class="koyo-range" type="range" aria-label="Date">' +
        '<span class="koyo-bubble"></span></div>' +
      '</div>' +
      '<ul class="koyo-legend">' + STAGES.map(s =>
        `<li><i style="background:${s[0]}"></i><b>${s[1]}</b><span>${s[2]}</span></li>`).join('') + '</ul>';
    const stageEl = root.querySelector('.koyo-stage');
    const canvas = root.querySelector('.koyo-canvas');
    const ctx = canvas.getContext('2d');
    const svg = root.querySelector('.koyo-svg svg');
    const tip = root.querySelector('.koyo-tip');
    const range = root.querySelector('.koyo-range');
    const bubble = root.querySelector('.koyo-bubble');
    const play = root.querySelector('.koyo-play');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', '0 0 ' + (parseFloat(svg.getAttribute('width')) || 1000) +
                                    ' ' + (parseFloat(svg.getAttribute('height')) || 1000));
    }
    svg.removeAttribute('width'); svg.removeAttribute('height');
    const shapes = [], mask = new Path2D();
    svg.querySelectorAll('path, polygon').forEach(el => {
      const code = codeOf(el) || codeOf(el.parentNode || el);
      if (!code) return;
      el.setAttribute('data-koyo', code);
      const b = el.getBBox();
      if (b.width || b.height) shapes.push({ code, cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
      try {
        if (el.tagName.toLowerCase() === 'path') mask.addPath(new Path2D(el.getAttribute('d')));
        else {
          const p = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number), sp = new Path2D();
          if (p.length >= 6) { sp.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) sp.lineTo(p[i], p[i + 1]); sp.closePath(); mask.addPath(sp); }
        }
      } catch (e) { /* tracé exotique */ }
    });
    const proj = (function () {
      const pref = new Map(KOYO_DATA.prefs.map(p => [p.c, p]));
      const u = [], v = [], uu = [], vv = [];
      shapes.forEach(s => { const p = pref.get(s.code); if (p) { u.push(p.lon); v.push(s.cx); uu.push(mercY(p.lat)); vv.push(s.cy); } });
      const fit = (x, y) => {
        const n = x.length; let sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
        const a = (n * sxy - sx * sy) / (n * sxx - sx * sx);
        return [a, (sy - a * sx) / n];
      };
      if (u.length < 8) {
        const b = svg.viewBox.baseVal, L0 = 127.5, L1 = 146.5, M0 = mercY(25.5), M1 = mercY(45.8);
        const ax = b.width / (L1 - L0), ay = -b.height / (M1 - M0);
        return { lat: y => 2 * Math.atan(Math.exp((y - b.y - b.height) / ay + M0)) * 57.29578 - 90,
                 lon: x => (x - b.x) / ax + L0 };
      }
      const [ax, bx] = fit(u, v), [ay, by] = fit(uu, vv);
      return { lat: y => 2 * Math.atan(Math.exp((y - by) / ay)) * 57.29578 - 90, lon: x => (x - bx) / ax };
    })();
    let t = D0, playing = false, tr = null, grid = null, dpr = 1, last = 0;
    const buf = [0, 0, 0];
    function layout() {
      const r = stageEl.getBoundingClientRect(), b = svg.viewBox.baseVal;
      if (!r.width || !r.height) return;
      const sc = Math.min(r.width / b.width, r.height / b.height);
      tr = { sc, ox: (r.width - b.width * sc) / 2 - b.x * sc, oy: (r.height - b.height * sc) / 2 - b.y * sc, w: r.width, h: r.height };
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      const cols = Math.ceil(r.width / STEP), rows = Math.ceil(r.height / STEP);
      const p = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = (i * STEP + STEP / 2 - tr.ox) / sc, y = (j * STEP + STEP / 2 - tr.oy) / sc;
        p[j * cols + i] = peakAt(proj.lat(y), proj.lon(x));
      }
      grid = { cols, rows, p, img: ctx.createImageData(cols, rows), tmp: document.createElement('canvas') };
      grid.tmp.width = cols; grid.tmp.height = rows;
      draw();
    }
    function draw() {
      if (!grid || !tr) return;
      const px = grid.img.data;
      for (let k = 0, n = grid.cols * grid.rows; k < n; k++) {
        rgb(stage(grid.p[k], t), buf);
        px[k * 4] = buf[0]; px[k * 4 + 1] = buf[1]; px[k * 4 + 2] = buf[2]; px[k * 4 + 3] = 255;
      }
      grid.tmp.getContext('2d').putImageData(grid.img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(grid.tmp, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.setTransform(tr.sc * dpr, 0, 0, tr.sc * dpr, tr.ox * dpr, tr.oy * dpr);
      ctx.fill(mask, 'nonzero');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      range.value = t;
      moveBubble();
    }
    function moveBubble() {
      const w = range.offsetWidth, th = 16;
      const pct = (t - D0) / (D1 - D0);
      bubble.style.left = (th / 2 + pct * (w - th)) + 'px';
      bubble.textContent = fmt(t);
    }
    function onMove(e) {
      const el = e.target.closest && e.target.closest('[data-koyo]');
      if (!el || !tr) { tip.hidden = true; return; }
      const r = stageEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const pref = KOYO_DATA.prefs.find(p => p.c === el.getAttribute('data-koyo'));
      if (!pref) { tip.hidden = true; return; }
      let html = `<b>${pref.ja}</b> ${pref.r}`;
      if (pref.peak) {
        const p = peakAt(proj.lat((y - tr.oy) / tr.sc), proj.lon((x - tr.ox) / tr.sc));
        const st = STAGES[Math.max(0, Math.min(4, Math.round(stage(p, t))))];
        html += `<span><i style="background:${st[0]}"></i>${st[1]} — ${st[2]}</span>`
              + `<span class="koyo-tip-peak">見頃 : ${fmt(p)}</span>`;
      } else html += '<span>Pas de kōyō caducifolié</span>';
      tip.innerHTML = html;
      tip.hidden = false;
      tip.style.left = Math.min(r.width - tip.offsetWidth - 8, x + 14) + 'px';
      tip.style.top = Math.max(4, y - 12) + 'px';
    }
    function loop(ts) {
      if (playing) {
        if (last) { t += (ts - last) / 1000 * SPEED; if (t >= D1) t = D0; draw(); }
        last = ts;
      } else last = 0;
      requestAnimationFrame(loop);
    }
    range.min = D0; range.max = D1; range.step = .25; range.value = t;
    range.addEventListener('input', () => { t = +range.value; draw(); });
    play.addEventListener('click', () => {
      playing = !playing;
      play.textContent = playing ? '❚❚' : '▶';
      play.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
    });
    stageEl.addEventListener('mousemove', onMove);
    stageEl.addEventListener('mouseleave', () => { tip.hidden = true; });
    if (window.ResizeObserver) new ResizeObserver(layout).observe(stageEl);
    else window.addEventListener('resize', layout);
    layout();
    requestAnimationFrame(loop);
    return { get date() { return new Date(ORIGIN + t * DAY); }, redraw: draw };
  }
  return { mount };
})();
KoyoMap.mount('#koyo');