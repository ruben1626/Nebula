'use strict';

const path = require('path');

require('css.escape');

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

const CAJA_EXTRA_ELEMENTS = {
	// Non-standard HTML
	'marquee': 0,
	'blink': 0,

	// Untrusted HTML
	'form': 84,

	// Custom elements
	'countup': 0,
	'countdown': 0,
};

const CAJA_EXTRA_ATTRIBUTES = {
	// Non-standard HTML
	'marquee::behavior': 0,
	'marquee::bgcolor': 0,
	'marquee::direction': 0,
	'marquee::height': 0,
	'marquee::hspace': 0,
	'marquee::loop': 0,
	'marquee::scrollamount': 0,
	'marquee::scrolldelay': 0,
	'marquee::truespeed': 0,
	'marquee::vspace': 0,
	'marquee::width': 0,

	// Custom elements
	'countup::data-max': 0,
	'countup::data-value': 0,
	'countup::data-zone': 0,
	'countup::data-hour': 0,
	'countup::time': 0,
	'countdown::data-min': 0,
	'countdown::data-value': 0,
	'countdown::data-zone': 0,
	'countdown::data-hour': 0,
	'countdown::time': 0,
};

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

exports.getRow = getRow;
exports.getRowGroup = getRowGroup;

exports.openTag = openTag;
exports.closeTag = closeTag;
exports.createElement = createElement;

exports.blockElements = blockElements;
exports.modernize = modernizeHTML;

exports.escape = escapeHTML;
exports.unescape = unescapeHTML;

Object.assign(exports, (function () {
	const cajaPath = path.resolve(__dirname, 'html-css-sanitizer-bundle.js');
	const sandbox = browserRequire(cajaPath, function (fileContents) {
		// return fileContents.replace(/ALLOWED_URI_SCHEMES\s*=\s*\/\^\(\?\:([^\/\$\)]+)\)\$\/i/g, 'ALLOWED_URI_SCHEMES = /^(?:$1|data)$/i');
		return fileContents;
	});

	Object.assign(sandbox.html4.ELEMENTS, CAJA_EXTRA_ELEMENTS);
	Object.assign(sandbox.html4.ATTRIBS, CAJA_EXTRA_ATTRIBUTES);

	return {
		caja: sandbox.html,
		URI: sandbox.URI,
	};
})());

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
