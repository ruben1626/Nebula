'use strict';

const path = require('path');

require('css.escape');

const cajaContext = require('./caja-wrap');
const browserRequire = require('./../browser-require');
const modernizeHTML = require('./modernizer');

const blockElements = new Set([
	'address', 'article', 'aside', 'blockquote', 'canvas', 'div', 'dl',
	'fieldset', 'figcaption', 'figure', 'footer', 'form',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup',
	'hr', 'li', 'main', 'nav', 'noscript', 'ol', 'output',
	'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video',
]);

const IMAGE_LEGACY_DIMENSION = /^\d+%?$/;

const ESCAPE_CHARS = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;',
	"\/": '&#x2f;',
};

const UNESCAPE_CHARS = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&apos;': "'",
	'&#x2f;': "\/",
};

function openTag(tagName, attribs, style) {
	const extraStyle = style ? Object.entries(style).map(entry => CSS.escape(entry[0]) + ': ' + CSS.escape(entry[1])).join(" ; ") : "";
	const entries = [];
	for (let key in attribs) {
		let value = attribs[key];
		if (key === 'style' && style) {
			value += (value.trim().endsWith(';') ? "" : " ; ") + extraStyle;
		}
		entries.push([key, value]);
	}
	if (extraStyle && !('style' in attribs)) {
		attribs['style'] = extraStyle;
		entries.push(['style', extraStyle]);
	}
	return '<' + tagName + (entries.length ? " " + entries.map(entry => Chat.escapeHTML(entry[0]) + '="' + Chat.escapeHTML(entry[1]) + '"').join(" ") : "") + '>';
}

function closeTag(tagName) {
	return '</' + tagName + '>';
}

function createElement(tagName, innerHTML, attribs, style) {
	return openTag(tagName, attribs || {}, style) + innerHTML + closeTag(tagName);
}

function getRow(arr) {
	if (!arr.length) return '';
	return '<td>' + arr.join('</td><td>') + '</td>';
}

function getRowGroup(arr) {
	if (!arr.length) return '';
	return '<tr>' + arr.join('</tr><tr>') + '</tr>';
}

function escapeHTML(str) {
	if (!str) return '';
	return ('' + str).replace(new RegExp('(' + Object.keys(ESCAPE_CHARS).join('|') + ')', 'g'), function (match) {return ESCAPE_CHARS[match]});
}

function unescapeHTML(str) {
	if (!str) return '';
	return ('' + str).replace(new RegExp('(' + Object.keys(UNESCAPE_CHARS).join('|') + ')', 'g'), function (match) {return UNESCAPE_CHARS[match]});
}

function linkify(message, whiteList) {
	return message.replace(/https?\:\/\/[a-z0-9-.]+(?:\:[0-9]+)?(?:\/(?:[^\s]*[^\s?.,])?)?|[a-z0-9.]+\@[a-z0-9.]+\.[a-z0-9]{2,3}|(?:[a-z0-9](?:[a-z0-9-\.]*[a-z0-9])?\.(?:com|org|net|edu|us|jp)(?:\:[0-9]+)?|qmark\.tk)(?:(?:\/(?:[^\s]*[^\s?.,])?)?)\b/ig, uri => {
		if (/[a-z0-9.]+\@[a-z0-9.]+\.[a-z0-9]{2,3}/ig.test(uri)) {
			return '<a href="mailto:' + this.escapeHTML(uri) + '">' + this.escapeHTML(uri) + '</a>';
		}
		// Insert http:// before URIs without a URI scheme specified.
		const qualifiedURI = uri.replace(/^([a-z]*[^a-z:])/g, 'http://$1');
		const securedURI = this.secureURI(qualifiedURI, whiteList);
		if (!securedURI) return this.escapeHTML(uri);
		return '<a href="' + this.escapeHTML(securedURI) + '">' + this.escapeHTML(uri) + '</a>';
	});
}

function sanitizeHTML() {
	const caja = cajaContext.caja;

	function createReservedValuesSrc(exceptions) {
		return (
			'^(' + [
				// Disallow all commands except for a very specific subset
				'\(\/|\!)' + '(?!(' + (
					[].concat(
						['warlog', 'clan', 'clanauth', 'rules', 'tourhof', 'shop', 'roomauth'].map(cmd => cmd + '|' + cmd + ' ([^ \n\r\f]+)')
					).concat(
						['join canaldeeventos']
					).concat(
						['[a-z]+ help']
					).concat(
						exceptions || []
					).join('|')
				) + ')$)' + '.*',
			].join('|') + ')$'
		);
	}

	function createReservedTokensSrc(exceptions) {
		return (
			'^(' + [
				'ps-room', 'pm-window', 'pm-window-.*',
				'pm-log-add', 'chat-log-add',
				'chat-message-.*',
				'inner',
				'autofocus',
				'username',
				'parseCommand',
				'x-enriched',
			].filter(elem => {
				return !exceptions || !exceptions.has(elem);
			}).join('|') + ')$'
		);
	}

	const defaultReservedValuesSrc = createReservedValuesSrc();
	const defaultReservedTokensSrc = createReservedTokensSrc();

	// Create cache for reserved value/token regular expresions and register defaults.
	const reservedValues = new Map([[defaultReservedValuesSrc, new RegExp(defaultReservedValuesSrc)]]);
	const reservedTokens = new Map([[defaultReservedTokensSrc, new RegExp(defaultReservedTokensSrc)]]);

	const naiveUriRewriter = Tools._secureURI;

	const nmTokenPolicy = (tokenList, tokenExceptions) => {
		const effReservedSrc = tokenExceptions ? createReservedTokensSrc(tokenExceptions) : defaultReservedTokensSrc;
		const effReserved = (reservedTokens.has(effReservedSrc) ? reservedTokens : reservedTokens.set(effReservedSrc, new RegExp(effReservedSrc))).get(effReservedSrc);
		return tokenList.split(' ').filter(token => !effReserved.test(token)).join(' ');
	};

	const parseLegacyDimension = dimension => {
		const numericalPart = dimension.match(/^\d+/);
		if (!numericalPart) return '';
		if (numericalPart[0].length === dimension.length) return dimension + 'px';
		if (numericalPart[0] + '%' === dimension) return dimension;
		return '';
	};

	const tagPolicy = (tagName, attribs, options) => {
		const valueExceptions = options.exceptValues;
		const tokenExceptions = Array.isArray(options.exceptTokens) ? new Set(options.exceptTokens) : options.exceptTokens;

		const effReservedSrc = valueExceptions ? createReservedValuesSrc(valueExceptions) : defaultReservedValuesSrc;
		const effReserved = (reservedValues.has(effReservedSrc) ? reservedValues : reservedValues.set(effReservedSrc, new RegExp(effReservedSrc))).get(effReservedSrc);

		const styleAttrs = new Map();

		// Initialize index of the value for "style" attribute.
		// !! Once found, make sure to decrease it each time attributes are deleted !!
		let styleValueIndex = -1;
		let hasLegacyOnlyAttribute = false; // if true, we don't convert to modern tags

		for (let i = attribs.length - 2; i >= 0; i -= 2) {
			switch (attribs[i]) {
			case 'value':
				if (effReserved.test(attribs[i + 1].trim())) {
					attribs.splice(i, 2);
					styleValueIndex -= 2;
				}
				break;

			case 'style':
				styleValueIndex = i + 1;
				break;

			case 'height': case 'width': {
				if (tagName !== 'img' && tagName !== 'object') break;
				let dimension = parseLegacyDimension(attribs[i + 1].trim());
				if (dimension) {
					styleAttrs.set(attribs[i], dimension);
					attribs.splice(i, 2);
					styleValueIndex -= 2;
				} else {
					hasLegacyOnlyAttribute = true;
				}
				break;
			}

			case 'hspace': case 'vspace': {
				if (tagName !== 'img' && tagName !== 'object') break;
				let dimension = parseLegacyDimension(attribs[i + 1].trim());
				if (dimension) {
					styleAttrs.set(attribs[i] === 'vspace' ? 'margin-top' : 'margin-left', dimension);
					styleAttrs.set(attribs[i] === 'vspace' ? 'margin-bottom' : 'margin-right', dimension);
					attribs.splice(i, 2);
					styleValueIndex -= 2;
				} else {
					hasLegacyOnlyAttribute = true;
				}
				break;
			}

			case 'color': case 'face': {
				// <font color="${value}"></font>	style="color:${value}"
				// <font face="${value}"></font>	style="font-family:${value}"
				if (tagName !== 'font') break;
				let cssProperty = attribs[i] === 'color' ? 'color' : 'font-family';
				styleAttrs.set(cssProperty, attribs[i + 1].trim());
				attribs.splice(i, 2);
				styleValueIndex -= 2;
				break;
			}

			case 'size': {
				// <hr size="${value}" />			<hr style="height:${value}(px|%)" />
				// <font size="${value}"></font>	<span style="font-size:${value}px"></span>
				if (tagName !== 'font' && tagName !== 'hr') break;
				let dimension = parseLegacyDimension(attribs[i + 1].trim());
				if (dimension) {
					if (tagName === 'font' && !dimension.endsWith('px')) {
						hasLegacyOnlyAttribute = true;
						break;
					}
					let cssProperty = tagName === 'font' ? 'font-size' : 'height';
					styleAttrs.set(cssProperty, dimension);
					attribs.splice(i, 2);
					styleValueIndex -= 2;
				} else {
					hasLegacyOnlyAttribute = true;
				}
				break;
			}

			case 'bgcolor':
				styleAttrs.set('background-color', attribs[i + 1].trim());
				attribs.splice(i, 2);
				styleValueIndex -= 2;
				break;

			case 'align': {
				let value = attribs[i + 1].trim();
				if (value === 'top' || value === 'bottom' || value === 'middle' || value === 'absmiddle') {
					if (value === 'absmiddle') value = 'middle';
					styleAttrs.set('vertical-align', value);
				} else if (value === 'center' || value === 'right' || value === 'left') {
					if (tagName === 'table' || tagName === 'hr') {
						let cssProperty = 'float';
						if (value === 'center') {
							cssProperty = 'margin';
							value = 'auto';
						}
						styleAttrs.set(cssProperty, value);
					} else if (tagName === 'p' || /^h[1-6]$/.test(tagName)) {
						styleAttrs.set('text-align', attribs[i + 1].trim());
					} else if (tagName === 'img' || tagName === 'input' || tagName === 'object' || tagName === 'iframe') {
						if (value === 'center') break;
						styleAttrs.set('float', attribs[i + 1].trim());
					} else {
						hasLegacyOnlyAttribute = true;
						break;
					}
				} else {
					hasLegacyOnlyAttribute = true;
					break;
				}
				attribs.splice(i, 2);
				styleValueIndex -= 2;
				break;
			}

			case 'valign': {
				let value = attribs[i + 1].trim();
				if (value === 'absmiddle') value = 'middle';
				styleAttrs.set('vertical-align', value);
				attribs.splice(i, 2);
				styleValueIndex -= 2;
				break;
			}

			default:
				break;
			}
		}

		switch (tagName) {
		case 's': case 'strike':
			if (!hasLegacyOnlyAttribute) tagName = 'span';
			styleAttrs.set('text-decoration', 'line-through');
			break;
		case 'u':
			if (!hasLegacyOnlyAttribute) tagName = 'span';
			styleAttrs.set('text-decoration', 'underline');
			break;
		case 'big': case 'small':
			styleAttrs.set('font-size', tagName === 'big' ? 'larger' : 'smaller');
			if (!hasLegacyOnlyAttribute) tagName = 'span';
			break;
		case 'b':
			if (!hasLegacyOnlyAttribute) tagName = 'strong';
			break;
		case 'i':
			if (!hasLegacyOnlyAttribute) tagName = 'em';
			break;
		case 'font':
			if (!hasLegacyOnlyAttribute) tagName = 'span';
			break;
		default:
			break;
		}

		if (styleAttrs.size) {
			if (styleValueIndex < 1) {
				// We never found the style attribute. Create it with our modern style rules.
				styleValueIndex = attribs.length + 1;
				attribs.push('style', Array.from(styleAttrs).map(entry => entry[0] + ": " + CSS.escape(entry[1])).join("; "));
			} else if (styleAttrs.size) {
				// Append modernized style rules to the `style` attribute.
				// Don't check for duplicates and/or invalid syntax. It really doesn't matter.
				attribs[styleValueIndex] += '; ' + Array.from(styleAttrs).map(entry => entry[0] + ": " + CSS.escape(entry[1])).join("; ");
			}
		}

		return {
			'tagName': tagName,
			'attribs': caja.sanitizeAttribs(tagName, attribs, naiveUriRewriter, tokenList => nmTokenPolicy(tokenList, tokenExceptions)),
		};
	};

	return function (str, options) {
		str = Tools.getString(str);
		str = caja.sanitizeWithPolicy(str, (tagName, attribs) => tagPolicy(tagName, attribs, options || {}));
		return modernizeHTML(str, ['center', 'div']);
	};
}

exports.getRow = getRow;
exports.getRowGroup = getRowGroup;

exports.openTag = openTag;
exports.closeTag = closeTag;
exports.createElement = createElement;

exports.blockElements = blockElements;
exports.modernize = modernizeHTML;

exports.escape = escapeHTML;
exports.unescape = unescapeHTML;
exports.linkify = linkify;
exports.sanitize = sanitizeHTML;

exports.caja = cajaContext.caja;
exports.URI = cajaContext.URI;

Object.assign(exports, (function () {
	const tabifierPath = path.resolve(__dirname, 'tabifier.js');
	const sandbox = browserRequire(tabifierPath, {
		timers: true,
	});
	return {cleanHTML: sandbox.cleanHTML};
})());

Object.assign(exports, {
	renderMarkup: function (html, cb) {
		this.cleanHTML(html, function (cleanedHTML) {
			return cb(
				Chat.escapeHTML(cleanedHTML)
				.replace(/((&lt;br&gt;)+)/, '<span klass="html-block-separator">$1</span>')
				.replace(/&gt;(.*?)&lt;/g, '&gt;<span klass="html-text">$1</span>&lt;') // text content
				.replace(/[\r\n]+/g, '<br />') // new lines
				.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') // indentation
				.replace(/\s(class|name|src|href)=/g, ' <span klass="html-attrib-highlighted">$1</span>=') // main attributes
				.replace(/\s(style)=&quot;(.*?)&quot;/g, ' <span klass="html-attrib-highlighted">$1</span>=&quot;<span klass="html-style-highlighted">$2</span>&quot;') // style content
				.replace(/\s(value)=&quot;(.*?)&quot;/g, ' <span klass="html-attrib-highlighted">$1</span>=&quot;<span klass="html-value-highlighted">$2</span>&quot;') // value content
				.replace(/&lt;([a-zA-Z0-9]+)/g, '&lt;<span klass="html-tag-highlighted">$1</span>') // opening tag
				.replace(/&lt;&#x2f;([a-zA-Z0-9]+)/g, '&lt;&#x2f;<span klass="html-tag-highlighted">$1</span>') // closing tag
				.replace(/(custom\-client\-only|base\-client\-only|send|joinRoom|icon\-[a-z0-9\-]+|fa\sfa\-[a-z0-9\-]+)/g, '<span klass="html-magic-highlighted">$1</span>') // magic values
				.replace(/<span klass=\"/g, '<span class="')
			);
		});
	},
});
