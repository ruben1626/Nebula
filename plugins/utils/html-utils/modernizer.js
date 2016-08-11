'use strict';

const cheerio = (() => {
	try {
		require.resolve('cheerio');
	} catch (err) {
		return null;
	}
	return require('cheerio');
})();

const htmlUtils = require('./html-utils');
const cheerioExtras = require('./cheerio-extras');

// HTML5-ization
const tagMap = new Map([
	['b', 'strong'],
	['i', 'em'],
	['font', 'span'],
]);
const decorationMap = new Map([
	['u', 'underline'],
	['s', 'line-through'],
	['strike', 'line-through'],
]);
const sizeMap = new Map([
	['big', 'larger'],
	['small', 'smaller'],
]);

const LEGACY_DIMENSION = /^\d+%?$/;
const LEGACY_ALIGNMENT_HORIZONTAL = /^(left|center|right)$/;
const LEGACY_ALIGNMENT_VERTICAL = /^(top|bottom|middle|absmiddle)$/;
const LEGACY_ALIGNMENT_ANY = /^(left|center|right|top|bottom|middle|absmiddle)$/;

const DEFAULT_TAGS = [
	'img',
	'b', 'i', 'font',
	's', 'strike', 'u',
	'big', 'small',
	'center',
];

const modernizeRoutines = {
	__proto__: null,
	'b': 'font',
	'i': 'font',
	'font': {
		handler: function ($, index, elem) {
			// <strong>, <em>, <span>
			const $elem = $(elem);
			const attribs = elem.attribs;

			const style = {};
			if (elem.name === 'font') {
				// <font color="${value}"></font>	style="color:${value}"
				// <font size="${value}"></font>	style="font-size:${value}"
				// <font face="${value}"></font>	style="font-family:${value}"
				if ('size' in attribs) {
					style['font-size'] = attribs.size;
					delete attribs.size;
				}
				if ('color' in attribs) {
					style['color'] = attribs.color;
					delete attribs.color;
				}
				if ('face' in attribs) {
					style['font-family'] = attribs.face;
					delete attribs.face;
				}
			}

			$elem.replaceWith(htmlUtils.createElement(tagMap.get(elem.name), $elem.html(), attribs, style));
		},
	},
	's': 'strike',
	'strike': {
		handler: function ($, index, elem) {
			// text-decoration: line-through, line-through, underline
			const $elem = $(elem);
			const attribs = elem.attribs;
			$elem.replaceWith(htmlUtils.createElement('del', $elem.html(), attribs));
		},
	},
	'u': {
		handler: function ($, index, elem) {
			// text-decoration: line-through, line-through, underline
			const $elem = $(elem);
			const attribs = elem.attribs;
			$elem.replaceWith(htmlUtils.createElement('em', $elem.html(), attribs, {
				'text-decoration': decorationMap.get(elem.name),
			}));
		},
	},
	'small': 'big',
	'big': {
		handler: function ($, index, elem) {
			// font-size: bigger, smaller
			const $elem = $(elem);
			const attribs = elem.attribs;
			$elem.replaceWith(htmlUtils.createElement('span', $elem.html(), attribs, {
				'font-size': sizeMap.get(elem.name),
			}));
		},
	},
	'center': {
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;
			$elem.children().each((index, child) => {
				if (!htmlUtils.blockElements.has(child.name)) return;
				const $child = $(child);
				$child.css('margin', 'auto');
			});
			$elem.replaceWith(htmlUtils.createElement('div', $elem.html(), attribs, {
				'text-align': 'center',
				'margin': 'auto',
			}));
		},
	},
	'div': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;
			if ('align' in attribs && attribs.align === 'center') {
				$elem.children().each((index, child) => {
					if (!htmlUtils.blockElements.has(child.name)) return;
					const $child = $(child);
					$child.css('margin', 'auto');
				});
				$elem.css('text-align', 'center');
				$elem.css('margin', 'auto');
				$elem.removeAttr('align');
			}
		},
	},
	'hr': {
		passive: true, // TODO: swap <hr /> for another element...
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;
			if ('width' in attribs && LEGACY_DIMENSION.test(attribs.width)) {
				const width = /^\d+$/.test(attribs.width) ? attribs.width + 'px' : attribs.width;
				$elem.css('width', width);
				$elem.removeAttr('width');
			}
			if ('size' in attribs && LEGACY_DIMENSION.test(attribs.size)) {
				const height = /^\d+$/.test(attribs.size) ? attribs.size + 'px' : attribs.size;
				$elem.css('height', height);
				$elem.removeAttr('size');
			}
			if ('align' in attribs && LEGACY_ALIGNMENT_HORIZONTAL.test(attribs.align)) {
				if (attribs.align === 'center') {
					$elem.css('margin', 'auto');
				} else {
					$elem.css('float', attribs.align);
				}
				$elem.removeAttr('align');
			}
		},
	},
	'object': 'img',
	'img': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('height' in attribs && LEGACY_DIMENSION.test(attribs.height)) {
				const height = /^\d+$/.test(attribs.height) ? attribs.height + 'px' : attribs.height;
				$elem.css('height', height);
				$elem.removeAttr('height');
			}
			if ('width' in attribs && LEGACY_DIMENSION.test(attribs.width)) {
				const width = /^\d+$/.test(attribs.width) ? attribs.width + 'px' : attribs.width;
				$elem.css('width', width);
				$elem.removeAttr('width');
			}
			if ('hspace' in attribs && LEGACY_DIMENSION.test(attribs.hspace)) {
				const hspace = /^\d+$/.test(attribs.hspace) ? attribs.hspace + 'px' : attribs.hspace;
				$elem.css('margin-left', hspace);
				$elem.css('margin-right', hspace);
				$elem.removeAttr('hspace');
			}
			if ('vspace' in attribs && LEGACY_DIMENSION.test(attribs.vspace)) {
				const vspace = /^\d+$/.test(attribs.vspace) ? attribs.vspace + 'px' : attribs.vspace;
				$elem.css('margin-top', vspace);
				$elem.css('margin-bottom', vspace);
				$elem.removeAttr('vspace');
			}
			if ('align' in attribs && LEGACY_ALIGNMENT_HORIZONTAL.test(attribs.align) && attribs.align !== 'center') {
				$elem.css('float', attribs.align);
			}
		},
	},
	'h6': 'p',
	'h5': 'p',
	'h4': 'p',
	'h3': 'p',
	'h2': 'p',
	'h1': 'p',
	'p': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('align' in attribs && LEGACY_ALIGNMENT_HORIZONTAL.test(attribs.align)) {
				$elem.css('text-align', attribs.align);
				$elem.removeAttr('align');
			}
		},
	},
	'pre': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('width' in attribs && LEGACY_DIMENSION.test(attribs.width)) {
				const width = /^\d+$/.test(attribs.width) ? attribs.width + 'px' : attribs.width;
				$elem.css('width', width);
				$elem.removeAttr('width');
			}
		},
	},
	'thead': 'tbody',
	'tfoot': 'tbody',
	'tbody': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('align' in attribs && attribs.align === 'center') {
				$elem.children().each((index, child) => {
					if (!htmlUtils.blockElements.has(child.name)) return;
					const $child = $(child);
					$child.css('margin', 'auto');
				});
				$elem.css('text-align', 'center');
				$elem.css('margin', 'auto');
				$elem.removeAttr('align');
			}
			if ('valign' in attribs) {
				$elem.css('vertical-align', CSS.escape(attribs.valign));
				$elem.removeAttr('valign');
			}
		},
	},
	'th': 'td',
	'td': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('align' in attribs && attribs.align === 'center') {
				$elem.children().each((index, child) => {
					if (!htmlUtils.blockElements.has(child.name)) return;
					const $child = $(child);
					$child.css('margin', 'auto');
				});
				$elem.css('text-align', 'center');
				$elem.css('margin', 'auto');
				$elem.removeAttr('align');
			}
			if ('bgcolor' in attribs) {
				$elem.css('background-color', CSS.escape(attribs.bgcolor));
				$elem.removeAttr('bgcolor');
			}
			if ('valign' in attribs) {
				$elem.css('vertical-align', CSS.escape(attribs.valign));
				$elem.removeAttr('valign');
			}
			if ('height' in attribs && LEGACY_DIMENSION.test(attribs.height)) {
				const height = /^\d+$/.test(attribs.height) ? attribs.height + 'px' : attribs.height;
				$elem.css('height', height);
				$elem.removeAttr('height');
			}
			if ('width' in attribs && LEGACY_DIMENSION.test(attribs.width)) {
				const width = /^\d+$/.test(attribs.width) ? attribs.width + 'px' : attribs.width;
				$elem.css('width', width);
				$elem.removeAttr('width');
			}
			if ('nowrap' in attribs) {
				$elem.css('white-space', 'nowrap');
				$elem.removeAttr('nowrap');
			}
		},
	},
	'tr': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('align' in attribs && attribs.align === 'center') {
				$elem.children().each((index, child) => {
					if (!htmlUtils.blockElements.has(child.name)) return;
					const $child = $(child);
					$child.css('margin', 'auto');
				});
				$elem.css('text-align', 'center');
				$elem.css('margin', 'auto');
				$elem.removeAttr('align');
			}
			if ('bgcolor' in attribs) {
				$elem.css('background-color', CSS.escape(attribs.bgcolor));
				$elem.removeAttr('bgcolor');
			}
			if ('valign' in attribs) {
				$elem.css('vertical-align', CSS.escape(attribs.valign));
				$elem.removeAttr('valign');
			}
		},
	},
	'table': {
		passive: true,
		handler: function ($, index, elem) {
			const $elem = $(elem);
			const attribs = elem.attribs;

			if ('width' in attribs && LEGACY_DIMENSION.test(attribs.width)) {
				const width = /^\d+$/.test(attribs.width) ? attribs.width + 'px' : attribs.width;
				$elem.css('width', width);
				$elem.removeAttr('width');
			}
			if ('align' in attribs && LEGACY_ALIGNMENT_HORIZONTAL.test(attribs.align)) {
				if (attribs.align === 'center') {
					$elem.css('margin', 'auto');
				} else {
					$elem.css('float', attribs.align);
				}
				$elem.removeAttr('align');
			}
			if ('bgcolor' in attribs) {
				$elem.css('background-color', CSS.escape(attribs.bgcolor));
				$elem.removeAttr('bgcolor');
			}
			if ('border' in attribs && /^\d+$/.test(attribs.border)) {
				$elem.css('border-width', '' + attribs.border + 'px');
				$elem.removeAttr('border');
			}
			if ('cellpadding' in attribs && /^\d+$/.test(attribs.cellpadding)) {
				// TODO: 'padding' on the table's td and th
			}
			if ('cellspacing' in attribs && /^\d+$/.test(attribs.cellspacing)) {
				$elem.css('border-spacing', '' + attribs.cellspacing + 'px');
				$elem.removeAttr('cellspacing');
			}
		},
	},
};

function getModernizeRoutine(tagName) {
	const routine = modernizeRoutines[tagName];
	if (typeof routine === 'string') return modernizeRoutines[routine];
	return routine;
}

/* Convert presentational HTML to CSS */
function modernizeHTML(code, tagNames) {
	if (!cheerio) throw new Error("cheerio is not installed");
	if (!tagNames) tagNames = DEFAULT_TAGS;
	if (!tagNames.length) return code;

	const $ = cheerio.load(code);
	for (const tagName of tagNames) {
		const routine = getModernizeRoutine(tagName);
		if (!routine) continue;
		if (routine.passive) {
			$(tagName).each(routine.handler.bind(null, $));
		} else {
			cheerioExtras.eachNested($, tagName, routine.handler.bind(null, $));
		}
	}
	return $.html();
}

module.exports = modernizeHTML;
